"""Windows VS Code launcher with a dedicated local database and synthetic data."""

import argparse
import ctypes
import hashlib
import json
import os
from pathlib import Path
import secrets
import shutil
import socket
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
PRIVATE = Path(os.environ.get('LOCALAPPDATA', str(Path.home() / '.local/share'))) / 'SSCWebsiteDev' / hashlib.sha256(str(ROOT).encode()).hexdigest()[:12]
STATE = PRIVATE / 'state.json'
HIDDEN = subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0


def environment():
    env = dict(os.environ)
    for key in ('DB_SERVER', 'DB_USERNAME', 'DB_PASSWORD', 'DB_NAME', 'DB_PORT'):
        env.pop(key, None)
    env['SSC_LOCAL_DEV'] = '1'
    return env


def php_command():
    binary = shutil.which('php')
    if not binary:
        raise RuntimeError('Install PHP 8.3+ and add it to PATH.')
    modules = subprocess.check_output([binary, '-m'], text=True).splitlines()
    args = [binary]
    for extension in ('mysqli', 'gd'):
        if extension not in modules:
            args += ['-d', f'extension={extension}']
    check = subprocess.run(args + ['-r', 'exit(extension_loaded("mysqli") && extension_loaded("gd") ? 0 : 1);'], capture_output=True)
    if check.returncode:
        raise RuntimeError('PHP needs the mysqli and GD extension binaries.')
    return args + ['-d', 'date.timezone=Asia/Taipei']


def load_state(create=False):
    PRIVATE.mkdir(parents=True, exist_ok=True)
    if not STATE.exists():
        if not create:
            raise RuntimeError('Run python scripts/dev.py setup first.')
        mysql_bin = Path(os.environ.get('SSC_MYSQL_BIN', r'C:\xampp\mysql\bin'))
        for name in ('mysql.exe', 'mysqld.exe', 'mysql_install_db.exe', 'mysqladmin.exe'):
            if not (mysql_bin / name).is_file():
                raise RuntimeError('Set SSC_MYSQL_BIN to your MariaDB Windows bin directory.')
        state = {'mysql_bin': str(mysql_bin), 'port': 33079, 'root_password': secrets.token_hex(24),
                 'app_password': secrets.token_hex(24), 'admin_password': secrets.token_urlsafe(18),
                 'member_password': secrets.token_urlsafe(18)}
        STATE.write_text(json.dumps(state, indent=2), encoding='utf-8')
    state = json.loads(STATE.read_text(encoding='utf-8'))
    client = PRIVATE / 'client-private.ini'
    client.write_text(f'[client]\nuser=root\npassword={state["root_password"]}\nhost=127.0.0.1\nport={state["port"]}\n', encoding='utf-8')
    return state


def mysql(state, sql):
    with (PRIVATE / 'database-private.log').open('ab') as log:
        result = subprocess.run([str(Path(state['mysql_bin']) / 'mysql.exe'),
            f'--defaults-file={PRIVATE / "client-private.ini"}', '--batch', '--skip-column-names'],
            input=sql.encode(), stdout=subprocess.PIPE, stderr=log, creationflags=HIDDEN, timeout=30)
    if result.returncode:
        raise RuntimeError('Dedicated local database did not accept the operation; private diagnostics retained.')
    return result.stdout.decode().strip()


def start_database(state):
    probe = socket.socket()
    try:
        probe.bind(('127.0.0.1', state['port']))
    except OSError:
        # Never initialize, stop or reconfigure another database using this port.
        mysql(state, 'SELECT 1;')
        return
    finally:
        probe.close()
    data = PRIVATE / 'data'
    binary = Path(state['mysql_bin'])
    with (PRIVATE / 'database-private.log').open('ab') as log:
        if not data.exists():
            initialized = subprocess.run([str(binary / 'mysql_install_db.exe'), f'--datadir={data}',
                f'--port={state["port"]}', f'--password={state["root_password"]}', '--silent'],
                stdout=log, stderr=log, creationflags=HIDDEN, timeout=60)
            if initialized.returncode:
                raise RuntimeError('Local database initialization failed; existing files preserved.')
        process = subprocess.Popen([str(binary / 'mysqld.exe'), f'--defaults-file={data / "my.ini"}',
            f'--basedir={binary.parent}', f'--datadir={data}', f'--port={state["port"]}',
            '--bind-address=127.0.0.1', '--skip-log-bin', f'--secure-file-priv={PRIVATE}',
            f'--log-error={PRIVATE / "server-private.log"}', f'--pid-file={PRIVATE / "database.pid"}'],
            stdout=log, stderr=log, creationflags=HIDDEN)
        for _ in range(40):
            if process.poll() is not None:
                break
            try:
                mysql(state, 'SELECT 1;')
                return
            except RuntimeError:
                time.sleep(0.25)
    raise RuntimeError('Local database did not start; private diagnostics retained.')


def stop_database(state):
    # mysqladmin can return while InnoDB is still closing files. Hold a handle to
    # this authenticated instance so an immediate restart cannot race shutdown.
    pid_file = Path(mysql(state, 'SELECT @@pid_file;')).resolve()
    if not pid_file.is_relative_to(PRIVATE.resolve()):
        raise RuntimeError('The listening instance is not this workspace\'s database; refusing shutdown.')
    pid = int(pid_file.read_text().strip())
    kernel = ctypes.WinDLL('kernel32', use_last_error=True)
    kernel.OpenProcess.argtypes = [ctypes.c_ulong, ctypes.c_int, ctypes.c_ulong]
    kernel.OpenProcess.restype = ctypes.c_void_p
    kernel.WaitForSingleObject.argtypes = [ctypes.c_void_p, ctypes.c_ulong]
    kernel.WaitForSingleObject.restype = ctypes.c_ulong
    kernel.CloseHandle.argtypes = [ctypes.c_void_p]
    handle = kernel.OpenProcess(0x00100000, False, pid)  # SYNCHRONIZE only
    if not handle:
        raise RuntimeError('Could not observe the local database process; shutdown cancelled.')
    try:
        subprocess.run([str(Path(state['mysql_bin']) / 'mysqladmin.exe'),
            f'--defaults-file={PRIVATE / "client-private.ini"}', 'shutdown'], check=True,
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, creationflags=HIDDEN)
        if kernel.WaitForSingleObject(handle, 30000) != 0:
            raise RuntimeError('Database shutdown is still in progress; wait before restarting.')
    finally:
        kernel.CloseHandle(handle)
    print('Dedicated development database stopped. Port 3306 unchanged.')


def php(state, action, seed=False):
    return subprocess.run(php_command() + [str(ROOT / 'scripts/database.php'), action],
        input=json.dumps(state) if seed else None, text=True, cwd=ROOT, env=environment(), check=True)


def setup(state):
    php_args = php_command()
    composer = shutil.which('composer')
    phar = Path(composer).with_suffix('.phar') if composer else None
    if not phar or not phar.is_file():
        raise RuntimeError('Install Composer; composer.phar should be beside its launcher on PATH.')
    subprocess.run(php_args + [str(phar), 'install', '--no-dev', '--prefer-dist', '--no-interaction', '--no-scripts', '--no-progress'], cwd=ROOT, env=environment(), check=True)
    start_database(state)
    password = state['app_password']
    mysql(state, f"CREATE DATABASE IF NOT EXISTS ssc_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n"
          + ''.join(f"CREATE USER IF NOT EXISTS 'ssc_dev'@'{host}' IDENTIFIED BY '{password}';\nGRANT ALL ON ssc_dev.* TO 'ssc_dev'@'{host}';\n" for host in ('localhost', '127.0.0.1')))
    config = ROOT / 'config/database.local.php'
    if config.exists() and '# Generated by scripts/dev.py' not in config.read_text(encoding='utf-8-sig'):
        previous = PRIVATE / 'previous-database.local.php'
        if not previous.exists():
            shutil.copyfile(config, previous)
    config.write_text("<?php\n// Generated by scripts/dev.py; local development only.\nreturn [\n"
        + f"    'server' => '127.0.0.1',\n    'username' => 'ssc_dev',\n    'password' => '{password}',\n"
        + f"    'name' => 'ssc_dev',\n    'port' => {state['port']},\n];\n", encoding='utf-8')
    credentials = {'admin_email': 'admin@example.test', 'admin_password': state['admin_password'],
                   'member_email': 'member@example.test', 'member_password': state['member_password']}
    (ROOT / 'config/dev.local.json').write_text(json.dumps(credentials, indent=2), encoding='utf-8')
    php(state, 'migrate')
    php(state, 'seed', seed=True)
    print('Local setup ready. Login details: config/dev.local.json (ignored).')
    print('Start the site: python scripts/dev.py serve')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['setup', 'serve', 'start-db', 'stop-db', 'stop-web', 'migrate', 'seed', 'status', 'doctor', 'test'])
    args = parser.parse_args()
    if args.command == 'doctor':
        subprocess.run(php_command() + ['--version'], check=True)
        print('Project PHP flags enable mysqli/GD without changing global php.ini.')
        return
    state = load_state(create=args.command == 'setup')
    if args.command == 'setup':
        setup(state)
    elif args.command == 'stop-web':
        (PRIVATE / 'stop-website').touch()
        print('Requested shutdown of this workspace\'s local PHP launcher.')
    elif args.command == 'stop-db':
        stop_database(state)
    else:
        start_database(state)
        if args.command == 'test':
            database = 'ssc_test_' + secrets.token_hex(6)
            password = state['app_password']
            mysql(state, f'CREATE DATABASE `{database}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;'
                  + ''.join(f"GRANT ALL ON `{database}`.* TO 'ssc_dev'@'{host}';" for host in ('localhost', '127.0.0.1')))
            env = environment()
            env.update({'SSC_INTEGRATION': '1', 'DB_SERVER': '127.0.0.1', 'DB_PORT': str(state['port']),
                        'DB_USERNAME': 'ssc_dev', 'DB_PASSWORD': password, 'DB_NAME': database})
            try:
                subprocess.run([sys.executable, '-m', 'unittest', 'discover', '-s', 'tests', '-v'],
                    cwd=ROOT, env=env, check=True)
            finally:
                mysql(state, f'DROP DATABASE `{database}`;'
                      + ''.join(f"REVOKE ALL ON `{database}`.* FROM 'ssc_dev'@'{host}';" for host in ('localhost', '127.0.0.1')))
                fixture = ROOT / 'uploads' / 'development' / database
                if fixture.exists():
                    if fixture.resolve() != ROOT / 'uploads' / 'development' / database:
                        raise RuntimeError('Invalid temporary fixture path; cleanup stopped.')
                    shutil.rmtree(fixture)
        elif args.command == 'serve':
            sessions = PRIVATE / 'sessions'
            sessions.mkdir(exist_ok=True)
            print('Serving http://127.0.0.1:8000/; Ctrl+C stops PHP. Database persists until stop-db.', flush=True)
            stop = PRIVATE / 'stop-website'
            stop.unlink(missing_ok=True)
            process = subprocess.Popen(php_command() + ['-d', f'session.save_path={sessions}',
                '-S', '127.0.0.1:8000', str(ROOT / 'scripts/dev-router.php')], cwd=ROOT, env=environment())
            try:
                while process.poll() is None and not stop.exists():
                    time.sleep(0.25)
                if process.poll() not in (None, 0):
                    raise RuntimeError('The local PHP server stopped with an error; check the terminal output.')
            finally:
                if process.poll() is None:
                    process.terminate()
                    process.wait(timeout=10)
                stop.unlink(missing_ok=True)
        elif args.command in {'migrate', 'seed', 'status'}:
            php(state, args.command, seed=args.command == 'seed')
        else:
            print('Dedicated development database ready on 127.0.0.1:' + str(state['port']))


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        pass
    except (RuntimeError, subprocess.SubprocessError, OSError) as error:
        print(str(error) if isinstance(error, RuntimeError) else 'Local launcher failed; check your private runtime logs.', file=sys.stderr)
        sys.exit(1)
