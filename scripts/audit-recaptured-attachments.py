"""Compare fresh Discord DOM captures with the original image index.

This does not mark a channel complete: it only reports attachments exposed by
the supplied, overlapping windows. Existing image-review indices stay stable.
"""
import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('pattern', help='Glob under archive/raw')
parser.add_argument('--output', required=True, help='Private report path relative to repo')
args = parser.parse_args()
output = ROOT / args.output
previous = {}
if output.exists():
    previous = {(r['messageId'], r['attachmentId']): r for r in json.loads(output.read_text()).get('missingFromOriginalIndex', [])}
index = json.loads((ROOT / 'archive/submission-image-map.json').read_text())
known = {r['attachmentId'] for r in index['images']}
messages, windows, recovered = {}, [], {}
for path in sorted((ROOT / 'archive/raw').glob(args.pattern)):
    rows = json.loads(path.read_text())['data']['messages']
    if not rows:
        continue
    windows.append({'capture': str(path.relative_to(ROOT)), 'first': rows[0]['id'], 'last': rows[-1]['id'], 'messages': len(rows)})
    for row in rows:
        messages[row['id']] = row
        for link in row.get('links', []):
            match = re.search(r'/attachments/(\d+)/(\d+)/', link['href'])
            if not match or match[2] in known:
                continue
            key = (row['id'], match[2])
            recovered[key] = {**previous.get(key, {'reviewStatus': 'needs-visual-review'}), 'messageId': row['id'], 'attachmentId': match[2], 'url': link['href'], 'text': row['text'], 'publishedAt': datetime.fromtimestamp(((int(row['id']) >> 22) + 1420070400000) / 1000, timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z'), 'capture': str(path.relative_to(ROOT))}
report = {'caution': 'Fresh captures exposed attachments absent from the old index. A blank old links array is not evidence of an attachment-free message. This report measures only these windows; it cannot establish complete channel coverage.', 'windows': windows, 'uniqueMessagesRecaptured': len(messages), 'missingFromOriginalIndex': sorted(recovered.values(), key=lambda r: (int(r['messageId']), int(r['attachmentId'])))}
(ROOT / args.output).write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'windows': len(windows), 'messages': len(messages), 'missingAttachments': len(recovered)}))
