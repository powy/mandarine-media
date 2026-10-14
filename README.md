# Mandarine Media

An archived media platform built for **Kyool**, an OTT (over-the-top) streaming project centred on DRM-protected video. This monorepo contains the web application, mobile development work, backend API, catalogue backoffice, media publishing tools, and infrastructure configuration.

The project reached a usable web beta in December 2025: users could register, browse the catalogue, and watch protected media. It was abandoned at that point. The code is now preserved for learning, portfolio presentation, and technical discussion.

## Project history

The project entered its planning and technical exploration phase in January 2025, covering proof-of-concept work, technology choices, discussions with AWS, and architecture design. The initial target was to deliver an essential web platform for OTT video and webtoons by the end of March 2025. The available budget was far below what that scope and schedule required, leading to a pivot towards a mobile application with a much longer development period while investment was sought.

By July 2025, the company behind the project could no longer sustain even its previous platform without additional investment. Mux credits made a lower-cost replacement possible, giving the project another route towards launch.

In August 2025, the deadline tightened again: a working version was needed in September. Development pivoted back to the web application to meet that target.

By September, the core display functionality needed to make the web application usable was in place, although many details remained unfinished. Much of the remaining effort went into the operational side of the platform: managing the catalogue through the backoffice and preparing, uploading, and publishing its media.

The beta was complete in December 2025, with registration, catalogue browsing, and protected playback available to users. The project was then abandoned, and the AWS and Mux accounts were subsequently closed.

## What was built

- **Public web application:** user registration and authentication, catalogue browsing, media pages, and Mux playback with signed playback and DRM tokens.
- **Catalogue backoffice:** administration of programmes, seasons, media descriptions, videos, images, and catalogue presentation.
- **Backend API:** authentication, catalogue and media management, database access, and integration with storage and video services.
- **Media publishing tools:** video analysis and processing, Mux uploads, subtitle and image uploads, batch workflows, and upload reporting.
- **Shared frontend package:** TypeScript models, API clients, authentication helpers, and reusable data-fetching hooks.
- **Mobile development:** React Native applications retained from the earlier mobile direction. Their presence does not imply a completed mobile release.
- **Infrastructure:** AWS deployment material and a later Terraform reconstruction preserving as much of the former service organisation as possible.

OTT video became the main delivery focus. Webtoons were part of the original scope; that initial plan should not be read as a claim that every planned feature was completed.

## Engineering context

This project was developed under severe deadline pressure with very limited developer time. Repeated changes in direction also left earlier approaches, experiments, and partially integrated work in the repository.

The result reached a usable beta, but the code is uneven. Some areas have reusable abstractions and automated tests; others contain duplication, temporary workarounds, debug code, or incomplete cleanup. It is preserved as a record of what was delivered under those constraints, rather than as a polished reference implementation.

The repository is useful for discussing the whole delivery chain: from catalogue modelling and administration to media ingestion, protected playback, and cloud deployment. It also provides concrete material for discussing the trade-offs made under pressure and how those choices could be improved with more time.

## Repository map

```text
apps/
  web/                 Public React web application
  backoffice/          Catalogue administration application
  alpha/               React Native mobile development
  mobile/              Alternative React Native implementation
  media-uploader/      Media processing and publishing tools
packages/
  share/               Shared types, API clients, and hooks
backend/               FastAPI application, models, migrations, and tests
infrastructure/
  terraform/           Reconstruction of the former AWS infrastructure
documents/             API and implementation documentation
tests/                 Additional test material
```

## Technical overview

| Area | Main technologies |
| --- | --- |
| Web | React, TypeScript, Vite, React Router, Mux Player |
| Backoffice | React Admin, React, TypeScript, Vite |
| Frontend state | TanStack Query for server data; React Context and hooks for application and local state |
| Mobile | React Native, TypeScript, React Navigation |
| Backend | Python, FastAPI, Pydantic, SQLAlchemy, Alembic |
| Database | PostgreSQL for deployment; SQLite used in parts of local development and testing |
| Media services | Mux for video processing and protected playback; AWS S3 for file storage |
| Publishing tools | Node.js, FFmpeg, Mux and AWS SDKs, spreadsheet-based workflows |
| Infrastructure | AWS, Terraform, and retained deployment scripts |

## Exploring or running the code

Start with the component relevant to your interests. This is an archive, and there is no working hosted instance or guaranteed one-command setup.

- [Backend implementation notes](backend/README.md)
- [Media uploader CLI](apps/media-uploader/README.md)
- [Terraform architecture and reconstruction choices](infrastructure/terraform/ARCHITECTURE.md)
- [Terraform validation and deployment instructions](infrastructure/terraform/SETUP.md)

These documents retain development-era assumptions and should be read alongside the current code. The root package declares Node.js 18+ and npm 8+; Python dependencies are listed in [backend/requirements.txt](backend/requirements.txt). React Native development additionally requires the relevant native platform toolchain, and media processing uses FFmpeg.

Running the platform again would require fresh configuration, a database, replacement service accounts, signing keys, and media assets. Historical URLs and identifiers still appear in code and sample data; they do not provide access to the former services.

The Terraform configuration creates new, empty infrastructure. It preserves architectural organisation, not the former database contents, uploaded files, or Mux assets.

## Testing and current limitations

The repository contains several kinds of automated tests:

- **Backend:** pytest, pytest-asyncio, and HTTPX for API and integration tests.
- **Shared frontend and backoffice:** Vitest and Testing Library.
- **Mobile:** Jest and React Native Testing Library.
- **Media tools:** Jest, Supertest, Nock, and dedicated orchestration regression checks.
- **API smoke checks:** a shell script using `curl` in [test-e2e.sh](test-e2e.sh). Despite its name, it is not a browser-based end-to-end suite.

Test coverage is partial, and some tests depend on configuration or services that are no longer available. A declared test command is not a guarantee that its suite passes in the archived environment.

Known limitations include:

- The backend migration graph has two Alembic heads; the old `alembic upgrade head` instructions require review before database setup.
- Web and backoffice both default to port 3001, so running them together requires a port override.
- The root `test:e2e` command references a missing script.
- Some mobile sample JSON is invalid and requires cleanup.
- Dependencies are dated and include reported security vulnerabilities. They need review before any new deployment or use with untrusted input.
- Earlier implementations, backup files, and development diagnostics remain in the tree.

## Contributors

- **[Thierry Durand](https://github.com/powy)** — Principal developer: backend, frontend, infrastructure, and media management tools.
- **[Damien Corneau](https://github.com/corneadoug)** — Frontend developer: design and frontend development.

## Project name and reuse

**Mandarine Media** is the name of this archive repository. **Kyool** was the intended name of the original platform and remains in historical code, configuration, and documentation.

The contributors do not own the Kyool name, and its trademark status has not been established here. Do not reuse it as a commercial product name without independently confirming the necessary rights.

The sample media, artwork, and third-party dependencies have their own ownership and licensing considerations. Their inclusion in this archive does not grant permission to redistribute or use them commercially.
