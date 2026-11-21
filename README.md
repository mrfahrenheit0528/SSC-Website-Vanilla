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
The SIKLAB hero uses static WebP artwork and CSS, with no 3D renderer or frontend
build step. The unused Three.js code, bundle, and build dependencies are removed.
Tailwind, PDF.js, fonts, and the existing council logo still use their CDNs.

### SIKLAB homepage

Open `http://127.0.0.1:8000/`. SIKLAB stays active until the owner requests a
theme change. The December 5 cutoff is removed; there is no automatic expiry.
`includes/theme.php` sets the active theme. There is no visitor theme picker;
old theme query parameters and preference cookies cannot override it.
The Regular redesign is deferred until after SIKLAB.
Secondary page layouts are not yet overhauled.

The homepage keeps the original council text, links, document counts, officer
rosters, platform information, dialogs, contact details and announcement banner.
Both themes share `includes/home-content.php`. The event adds its palette,
wordmark, glass surfaces and the supplied 2D trophy artwork. Seven college logos
(BUHI, CAS, CCS, CEA, CHS, CTDE, CTHBM) surround the upright trophy in place of
the orbit circles. BUHI uses the supplied `BC.png` artwork. The arrangement is
static and responsive, with no canvas, animation controls or extra event slogans.
Buttons have sharp corners and gradients sampled from the supplied palette.

Original PNGs are retained in `assets/static/`. Prepared WebP variants are in
`assets/img/siklab/`; regenerate them with:

```powershell
php -d extension=gd scripts/prepare-visual-assets.php
```

This CLI-only encoder preserves the originals and uses a temporary 512 MB memory
limit for the large source artwork. It is not run on the hosting server. No event
dates, match schedules, results or official slogans were invented; existing
documents, officer rosters and the admin-managed announcement banner remain the
source of council content. The supplied GLB remains in the source assets for
future use but is not loaded by the homepage. PHP tests cover the active theme,
preservation of homepage content, the seven college identities and image delivery.
Visual browser QA is pending because the preview browser connection is unavailable.

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
