#!/usr/bin/env bash
# Downloads every original photo of the DW 14 archive (~48 GB). Run with no
# arguments for help. Needs curl, jq, and sha256sum (Linux) or shasum (macOS).
set -euo pipefail

FLAG=--download-near-fifty-gigabyte-from-public-url
FILES_JSON=${FILES_JSON:-https://photo.dw14.alisaqaq.moe/files.json}
ATTEMPTS=3

usage() {
  cat <<EOF
Downloads every original photo of the DW 14 archive (~48 GB) into
<output dir>/<set>/<file name>, checking each file against its SHA-256 in
files.json.

usage: $0 $FLAG [<output dir>] [--jobs N]

  $FLAG
              required: confirms you want to download ~48 GB
  <output dir>  where to save the photos (default: dw14-photos)
  --jobs N      parallel downloads (default: 4)

Rerun the same command to resume: finished files are skipped, and files cut
off mid-download continue where they stopped.
EOF
}

out=dw14-photos
jobs=4
consent=false
while (($#)); do
  case $1 in
    "$FLAG") consent=true ;;
    --jobs)
      [[ ${2-} =~ ^[1-9][0-9]*$ ]] || { echo "--jobs needs a number ≥ 1" >&2; exit 1; }
      jobs=$2
      shift
      ;;
    -h | --help) usage; exit 0 ;;
    -*) echo "Unknown option: $1" >&2; usage >&2; exit 1 ;;
    *) out=$1 ;;
  esac
  shift
done
if ! $consent; then
  usage
  exit 0
fi

for tool in curl jq; do
  command -v "$tool" >/dev/null || { echo "Needs $tool" >&2; exit 1; }
done

sha256() {
  if command -v sha256sum >/dev/null; then
    sha256sum "$1" | cut -d ' ' -f 1
  else
    shasum -a 256 "$1" | cut -d ' ' -f 1
  fi
}

# Downloads into <dest>.part, continuing whatever an earlier run left there,
# and moves it into place only once the hash matches
fetch() {
  local url=$1 size=$2 sha=$3 dest=$4
  local part=$dest.part attempt
  if [[ -f $dest && $(sha256 "$dest") == "$sha" ]]; then
    return 0
  fi
  mkdir -p "$(dirname "$dest")"
  for ((attempt = 1; attempt <= ATTEMPTS; attempt++)); do
    # -C - asks the server for the rest of the file only
    if [[ -f $part && $(wc -c <"$part") -ge $size ]] ||
      curl -fsSL -C - -o "$part" "$url"; then
      break
    fi
    sleep $((2 * attempt))
  done
  if [[ -f $part && $(sha256 "$part") == "$sha" ]]; then
    mv "$part" "$dest"
    echo "ok    $dest"
  else
    # A complete but wrong file can't be continued: start over next time
    if [[ -f $part && $(wc -c <"$part") -ge $size ]]; then rm -f "$part"; fi
    echo "FAIL  $dest ($url)" >&2
    return 1
  fi
}
export -f sha256 fetch
export ATTEMPTS

echo "Downloading the file list from $FILES_JSON"
list=$(curl -fsSL "$FILES_JSON")
echo "$(jq -r '"\(.count) files, \(.size / 1e9 | floor) GB"' <<<"$list") into $out/"

# url, size, sha256 and destination per file, NUL-separated so any output
# directory name works
if jq -j --arg out "$out" \
  '.files[] | "\(.url)\u0000\(.size)\u0000\(.sha256)\u0000\($out)/\(.set)/\(.name)\u0000"' \
  <<<"$list" | xargs -0 -n 4 -P "$jobs" bash -c 'fetch "$@"' _; then
  echo "Done: every file is downloaded and checked."
else
  echo "Some files failed (listed above). Rerun to retry them." >&2
  exit 1
fi
