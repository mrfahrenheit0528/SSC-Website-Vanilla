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
an array with `server`, `username`, `password`, and `name` keys. It is ignored by
Git. The cleanup preserved this checkout's previous values in that local file;
they have not been validated. **Replace them with local database settings before
starting local development.** Do not use production as a development database.

Alternatively, configure `DB_SERVER`, `DB_USERNAME`, `DB_PASSWORD`, and `DB_NAME`
environment variables. Each supplied variable overrides the corresponding local
file value. An explicitly empty password is supported; the other values must be
nonempty. The application does not load `.env` files automatically.

Missing or invalid settings, a missing mysqli extension, or a failed connection
produce a generic HTTP 503 response without exposing connection details.

## Local development

1. Use PHP 8.3 with mysqli, GD, fileinfo, and the extensions required by Composer
   dependencies (including curl). The current workstation still needs mysqli and GD.
2. Install PHP dependencies from the committed lockfile:

   ```powershell
   composer install --no-dev --prefer-dist
   ```

3. Create an isolated local MySQL/MariaDB database and configure it as above.
   A clean schema/fixture and migrations are pending phase 2 of the overhaul.
   The historical SQL export is not a reliable initializer: it lacks
   `documents.display_name` and requires `title`, which current uploads do not supply.
4. Start the local server from the repository root:

   ```powershell
   php -S 127.0.0.1:8000
   ```

5. Open `http://127.0.0.1:8000/` in your browser. Development remains in VS Code.

The PHP development server does not enforce Apache `.htaccess` rules. Bind it
only to localhost. Full application testing requires the local schema setup.

## Frontend dependencies

Flowbite's vendored CSS and JavaScript in `assets/` are used by the pages. `npm ci`
restores the package dependency if needed; there is currently no frontend build
or asset-copy script. Tailwind, the active PDF.js viewer, fonts, and some other
libraries still load from CDNs. The unused npm PDF.js dependency and local module
copies were removed; the existing viewer was retained.

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
present in the production environment. The stored credentials still require
an actual FTPS login test; database access and configuration also remain pending.
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
