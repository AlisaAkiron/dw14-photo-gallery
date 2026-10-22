#!/usr/bin/env python3
"""Downloads every original photo of the DW 14 archive (~48 GB).

Files go to <output dir>/<set>/<file name>, each checked against its SHA-256
in files.json. Rerun the same command to resume: finished files are skipped,
and files cut off mid-download continue where they stopped.

Python 3.9 or newer, standard library only.
"""

import argparse
import hashlib
import json
import os
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

FLAG = "--download-near-fifty-gigabyte-from-public-url"
FILES_JSON = os.environ.get(
    "FILES_JSON", "https://photo.dw14.alisaqaq.moe/files.json"
)
HEADERS = {"User-Agent": "dw14-archive-download"}
ATTEMPTS = 3
CHUNK = 1 << 20


def get(url, headers=None):
    request = urllib.request.Request(url, headers={**HEADERS, **(headers or {})})
    return urllib.request.urlopen(request, timeout=60)


def sha256_of(path):
    digest = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(CHUNK):
            digest.update(chunk)
    return digest.hexdigest()


def download(entry, part):
    """Fills <part> up to the file's size, continuing what is already there"""
    have = os.path.getsize(part) if os.path.exists(part) else 0
    if have >= entry["size"]:
        return
    with get(entry["url"], {"Range": f"bytes={have}-"} if have else None) as r:
        # 206: the server sent only the rest; 200: it sent the whole file
        mode = "ab" if have and r.status == 206 else "wb"
        with open(part, mode) as f:
            while chunk := r.read(CHUNK):
                f.write(chunk)


def fetch(entry, out):
    """Downloads one file through <dest>.part, moved in only if it checks out"""
    dest = os.path.join(out, entry["set"], entry["name"])
    if os.path.isfile(dest) and sha256_of(dest) == entry["sha256"]:
        return "kept"
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    part = dest + ".part"
    for attempt in range(1, ATTEMPTS + 1):
        try:
            download(entry, part)
            break
        except Exception as error:
            # The partial file stays, so the next attempt or run continues it
            if attempt == ATTEMPTS:
                raise RuntimeError(f"{entry['url']}: {error}") from error
            time.sleep(2 * attempt)
    if sha256_of(part) != entry["sha256"]:
        # A complete but wrong file can't be continued: start over next time
        os.remove(part)
        raise RuntimeError(f"{entry['url']}: SHA-256 mismatch")
    os.replace(part, dest)
    return "downloaded"


def main():
    parser = argparse.ArgumentParser(
        description=__doc__.split("\n\n")[0],
        epilog=__doc__.split("\n\n")[1],
    )
    parser.add_argument(
        FLAG,
        dest="consent",
        action="store_true",
        help="required: confirms you want to download ~48 GB",
    )
    parser.add_argument(
        "out", nargs="?", default="dw14-photos", help="default: dw14-photos"
    )
    parser.add_argument(
        "--jobs", type=int, default=4, help="parallel downloads (default: 4)"
    )
    args = parser.parse_args()
    if not args.consent:
        parser.print_help()
        return
    if args.jobs < 1:
        parser.error("--jobs must be at least 1")

    print(f"Downloading the file list from {FILES_JSON}")
    with get(FILES_JSON) as response:
        listing = json.load(response)
    files = listing["files"]
    print(f"{len(files)} files, {listing['size'] // 10**9} GB into {args.out}/")

    # A live counter on a terminal; one line per 100 files in a log
    live = sys.stdout.isatty()
    newline = "\n" if live else ""  # ends the counter's line first
    counts = {"kept": 0, "downloaded": 0, "failed": 0}
    with ThreadPoolExecutor(args.jobs) as pool:
        jobs = [pool.submit(fetch, entry, args.out) for entry in files]
        for done, job in enumerate(as_completed(jobs), 1):
            try:
                counts[job.result()] += 1
            except Exception as error:
                counts["failed"] += 1
                print(f"{newline}FAIL  {error}", flush=True)
            if live:
                print(f"\r{done}/{len(files)}", end="", flush=True)
            elif done % 100 == 0 or done == len(files):
                print(f"{done}/{len(files)}", flush=True)

    print(
        f"{newline}{counts['kept']} already there, "
        f"{counts['downloaded']} downloaded, {counts['failed']} failed"
    )
    if counts["failed"]:
        print("Rerun to retry the failed files.")
        sys.exit(1)


if __name__ == "__main__":
    main()
