"""Merge reviewed original Mario Bros. Tour evidence without inventing dates."""
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]

def read(path):
    return json.loads((ROOT / path).read_text())

def save(path, value):
    (ROOT / path).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")

report = read("archive/mario-bros-2020-reconciliation.json")
runs = report["confirmedChanges"]
assets = read("archive/assets-manifest.json")
for run in runs:
    if not run.get("proofImage"):
        continue
    attachment = run["proofImage"].split("/attachments/")[1].split("/")[1]
    original = ROOT / f"archive/early-submission-images/{attachment}.png"
    image = Image.open(original).convert("RGB")
    if run["time"] == "1:00.16":
        attributed = Image.open(ROOT / "public/assets/proof/kamek-2021-881513268219371540.webp").convert("RGB")
        assert image.size == attributed.size
        assert ImageChops.difference(image, attributed).getbbox() is None
    target = ROOT / f"public/assets/proof/mario-bros-2020-{attachment}.webp"
    image.save(target, "WEBP", lossless=True)
    assets[run["proofImage"]] = {
        "path": "/" + str(target.relative_to(ROOT / "public")),
        "sha256": hashlib.sha256(target.read_bytes()).hexdigest(),
        "bytes": target.stat().st_size,
        "contentType": "image/webp",
    }

ids = {run["messageId"] for run in runs}
save("archive/curated-runs.json", [r for r in read("archive/curated-runs.json") if r.get("messageId") not in ids] + runs)
save("archive/assets-manifest.json", assets)
print(f"Merged {len(runs)} reviewed records; coverage remains incomplete.")
