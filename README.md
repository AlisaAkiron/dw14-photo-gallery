# dw14-photo-gallery

Photo archive for **Doll Weekend 14** (Aug 21–23, 2026, Huizhou): all 3,058
photos from the event's live album, browsable by day, hour, set and
photographer, in English, 简体中文, 繁體中文 and 日本語.

Built with TanStack Start on Cloudflare Workers. Photos are served from
Cloudflare R2.

## Develop

```sh
pnpm install
pnpm images   # once: renders thumbnails into .images/ from archive/
pnpm dev
```

`archive/` is the source photo archive (~48 GB, not in git): 8 set folders
plus `photo_info.json`. In dev, `.images/` stands in for the R2 bucket, so
the whole site works locally, downloads included.

Without the archive, rebuild it from the published originals:

```sh
pnpm restore <dir>   # copy originals from <dir> (e.g. a copy of the bucket's original/)
pnpm restore --download-near-fifty-gigabyte-from-public-url   # or download them all (~48 GB)
```

Every file is checked against its SHA-256 in `public/files.json`, and a rerun
resumes where it stopped. The folders and `photo_info.json` come from
`data/photo_info.json`.

| Script                    | Does                                           |
| ------------------------- | ---------------------------------------------- |
| `pnpm dev`                | dev server                                     |
| `pnpm build` / `preview`  | production build and type-check / serve it     |
| `pnpm run deploy`         | build and deploy the Worker                    |
| `pnpm lint` / `format`    | oxlint / oxfmt                                 |
| `pnpm images [--limit N]` | render thumbnails and viewer images            |
| `pnpm gen:data`           | rebuild `src/data/album.json` from the archive |
| `pnpm gen:files`          | rebuild `public/files.json` from the archive   |
| `pnpm restore`            | rebuild `archive/` from the originals          |

The image and data scripts read `archive/` by default; pass another
directory as the first argument to use a different copy.

## How it fits together

- **Images**: `pnpm images` writes `.images/` in the bucket's exact layout:
  `thumb/<id>.webp` (640 px), `view/<id>.webp` (2048 px) and
  `original/<name>.jpg` (symlinks into `archive/`). Browsers load all of it
  straight from the bucket's domain; the Worker never handles a photo.
- **Times** are always shown in China time (UTC+8), as the event ran.

## Photo data

| File                      | In git | Written by    | What it is                                                                                                                      |
| ------------------------- | ------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `archive/photo_info.json` | no     | —             | The source: every photo's folder, set, photographer, shoot time and camera. All scripts start here.                             |
| `data/photo_info.json`    | yes    | `gen:data`    | Exact copy of the above, so `pnpm restore` can rebuild `archive/`.                                                              |
| `src/data/album.json`     | yes    | `gen:data`    | What the site uses: photos, sets and photographers, slimmed down. Bundled for SSR; the browser fetches it once (~70 KB gzip).   |
| `public/files.json`       | yes    | `gen:files`   | Served at `/files.json`: every original's URL, size and SHA-256, for download managers. `pnpm restore` checks files against it. |
| `.images/files.json`      | no     | `gen:files`   | Identical copy, uploaded by hand to the bucket root so the bucket describes itself.                                             |
| `.images/meta.json`       | no     | `pnpm images` | Each photo's dominant colour, which `gen:data` puts into `album.json` as the grid placeholder. Not uploaded.                    |
| `.images/hashes.json`     | no     | `gen:files`   | SHA-256 cache by file size and mtime, so reruns only read changed files. Not uploaded.                                          |

```
archive/photo_info.json ──gen:data──▶ src/data/album.json
        │   .images/meta.json ──┘ └─▶ data/photo_info.json
        └───────────gen:files──▶ public/files.json = .images/files.json

data/photo_info.json + public/files.json ──restore──▶ archive/
```

After changing the archive, run `gen:data`, then `gen:files`, and commit the
three tracked files together — `gen:files` refuses to run if `album.json`
no longer matches the archive.

## License

The code is [MIT](LICENSE). The photos are not covered by it: they belong to
their photographers, and the DW wordmark and favicon to Doll Weekend.
