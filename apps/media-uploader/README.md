# Media Uploader

Node.js command-line tool for analysing media folders and publishing videos, subtitles, and pictures to Mux, S3, and the backend API.

## Setup

Requires Node.js 18+ and FFmpeg. Install dependencies once from the repository root:

```bash
npm install
```

Credentials and endpoints are read from a config file. Copy `config.example.ini` to `config.ini` and fill it in, or use one of the JSON examples in [`examples/`](examples/README.md).

## Running

From `apps/media-uploader`:

```bash
node src/index.js <command> [options]
node src/index.js --help             # list all commands
node src/index.js <command> --help   # options for one command
```

From the repository root: `npm run media-uploader -- <command> [options]`.

## Commands

| Command (alias) | Purpose |
| --- | --- |
| `analyze` (`media-analyzer`) | Analyse and associate video, subtitle, and image files in a folder |
| `mux-upload` (`upload-video`) | Upload video files to Mux |
| `mux-subtitle-upload` (`upload-subtitles`) | Upload subtitle files to existing Mux assets via S3 |
| `picture-upload` (`upload-picture`) | Upload pictures to S3 and create backend records |
| `optimize-picture` | Create large and small WebP variants of pictures |
| `one-media-complete-upload` (`complete-upload`) | Full workflow for one media folder: analyse, upload, register |
| `cli-multi-upload` (`multi-upload`) | Run the complete workflow on several sub-folders in parallel |
| `excel-batch-update` (`batch-excel`) | Update a field in the Excel description files of many sub-folders |
| `propagate-season-data` (`propagate`) | Copy missing season data to all its episodes |
| `diagnostic <subcommand>` (`diagnose`) | Check MediaDescriptions: `verify`, `verify-season`, `verify-batch` (and `-ini` variants that read a config file) |

Examples:

```bash
node src/index.js analyze /path/to/media --output results.json
node src/index.js complete-upload --config config.ini --folder /path/to/media
node src/index.js multi-upload --config config.ini --parent-folder /path/to/season
node src/index.js diagnostic verify-season-ini --config config.ini --season-id <uuid>
```

More upload options: [`examples/CLI-USAGE.md`](examples/CLI-USAGE.md). Config schema: [`examples/CONFIG-REFERENCE.md`](examples/CONFIG-REFERENCE.md).

## Optional web interface

`src/subtools/service-server` (task API) and `src/subtools/service-interface` (web UI) queue and monitor the same CLI workflows:

```bash
npm run model:setup     # install the interface dependencies
npm run model:install   # initialise the task database
npm run model:start     # start server and interface
```

See [`service-server/README.md`](src/subtools/service-server/README.md).

## Tests

```bash
npm run test --workspace=media-uploader
```
