"""Integration tests use a disposable ssc_test_* database, never ssc_dev/hosting."""

import http.cookiejar
import html
import json
import os
import re
from pathlib import Path
import socket
import shutil
import subprocess
import sys
import tempfile
import time
import unittest
import urllib.error
import urllib.parse
import urllib.request
import uuid

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from dev import php_command


class ConfigurationTests(unittest.TestCase):
    def test_parallax_webp_layers_preserve_registration_and_transparency(self):
        source = '''<?php $rows=[]; foreach (['sky','distance','campus','monument','foreground'] as $layer) {
            $source=$argv[1].'/assets/static/parallax-v3/'.$layer.'.png';
            $path=$argv[1].'/assets/img/siklab/parallax-'.$layer.'-v3.webp';
            $image=imagecreatefromwebp($path);
            $rows[$layer]=['source'=>array_slice(getimagesize($source),0,2),
                'registered'=>array_slice(getimagesize($argv[1].'/assets/static/parallax-v3/master.png'),0,2),
                'web'=>[imagesx($image),imagesy($image)],
                'corner_alpha'=>imagecolorsforindex($image,imagecolorat($image,0,0))['alpha']];
            imagedestroy($image);
        } echo json_encode($rows);'''
        with tempfile.TemporaryDirectory() as directory:
            script = Path(directory) / 'layers.php'
            script.write_text(source, encoding='utf-8')
            result = subprocess.run(php_command() + [str(script), str(ROOT)], capture_output=True, text=True, check=True)
            rows = json.loads(result.stdout)
            self.assertEqual(len({tuple(row['web']) for row in rows.values()}), 1)
            for layer, row in rows.items():
                self.assertEqual(row['registered'], row['web'], layer)
                self.assertTrue(all(abs(a-b) <= 1 for a, b in zip(row['source'], row['web'])), layer)
                self.assertEqual(row['corner_alpha'], 0 if layer == 'sky' else 127, layer)

    def test_settings_defaults_overrides_and_invalid_port(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            shutil.copyfile(ROOT / 'config/database-settings.php', root / 'database-settings.php')
            (root / 'database.local.php').write_text("<?php return ['server'=>'fixture-host','username'=>'fixture-user','password'=>'','name'=>'fixture-db'];", encoding='utf-8')
            (root / 'check.php').write_text("<?php require __DIR__.'/database-settings.php'; try { echo json_encode(database_settings()); } catch (Throwable $e) { exit(1); }", encoding='utf-8')
            env = {key: value for key, value in os.environ.items() if key not in {'DB_SERVER','DB_USERNAME','DB_PASSWORD','DB_NAME','DB_PORT'}}
            result = subprocess.run(php_command() + [str(root / 'check.php')], env=env, capture_output=True, text=True)
            self.assertEqual(json.loads(result.stdout)['port'], 3306)
            self.assertEqual(json.loads(result.stdout)['password'], '')
            result = subprocess.run(php_command() + [str(root / 'check.php')], env={**env, 'DB_SERVER':'override-host', 'DB_PORT':'33079'}, capture_output=True, text=True)
            self.assertEqual(json.loads(result.stdout)['server'], 'override-host')
            self.assertEqual(json.loads(result.stdout)['port'], 33079)
            for value in ('0', '65536', 'not-a-port'):
                with self.subTest(port=value):
                    result = subprocess.run(php_command() + [str(root / 'check.php')], env={**env, 'DB_PORT':value}, capture_output=True)
                    self.assertEqual(result.returncode, 1)

    def test_remote_migrations_refused_before_connecting(self):
        env = {**os.environ, 'DB_SERVER': 'must-not-connect.example.invalid',
               'DB_USERNAME': 'fixture', 'DB_PASSWORD': 'do-not-disclose',
               'DB_NAME': 'ssc_test_guard', 'DB_PORT': '3306'}
        result = subprocess.run(php_command() + ['scripts/database.php', 'migrate'],
            cwd=ROOT, env=env, capture_output=True, text=True, timeout=10)
        self.assertEqual(result.returncode, 1)
        self.assertIn('loopback', result.stderr)
        self.assertNotIn('do-not-disclose', result.stdout + result.stderr)


@unittest.skipUnless(os.environ.get('SSC_INTEGRATION') == '1', 'Run scripts/dev.py test or CI for isolated database tests')
class LocalApplicationTests(unittest.TestCase):
    @classmethod
    def php(cls, action, content=None):
        result = subprocess.run(cls.command + ['scripts/database.php', action], cwd=ROOT,
            env=cls.env, input=content, capture_output=True, text=True, timeout=30)
        if result.returncode:
            raise RuntimeError('Disposable database command failed: ' + result.stderr)
        return result.stdout

    @classmethod
    def sql(cls, sql):
        source = '<?php require $argv[1]; $result=$conn->query(stream_get_contents(STDIN)); if ($result instanceof mysqli_result) echo json_encode($result->fetch_all(MYSQLI_ASSOC));'
        with tempfile.NamedTemporaryFile(suffix='.php', delete=False) as script:
            script.write(source.encode())
            path = Path(script.name)
        try:
            result = subprocess.run(cls.command + [str(path), str(ROOT / 'config/database.php')],
                cwd=ROOT, env=cls.env, input=sql, capture_output=True, text=True, timeout=10)
            if result.returncode:
                raise RuntimeError('Disposable database query failed')
            return json.loads(result.stdout) if result.stdout else None
        finally:
            path.unlink()

    @classmethod
    def setUpClass(cls):
        if not os.environ.get('DB_NAME', '').startswith('ssc_test_'):
            raise RuntimeError('Integration tests require a disposable ssc_test_* database')
        cls.command = php_command()
        cls.env = {**os.environ, 'SSC_LOCAL_DEV': '1'}
        cls.credentials = {'admin_password': uuid.uuid4().hex, 'member_password': uuid.uuid4().hex}
        cls.php('migrate')
        cls.php('seed', json.dumps(cls.credentials))
        cls.directory = tempfile.TemporaryDirectory()
        cls.log = (Path(cls.directory.name) / 'server.log').open('wb')
        probe = socket.socket()
        probe.bind(('127.0.0.1', 0))
        port = probe.getsockname()[1]
        probe.close()
        cls.base = f'http://127.0.0.1:{port}'
        cls.server = subprocess.Popen(cls.command + ['-d', f'session.save_path={cls.directory.name}',
            '-S', f'127.0.0.1:{port}', 'scripts/dev-router.php'], cwd=ROOT, env=cls.env,
            stdout=cls.log, stderr=cls.log,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
        for _ in range(60):
            try:
                with urllib.request.urlopen(cls.base, timeout=1) as response:
                    if response.status == 200:
                        break
            except (OSError, urllib.error.HTTPError):
                time.sleep(0.1)
        else:
            cls.server.terminate()
            cls.server.wait(timeout=10)
            cls.log.close()
            raise RuntimeError('Local test server failed to start')

    @classmethod
    def tearDownClass(cls):
        cls.server.terminate()
        cls.server.wait(timeout=10)
        cls.log.close()
        cls.directory.cleanup()

    def login(self):
        opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        data = urllib.parse.urlencode({'username': 'admin@example.test', 'password': self.credentials['admin_password']}).encode()
        response = opener.open(self.base + '/login.php', data=data, timeout=10)
        self.assertIn('/dashboard.php', response.url)
        return opener

    def test_public_pages_and_document_filter(self):
        for path in ('/', '/about.php', '/officers.php', '/documents.php', '/login.php', '/auth/register.php'):
            with self.subTest(path=path), urllib.request.urlopen(self.base + path, timeout=10) as response:
                self.assertEqual(response.status, 200)
                body = response.read()
                self.assertNotIn(b'Fatal error', body)
                self.assertNotIn(b'Warning:', body)
        with urllib.request.urlopen(self.base + '/documents.php?section=treasurer&search=Example', timeout=10) as response:
            self.assertIn(b'Example Finance Report', response.read())

    def test_home_preserves_council_content_and_siklab_cannot_be_overridden(self):
        before = self.sql('SELECT COUNT(*) AS total FROM documents')
        expected = 'siklab'
        for path in ('/', '/?theme=regular', '/?theme=siklab', '/?theme%5B%5D=invalid',
                     '/documents.php?section=treasurer&search=Example'):
            for cookie_theme in ('regular', 'siklab'):
                request = urllib.request.Request(self.base + path, headers={'Cookie': 'ssc_theme=' + cookie_theme})
                with self.subTest(path=path, cookie=cookie_theme), urllib.request.urlopen(request, timeout=10) as response:
                    body = response.read()
                    body_text = ' '.join(re.sub(r'<[^>]+>', ' ', html.unescape(body.decode('utf-8'))).split())
                    self.assertIn(f'data-theme="{expected}"'.encode(), body)
                    for removed in (b'theme-picker', b'team-lineup', b'event-frame-note', b'Seven teams. One shared flame.',
                                    b'data-trophy-scene', b'data-model-url', b'stage-orbit', b'siklab-scene.bundle.js', b'<canvas', b'Warning:'):
                        self.assertNotIn(removed, body)
                    if path.startswith('/documents.php'):
                        self.assertIn(b'Example Finance Report', body)
                        continue
                    for original in (b'CSPC Supreme Student Council', b'Academic Year 2025-2026',
                                     b'Promoting transparency and student welfare through accessible documentation and information sharing.',
                                     b'Empowering students through leadership, service, and advocacy.',
                                     b'Meet the Council', b'Official Documents', b'Executive Officers',
                                     b'Ann Kyla V. Aquiler', b'About This Platform',
                                     b'Event announcements will appear here when posted.'):
                        self.assertIn(original.decode('utf-8'), body_text)
                    self.assertEqual(b'class="opening-trophy"' in body, expected == 'siklab')
                    if expected == 'siklab':
                        self.assertIn(b'assets/img/siklab/trophy.webp', body)
                        self.assertEqual(body.count(b'data-officer-section'), 8)
                        self.assertEqual(body.count(b'data-document-card'), 3)
                        self.assertEqual(body.count(b'data-scene-layer'), 5)
                        self.assertIn(b'data-parallax-stage', body)
                        self.assertNotIn(b'campus-illustration-v1.webp', body)
                        self.assertNotIn(b'id="aboutModal"', body)
                        self.assertNotIn(b'id="profileModal"', body)
                        self.assertIn(b'href="about.php"', body)
                        for college in ('BUHI', 'CAS', 'CCS', 'CEA', 'CHS', 'CTDE', 'CTHBM'):
                            self.assertIn(f'<span>{college}</span>'.encode(), body)
        for asset in ('trophy', 'bc', 'cas', 'ccs', 'cea', 'chs', 'ctde', 'cthbm',
                      'parallax-sky-v3', 'parallax-distance-v3', 'parallax-campus-v3',
                      'parallax-monument-v3', 'parallax-foreground-v3'):
            with self.subTest(asset=asset), urllib.request.urlopen(self.base + f'/assets/img/siklab/{asset}.webp', timeout=10) as response:
                self.assertEqual(response.status, 200)
                header = response.read(12)
                self.assertEqual(header[:4], b'RIFF')
                self.assertEqual(header[8:12], b'WEBP')
        self.assertEqual(self.sql('SELECT COUNT(*) AS total FROM documents'), before)

    def test_about_page_preserves_developer_profiles(self):
        with urllib.request.urlopen(self.base + '/about.php', timeout=10) as response:
            body = response.read()
            for value in (b'About This Platform', b'Jeriel Agua', b'Jessil C. Martinez',
                          b'Ralph Abonal', b'Jancee Kenn Abonita', b'Joberth Iballar',
                          b'id="profileModal"', b'function openProfileModal', b'function closeProfileModal'):
                self.assertIn(value, body)
            self.assertNotIn(b'id="aboutModal"', body)
            self.assertIn(b'<dialog id="profileModal"', body)
            self.assertEqual(body.count(b'role="button" tabindex="0"'), 5)

    def test_uploaded_event_announcement_is_available_from_opening(self):
        original = self.sql("SELECT setting_value FROM site_settings WHERE setting_key='event_photo'")
        self.sql("INSERT INTO site_settings (setting_key,setting_value) VALUES ('event_photo','assets/img/siklab/wordmark.webp') ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)")
        try:
            with urllib.request.urlopen(self.base + '/', timeout=10) as response:
                body = response.read()
                self.assertIn(b'data-event-poster-open', body)
                self.assertIn(b'<dialog class="event-poster-dialog"', body)
                self.assertIn(b'alt="Upcoming Event"', body)
                self.assertNotIn(b'Event announcements will appear here when posted.', body)
        finally:
            self.sql("DELETE FROM site_settings WHERE setting_key='event_photo'")
            if original:
                value = original[0]['setting_value']
                literal = 'NULL' if value is None else "'" + value.replace('\\', '\\\\').replace("'", "\\'") + "'"
                self.sql("INSERT INTO site_settings (setting_key,setting_value) VALUES ('event_photo'," + literal + ")")

    def test_local_router_blocks_private_files(self):
        for path in ('/config/database.local.php', '/config/dev.local.json', '/.git/config',
                     '/vendor/autoload.php', '/scripts/database.php', '/database/migrations/001_initial.sql',
                     '/.vscode/tasks.json', '/sscwebsite.sql'):
            with self.subTest(path=path), self.assertRaises(urllib.error.HTTPError) as raised:
                urllib.request.urlopen(self.base + path, timeout=10)
            self.assertIn(raised.exception.code, (403, 404))

    def test_migrations_and_seeding_are_repeatable(self):
        counts = self.sql('SELECT COUNT(*) AS total FROM documents')
        self.assertNotIn('Applied ', self.php('migrate'))
        self.php('seed', json.dumps(self.credentials))
        self.assertEqual(self.sql('SELECT COUNT(*) AS total FROM documents'), counts)

    def test_older_documents_schema_gets_display_name_without_losing_records(self):
        before = self.sql('SELECT COUNT(*) AS total FROM documents')
        self.sql('ALTER TABLE documents DROP COLUMN display_name')
        self.sql("DELETE FROM _schema_migrations WHERE version='002_document_display_name.php'")
        try:
            self.assertIn('002_document_display_name.php', self.php('migrate'))
        finally:
            self.php('migrate')
        self.assertEqual(self.sql('SELECT COUNT(*) AS total FROM documents'), before)
        self.assertTrue(self.sql("SHOW COLUMNS FROM documents LIKE 'display_name'"))

    def test_sign_in_reports_pdf_viewer_and_logout(self):
        opener = self.login()
        with opener.open(self.base + '/generate_report.php', timeout=10) as response:
            self.assertTrue(response.read().startswith(b'%PDF-'))
        path = 'uploads/development/' + os.environ['DB_NAME'] + '/treasurer.pdf'
        with opener.open(self.base + '/pdfviewer.php?file=' + urllib.parse.quote(path), timeout=10) as response:
            self.assertEqual(response.status, 200)
        with opener.open(self.base + '/view_pdf.php?file=' + urllib.parse.quote(path), timeout=10) as response:
            self.assertTrue(response.read().startswith(b'%PDF-'))
        opener.open(self.base + '/logout.php', timeout=10).close()
        with opener.open(self.base + '/dashboard.php', timeout=10) as response:
            self.assertIn('/login.php', response.url)

    def test_upload_supplies_required_title_on_strict_schema(self):
        opener = self.login()
        filename = 'integration-' + uuid.uuid4().hex + '.pdf'
        boundary = 'ssc-' + uuid.uuid4().hex
        data = b''
        for name, value in {'upload': '1', 'section': 'treasurer', 'display_name': 'Synthetic Test'}.items():
            data += f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode()
        fixture = ROOT / 'uploads/development' / os.environ['DB_NAME'] / 'treasurer.pdf'
        data += f'--{boundary}\r\nContent-Disposition: form-data; name="files[]"; filename="{filename}"\r\nContent-Type: application/pdf\r\n\r\n'.encode()
        data += fixture.read_bytes() + f'\r\n--{boundary}--\r\n'.encode()
        request = urllib.request.Request(self.base + '/dashboard.php', data=data,
            headers={'Content-Type': 'multipart/form-data; boundary=' + boundary})
        try:
            with opener.open(request, timeout=10) as response:
                self.assertIn('upload=success', response.url)
            rows = self.sql("SELECT title FROM documents WHERE original_name='" + filename + "'")
            self.assertEqual(rows, [{'title': filename}])
        finally:
            self.sql("DELETE FROM documents WHERE original_name='" + filename + "'")
            (ROOT / 'uploads' / filename).unlink(missing_ok=True)
