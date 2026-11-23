"""Publish only the verified Home tally URL change; retain its Git recovery copy."""

import argparse
import ftplib
import io
import os
from pathlib import Path
import ssl
import subprocess
import sys
import uuid

from deploy_ftps import connection_settings, preflight

TEMPLATE = 'includes/home-siklab.php'
RECOVERY_COMMIT = '453ba3fafff8bf7b0259b84a07be2519da3a890b'
OLD_LINK = b'href="tally.php"'
NEW_LINK = b'href="https://www.siklab2026.app"'
MAX_TEMPLATE_BYTES = 128 * 1024


def read_template(ftp, path):
    result = bytearray()
    def receive(chunk):
        result.extend(chunk)
        if len(result) > MAX_TEMPLATE_BYTES:
            raise ValueError('Unexpected template size; publication stopped')
    ftp.retrbinary('RETR ' + path, receive)
    return bytes(result)


def publish(ftp, remote, original, replacement, apply=False):
    if (not original or len(original) > MAX_TEMPLATE_BYTES
            or original.count(OLD_LINK) != 1
            or original.replace(OLD_LINK, NEW_LINK, 1) != replacement):
        raise ValueError('Only the single approved tally URL replacement can be published')
    preflight(ftp, remote)
    current = read_template(ftp, TEMPLATE)
    if current == replacement:
        print('Official tally URL is already published; no file changed.')
        return
    if current != original:
        raise ValueError('Live template differs from the committed recovery copy; no file changed')
    print('Live template matches Git recovery copy ' + RECOVERY_COMMIT + '.')
    if not apply:
        print('Read-only tally-link preview passed; no file changed.')
        return
    temporary = TEMPLATE + '.tally-' + uuid.uuid4().hex + '.tmp'
    ftp.storbinary('STOR ' + temporary, io.BytesIO(replacement))
    if read_template(ftp, temporary) != replacement:
        raise ValueError('Temporary upload did not verify; original template preserved')
    # Refuse to overwrite an edit that arrived while the temporary file uploaded.
    if read_template(ftp, TEMPLATE) != original:
        raise ValueError('Live template changed during upload; original not replaced')
    ftp.rename(temporary, TEMPLATE)
    if read_template(ftp, TEMPLATE) != replacement:
        raise ValueError('Published template did not verify; inspect hosting before retrying')
    print('Published and read back the single Home tally-link update.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--publish', action='store_true', help='Apply the verified one-file change')
    args = parser.parse_args()
    try:
        root = Path(__file__).resolve().parents[1]
        original = subprocess.check_output(['git', 'show', RECOVERY_COMMIT + ':' + TEMPLATE], cwd=root)
        replacement = (root / TEMPLATE).read_bytes()
        config = connection_settings(os.environ)
        with ftplib.FTP_TLS(context=ssl.create_default_context(), timeout=60) as ftp:
            ftp.connect(config['FTP_SERVER'], 21)
            ftp.login(config['FTP_USERNAME'], config['FTP_PASSWORD'])
            ftp.prot_p()
            publish(ftp, config['FTP_REMOTE_DIR'], original, replacement, args.publish)
    except ValueError as error:
        print(str(error), file=sys.stderr)
        return 1
    except Exception as error:
        print('Tally-link publication failed (' + type(error).__name__ + '); inspect the job and hosting state.', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
