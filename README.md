# CSPC Supreme Student Council website

Vanilla PHP/MySQL website with a public document library, officer directory,
PDF viewing and QR sharing, and a council management dashboard.

Live website: https://cspcssc.ct.ws/

## Configuration

Connection values are not part of the committed PHP bootstrap. Copy the example
and enter the database settings for the environment you intend to use:

```powershell
Copy-Item config/database.example.php config/database.local.php
```

Do not overwrite an existing private config. `config/database.local.php` returns
an array with `server`, `username`, `password`, `name`, and optional `port`
(default 3306). It is ignored by Git. Local setup replaces this workstation's
old production connection with a dedicated development connection, preserving
the previous private config outside the repository. Do not use production as
a development database.

Alternatively, configure `DB_SERVER`, `DB_USERNAME`, `DB_PASSWORD`, and `DB_NAME`
and optional `DB_PORT` environment variables. Each supplied variable overrides the corresponding local
file value. An explicitly empty password is supported; the other values must be
nonempty. The application does not load `.env` files automatically.

Missing or invalid settings, a missing mysqli extension, or a failed connection
produce a generic HTTP 503 response without exposing connection details.

## Local development

The Windows launcher uses Python 3.10+, PHP 8.3+, Composer, and the MariaDB binaries
already installed with XAMPP. The default binary directory is
`C:\xampp\mysql\bin`; set `SSC_MYSQL_BIN` if yours differs. PHP and Composer must
be on PATH, with `composer.phar` beside the Composer launcher. PHP extension
binaries for mysqli and GD must be installed. The helper enables them with
process-specific flags and leaves the global `php.ini` unchanged.

From the repository root in VS Code's terminal:

```powershell
python scripts/dev.py setup
python scripts/dev.py serve
```

Open **http://127.0.0.1:8000/**. Alternatively, use **Terminal → Run Task** and
choose **SSC: Set up local environment** or **SSC: Start local website**.
Login credentials are in ignored `config/dev.local.json`. The fixture accounts
are `admin@example.test` and `member@example.test`, with generated passwords.
The member account currently inherits the existing application's overly broad
dashboard access; role enforcement is scheduled for phase 3. Use the synthetic
administrator when testing management workflows in this phase.

Setup installs locked PHP dependencies and creates a dedicated, password-protected
MariaDB instance on **127.0.0.1:33079**, with an `ssc_dev` schema and a restricted
database user. It does not use or change the existing service on port 3306.
Private server files, logs, root credentials, and the previous connection config
live under `%LOCALAPPDATA%\SSCWebsiteDev\<workspace-id>`. No OS service is installed.
The three seeded PDFs are in ignored `uploads/development/ssc_dev/`. No production
accounts, sessions, or database records are imported into development.

Useful commands:

```powershell
python scripts/dev.py doctor    # Check project PHP extensions
python scripts/dev.py status    # Start DB if necessary and show table counts
python scripts/dev.py migrate   # Apply unapplied versioned migrations
python scripts/dev.py seed      # Add missing synthetic fixtures without resetting data
python scripts/dev.py test      # Run tests against a separate disposable database
python scripts/dev.py stop-web  # Stop this workspace's PHP launcher
python scripts/dev.py stop-db   # Stop only the dedicated development instance
```

Ctrl+C stops the PHP server; the database stays available until `stop-db`.
Repeating setup preserves the generated passwords, existing development records,
and migration history. An occupied database port with incompatible credentials
fails safely instead of reinitializing or stopping an unrelated instance.

The helper's PHP router blocks private/configuration/development files because
PHP's built-in server does not enforce `.htaccess`. Always use the launcher for
previewing this checkout, bound to localhost. VS Code tasks do not publish or
deploy the site.

On other operating systems, provision a loopback-only MySQL/MariaDB database named
`ssc_dev`, configure the ignored local file (or DB_* variables), enable the required
PHP extensions, run `php scripts/database.php migrate`, then seed through the CLI
using generated passwords on standard input. The Windows/XAMPP lifecycle helper
is not a cross-platform database installer.

Versioned migrations live in `database/migrations/`, with checksums recorded in
`_schema_migrations`. The initial migration creates only the application's tables;
the next adds `documents.display_name` to older schemas without recreating tables.
Keep applied migrations unchanged and add a new version for subsequent changes.
The upload query now supplies the schema's required `title` column explicitly.
Web requests never run DDL. The migration/seed CLI refuses remote hosts and database
names outside `ssc_dev`/`ssc_test_*`, and these scripts are not in the deploy package.
Production schema changes will need a separately reviewed hosting procedure.

CI uses an ephemeral MariaDB 11.4 service to exercise migrations, synthetic seed
data, public pages, login, PDFs, reports, uploads, and private-path restrictions.
Local integration tests create and drop only a generated `ssc_test_*` database;
they do not reset your persistent development database.

## Frontend dependencies

Flowbite's vendored CSS and JavaScript in `assets/` are used by existing pages.
The SIKLAB hero uses an optimized MP4 loop with a WebP poster, with no 3D
renderer or frontend build step. The unused Three.js code, bundle, and build dependencies are removed.
Tailwind, PDF.js, fonts, and the existing council logo still use their CDNs.

### SIKLAB homepage

Open `http://127.0.0.1:8000/`. SIKLAB stays active until the owner requests a
theme change. The December 5 cutoff is removed; there is no automatic expiry.
`includes/theme.php` sets the active theme. There is no visitor theme picker;
old theme query parameters and preference cookies cannot override it.
The Regular redesign is deferred until after SIKLAB.
The Officers directory, Documents library and About page are also overhauled; the other secondary pages retain their existing layouts.

The current homepage uses a lighter SIKLAB design with four sections:

- A centered, full-width video hero for **SIKLAB: CSPC Intramurals 2026**, dated
  **November 23-28, 2026**. The official tally-board button opens `tally.php`, which
  displays "The official tally board is underway" until the real board is ready.
  The seven college logos sit inside the opening, with names provided only as alt text.
- Three redesigned document cards (Treasurer, Legislative, Secretary), using live
  database counts and the existing library filters. Mouse hover reveals a card;
  click/tap and keyboard activation work too. Escape returns to its front. Hover
  does not move focus. Hidden faces are inert; without JavaScript both faces and
  document links remain available.
- A desktop officer sequence that moves horizontally as the visitor scrolls down.
  Native sticky positioning and normal page scrolling drive it; wheel and touch
  events are not intercepted. Previous/Next controls, direct officer anchors and
  keyboard focus reveal the corresponding panel. The heading, cards and controls
  share one viewport-height sticky stage beneath the fixed navigation, so the
  Executive Officers heading stays visible throughout the horizontal sequence.
  Frame-based easing softens wheel/trackpad motion; 1.35 vertical pixels move the
  rail one horizontal pixel. Keyboard focus and direct anchors remain immediate.
  Mobile, reduced motion and
  short/zoomed layouts use vertical profiles. `includes/executive-officers.php`
  derives the eight current executives from the shared AY 2026-2027 roster in
  the supplied directory's order.
- The existing council footer, quick links, social links and contact information.

Home uses ordinary page scrolling throughout; there are no automatic section or
card stops. The horizontal executive rail retains its eased visual movement and
Previous/Next controls, but never adjusts the page position after a scroll
settles. The former snapping controller, markers and related CSS are removed.
Navigation width, link weight and translucent styling match the other SSC pages.
The document/officer section headings use their compact, blue-bordered panel
style and shared content width. The event video and SIKLAB wordmark remain.

`about.php` retains About This Platform and the original developer profiles.
`assets/css/home.css` styles Home and the tally placeholder; `assets/js/home.js`
handles cards, video playback, reveals and the optional uploaded-announcement
modal. `assets/js/officer-scroll.mjs` handles the officer sequence. The former
photo-parallax modules and photo assets are retained as earlier design work but
are no longer loaded by the homepage. The Regular template remains archived for
its later redesign.

The owner's original `assets/static/1122(1).mp4` is preserved locally. The runtime
copy is `assets/video/siklab-2026-loop.mp4`: H.264, 1280 x 720, 24 fps, no audio,
fast-start metadata, approximately 5.85 MB, reduced from the 26.98 MB source.
The video loops muted with inline playback. A pause/play button is available;
playback pauses offscreen and in hidden tabs. Reduced-motion and data-saving
preferences default to the WebP poster, with manual play still available.
Blocked autoplay or video errors leave the poster and event information visible.

Recreate the web video and poster from the untouched source with FFmpeg:

```powershell
ffmpeg -i "assets/static/1122(1).mp4" -vf "scale=1280:-2,fps=24" -c:v libx264 -preset medium -crf 28 -maxrate 2200k -bufsize 4400k -pix_fmt yuv420p -an -movflags +faststart assets/video/siklab-2026-loop.mp4
ffmpeg -ss 1 -i "assets/static/1122(1).mp4" -frames:v 1 -vf "scale=1280:-2" -quality 85 -update 1 assets/img/siklab/event-video-poster.webp
```

Original SIKLAB PNGs remain in `assets/static/`; prepared WebP images are in
`assets/img/siklab/`. The earlier photo source is verified against
`docs/campus-photo-source.json`. `scripts/prepare-visual-assets.php` still reproduces
those artwork assets. The GLB remains available but is not loaded by the homepage.
Local references in `assets/reference/` and original video masters in
`assets/static/` are excluded from release packages; optimized `assets/video/`
files are included. `tally.php` is included in both the local router and release.

Run `python scripts/dev.py test` for disposable-database integration checks,
public pages/media and release safeguards. Run `node --test tests/*.test.mjs`
for card hover/focus/Escape, video preferences/playback, officer scroll bounds,
keyboard navigation and responsive/reduced-motion resets. The retained photo
module tests also continue to run. Visual desktop/mobile browser QA remains
pending because the browser connection is unavailable.

### Officers directory

`officers.php` uses the owner's original `assets/static/BACKGROUND (1).png`
as a stationary viewport background, with separate vertical sections for council offices,
college/campus representatives and committees. Assistants appear in the same
section as their corresponding office. Ordinary document flow is used on all
screens; this page does not load the homepage's horizontal rail.

The original 52 AY 2024-2025 profiles and 51 AY 2025-2026 profiles are preserved
in `includes/officer-rosters.php`. AY 2026-2027 now includes 53 officers: 49 from
the supplied directory and four from the supplemental note, grouped into 19
offices. The 46 supplied portraits are encoded for web delivery; seven entries
without a matched photo use silhouettes. Contact details for the four supplemental
entries remain blank because none were provided. The owner's confirmed birthday
correction and Acbang portrait assignment are recorded in
`docs/officers-2026-source.json` alongside source provenance.
Current-year hometowns use barangay, town/city and province only; house numbers,
zones, streets and smaller locality details are omitted. Missing hometowns keep
their placeholders.
`includes/council-offices.php` defines office groups. Year links use `?year=2024`,
`?year=2025` or `?year=2026`; the default is now 2026-2027.

With JavaScript enabled, academic-year tabs fetch and replace the roster in place
without reloading the page. Visited rosters are cached for the current page session;
search and office navigation apply to the newly selected roster. The URL and browser
Back/Forward history track the selected year and search. Tabs support arrow keys,
Home/End and Space; ordinary links and server-side search remain available without
JavaScript. Failed requests preserve the displayed roster and offer a retry.
`includes/current-academic-year.php` supplies the shared current year for the
directory, homepage executives and footer. Older roster records remain intact.
Search by name, role or office works live through `assets/js/officers.js` and
also through `?q=...` without JavaScript. Nonmatching offices, cards and jump
options are hidden together. The Jump to an office control uses ordinary page
anchors. Styling is scoped to `assets/css/officers.css` and the Officers page.
The supplied `assets/static/SSC LOGO.png` replaces the event wordmark. Academic
years, search and the office selector share one desktop row and wrap on smaller
screens. The overall results count is removed. Multi-officer cards share a
measured content height across offices; solo-office cards retain their wider
layout. Heights recalculate after filtering, fonts load and viewport changes.
Entry reveals and hover feedback respect reduced-motion preferences.
Program, Hometown and Birthday labels remain visible for every officer, with
"Not provided" placeholders for missing values. Call officer and Send email
controls remain visible and are disabled when the corresponding contact is missing.

Directory portraits are validated local WebP copies in `assets/img/officers/`,
so an image host outage cannot substitute a provider error graphic at runtime.
The manifest maps original roster URLs to prepared files or silhouette fallbacks;
original roster fields stay unchanged. Missing assets and browser image errors
also reveal the silhouette. Supplied local JPEGs use the same encoder as cached
historical portraits; the original high-resolution files remain intact.
Refresh them with `python scripts/prepare-officer-portraits.py`; add `--refresh`
to refetch already-cached sources. Raw downloads stay in ignored `build/`.
New roster reference PDFs and the `assets/static/2026-2027 officers/` source
folder are preserved locally and excluded from runtime packaging; prepared
portrait assets in `assets/img/officers/` are included.
The CLI encoder rejects invalid files and the provider's cyan error graphics,
including those returned with HTTP 200.

### Documents library

`documents.php` shares the Officers page's fixed geometric background, SSC crest,
condensed headings, sharp controls and blue/pink/gold accents. The responsive
document grid preserves publication labels, upload dates, PDF viewing, direct
downloads and QR sharing. Normal vertical scrolling is used, with no home rail
or snap controller. Page assets are scoped to `assets/css/documents.css` and
`assets/js/documents.js`.

Category links retain `?section=treasurer`, `?section=legislative` and
`?section=secretary`; `?search=...` searches filenames and descriptions. Links
and the GET form work without JavaScript. With JavaScript, category changes,
search submissions, clear-search links, pagination and Back/Forward update results in place.
Stale requests cannot overwrite newer selections; failures preserve existing
records and offer a retry. Category totals describe the full library, while the
results heading shows the filtered count. Results use 12 records per page and
retain category/search parameters between pages. Office-holder panels derive all three
academic years from the shared roster and identify AY 2026-2027 as current.
Compact office-holder cards run from oldest to newest, with the current year on
the right. Former officers retain their colors with opacity-only fading, and the
cards have no links. File grids use up to five compact columns; list rows have
separate borders and spacing. File actions use small, single-line View document
buttons. Icon-only list
and grid controls beside the results heading switch document layouts without
checkmarks. The chosen layout persists across filtering/pagination and is saved
in local storage when available; blocked storage does not prevent switching.

PDF and download links normalize legacy Windows upload paths and encode filename
segments so spaces, apostrophes and hash characters remain usable. QR sharing uses
the existing QRServer image service, with a native modal dialog, keyboard dismissal,
backdrop dismissal and a direct document link if the QR image cannot load. Broken
office-holder portraits fall back to the local silhouette. Automated checks cover
filters, malformed inputs, escaping, current roster selection, special filenames,
request races/history, portrait fallback and QR errors. Visual browser QA remains
pending while the browser connection is unavailable.

### About the platform

`about.php` uses the same fixed SSC background, translucent navigation, condensed
headings and sharp controls as Officers and Documents. A TransFormation overview
introduces the platform's existing purpose, with links to council records and the
officer directory. The five original proposers/developers retain their project
credits and position histories, clearly labeled as the AY 2025-2026 platform team.
Their portraits use the validated local officer images with silhouette fallback.

`includes/about-content.php` holds the preserved credit data and renders compact
cards, a native profile dialog and inline position histories. With JavaScript and
dialog support, accessible View profile buttons open the dialog and the inline
histories are hidden; otherwise the inline details remain available. Profile text
is inserted as text, native dismissal restores scrolling, and backdrop clicks
outside the dialog close it. Styles and behavior are scoped to `assets/css/about.css`
and `assets/js/about.js`. Intro/hover effects respect reduced motion. Automated
checks cover profile selection, history replacement, dismissal/scroll restoration,
image failure and the fallback experience. Visual browser QA remains pending.

## Private files and uploaded records

- `vendor/` and `node_modules/` are generated dependencies and are not tracked.
- Local credential files, `.env` files, SQL exports, backups, and new uploads
  are ignored. Deliberately authored `database/schema.sql` and migration SQL files
  may be committed when introduced; they must not contain private data.
- Previously tracked council PDFs and the event banner remain tracked to preserve
  the existing content baseline. Ignore rules do not remove tracked files.
- The old `sscwebsite.sql` dump remains on this workstation as an ignored file
  and in the private cleanup backup. It contains user/session data and must not
  be committed or deployed.
- Apache rules deny direct access to configuration, dependency/source directories,
  database exports, backup archives, and development manifests. These rules need
  verification on the actual hosting environment before release.

Ignoring or untracking a file does **not** erase older commits. Treat previously
committed credentials and authentication/session data as exposed. Coordinate
credential rotation and session invalidation with the hosting owner before
deployment. The repository history has not been rewritten, including upstream
history and other copies of the original repository.

## Deployment status

This repository is a fork. The owner currently has InfinityFree account
credentials; FTP details, database access, and the exact deployed directory have
not yet been verified. The original deployment does not use GitHub Actions.
Workflows are prepared in `.github/workflows/`; hosting connection verification
and the first deployment remain pending. No production files have been changed.

Before deploying this configuration change:

1. Back up the live application, database, and uploads.
2. Prepare `config/database.local.php` on the host with its database settings,
   or configure all required environment variables. Deploying the bootstrap
   without either configuration method will return HTTP 503.
3. Install dependencies from `composer.lock` locally or in the future CI runner
   and include `vendor/` in the deployment artifact. Removing it from Git does
   not remove the application's runtime dependency on TCPDF.
4. Preserve the host's private configuration and live `uploads/` tree. Do not
   use cleanup deletions as an instruction to delete remote files blindly.
5. Remove any old deployed diagnostic pages (`test.php`, `hello.html`) and the
   deployed SQL dump after preserving necessary private backups.
6. Verify access restrictions, public documents, login, and generated reports.

## GitHub Actions setup

The `CI` workflow runs on pushes and pull requests. It validates dependency
manifests, installs locked dependencies, checks PHP syntax, tests deployment
safeguards, builds a runtime-only release, and checks PDF generation. Runners
use PHP 8.3 and Node 22. Verify the hosting PHP version/extensions before release.

The `Deploy to InfinityFree` workflow is manual and only deploys from this
fork's `main` branch. A `production` environment has been created on GitHub and
restricted to `main`. The deployment is a **read-only preview by default**.
The workflow must be merged into the default branch before GitHub offers its
manual Run workflow button.

Under this fork's **Settings → Environments → production**, configure:

| Kind | Name | Value |
| --- | --- | --- |
| Variable | `FTP_SERVER` | `ftpupload.net` (supplied by owner) |
| Variable | `FTP_REMOTE_DIR` | `/cspcssc.ct.ws/htdocs/` (confirmed by the domain's Directory entry) |
| Secret | `FTP_USERNAME` | Username shown in the hosting account's FTP Details |
| Secret | `FTP_PASSWORD` | Password shown in FTP Details, which may differ from the client-area password |

Enter secrets directly on GitHub or use the following commands in your own
VS Code terminal; `gh` prompts for each value. Do not paste passwords in chat or
commit them to configuration files.

```powershell
gh secret set FTP_USERNAME --env production --repo mrfahrenheit0528/SSC-Website-Vanilla
gh secret set FTP_PASSWORD --env production --repo mrfahrenheit0528/SSC-Website-Vanilla
```

The hostname and domain directory are confirmed, and both FTP secret names are
present in the production environment. Read-only run 44782089782 passed after
the host's private config was created. The downloaded config passes PHP syntax
checks and its connection values match the existing deployed bootstrap.
The production backup was hashed and its SQL restored into a separate temporary
MariaDB instance; all 47 document references and the event banner were present.
These checks do not replace testing the updated application on the host. No
production files have been uploaded by CI/CD.
No credentials are derived from previously exposed Git
history or uploaded automatically from this workstation.

### Before the first deployment

1. Confirm the document root belongs to `cspcssc.ct.ws`. Back up the live files,
   database, and uploads privately and verify the recovery plan.
2. Rotate exposed credentials with a coordinated live-config update, and inspect
   the deployed schema/source for production-only changes.
3. On the host, create `config/database.local.php` using the example's array
   format and the correct host database settings. Leave the currently deployed
   `config/database.php` in place until deployment replaces it. The workflow
   requires the private file to exist and be nonempty; it does not inspect its
   contents or prove its settings/schema are correct. Validate those separately.
4. Review and merge the cleanup/CI changes into this fork's `main`. This enables
   the manual workflow; merging does not deploy the site.
5. In **Actions → Deploy to InfinityFree → Run workflow**, select `main`, leave
   `dry_run` checked, and run the read-only preflight. This logs in with explicit
   FTPS, verifies the configured directory and required files, and uploads nothing.
6. Resolve any errors. Only after the root, backups, configuration, and release
   are confirmed, run it with `dry_run` unchecked and `backups_confirmed` checked.
7. Check the live pages, existing PDFs, login, dashboard, reports, and denied
   diagnostic/config/dump URLs in a browser. The hosting JavaScript cookie check
   means an automated HTTP 200 response is not sufficient proof of application health.

The release allowlist includes application PHP, shared includes, assets, Apache
rules, the license, and installed Composer dependencies. It excludes uploads,
private config, SQL exports, documentation, Git history, workflow/scripts/tests,
and Node dependencies. It does not publish the historical SQL dump or run
database migrations. No private production backups are stored as public-repo
workflow artifacts.

FTPS uses port 21, certificate verification, and encrypted control/data channels.
There is no plaintext or insecure-certificate fallback. Each file is uploaded to
a temporary name then renamed; replacements must be supported by the server.
Before any writes, the script reads the existing `.htaccess` over FTPS and
preserves its host-specific directives, including InfinityFree's managed block.
Repository rules are appended in a marked block that is replaced on subsequent
deployments. An unreadable, empty, or malformed host file blocks deployment.
The additional rules can override earlier directives (for example error display);
review the effective settings and any later hosting-panel edits after release.

This is not an atomic whole-site release: a failed job can leave some files
updated and may leave non-secret temporary files. Use a maintenance window for
incompatible changes. The script never deletes remote files, overwrites private
config/uploads, or deletes an original to force a failed rename. Old remote-only
files require deliberate cleanup; Apache rules deny the removed diagnostic URLs.

To run packaging/safeguard checks locally:

```powershell
python -m unittest discover -s tests -v
python scripts/build_release.py
```

Python 3.10+ and Composer-installed dependencies are required. Generated packages
are in ignored `build/release/`; they are not a production backup. The Python
tests use synthetic files and a fake FTP server and do not contact production.

See [OVERHAUL_PLAN.md](OVERHAUL_PLAN.md) and
[DEPLOYMENT_BASELINE.md](DEPLOYMENT_BASELINE.md) for pending work.
