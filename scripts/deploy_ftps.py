"""Upload an allowlisted release with verified TLS; never mirror-delete files."""

import ftplib
import os
from pathlib import Path, PurePosixPath
import re
import ssl
import sys
import uuid

from build_release import release_files


def settings(environ):
    names = ('FTP_SERVER', 'FTP_REMOTE_DIR', 'FTP_USERNAME', 'FTP_PASSWORD')
    if any(not environ.get(name) for name in names):
        raise ValueError('Set FTP_SERVER/FTP_REMOTE_DIR variables and FTP_USERNAME/FTP_PASSWORD secrets in production')
    values = {name: environ[name] for name in names}
    if any(any(char in value for char in '\r\n\0') for value in values.values()):
        raise ValueError('Invalid control characters in FTP settings')
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9.-]*', values['FTP_SERVER']):
        raise ValueError('FTP_SERVER must be a hostname, without a protocol or port')
    remote = values['FTP_REMOTE_DIR']
    if (not remote.startswith('/') or '\\' in remote
            or any(part in {'.', '..'} for part in remote.split('/'))
            or PurePosixPath(remote).name != 'htdocs'):
        raise ValueError('FTP_REMOTE_DIR must be the verified absolute website directory ending in /htdocs/')
    values['FTP_REMOTE_DIR'] = remote.rstrip('/')
    if environ.get('DEPLOY_DRY_RUN', 'true') not in {'true', 'false'}:
        raise ValueError('DEPLOY_DRY_RUN must be true or false')
    values['dry_run'] = environ.get('DEPLOY_DRY_RUN', 'true') == 'true'
    if not values['dry_run'] and environ.get('BACKUPS_CONFIRMED') != 'true':
        raise ValueError('A verified private production backup is required before uploads')
    return values


def preflight(ftp, remote):
    ftp.cwd(remote)
    if ftp.pwd().rstrip('/') != remote:
        raise ValueError('FTP directory does not match the configured document root')
    ftp.voidcmd('TYPE I')
    for name in ('index.php', 'config/database.php', 'config/database.local.php'):
        try:
            size = ftp.size(name)
        except ftplib.error_perm:
            size = None
        if not size:
            raise ValueError(f'Remote preflight failed: {name} is missing or empty; no files uploaded')


def upload_release(ftp, root, remote, dry_run=True):
    root = Path(root)
    files = release_files(root)
    # Dependencies first, entry points next, bootstrap/access rules last.
    def priority(path):
        relative = path.relative_to(root).as_posix()
        if relative == '.htaccess':
            return (3, relative)
        if relative.startswith('config/'):
            return (2, relative)
        return (1 if len(path.relative_to(root).parts) == 1 else 0, relative)
    files.sort(key=priority)
    preflight(ftp, remote)
    if dry_run:
        print(f'Read-only preview passed: {len(files)} files would be uploaded; no hosting files changed.')
        return
    known_directories = {''}
    upload_id = uuid.uuid4().hex
    for path in files:
        relative = path.relative_to(root).as_posix()
        parent = PurePosixPath(relative).parent
        current = ''
        for part in (() if str(parent) == '.' else parent.parts):
            current = f'{current}/{part}'.lstrip('/')
            if current not in known_directories:
                absolute = f'{remote}/{current}'
                try:
                    ftp.cwd(absolute)
                except ftplib.error_perm:
                    ftp.mkd(absolute)
                known_directories.add(current)
        ftp.cwd(remote)
        temporary = f'{relative}.deploy-{upload_id}.tmp'
        with path.open('rb') as source:
            ftp.storbinary(f'STOR {temporary}', source)
        # Never delete the original to work around a failed replacement.
        ftp.rename(temporary, relative)
    print(f'Uploaded {len(files)} files. Uploads/private config preserved; no remote deletes or database migrations run.')
    print('Verify public pages, existing PDFs, login, reports and access restrictions in a browser.')


def main():
    try:
        config = settings(os.environ)
        root = Path(__file__).resolve().parents[1] / 'build' / 'release'
        with ftplib.FTP_TLS(context=ssl.create_default_context(), timeout=60) as ftp:
            ftp.connect(config['FTP_SERVER'], 21)
            ftp.login(config['FTP_USERNAME'], config['FTP_PASSWORD'])
            ftp.prot_p()
            upload_release(ftp, root, config['FTP_REMOTE_DIR'], config['dry_run'])
    except ValueError as error:
        print(str(error), file=sys.stderr)
        return 1
    except Exception as error:
        # Avoid echoing FTP responses, credentials or remote file contents.
        print(f'FTPS deployment failed ({type(error).__name__}). Check connection, certificate, permissions and rename support.', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
