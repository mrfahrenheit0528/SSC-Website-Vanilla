"""Cache and validate the existing public roster photos; never modify roster data."""

from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import argparse
import hashlib
import json
import subprocess
import urllib.request
from urllib.parse import unquote, urlsplit

from dev import php_command

ROOT = Path(__file__).resolve().parents[1]


def prepare(refresh=False):
    command = php_command()
    result = subprocess.run(command + ['-r', 'echo json_encode(require $argv[1]);',
                             str(ROOT / 'includes/officer-rosters.php')],
                            capture_output=True, text=True, check=True)
    rosters = json.loads(result.stdout)
    sources = sorted({officer['image'] for roster in rosters.values() for officer in roster if officer.get('image')})
    cache = ROOT / 'build/officer-portraits'
    cache.mkdir(parents=True, exist_ok=True)

    def download(url):
        key = hashlib.sha256(url.encode()).hexdigest()[:20]
        if not urlsplit(url).scheme:
            local = (ROOT / unquote(url)).resolve()
            supplied = (ROOT / 'assets/static').resolve()
            source = str(local) if local.is_relative_to(supplied) and local.is_file() else None
            return {'url': url, 'key': key, 'source': source}
        target = cache / (key + '.source')
        if target.is_file() and not refresh:
            return {'url': url, 'key': key, 'source': str(target)}
        try:
            request = urllib.request.Request(url, headers={'User-Agent': 'SSC-Website-Portrait-Preparation/1.0'})
            with urllib.request.urlopen(request, timeout=20) as response:
                data = response.read(12 * 1024 * 1024 + 1)
                if not response.headers.get_content_type().startswith('image/') or len(data) > 12 * 1024 * 1024:
                    raise ValueError('Not a supported portrait image')
            target.write_bytes(data)
            return {'url': url, 'key': key, 'source': str(target)}
        except Exception:
            return {'url': url, 'key': key, 'source': None}

    with ThreadPoolExecutor(max_workers=6) as pool:
        downloads = list(pool.map(download, sources))
    manifest = cache / 'downloads.json'
    manifest.write_text(json.dumps(downloads), encoding='utf-8')
    subprocess.run(command + [str(ROOT / 'scripts/encode-officer-portraits.php'), str(manifest)], check=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--refresh', action='store_true', help='Refresh cached upstream images')
    prepare(parser.parse_args().refresh)
