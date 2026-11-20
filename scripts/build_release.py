"""Build a runtime-only package without credentials or user uploads."""

from pathlib import Path
import shutil

ROOT_FILES = (
    '.htaccess', 'LICENSE', 'index.php', 'officers.php', 'documents.php',
    'dashboard.php', 'login.php', 'logout.php', 'attendance.php',
    'delete_document.php', 'generate_report.php', 'pdfviewer.php', 'view_pdf.php',
    'config/database.php', 'config/.htaccess',
)
RUNTIME_DIRS = ('assets', 'includes', 'auth', 'vendor')


def release_files(root):
    root = Path(root)
    files = [root / name for name in ROOT_FILES]
    for name in RUNTIME_DIRS:
        directory = root / name
        if not directory.is_dir() or directory.is_symlink():
            raise ValueError(f'Missing or invalid runtime directory: {name}')
        for path in directory.rglob('*'):
            if path.is_symlink():
                raise ValueError('Symlinks are not permitted in a release')
            if path.is_file():
                files.append(path)
    if not (root / 'vendor/autoload.php').is_file():
        raise ValueError('Run composer install before packaging')
    for path in files:
        if not path.is_file() or path.is_symlink():
            raise ValueError('Missing or invalid runtime file')
        relative = path.relative_to(root)
        if any((root / parent).is_symlink() for parent in relative.parents):
            raise ValueError('Symlinked parent in runtime tree')
        # Fail closed if a runtime directory contains a private/backup artifact.
        if (path.name.startswith('.env') or '.local.' in path.name
                or path.suffix.lower() in {'.sql', '.bak', '.backup', '.old', '.zip', '.7z', '.tar', '.gz'}):
            raise ValueError(f'Private or backup file in runtime tree: {relative}')
        if any(part in {'.git', 'node_modules', 'uploads', 'backups'} for part in relative.parts):
            raise ValueError('Private directory in runtime tree')
    return sorted(files)


def build_release(root):
    root = Path(root).resolve()
    files = release_files(root)
    output = root / 'build' / 'release'
    # Do not follow a build/output symlink when cleaning or writing the package.
    if (root / 'build').is_symlink() or output.is_symlink() or output.resolve() != output:
        raise ValueError('Invalid release output directory')
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)
    for path in files:
        destination = output / path.relative_to(root)
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(path, destination)
    return output, len(files)


if __name__ == '__main__':
    output, count = build_release(Path(__file__).resolve().parents[1])
    print(f'Prepared {count} runtime files in {output.relative_to(output.parents[1])}')
