"""Integration tests use a disposable ssc_test_* database, never ssc_dev/hosting."""

import http.cookiejar
import html
from html.parser import HTMLParser
import hashlib
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
    def test_current_roster_uses_the_confirmed_directory_and_shared_executives(self):
        source = '''require $argv[1].'/includes/current-academic-year.php';
        $rosters=require $argv[1].'/includes/officer-rosters.php';
        $executives=require $argv[1].'/includes/executive-officers.php';
        echo json_encode(['year'=>SSC_CURRENT_ACADEMIC_YEAR,'roster'=>$rosters[SSC_CURRENT_ACADEMIC_YEAR],'executives'=>$executives]);'''
        result = subprocess.run(php_command() + ['-r', source, str(ROOT)], capture_output=True, text=True, encoding='utf-8', check=True)
        data = json.loads(result.stdout)
        self.assertEqual(data['year'], '2026')
        self.assertEqual(len(data['roster']), 53)
        by_name = {officer['name']: officer for officer in data['roster']}
        self.assertEqual(len(by_name), 53)
        self.assertEqual(sum(bool(officer['image']) for officer in data['roster']), 46)
        self.assertEqual(by_name['Trisha Mae E. Abonita']['birthday'], 'Birthday: April 30, 2008')
        self.assertTrue(by_name['Carl Anthony S. Acbang']['image'].endswith('/acbang.jpg'))
        self.assertEqual(by_name['Remier Rave O. Acbang']['image'], '')
        self.assertEqual(by_name['Ma. Vianney B. Morillo']['role'], by_name['Faith Meca T. Puyawan']['role'])
        self.assertEqual(by_name['Ma. Vianney B. Morillo']['course'], 'BSIS 4A')
        for name in ('Ma. Vianney B. Morillo', 'Chloe Ysabelle T. Peñones', 'Ma. Socorro B. Igana', 'Janelle Sallena'):
            self.assertIn(name, by_name)
            self.assertEqual(by_name[name]['contacts'], [])
            self.assertEqual(by_name[name]['birthday'], '')
        self.assertEqual([officer['name'] for officer in data['executives']], [
            'Jester Carl SJ. Sumpay', 'Jessil C. Martinez', 'Ralph Joefrancis D. Abonal',
            'Ma. Lourdes Carmen A. Tulabot', 'RJ Patrick A. Sernal', 'Luke Andrei O. Ronquillo',
            'Krystine Joy A. Grospe', 'Camille C. Salvadora',
        ])
        self.assertTrue(all(officer['image'].startswith('assets/img/officers/') for officer in data['executives']))

    def test_portrait_encoder_rejects_provider_error_graphics_and_preserves_valid_photos(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            fixture = root / 'error.php'
            fixture.write_text("<?php $i=imagecreatetruecolor(320,240);imagefill($i,0,0,imagecolorallocate($i,34,167,218));imagestring($i,5,20,70,'imgbb.com',imagecolorallocate($i,255,255,255));imagestring($i,4,10,140,'service unavailable',imagecolorallocate($i,255,255,255));imagepng($i,$argv[1]);", encoding='utf-8')
            error_image = root / 'provider-error.png'
            subprocess.run(php_command() + [str(fixture), str(error_image)], check=True, capture_output=True)
            valid_image = next((ROOT / 'assets/img/officers').glob('*.webp'))
            sources = root / 'sources.json'
            sources.write_text(json.dumps([
                {'url': 'fixture-error', 'key': 'error', 'source': str(error_image)},
                {'url': 'fixture-valid', 'key': 'portrait', 'source': str(valid_image)},
                {'url': 'fixture-missing', 'key': 'missing', 'source': None},
            ]), encoding='utf-8')
            subprocess.run(php_command() + [str(ROOT / 'scripts/encode-officer-portraits.php'), str(sources), str(root)], check=True, capture_output=True)
            manifest = json.loads((root / 'assets/img/officers/manifest.json').read_text())
            self.assertIsNone(manifest['fixture-error']['path'])
            self.assertIsNone(manifest['fixture-missing']['path'])
            self.assertEqual(manifest['fixture-valid']['path'], 'assets/img/officers/portrait.webp')
            self.assertEqual((root / manifest['fixture-valid']['path']).read_bytes()[:4], b'RIFF')

    def test_campus_source_is_the_untouched_supplied_photograph(self):
        metadata = json.loads((ROOT / 'docs/campus-photo-source.json').read_text(encoding='utf-8'))
        original = (ROOT / 'assets/static/photo-parallax-v1/original.jpg').read_bytes()
        self.assertEqual(hashlib.sha256(original).hexdigest(), metadata['sha256'])
        self.assertEqual(metadata['source_dimensions'], [2048, 1150])

    def test_photo_masks_register_and_partition_the_original_without_duplicate_surfaces(self):
        source = '''<?php $base=$argv[1].'/assets/img/siklab/'; $masks=[]; $rows=[];
        foreach (['sky','campus','monument','foreground','gap'] as $name) {
            $masks[$name]=imagecreatefromwebp($base.'photo-'.$name.'-mask-v1.webp');
            $rows[$name]=[imagesx($masks[$name]),imagesy($masks[$name])];
        }
        $violations=0; $seen=[];
        for($y=7;$y<1078;$y+=19) for($x=7;$x<1920;$x+=19) {
            $sum=0; $near=0;
            foreach($masks as $name=>$image) {
                $color=imagecolorat($image,$x,$y); $opacity=127-(($color>>24)&127);
                if($opacity!==0 && $opacity!==127) $violations++;
                if($opacity===127 && ($color & 0xFFFFFF)!==0xFFFFFF) $violations++;
                if($opacity) $seen[$name]=true;
                if($name!=='gap') $sum+=$opacity;
                if($name==='monument'||$name==='foreground') $near+=$opacity;
            }
            if($sum!==127) $violations++;
            $gap=127-((imagecolorat($masks['gap'],$x,$y)>>24)&127);
            if($near!==$gap) $violations++;
        }
        foreach(['campus-photo-v1','photo-sky-fill-v1','photo-campus-fill-v1'] as $name)
            $rows[$name]=array_slice(getimagesize($base.$name.'.webp'),0,2);
        echo json_encode(['sizes'=>$rows,'violations'=>$violations,'seen'=>array_keys($seen)]);'''
        with tempfile.TemporaryDirectory() as directory:
            script = Path(directory) / 'layers.php'
            script.write_text(source, encoding='utf-8')
            result = subprocess.run(php_command() + [str(script), str(ROOT)], capture_output=True, text=True, check=True)
            result = json.loads(result.stdout)
            self.assertTrue(all(size == [1920, 1078] for size in result['sizes'].values()))
            self.assertEqual(result['violations'], 0)
            self.assertEqual(set(result['seen']), {'sky', 'campus', 'monument', 'foreground', 'gap'})

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

    def csrf(self, opener, page='/dashboard.php'):
        with opener.open(self.base + page) as response:
            return re.search(r'name="csrf_token" value="([a-f0-9]+)"', response.read().decode()).group(1)

    def multipart(self, opener, fields, files):
        boundary = 'ssc-' + uuid.uuid4().hex
        data = b''
        for name, value in fields.items():
            data += f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode()
        for field, filename, mime, content in files:
            data += f'--{boundary}\r\nContent-Disposition: form-data; name="{field}"; filename="{filename}"\r\nContent-Type: {mime}\r\n\r\n'.encode() + content + b'\r\n'
        data += f'--{boundary}--\r\n'.encode()
        return opener.open(urllib.request.Request(self.base + '/dashboard.php', data=data, headers={'Content-Type': 'multipart/form-data; boundary=' + boundary}), timeout=15)

    def login(self, member=False):
        opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        with opener.open(self.base + '/login.php') as response:
            token = re.search(r'name="csrf_token" value="([a-f0-9]+)"', response.read().decode()).group(1)
        data = urllib.parse.urlencode({'username': 'member@example.test' if member else 'admin@example.test', 'password': self.credentials['member_password' if member else 'admin_password'], 'csrf_token': token}).encode()
        response = opener.open(self.base + '/login.php', data=data, timeout=10)
        self.assertIn('/dashboard.php', response.url)
        return opener

    def test_public_pages_and_document_filter(self):
        for path in ('/', '/about.php', '/tally.php', '/officers.php', '/documents.php', '/login.php', '/auth/register.php'):
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
                    for original in (b'CSPC Supreme Student Council', 'Academic Year 2026–2027'.encode('utf-8'),
                                     b'Promoting transparency and student welfare through accessible documentation and information sharing.',
                                     b'OFFICIAL DOCUMENTS', b'EXECUTIVE OFFICERS',
                                     b'Jester Carl SJ. Sumpay', b'RJ Patrick A. Sernal', b'About This Platform',
                                     b'SIKLAB: CSPC Intramurals 2026', b'November 23', b'28, 2026'):
                        self.assertIn(original.decode('utf-8'), body_text)
                    if expected == 'siklab':
                        self.assertEqual(body.count(b'data-officer-section'), 8)
                        self.assertEqual(body.count(b'data-document-card'), 3)
                        self.assertIn(b'data-officer-scroll', body)
                        self.assertIn(b'data-officer-track', body)
                        self.assertIn(b'data-hero-video', body)
                        self.assertIn(b'muted loop playsinline preload="none"', body)
                        self.assertIn(b'href="tally.php"', body)
                        for obsolete in (b'data-photo-scene', b'data-parallax-stage', b'opening-trophy', b'THE SEVEN COLLEGES', b'college-chapter'):
                            self.assertNotIn(obsolete, body)
                        self.assertNotIn(b'id="aboutModal"', body)
                        self.assertNotIn(b'id="profileModal"', body)
                        self.assertIn(b'href="about.php"', body)
                        hero = body.split(b'<section class="event-hero"', 1)[1].split(b'</section>', 1)[0]
                        self.assertNotIn(b'Promoting transparency', hero)
                        for college in ('BUHI', 'CAS', 'CCS', 'CEA', 'CHS', 'CTDE', 'CTHBM'):
                            self.assertIn(f'alt="{college}"'.encode(), hero)
                            self.assertNotIn(f'<span>{college}</span>'.encode(), body)
        for asset in ('trophy', 'bc', 'cas', 'ccs', 'cea', 'chs', 'ctde', 'cthbm',
                      'campus-photo-v1', 'photo-sky-fill-v1', 'photo-campus-fill-v1',
                      'photo-sky-mask-v1', 'photo-campus-mask-v1', 'photo-monument-mask-v1',
                      'photo-foreground-mask-v1', 'photo-gap-mask-v1'):
            with self.subTest(asset=asset), urllib.request.urlopen(self.base + f'/assets/img/siklab/{asset}.webp', timeout=10) as response:
                self.assertEqual(response.status, 200)
                header = response.read(12)
                self.assertEqual(header[:4], b'RIFF')
                self.assertEqual(header[8:12], b'WEBP')
        self.assertEqual(self.sql('SELECT COUNT(*) AS total FROM documents'), before)

    def test_document_library_filters_and_current_office_holders(self):
        cases = [('treasurer', 'RJ Patrick A. Sernal', 'Example Finance Report', 'Example Meeting Minutes'),
                 ('legislative', 'Ralph Joefrancis D. Abonal', 'Example Council Resolution', 'Example Finance Report'),
                 ('secretary', 'Ma. Lourdes Carmen A. Tulabot', 'Example Meeting Minutes', 'Example Council Resolution')]
        for category, officer, included, excluded in cases:
            with self.subTest(category=category), urllib.request.urlopen(self.base + '/documents.php?section=' + category) as response:
                body = response.read().decode('utf-8')
                self.assertIn('<h1>OFFICIAL DOCUMENTS</h1>', body)
                self.assertIn('assets/css/documents.css', body)
                self.assertIn('assets/js/documents.js', body)
                self.assertNotIn('officer-scroll.mjs', body)
                self.assertIn(included, body)
                self.assertNotIn(excluded, body)
                self.assertIn(officer, body)
                self.assertEqual(body.count('class="library-holder-year"'), 3)
                self.assertIn('Current &middot; AY 2026&ndash;2027', body)
                holders = body.split('<aside class="library-holders"', 1)[1].split('</aside>', 1)[0]
                self.assertNotIn('https://i.ibb.co/', holders)
                self.assertEqual(re.findall(r'AY (\d{4})&ndash;', holders), ['2024', '2025', '2026'])
                self.assertEqual(holders.count('is-former'), 2)
                self.assertNotIn('<a ', holders)
        for query, count in [('section=treasurer&search=Synthetic', 1), ('search=Example', 3),
                             ('section=secretary&search=Finance', 0), ('section=unknown', 3),
                             ('section%5B%5D=treasurer&search%5B%5D=invalid', 3),
                             ('search=%22%3E%3Cscript%3Ealert(1)%3C%2Fscript%3E', 0)]:
            with self.subTest(query=query), urllib.request.urlopen(self.base + '/documents.php?' + query) as response:
                body = response.read().decode('utf-8')
                self.assertEqual(body.count('data-document-record'), count)
                self.assertNotIn('<script>alert(1)</script>', body)
                self.assertNotIn('Warning:', body)
                if count == 0:
                    self.assertIn('No documents found', body)
                    self.assertIn('data-library-link', body)

    def test_document_library_preserves_legacy_paths_and_encoded_download_links(self):
        class Links(HTMLParser):
            def __init__(self):
                super().__init__()
                self.links, self.qr = [], []

            def handle_starttag(self, tag, attrs):
                attrs = dict(attrs)
                if tag == 'a': self.links.append(attrs)
                if 'data-document-qr' in attrs: self.qr.append(attrs)

        original = self.sql('SELECT file_path FROM documents ORDER BY id LIMIT 1')[0]['file_path']
        file = ROOT / Path(original).parent / "Council's budget #1.pdf"
        file.write_bytes((ROOT / original).read_bytes())
        legacy = 'C:\\xampp\\htdocs\\sscwebsite\\' + str(file.relative_to(ROOT)).replace('/', '\\')
        name_hex = file.name.encode().hex()
        legacy_hex = legacy.encode().hex()
        self.sql(f"INSERT INTO documents (title,original_name,description,category,file_path,uploaded_by,display_name,created_at) SELECT 'Special filename fixture',CONVERT(0x{name_hex} USING utf8mb4),'Filename fixture','treasurer',CONVERT(0x{legacy_hex} USING utf8mb4),uploaded_by,'',NOW() FROM documents ORDER BY id LIMIT 1")
        fixture_id = self.sql("SELECT id FROM documents WHERE title='Special filename fixture'")[0]['id']
        try:
            with urllib.request.urlopen(self.base + '/documents.php?search=budget') as response:
                body = response.read().decode('utf-8')
            self.assertEqual(body.count('data-document-record'), 1)
            parser = Links()
            parser.feed(body)
            download = next(link['href'] for link in parser.links if 'download' in link)
            viewer = next(link['href'] for link in parser.links if link.get('href', '').startswith('pdfviewer.php?file='))
            self.assertIn('%27s%20budget%20%231.pdf', download)
            self.assertEqual(parser.qr[0]['data-document-qr'], download)
            self.assertEqual(parser.qr[0]['data-document-name'], file.name)
            self.assertNotIn('onclick=', body)
            with urllib.request.urlopen(self.base + '/' + download) as response:
                self.assertEqual(response.read(5), b'%PDF-')
            with urllib.request.urlopen(self.base + '/' + viewer) as response:
                self.assertIn(b'PDF Viewer', response.read())
        finally:
            self.sql(f'DELETE FROM documents WHERE id={int(fixture_id)}')
            file.unlink()

    def test_document_library_pagination_keeps_search_and_category(self):
        numbers = ' UNION ALL '.join(f'SELECT {index} AS n' for index in range(1, 15))
        self.sql("INSERT INTO documents (title,original_name,description,category,file_path,uploaded_by,display_name,created_at) "
                 "SELECT CONCAT('Pagination fixture ',n.n),CONCAT('Pagination fixture ',n.n,'.pdf'),'Pagination test','treasurer',d.file_path,d.uploaded_by,'Fixture',NOW() "
                 f"FROM (SELECT file_path,uploaded_by FROM documents ORDER BY id LIMIT 1) d CROSS JOIN ({numbers}) n")
        try:
            for page, expected, actual in [('1', 12, 1), ('2', 2, 2), ('9999', 2, 2), ('-1', 12, 1), ('bad', 12, 1)]:
                with self.subTest(page=page), urllib.request.urlopen(self.base + '/documents.php?section=treasurer&search=Pagination&page=' + page) as response:
                    body = response.read().decode('utf-8')
                    self.assertEqual(body.count('data-document-record'), expected)
                    self.assertIn(f'data-page="{actual}"', body)
                    self.assertIn('14 documents matching', body)
                    self.assertIn('section=treasurer&amp;search=Pagination', body)
                    self.assertIn('data-library-page', body)
            with urllib.request.urlopen(self.base + '/documents.php?error=notfound') as response:
                self.assertIn(b'That document could not be found.', response.read())
        finally:
            self.sql("DELETE FROM documents WHERE title LIKE 'Pagination fixture %'")

    def test_officer_directory_preserves_rosters_and_groups_them_by_office(self):
        for year, profiles in (('2024', 52), ('2025', 51), ('2026', 53)):
            with self.subTest(year=year), urllib.request.urlopen(self.base + '/officers.php?year=' + year, timeout=10) as response:
                body = response.read()
                self.assertEqual(body.count(b'data-directory-card'), profiles)
                self.assertEqual(body.count(b'class="directory-card is-executive"'), 8)
                self.assertEqual(body.count(b'data-office-section'), 19)
                self.assertIn(b'assets/css/officers.css', body)
                self.assertIn(b'assets/js/officers.js', body)
                self.assertIn(b'assets/static/SSC%20LOGO.png', body)
                self.assertEqual(body.count(b'class="directory-photo-fallback"'), profiles)
                self.assertNotIn(b'data-directory-status', body)
                self.assertNotIn(b'assets/img/siklab/wordmark.webp', body)
                for excluded in (b'assets/css/home.css', b'officer-scroll.mjs', b'section-snap.mjs', b'data-officer-scroll', b'data-parallax-stage'):
                    self.assertNotIn(excluded, body)
        with urllib.request.urlopen(self.base + '/officers.php', timeout=10) as response:
            body = response.read()
            self.assertNotIn(b'Coming Soon', body)
            self.assertEqual(body.count(b'data-directory-card'), 53)
            self.assertIn(b'Jester Carl SJ. Sumpay', body)
            self.assertIn('Chloe Ysabelle T. Peñones'.encode('utf-8'), body)
            self.assertIn(b'href="officers.php?year=2026" aria-current="page"', body)
        with urllib.request.urlopen(self.base + '/assets/static/BACKGROUND%20%281%29.png', timeout=10) as response:
            self.assertEqual(response.status, 200)
            self.assertEqual(response.read(8), b'\x89PNG\r\n\x1a\n')

    def test_officer_directory_search_works_without_javascript_and_handles_invalid_inputs(self):
        class VisibleProfiles(HTMLParser):
            def __init__(self):
                super().__init__()
                self.count = 0

            def handle_starttag(self, tag, attrs):
                attrs = dict(attrs)
                if 'data-directory-card' in attrs and 'hidden' not in attrs:
                    self.count += 1

        cases = [('year=2025&q=Aquiler', 2, 51), ('year=2025&q=secretary', 6, 51),
                 ('year=2025&q=Office+of+the+Property+Custodian', 7, 51),
                 ('year=2025&q=no-such-officer', 0, 51), ('year%5B%5D=2024&q%5B%5D=bad', 53, 53),
                 ('year=bad&q=%3Cscript%3Ealert(1)%3C%2Fscript%3E', 0, 53),
                 ('q=publication', 2, 53), ('q=BUHI', 2, 53), ('q=secretary', 8, 53)]
        for query, count, total in cases:
            with self.subTest(query=query), urllib.request.urlopen(self.base + '/officers.php?' + query, timeout=10) as response:
                body = response.read().decode('utf-8')
                parser = VisibleProfiles()
                parser.feed(body)
                self.assertEqual(parser.count, count)
                self.assertNotIn('Warning:', body)
                self.assertNotIn('<script>alert(1)</script>', body)
                self.assertEqual(body.count('data-directory-card'), total)

    def test_tally_placeholder_and_event_video_are_public(self):
        with urllib.request.urlopen(self.base + '/tally.php', timeout=10) as response:
            body = response.read()
            self.assertIn(b'<h1>The official tally board is underway</h1>', body)
            self.assertIn(b'href="index.php"', body)
            self.assertIn(b'Contact Info', body)
            self.assertNotIn(b'<table', body)
            self.assertNotIn(b'Warning:', body)
        with urllib.request.urlopen(self.base + '/assets/video/siklab-2026-loop.mp4', timeout=10) as response:
            self.assertEqual(response.status, 200)
            self.assertEqual(response.headers.get_content_type(), 'video/mp4')
            self.assertIn(b'ftyp', response.read(32))

    def test_about_page_preserves_developer_profiles(self):
        with urllib.request.urlopen(self.base + '/about.php', timeout=10) as response:
            body = response.read()
            for value in (b'About This Platform', b'Jeriel Agua', b'Jessil C. Martinez',
                          b'Ralph Abonal', b'Jancee Kenn Abonita', b'Joberth Iballar',
                          b'id="profileModal"', b'assets/css/about.css', b'assets/js/about.js'):
                self.assertIn(value, body)
            self.assertNotIn(b'id="aboutModal"', body)
            self.assertIn(b'<dialog id="profileModal"', body)
            self.assertEqual(body.count(b'data-profile-open='), 5)
            self.assertEqual(body.count(b'data-profile-fallback'), 5)
            payload = re.search(r'<script id="platform-profiles" type="application/json">(.*?)</script>', body.decode('utf-8'), re.S)
            profiles = json.loads(payload.group(1))
            self.assertEqual(list(profiles), ['jeriel', 'jessil', 'ralph', 'jancee', 'joberth'])
            self.assertEqual(len(profiles['joberth']['history']), 3)
            self.assertEqual(profiles['jessil']['project'], 'FinTech: Empowering Financial Transparency')
            expected_current = {'jeriel': 'Sports and Cultural Committee Director',
                                'jessil': 'Vice President for External Affairs',
                                'ralph': 'Vice President for Internal Affairs'}
            for identifier, position in expected_current.items():
                profile = profiles[identifier]
                self.assertTrue(profile['isCurrent'])
                self.assertEqual(profile['role'], position)
                self.assertIn('2026\u20132027', profile['currentRole'])
                self.assertEqual(profile['history'][0], {'year': '2026\u20132027', 'position': position, 'current': True})
                self.assertTrue(profile['history'][1]['year'].startswith('2025'))
            for identifier in ('jancee', 'joberth'):
                self.assertFalse(profiles[identifier]['isCurrent'])
                self.assertIn('2025-2026', profiles[identifier]['currentRole'])
                self.assertFalse(any(position.get('current') for position in profiles[identifier]['history']))
            self.assertTrue(all(profile['image'].startswith('assets/img/officers/') for profile in profiles.values()))
            self.assertNotIn(b'onclick=', body)

    def test_siklab_opening_omits_saved_event_announcement(self):
        original = self.sql("SELECT setting_value FROM site_settings WHERE setting_key='event_photo'")
        self.sql("INSERT INTO site_settings (setting_key,setting_value) VALUES ('event_photo','assets/img/siklab/wordmark.webp') ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)")
        try:
            with urllib.request.urlopen(self.base + '/', timeout=10) as response:
                body = response.read()
                self.assertNotIn(b'View event announcement', body)
                self.assertNotIn(b'data-event-poster-open', body)
                self.assertNotIn(b'event-poster-dialog', body)
                self.assertNotIn(b'alt="Upcoming Event"', body)
                self.assertIn(b'Official tally board', body)
                self.assertNotIn(b'Event announcements will appear here when posted.', body)
            self.assertEqual(self.sql("SELECT setting_value FROM site_settings WHERE setting_key='event_photo'")[0]['setting_value'], 'assets/img/siklab/wordmark.webp')
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

    def test_login_validation_and_session_token(self):
        opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        with opener.open(self.base + '/login.php') as response:
            body = response.read().decode()
            token = re.search(r'name="csrf_token" value="([a-f0-9]+)"', body).group(1)
            self.assertIn('autocomplete="current-password"', body)
        cases = [({'username': 'admin@example.test', 'password': 'wrong', 'csrf_token': token}, 'Invalid username or password.'),
                 ({'username[]': 'invalid', 'password[]': 'invalid', 'csrf_token': token}, 'Please enter your email address.'),
                 ({'username': 'admin@example.test', 'password': self.credentials['admin_password']}, 'Your session expired.')]
        for form, message in cases:
            with opener.open(self.base + '/login.php', urllib.parse.urlencode(form).encode()) as response:
                body = response.read().decode()
                self.assertIn(message, body)
                self.assertNotIn('Warning:', body)
                self.assertIn('/login.php', response.url)

    def test_upload_supplies_required_title_on_strict_schema(self):
        opener = self.login()
        filename = 'integration-' + uuid.uuid4().hex + '.pdf'
        boundary = 'ssc-' + uuid.uuid4().hex
        data = b''
        for name, value in {'upload': '1', 'section': 'treasurer', 'display_name': 'Synthetic Test', 'csrf_token': self.csrf(opener)}.items():
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
            paths = self.sql("SELECT file_path FROM documents WHERE original_name='" + filename + "'")
            self.sql("DELETE FROM documents WHERE original_name='" + filename + "'")
            for row in paths:
                path = (ROOT / row['file_path']).resolve()
                self.assertTrue(path.is_relative_to((ROOT / 'uploads').resolve()))
                path.unlink(missing_ok=True)

    def test_dashboard_permissions_and_csrf_reject_changes(self):
        opener = self.login()
        before = self.sql('SELECT id,original_name,category FROM documents ORDER BY id')
        with opener.open(self.base + '/dashboard.php') as response:
            body = response.read().decode()
            self.assertIn('COUNCIL DASHBOARD', body)
            self.assertIn('assets/js/dashboard.js', body)
            self.assertIn('data-workspace-document', body)
            self.assertNotIn('delete_document.php?id=', body)
            self.assertNotIn('View website', body)
            self.assertEqual(body.count('data-workspace-tab='), 2)
            self.assertIn('data-default-panel="uploaded-documents"', body)
        form = urllib.parse.urlencode({'bulk_action': 'delete', 'doc_ids[]': before[0]['id']}).encode()
        with self.assertRaises(urllib.error.HTTPError) as error:
            opener.open(self.base + '/dashboard.php', form)
        self.assertEqual(error.exception.code, 403)
        with self.assertRaises(urllib.error.HTTPError) as error:
            opener.open(self.base + '/delete_document.php?id=' + str(before[0]['id']))
        self.assertEqual(error.exception.code, 405)
        member = self.login(member=True)
        with member.open(self.base + '/dashboard.php') as response:
            body = response.read().decode()
            self.assertIn('read-only access', body)
            self.assertNotIn('data-edit-document', body)
            self.assertNotIn('id="upload-documents"', body)
        with self.assertRaises(urllib.error.HTTPError) as error:
            member.open(self.base + '/dashboard.php', form)
        self.assertEqual(error.exception.code, 403)
        self.assertEqual(self.sql('SELECT id,original_name,category FROM documents ORDER BY id'), before)

    def test_dashboard_upload_edit_bulk_and_delete_workflow(self):
        opener = self.login(); token = self.csrf(opener)
        prefix = 'workspace-' + uuid.uuid4().hex
        fixture = ROOT / 'uploads/development' / os.environ['DB_NAME'] / 'treasurer.pdf'
        paths = []
        try:
            for _ in range(2):
                with self.multipart(opener, {'csrf_token': token, 'upload': '1', 'section': 'treasurer', 'display_name': 'Workspace fixture'}, [('files[]', prefix + '.pdf', 'application/pdf', fixture.read_bytes())]) as response:
                    self.assertIn('upload=success', response.url)
            rows = self.sql(f"SELECT id,file_path FROM documents WHERE original_name='{prefix}.pdf' ORDER BY id")
            self.assertEqual(len(rows), 2)
            paths = [ROOT / row['file_path'] for row in rows]
            self.assertNotEqual(paths[0], paths[1])
            self.assertTrue(all(path.read_bytes() == fixture.read_bytes() for path in paths))
            form = {'csrf_token': token, 'edit_doc': '1', 'edit_id': rows[0]['id'], 'edit_name': prefix + '-renamed.pdf', 'edit_display': 'Updated publisher', 'edit_category': 'secretary'}
            with opener.open(self.base + '/dashboard.php', urllib.parse.urlencode(form).encode()) as response:
                self.assertIn('edit=success', response.url)
            updated = self.sql(f"SELECT original_name,display_name,category FROM documents WHERE id={rows[0]['id']}")[0]
            self.assertEqual(updated, {'original_name': prefix + '-renamed.pdf', 'display_name': 'Updated publisher', 'category': 'secretary'})
            form = {'csrf_token': token, 'bulk_action': 'legislative', 'doc_ids[]': [row['id'] for row in rows]}
            with opener.open(self.base + '/dashboard.php', urllib.parse.urlencode(form, doseq=True).encode()) as response:
                self.assertIn('bulk=success', response.url)
            self.assertEqual(int(self.sql(f"SELECT COUNT(*) AS total FROM documents WHERE original_name LIKE '{prefix}%' AND category='legislative'")[0]['total']), 2)
            with opener.open(self.base + '/delete_document.php', urllib.parse.urlencode({'csrf_token': token, 'id': rows[0]['id']}).encode()) as response:
                self.assertIn('bulk=success', response.url)
            with opener.open(self.base + '/dashboard.php', urllib.parse.urlencode({'csrf_token': token, 'bulk_action': 'delete', 'doc_ids[]': rows[1]['id']}).encode()) as response:
                self.assertIn('bulk=success', response.url)
            self.assertTrue(all(not path.exists() for path in paths))
        finally:
            remaining = self.sql(f"SELECT file_path FROM documents WHERE original_name LIKE '{prefix}%'")
            self.sql(f"DELETE FROM documents WHERE original_name LIKE '{prefix}%'")
            for path in set(paths + [ROOT / row['file_path'] for row in remaining]):
                self.assertTrue(path.resolve().is_relative_to((ROOT / 'uploads').resolve()))
                path.unlink(missing_ok=True)

    def test_dashboard_event_controls_are_paused_for_siklab(self):
        opener = self.login(); token = self.csrf(opener)
        previous = self.sql("SELECT setting_value FROM site_settings WHERE setting_key='event_photo'")
        png = subprocess.check_output(self.command + ['-r', '$i=imagecreatetruecolor(20,20);imagepng($i);'])
        stored = 'assets/img/siklab/wordmark.webp'
        digest = hashlib.sha256((ROOT / stored).read_bytes()).hexdigest()
        before = set((ROOT / 'uploads/events').glob('*'))
        self.sql("INSERT INTO site_settings(setting_key,setting_value) VALUES('event_photo','assets/img/siklab/wordmark.webp') ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)")
        try:
            with opener.open(self.base + '/dashboard.php') as response:
                body = response.read().decode('utf-8')
                self.assertIn('disabled aria-describedby="announcement-paused"', body)
                self.assertIn('Paused while the SIKLAB theme is active.', body)
            with self.assertRaises(urllib.error.HTTPError) as error:
                self.multipart(opener, {'csrf_token': token, 'upload_event_photo': '1'}, [('event_photo', 'fixture.png', 'image/png', png)])
            self.assertEqual(error.exception.code, 403)
            with self.assertRaises(urllib.error.HTTPError) as error:
                opener.open(self.base + '/dashboard.php', urllib.parse.urlencode({'csrf_token': token, 'remove_event_photo': '1'}).encode())
            self.assertEqual(error.exception.code, 403)
            self.assertEqual(self.sql("SELECT setting_value FROM site_settings WHERE setting_key='event_photo'")[0]['setting_value'], stored)
            self.assertEqual(hashlib.sha256((ROOT / stored).read_bytes()).hexdigest(), digest)
            self.assertEqual(set((ROOT / 'uploads/events').glob('*')), before)
        finally:
            self.sql("DELETE FROM site_settings WHERE setting_key='event_photo'")
            if previous:
                value = previous[0]['setting_value'].encode().hex()
                self.sql(f"INSERT INTO site_settings(setting_key,setting_value) VALUES('event_photo',CONVERT(0x{value} USING utf8mb4))")

    def test_dashboard_deleting_one_record_preserves_a_shared_upload(self):
        opener = self.login(); token = self.csrf(opener)
        name = 'shared-' + uuid.uuid4().hex
        file = ROOT / 'uploads/development' / os.environ['DB_NAME'] / (name + '.pdf')
        file.write_bytes((file.parent / 'treasurer.pdf').read_bytes())
        paths = [file.relative_to(ROOT).as_posix(), 'C:\\xampp\\htdocs\\sscwebsite\\' + str(file.relative_to(ROOT)).replace('/', '\\')]
        ids = []
        try:
            for stored in paths:
                value = stored.encode().hex()
                self.sql(f"INSERT INTO documents(title,original_name,category,file_path,uploaded_by,created_at) SELECT '{name}','{name}.pdf','treasurer',CONVERT(0x{value} USING utf8mb4),uploaded_by,NOW() FROM documents ORDER BY id LIMIT 1")
            ids = [row['id'] for row in self.sql(f"SELECT id FROM documents WHERE title='{name}' ORDER BY id")]
            for index, id in enumerate(ids):
                with opener.open(self.base + '/delete_document.php', urllib.parse.urlencode({'csrf_token': token, 'id': id}).encode()) as response:
                    self.assertIn('bulk=success', response.url)
                self.assertEqual(file.exists(), index == 0)
        finally:
            self.sql(f"DELETE FROM documents WHERE title='{name}'")
            file.unlink(missing_ok=True)
