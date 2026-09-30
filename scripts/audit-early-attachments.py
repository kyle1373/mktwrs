"""Compare captured has:image results with actual attachment capture and visual review."""
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
raw = root / 'archive/raw'
messages = {}

def assets(message):
    return [image['src'] for image in message.get('images', [])
            if '/attachments/' in image.get('src', '') or image.get('alt') == 'Image'] + [
        link['href'] for link in message.get('links', []) if '/attachments/' in link.get('href', '')]

for path in sorted(raw.glob('early-tt-*.json')):
    capture = json.loads(path.read_text())
    for page in capture.get('pages', [capture]):
        for message in page.get('messages', []):
            mid = message['id'].split('-')[-1]
            if mid not in messages or len(assets(message)) > len(assets(messages[mid])):
                messages[mid] = message

contexts = {}
for path in sorted(raw.glob('early-context-*.json')):
    for message in json.loads(path.read_text()).get('messages', []):
        mid = message['id'].split('-')[-1]
        if mid not in contexts or len(assets(message)) > len(assets(contexts[mid])):
            contexts[mid] = message

reviews = json.loads((root / 'archive/early-visual-review.json').read_text())
reviewed_messages = {r['messageId'] for r in reviews.values() if r.get('reviewStatus') == 'visually-reviewed'}
gaps = []
for mid, message in sorted(messages.items()):
    if assets(message):
        continue
    gaps.append({
        'messageId': mid,
        'submittedAt': message.get('datetime'),
        'contextCaptured': mid in contexts,
        'attachmentRecoveredInContext': bool(assets(contexts.get(mid, {}))),
        'hasVisuallyReviewedImage': mid in reviewed_messages,
    })
result = {
    'query': 'in:tt-discussion has:image before:2021-08-13 after:2019-10-01',
    'distinctCapturedMessages': len(messages),
    'originalResultsWithoutCapturedImage': len(gaps),
    'gapMessagesWithRecoveredAttachment': sum(r['attachmentRecoveredInContext'] for r in gaps),
    'gapMessagesWithVisuallyReviewedImage': sum(r['hasVisuallyReviewedImage'] for r in gaps),
    'status': 'in-progress',
    'note': 'Matching the search result count does not establish image coverage. Some missing images are external embeds. Context capture alone does not mean an image has been viewed or a run verified.',
    'gaps': gaps,
}
(root / 'archive/early-attachment-audit.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({k: v for k, v in result.items() if k != 'gaps'}, indent=2))
