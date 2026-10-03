#!/usr/bin/env python3
"""Preserve public Wayback originals and merge their review queue by post ID.

This retrieves public archived pages only. Retrieval is not visual review and
an exhausted index is not proof of complete player or Discord coverage.
Requires beautifulsoup4, used by the existing archive research environment.
"""
import argparse
import datetime
import hashlib
import json
import pathlib
import re
import urllib.request

from bs4 import BeautifulSoup


def save(path, value):
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")
    temporary.replace(path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--index", required=True)
    parser.add_argument("--ledger", required=True)
    parser.add_argument("--directory", required=True)
    parser.add_argument("--limit", type=int, default=20)
    parser.add_argument("--after", default="00000000", help="Capture date YYYYMMDD")
    parser.add_argument("--before", default="99999999", help="Capture date YYYYMMDD")
    parser.add_argument("--retry-failed", action="store_true")
    parser.add_argument("--related-ledger", action="append", default=[],
                        help="Existing review ledger whose retrieved IDs should also be skipped; repeatable")
    args = parser.parse_args()
    if args.limit < 1:
        parser.error("--limit must be positive")
    index = json.loads(pathlib.Path(args.index).read_text())
    if isinstance(index, dict):
        index = index.get("rows", index.get("response", []))
    ledger_path = pathlib.Path(args.ledger)
    ledger = json.loads(ledger_path.read_text()) if ledger_path.exists() else {"pages": []}
    pages = {str(p["id"]): p for p in ledger.get("pages", [])}
    related_retrieved = set()
    for related_path in args.related_ledger:
        related = json.loads(pathlib.Path(related_path).read_text())
        for entry in related.get("pages", []):
            if entry.get("posts"):
                related_retrieved.add(str(entry.get("id")))
    directory = pathlib.Path(args.directory)
    directory.mkdir(parents=True, exist_ok=True)
    attempted = 0
    for row in index:
        if len(row) < 2 or not str(row[0]).isdigit():
            continue
        timestamp, url = row[:2]
        match = re.search(r"/status/(\d+)", url)
        if not match or not args.after <= timestamp[:8] <= args.before:
            continue
        post_id = match[1]
        if post_id in related_retrieved:
            continue
        previous = pages.get(post_id)
        if previous and ("posts" in previous or not args.retry_failed):
            continue
        if attempted >= args.limit:
            break
        attempted += 1
        archive_url = f"https://web.archive.org/web/{timestamp}id_/{url}"
        entry = dict(previous or {})
        entry.update(id=post_id, archiveUrl=archive_url)
        attempt = {"at": datetime.datetime.now(datetime.timezone.utc).isoformat(), "url": archive_url}
        try:
            data = urllib.request.urlopen(archive_url, timeout=15).read()
            soup = BeautifulSoup(data, "html.parser")
            posts = []
            for tweet in soup.select("[data-tweet-id]"):
                text = tweet.select_one(".tweet-text")
                clock = tweet.select_one("[data-time-ms]")
                if text is None:
                    continue
                posts.append({
                    "id": tweet.get("data-tweet-id"),
                    "author": tweet.get("data-screen-name"),
                    "text": text.get_text(" ", strip=True),
                    "postedAt": datetime.datetime.fromtimestamp(
                        int(clock["data-time-ms"]) / 1000, datetime.timezone.utc
                    ).isoformat() if clock else None,
                    "images": [i.get("src") for i in tweet.select(".AdaptiveMedia-photoContainer img")],
                    "links": [a.get("data-expanded-url") or a.get("href") for a in text.select("a[href]")],
                })
            if not posts:
                raise ValueError("No original tweet text extracted; retrieval remains pending")
            file = directory / (post_id + ".html")
            file.write_bytes(data)
            entry.update(file=str(file), sha256=hashlib.sha256(data).hexdigest(), posts=posts,
                         retrievalStatus="retrieved", textReviewStatus="pending", mediaReviewStatus="pending")
            entry.pop("error", None)
            attempt["status"] = "retrieved"
            print(post_id, [(p["id"], p["text"][:450]) for p in posts], flush=True)
        except Exception as error:
            entry.update(error=str(error), retrievalStatus="pending")
            attempt.update(status="failed", error=str(error))
            print(post_id, "pending", str(error), flush=True)
        entry.setdefault("attempts", []).append(attempt)
        pages[post_id] = entry
        ledger.update(complete=False, scope="Public indexed originals only; does not establish full account or server coverage.",
                      pages=list(pages.values()), retrievedPages=sum("posts" in p for p in pages.values()),
                      pendingPages=sum("posts" not in p for p in pages.values()))
        save(ledger_path, ledger)
    print("Attempts:", attempted, "Retrieved:", sum("posts" in p for p in pages.values()),
          "Pending:", sum("posts" not in p for p in pages.values()), flush=True)


if __name__ == "__main__":
    main()
