# SSC Website Overhaul Plan

Working plan created November 19, 2026.

Production website: https://cspcssc.ct.ws/

Access/deployment update (November 21, 2026): this repository is the owner's fork.
The owner currently has only the InfinityFree account credentials; separate FTP
details, database access, and the deployed directory have not been verified.
The original developer confirmed that production does not use GitHub Actions.
Development will continue in VS Code. Future CI/CD will run from this fork after
the hosting details and backups are established; browser access is not a
requirement for independent local development. No deployment workflow is enabled.

CI/CD setup progress: CI and a manual FTPS deployment workflow are prepared.
GitHub Actions is enabled and a `production` environment permits only `main`.
The owner supplied `ftpupload.net` and tentatively `/cspcssc.ct.ws/htdocs/`.
The root is not verified; FTP credentials must be entered directly as environment
secrets. Deployment defaults to a read-only preview, preserves uploads/private
config, and requires backup confirmation for writes. The host's private config,
production backups, source/schema comparison, and live FTPS test are still pending.
See README.md for configuration and first-run steps. No live deployment has run.

## Objective

Modernize the council website's public pages and administration tools while preserving its documents, officer information, and existing PHP/MySQL functionality. Prepare and verify changes locally before updating production.

Approved scope: provide two UI themes: **Regular** for everyday council use and **Intramurals** for the council's intramurals event. Both themes will use the same content, navigation, components, and application features. Theme-specific artwork, colors, typography, and decorative treatments will be developed together. The event branding and how the theme is selected still need to be agreed during phase 4.

## Starting point

- The repository uses vanilla PHP, MySQL, Tailwind through a CDN, Flowbite, and TCPDF. Registration still uses Bootstrap.
- Public features include the homepage, officer directory, document search and filters, PDF viewing, and QR sharing. The dashboard manages documents and an event banner. Attendance embeds a separate website.
- The live homepage, documents, officers, and login pages returned HTTP 200 after the hosting service's JavaScript cookie check. Their content broadly matches the repository; exact deployed source parity and visual appearance have not been verified.
- The database configuration contains InfinityFree-related settings, but hosting account access and the deployment procedure still need verification.
- All 17 application PHP files passed syntax checks during the initial review. Local PHP lacks the mysqli and GD extensions required by existing features.
- Known issues include tracked database credentials, missing admin enforcement and CSRF protection, fragile uploads, and a database export that does not match current application queries.

## Working rules

- Keep PHP/MySQL as the baseline. Build frontend assets locally and deploy generated files; do not introduce a production Node server as part of this overhaul.
- Preserve existing page URLs, document links, and uploaded files unless a replacement includes a migration or redirect.
- Use synthetic data for local testing where possible. Keep credentials, private backups, and production database exports out of Git.
- Complete each phase's checkpoint before moving to work that depends on it.
- Record design decisions and any scope changes here as work proceeds.

## 1. Establish the deployment baseline and recovery path

- [x] Create a dedicated overhaul branch and record the current Git commit. Branch: `overhaul/ui-refresh`; baseline: `748df995c4d1f066441c086ce4b8168f17080379`.
- [ ] Locate the InfinityFree account, domain settings, document root, PHP version, database management access, and current upload/deployment method.
- [ ] Back up the live database and deployed files, including uploads and server configuration, to a private location outside the repository.
- [ ] Compare the deployed source and schema with this checkout. Record production-only changes before editing or replacing anything.
- [ ] Record which uploaded files exist only on production and protect them from deployment synchronization or deletion.
- [ ] Capture the current public pages at desktop and mobile widths, plus authorized admin workflows when access is available.
- [ ] Write down the restore procedure and check that backups are readable and complete.

**Checkpoint:** We know what is running, what must be preserved, and how to restore it. Missing hosting access does not block independent local preparation, but it blocks production rollout.

Progress: a local Git source snapshot has been saved and inspected outside the repository. This is not a live hosting backup. Browser and native computer connections are unavailable in this session, so hosting inspection, production backups, source/schema comparison, screenshots, and restore verification remain pending. See [DEPLOYMENT_BASELINE.md](DEPLOYMENT_BASELINE.md) for evidence and remaining work.

## 2. Make local development reproducible

- [ ] Enable mysqli and GD in local PHP and verify the other extensions required by Composer and existing features.
- [ ] Set up a local MySQL or MariaDB database using a sanitized fixture.
- [x] Move database credentials into an untracked configuration mechanism and provide an example with placeholders. The bootstrap now reads ignored `config/database.local.php` or environment variables; actual hosting compatibility still needs verification.
- [ ] Arrange rotation of any active credentials tracked in Git. Coordinate the configuration update so rotation does not leave production disconnected.
- [ ] Compare the SQL export, application queries, and live schema. Resolve the missing `documents.display_name`, the required `title` column, and any other differences.
- [ ] Add explicit, versioned database migration scripts. Move table creation out of normal page requests once the migration path is established.
- [ ] Install locked dependencies and document local setup, startup, asset build, and database initialization in README.md.
- [ ] Start the site locally and verify that public pages load and a test account can sign in.

**Checkpoint:** A fresh local setup can run the application using documented steps without production credentials or a production database connection.

## 3. Fix backend issues that affect the redesigned workflows

- [ ] Define who may upload, edit, delete, change event banners, and generate reports. Default management actions to administrators unless a different role policy is agreed.
- [ ] Enforce permissions on every affected server endpoint, including direct requests.
- [ ] Decide whether public registration is needed. Restrict or remove it if accounts are intended only for council staff.
- [ ] Add CSRF tokens to state-changing forms and require POST for deletion. Update the dashboard's delete controls at the same time.
- [ ] Regenerate the session ID after login and configure appropriate session cookie settings.
- [ ] Validate upload categories, file content/MIME type, size, and errors. Use unique stored filenames while preserving human-readable document names.
- [ ] Handle file/database failures so unsuccessful uploads or edits do not overwrite existing documents or leave inconsistent records.
- [ ] Constrain PDF serving and file deletion to verified paths within the intended upload directory.
- [ ] Remove or restrict production diagnostics such as test.php. Prevent web access to database dumps, private configuration artifacts, and backup files.

Cleanup progress (November 21, 2026): local diagnostic pages, unreferenced image
files, unused local PDF.js assets/dependency, and duplicate Flowbite loading were removed. The private SQL dump and generated vendor
dependencies were removed from tracking but retained locally. New private configs,
dumps, backups, and uploads are ignored. Apache access restrictions were added;
their production behavior is unverified. Old credentials remain in Git history and
require rotation. None of these local changes has been deployed.

Cleanup validation: application/configuration PHP syntax checks passed, nine
isolated configuration checks passed using synthetic values and stubbed database
connections, and TCPDF autoload/PDF generation passed. Retained npm package
versions are unchanged. Original connection values were absent from tracked
working-tree text after cleanup; Git history was not rewritten. Composer's
install dry run required no dependency changes. Full database workflows and
Apache access rules still require environment-specific testing.
- [ ] Add focused checks for permission enforcement, CSRF rejection, upload collisions, invalid uploads, and PDF path restrictions.

**Checkpoint:** Authorized management tasks work; anonymous and ordinary users cannot invoke restricted actions. Existing public PDFs remain accessible.

## 4. Agree on content and visual direction

- [ ] Confirm the council's logo, approved colors, fonts, contact details, and available campus/event photography.
- [ ] Confirm the current academic year and which officer rosters should be current versus archived. Avoid inferring this solely from today's date.
- [ ] Review homepage copy, document category labels, officer names/roles, and event details for accuracy.
- [ ] Define the primary student journeys: finding a document, identifying an officer, checking announcements, and contacting the council.
- [ ] Prepare a representative homepage and document-library design at desktop and mobile sizes.
- [ ] Show both Regular and Intramurals variants in the representative designs. Confirm the intramurals event name, approved artwork, palette, and content dates.
- [ ] Agree whether the theme is site-wide, visitor-selectable, scheduled, or a combination. Define the default theme, persistence, and return to Regular after the event.
- [ ] Review that concrete design with the user before applying it across all pages.

**Suggested starting direction:** A clear institutional style using council-approved navy/blue, white surfaces, strong typography, restrained accents, and real council imagery. Give document access and current announcements more prominence.

**Checkpoint:** The visual direction, navigation, content hierarchy, and current-year information are agreed. Homepage prototyping may proceed alongside backend work using local fixtures.

## 5. Build the shared UI foundation

- [ ] Create shared design tokens for color, typography, spacing, borders, and focus states.
- [ ] Implement Regular and Intramurals theme tokens on the same components. Keep theme selection separate from document/officer data and test contrast, focus, and reduced motion in both themes.
- [ ] Choose one consistent styling approach across public pages, login, registration if retained, and the dashboard. Replace the Tailwind runtime CDN with locally generated CSS if Tailwind is retained.
- [ ] Rework shared head, navigation, and footer partials with responsive layouts and consistent active states.
- [ ] Establish reusable buttons, inputs, alerts, document rows/cards, officer cards, empty states, and dialogs.
- [ ] Consolidate shared JavaScript and remove duplicate Flowbite loading. Remove old CSS only after checking its remaining consumers.
- [ ] Use local copies of approved brand assets where practical. Preserve image attribution or permissions where applicable.
- [ ] Include accessible labels, keyboard navigation, visible focus, contrast, reduced-motion behavior, and dialog focus management.

**Checkpoint:** A representative page demonstrates the shared components at mobile and desktop widths without overflow or keyboard-access issues.

## 6. Redesign the public pages

Work in this order so the most important student journeys become reviewable early.

### 6.1 Homepage

- [ ] Introduce a clearer council identity, concise purpose, and prominent document-library link.
- [ ] Present the current event or announcement with an appropriate empty state. Confirm whether the existing banner-only model is sufficient before adding new content fields.
- [ ] Simplify document-category summaries and officer previews.
- [ ] Make council contact and service links easy to find.
- [ ] Replace manually repeated current-year labels with a shared source of truth.

### 6.2 Documents and PDF viewing

- [ ] Improve search, category filters, result counts, and mobile layouts while preserving shareable query parameters.
- [ ] Present consistent document titles, categories, dates, and preview/download/share actions.
- [ ] Add pagination and meaningful empty/error states. Only add academic-year filters if reliable year metadata is available or a migration is included.
- [ ] Standardize the PDF.js version and asset loading after checking compatibility with the current viewer.
- [ ] Verify PDF viewing, downloads, QR links, and browser back navigation on mobile and desktop.

### 6.3 Officer directory

- [ ] Move officer content into structured data and render reusable cards instead of repeated markup.
- [ ] Preserve historical rosters and clearly distinguish the current academic year.
- [ ] Improve year selection, role grouping, image handling, and missing-image fallbacks.
- [ ] Verify every name, role, portrait, and academic-year association against the existing records.

### 6.4 Attendance and authentication pages

- [ ] Confirm whether attendance remains an external service and whether an embedded page or direct link gives the better mobile experience.
- [ ] Keep the external attendance service's behavior intact and provide a clear fallback link if embedding fails.
- [ ] Apply the shared design to login and registration if retained, with clear validation and error states.

**Checkpoint:** The complete public site is locally reviewable, responsive, and connected to working application data. Existing public document links still work.

## 7. Redesign administration

- [ ] Give the dashboard a clear hierarchy for documents, uploads, event management, and reports.
- [ ] Improve bulk actions, document editing, selection states, and deletion confirmation.
- [ ] Show useful upload limits, validation messages, partial-success results, and recovery options.
- [ ] Improve event-banner previews and explain any crop behavior before saving.
- [ ] Align report category names with the document library and verify generated PDF contents.
- [ ] Check that interface visibility and backend permissions agree for every supported role.

**Checkpoint:** An authorized administrator can complete each management workflow using the redesigned interface, including failure and cancellation paths.

## 8. Verify the release candidate

- [ ] Run PHP syntax checks and the focused backend checks from phase 3.
- [ ] Exercise search/filter combinations, pagination, previews, downloads, QR sharing, authentication, uploads, edits, deletion, banners, and reports.
- [ ] Test representative narrow mobile, tablet, and desktop widths, plus at least two browser engines when available.
- [ ] Check keyboard-only use, focus order, dialog behavior, labels, contrast, and reduced motion.
- [ ] Check missing images, invalid document IDs/paths, empty data, long filenames, large rosters, and upload failures.
- [ ] Check browser console/network errors, generated CSS coverage, image sizes, duplicate assets, and unnecessary page weight.
- [ ] Verify every redesigned page in both themes, including theme selection/default behavior, readable PDFs, mobile layouts, and event-theme retirement behavior where applicable.
- [ ] Review titles, descriptions, social previews, favicon, contact links, and academic-year labels.
- [ ] Produce a short change summary, screenshots, known limitations, migration steps, and deployment/rollback instructions for review.

**Checkpoint:** Required checks pass and the user can review a complete release candidate. Re-test affected areas after any changes made during review.

## 9. Deploy to InfinityFree

- [ ] Verify current hosting capabilities and limits against the final release requirements, including PHP extensions, uploads, storage, and database access.
- [ ] Use a staging location if available. Confirm whether the host's JavaScript cookie check affects PDF fetches, embeds, or shared links.
- [ ] Refresh the private production backup immediately before rollout.
- [ ] Prepare the exact deployment package with built frontend assets and required PHP dependencies. Exclude secrets, test data, SQL exports, and local tooling.
- [ ] Document file replacement and migration order based on the final implementation. Define what to do with new uploads or database writes if rollback becomes necessary.
- [ ] Present the tested release and concrete deployment steps for final review. Obtain deployment authorization if it has not already been given.
- [ ] Deploy without overwriting production uploads or host-specific configuration. Run the required migrations through the verified hosting method.
- [ ] Smoke-test public pages, existing PDF URLs, login, authorized management, and reports on the live domain.
- [ ] Check for errors and restore from the recovery plan if a blocking regression occurs.

**Checkpoint:** The redesigned site works on the live domain with its existing records and uploads preserved.

## 10. Close out and hand over

- [ ] Record the deployed commit/release, migration version, and deployment date.
- [ ] Update README.md with setup, asset build, content editing, role management, deployment, backup, and restore instructions.
- [ ] Record any deferred enhancements separately from release blockers.
- [ ] Retain the private recovery backup for an agreed period and document where authorized maintainers can find it.

## Completion criteria

- Public pages and administration use the agreed visual system and work on mobile.
- Regular and Intramurals themes share working features and content, with the agreed selection mechanism and accessible styling in both.
- Existing council documents, officer archives, and public links are preserved.
- Known authorization, CSRF, credential-handling, upload, and schema issues are resolved and verified.
- A fresh local setup and a repeatable production deployment are documented.
- The release is verified on the live domain with a usable recovery path.

## Immediate next step

Start phases 1 and 2: establish the production backup/deployment baseline and a working local environment. Then fix backend permissions and prepare the representative homepage/document-library design in parallel where dependencies allow.
