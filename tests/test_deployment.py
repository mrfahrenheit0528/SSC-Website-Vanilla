"""No-network regression checks for packaging and production safeguards."""

import ftplib
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from build_release import ROOT_FILES, RUNTIME_DIRS, build_release
from deploy_ftps import settings, upload_release


class FakeFTP:
    def __init__(self):
        self.root = '/site/htdocs'
        self.current = self.root
        self.directories = {self.root, self.root + '/config'}
        self.files = {'.htaccess': b'# BEGIN InfinityFree Managed Code\nphp_value date.timezone Asia/Hong_Kong\n# END InfinityFree Managed Code\n',
                      'index.php': b'old', 'config/database.php': b'old',
                      'config/database.local.php': b'private-config',
                      'uploads/student-record.pdf': b'keep-upload',
                      'production-only.txt': b'keep-extra'}
        self.writes = []

    def cwd(self, path):
        if path not in self.directories:
            raise ftplib.error_perm('550 missing directory')
        self.current = path

    def pwd(self):
        return self.current

    def voidcmd(self, command):
        assert command == 'TYPE I'

    def size(self, path):
        if path not in self.files:
            raise ftplib.error_perm('550 missing file')
        return len(self.files[path])

    def mkd(self, path):
        self.writes.append(('mkdir', path))
        self.directories.add(path)

    def storbinary(self, command, source):
        assert self.current == self.root
        self.writes.append(('upload', command[5:]))
        self.files[command[5:]] = source.read()

    def retrbinary(self, command, callback):
        name = command[5:]
        if name not in self.files:
            raise ftplib.error_perm('550 missing file')
        callback(self.files[name])

    def rename(self, source, target):
        self.writes.append(('rename', target))
        self.files[target] = self.files.pop(source)


class DeploymentTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        for name in (*ROOT_FILES, 'vendor/autoload.php', 'assets/example.css', 'includes/head.php', 'auth/register.php'):
            file = self.root / name
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_text('runtime', encoding='utf-8')
        for name in RUNTIME_DIRS:
            (self.root / name).mkdir(exist_ok=True)
        self.env = {'FTP_SERVER': 'ftp.example.test', 'FTP_REMOTE_DIR': '/site/htdocs/',
                    'FTP_USERNAME': 'fixture-user', 'FTP_PASSWORD': 'fixture-password'}

    def test_package_excludes_private_and_development_files(self):
        for name in ('config/database.local.php', '.env', 'sscwebsite.sql',
                     'uploads/private.pdf', '.git/config', 'node_modules/example.js',
                     'README.md', 'scripts/private.txt', 'assets/reference/Reference.mp4'):
            file = self.root / name
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_text('do not publish', encoding='utf-8')
        release, _ = build_release(self.root)
        names = {path.relative_to(release).as_posix() for path in release.rglob('*') if path.is_file()}
        self.assertEqual(names, set(ROOT_FILES) | {'vendor/autoload.php', 'assets/example.css', 'includes/head.php', 'auth/register.php'})

    def test_nested_private_artifact_rejected(self):
        (self.root / 'assets/private.sql').write_text('secret', encoding='utf-8')
        with self.assertRaises(ValueError):
            build_release(self.root)

    def test_missing_vendor_rejected(self):
        (self.root / 'vendor/autoload.php').unlink()
        with self.assertRaises(ValueError):
            build_release(self.root)

    def test_preview_has_no_writes(self):
        release, _ = build_release(self.root)
        ftp = FakeFTP()
        before = dict(ftp.files)
        upload_release(ftp, release, ftp.root)
        self.assertEqual(ftp.writes, [])
        self.assertEqual(ftp.files, before)

    def test_apply_preserves_private_config_uploads_and_remote_only_files(self):
        release, _ = build_release(self.root)
        ftp = FakeFTP()
        upload_release(ftp, release, ftp.root, dry_run=False)
        self.assertEqual(ftp.files['config/database.local.php'], b'private-config')
        self.assertEqual(ftp.files['uploads/student-record.pdf'], b'keep-upload')
        self.assertEqual(ftp.files['production-only.txt'], b'keep-extra')
        self.assertEqual(ftp.files['index.php'], b'runtime')
        self.assertEqual(ftp.writes[-1], ('rename', '.htaccess'))
        self.assertFalse(any('.tmp' in name for name in ftp.files))

    def test_host_settings_preserved_and_rule_block_replaced_on_redeploy(self):
        release, _ = build_release(self.root)
        ftp = FakeFTP()
        original = ftp.files['.htaccess'].rstrip()
        upload_release(ftp, release, ftp.root, dry_run=False)
        first = ftp.files['.htaccess']
        self.assertTrue(first.startswith(original))
        self.assertEqual(first.count(b'# BEGIN SSC DEPLOYMENT RULES'), 1)
        upload_release(ftp, release, ftp.root, dry_run=False)
        self.assertEqual(ftp.files['.htaccess'], first)

    def test_unreadable_or_malformed_host_config_blocks_before_writes(self):
        release, _ = build_release(self.root)
        for contents in (None, b'', b'# BEGIN SSC DEPLOYMENT RULES\nunfinished'):
            ftp = FakeFTP()
            if contents is None:
                del ftp.files['.htaccess']
            else:
                ftp.files['.htaccess'] = contents
            with self.subTest(contents=contents), self.assertRaises((ValueError, ftplib.error_perm)):
                upload_release(ftp, release, ftp.root, dry_run=False)
            self.assertEqual(ftp.writes, [])

    def test_missing_remote_config_blocks_before_writes(self):
        release, _ = build_release(self.root)
        ftp = FakeFTP()
        del ftp.files['config/database.local.php']
        with self.assertRaises(ValueError):
            upload_release(ftp, release, ftp.root, dry_run=False)
        self.assertEqual(ftp.writes, [])

    def test_wrong_document_root_blocks_before_writes(self):
        release, _ = build_release(self.root)
        ftp = FakeFTP()
        with self.assertRaises(ftplib.error_perm):
            upload_release(ftp, release, '/wrong/htdocs', dry_run=False)
        self.assertEqual(ftp.writes, [])

    def test_rename_failure_never_deletes_original(self):
        release, _ = build_release(self.root)
        ftp = FakeFTP()
        def fail_rename(source, target):
            raise ftplib.error_perm('550 cannot replace')
        ftp.rename = fail_rename
        with self.assertRaises(ftplib.error_perm):
            upload_release(ftp, release, ftp.root, dry_run=False)
        self.assertEqual(ftp.files['index.php'], b'old')
        self.assertEqual(ftp.files['config/database.php'], b'old')

    def test_settings_default_to_preview(self):
        self.assertTrue(settings(self.env)['dry_run'])

    def test_apply_requires_backup_confirmation(self):
        self.env['DEPLOY_DRY_RUN'] = 'false'
        with self.assertRaises(ValueError):
            settings(self.env)
        self.env['BACKUPS_CONFIRMED'] = 'true'
        self.assertFalse(settings(self.env)['dry_run'])

    def test_invalid_roots_and_control_characters_rejected(self):
        for remote in ('/', '/htdocs/../htdocs', 'htdocs/', '/other', '/site/./htdocs', '/site\\htdocs'):
            with self.subTest(remote=remote), self.assertRaises(ValueError):
                settings({**self.env, 'FTP_REMOTE_DIR': remote})
        with self.assertRaises(ValueError):
            settings({**self.env, 'FTP_USERNAME': 'user\r\ncommand'})

    def test_missing_settings_rejected(self):
        with self.assertRaises(ValueError):
            settings({})


if __name__ == '__main__':
    unittest.main()
