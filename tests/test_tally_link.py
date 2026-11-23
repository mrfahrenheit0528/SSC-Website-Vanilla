"""A single-file publisher must reject unrelated edits and preserve originals on failure."""
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from publish_tally_link import publish, TEMPLATE, OLD_LINK, NEW_LINK

ORIGINAL = b'<main><a ' + OLD_LINK + b'>Official tally board</a></main>'
UPDATED = ORIGINAL.replace(OLD_LINK, NEW_LINK)
REMOTE = '/cspcssc.ct.ws/htdocs'


class FTP:
    def __init__(self, content=ORIGINAL, corrupt=False, concurrent=False, rename_failure=False):
        self.files = {TEMPLATE: content}
        self.writes = []
        self.renames = []
        self.corrupt = corrupt
        self.concurrent = concurrent
        self.rename_failure = rename_failure
    def cwd(self, path): self.directory = path
    def pwd(self): return self.directory
    def voidcmd(self, command): return '200'
    def size(self, path): return 20
    def retrbinary(self, command, receive): receive(self.files[command.removeprefix('RETR ')])
    def storbinary(self, command, source):
        path = command.removeprefix('STOR ')
        self.files[path] = b'partial' if self.corrupt else source.read()
        self.writes.append(path)
        if self.concurrent: self.files[TEMPLATE] = b'concurrent edit'
    def rename(self, source, target):
        if self.rename_failure: raise OSError('rename rejected')
        self.renames.append((source, target))
        self.files[target] = self.files.pop(source)


class TallyLinkTests(unittest.TestCase):
    def test_preview_verifies_recovery_copy_without_writing(self):
        ftp = FTP()
        publish(ftp, REMOTE, ORIGINAL, UPDATED)
        self.assertEqual(ftp.files, {TEMPLATE: ORIGINAL})
        self.assertFalse(ftp.writes or ftp.renames)

    def test_publish_changes_only_fixed_template_and_verifies_result(self):
        ftp = FTP()
        publish(ftp, REMOTE, ORIGINAL, UPDATED, True)
        self.assertEqual(ftp.files, {TEMPLATE: UPDATED})
        self.assertEqual(len(ftp.writes), 1)
        self.assertTrue(ftp.writes[0].startswith(TEMPLATE + '.tally-'))
        self.assertEqual(ftp.renames, [(ftp.writes[0], TEMPLATE)])

    def test_already_published_is_a_noop(self):
        ftp = FTP(UPDATED)
        publish(ftp, REMOTE, ORIGINAL, UPDATED, True)
        self.assertFalse(ftp.writes or ftp.renames)

    def test_unexpected_remote_edits_are_not_overwritten(self):
        ftp = FTP(b'hosting-only edit')
        with self.assertRaisesRegex(ValueError, 'recovery copy'):
            publish(ftp, REMOTE, ORIGINAL, UPDATED, True)
        self.assertEqual(ftp.files[TEMPLATE], b'hosting-only edit')
        self.assertFalse(ftp.writes or ftp.renames)

    def test_additional_local_changes_are_rejected(self):
        ftp = FTP()
        with self.assertRaisesRegex(ValueError, 'single approved'):
            publish(ftp, REMOTE, ORIGINAL, UPDATED + b'unrelated edit', True)
        self.assertFalse(ftp.writes or ftp.renames)

    def test_corrupt_upload_keeps_original(self):
        ftp = FTP(corrupt=True)
        with self.assertRaisesRegex(ValueError, 'Temporary upload'):
            publish(ftp, REMOTE, ORIGINAL, UPDATED, True)
        self.assertEqual(ftp.files[TEMPLATE], ORIGINAL)
        self.assertFalse(ftp.renames)

    def test_edit_during_upload_is_preserved(self):
        ftp = FTP(concurrent=True)
        with self.assertRaisesRegex(ValueError, 'changed during upload'):
            publish(ftp, REMOTE, ORIGINAL, UPDATED, True)
        self.assertEqual(ftp.files[TEMPLATE], b'concurrent edit')
        self.assertFalse(ftp.renames)

    def test_rename_failure_keeps_original(self):
        ftp = FTP(rename_failure=True)
        with self.assertRaises(OSError):
            publish(ftp, REMOTE, ORIGINAL, UPDATED, True)
        self.assertEqual(ftp.files[TEMPLATE], ORIGINAL)
        self.assertFalse(ftp.renames)


if __name__ == '__main__':
    unittest.main()
