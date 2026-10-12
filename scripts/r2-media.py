#!/usr/bin/env python3
"""Upload public site assets to the dedicated R2 bucket and verify every object.

Credentials stay in the local AWS profile, never in this repository.
Configure profile mktwrs-r2 with R2 Object Read & Write credentials scoped to
mktwrs-media, then run: python scripts/r2-media.py upload
Run verify before enabling the application's R2 redirect or excluding assets.
"""
import argparse
import concurrent.futures
import hashlib
import json
import mimetypes
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENDPOINT = 'https://a868d426e15ae36b220e95d03914113d.r2.cloudflarestorage.com'
BUCKET = 'mktwrs-media'
ORIGIN = 'https://media.mktwrs.com'

def aws(args):
    p = subprocess.run(['aws', '--profile', 'mktwrs-r2', '--region', 'auto',
                        '--endpoint-url', ENDPOINT, 's3api', *args],
                       capture_output=True, text=True)
    if p.returncode:
        raise RuntimeError(p.stderr.strip())
    return json.loads(p.stdout) if p.stdout.strip() else {}

def inventory():
    rows = []
    for path in sorted((ROOT / 'public/assets').rglob('*')):
        if not path.is_file():
            continue
        sha, md5 = hashlib.sha256(), hashlib.md5(usedforsecurity=False)
        with path.open('rb') as f:
            for chunk in iter(lambda: f.read(1024 * 1024), b''):
                sha.update(chunk)
                md5.update(chunk)
        rows.append({'key': path.relative_to(ROOT / 'public').as_posix(),
                     'bytes': path.stat().st_size, 'sha256': sha.hexdigest(),
                     'md5': md5.hexdigest()})
    return rows

def remote():
    return {r['Key']: r for r in aws(['list-objects-v2', '--bucket', BUCKET]).get('Contents', [])}

def same(row, obj):
    return obj is not None and obj['Size'] == row['bytes'] and obj['ETag'].strip('"') == row['md5']

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['inventory', 'upload', 'verify'])
    parser.add_argument('--workers', type=int, default=8)
    args = parser.parse_args()
    rows = inventory()
    snapshot = {'bucket': BUCKET, 'origin': ORIGIN, 'objects': rows,
                'objectCount': len(rows), 'bytes': sum(r['bytes'] for r in rows)}
    destination = ROOT / 'archive/r2-media-migration-inventory.json'
    destination.write_text(json.dumps(snapshot, indent=2) + '\n')
    print(f"Inventory: {len(rows)} objects, {snapshot['bytes']} bytes", flush=True)
    if args.action == 'inventory':
        return
    existing = remote()
    if args.action == 'upload':
        pending = [r for r in rows if not same(r, existing.get(r['key']))]
        def put(row):
            path = ROOT / 'public' / row['key']
            # Recheck against inventory so a changing local file cannot be certified.
            if path.stat().st_size != row['bytes'] or hashlib.sha256(path.read_bytes()).hexdigest() != row['sha256']:
                raise RuntimeError('Source changed during migration: ' + row['key'])
            aws(['put-object', '--bucket', BUCKET, '--key', row['key'], '--body', str(path),
                 '--content-type', mimetypes.guess_type(path.name)[0] or 'application/octet-stream',
                 '--cache-control', 'public, max-age=86400',
                 '--metadata', 'sha256=' + row['sha256']])
            return row['key']
        print(f'Uploading {len(pending)} objects; {len(rows)-len(pending)} already match', flush=True)
        with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
            for n, _ in enumerate(pool.map(put, pending), 1):
                if n % 100 == 0 or n == len(pending):
                    print(f'Uploaded {n}/{len(pending)}', flush=True)
        existing = remote()
    bad = [r['key'] for r in rows if not same(r, existing.get(r['key']))]
    report = {'bucket': BUCKET, 'origin': ORIGIN, 'verifiedObjects': len(rows)-len(bad),
              'expectedObjects': len(rows), 'verified': not bad, 'mismatchedOrMissing': bad,
              'basis': 'Single-part R2 ETag MD5 and Content-Length compared to local source inventory.'}
    (ROOT / 'archive/r2-media-migration-verification.json').write_text(json.dumps(report, indent=2)+'\n')
    print(json.dumps(report if bad else {k:v for k,v in report.items() if k!='mismatchedOrMissing'}))
    if bad:
        raise SystemExit(1)

if __name__ == '__main__':
    main()
