# Deployment baseline and recovery checklist

Recorded November 19, 2026. Phase 1 is **in progress**. No production files, settings, or database records have been changed.

Update November 21, 2026: the owner has only the InfinityFree account credentials.
FTP connection details, database management access, and the deployed directory
still need verification. The original developer confirmed that GitHub Actions is
not in use. Future CI/CD will be configured in the owner's fork. Local development
will continue in VS Code independently of browser access.

During repository cleanup, the original connection config and historical SQL dump
were also copied to the private folder
`C:\Users\Elmo\AppData\Local\SSCWebsiteBackups\2026-11-21-cleanup`.
The dump and installed vendor files are no longer tracked but remain on disk.
Actual connection values are now in ignored `config/database.local.php` with
environment-variable overrides supported by the tracked bootstrap. These are
local changes only; neither the stored credentials nor production parity has
been verified. The snapshot below remains the pre-cleanup baseline.

## Source baseline

| Item | Recorded value |
| --- | --- |
| Local checkout | `F:\GitHub Repo\SSC-Website-Vanilla` |
| Baseline commit | `748df995c4d1f066441c086ce4b8168f17080379` |
| Working branch | `overhaul/ui-refresh` |
| Previous branch | `main` |
| Source origin | `https://github.com/mrfahrenheit0528/SSC-Website-Vanilla.git` |
| Upstream remote | `https://github.com/jkabonita/SSC-Website-Vanilla.git` |
| Live URL supplied by owner | `https://cspcssc.ct.ws/` |
| Deployment/source parity | Not verified |

The owner's approved scope includes Regular and Intramurals UI themes. Theme work begins in the design phases; phase 1 preserves the existing deployment.

## Local recovery snapshot

Private location on this computer:

`C:\Users\Elmo\AppData\Local\SSCWebsiteBackups\2026-11-19-baseline`

- Archive: `local-repository-748df995.zip`
- Archive size: 37,482,556 bytes.
- SHA-256: `D2BDCD1D1547579C0196C7867F1F8C9340505A6DEEB6C7FFCC414D760A837CD7`
- The snapshot was produced with `git archive` from the recorded commit. It contains the tracked application, tracked vendor dependencies, configuration, SQL export, and tracked uploads.
- It excludes untracked files, ignored files, and Git history. Plans created after the baseline commit are also excluded.
- It contains existing tracked configuration and SQL data and must stay private. Do not attach it to issues, publish it, or commit it.
- All 304 tracked files in the ZIP were read successfully and matched the baseline commit's file inventory (no missing files). A private per-file SHA-256 manifest is saved as `local-source-manifest.csv`. This verifies archive readability and inventory; it is not a runtime or database restore test.

**This is a local source snapshot, not a backup of the deployed website or its live database.** It cannot establish a production recovery point.

## Observed public deployment

During the initial review, `/`, `/documents.php`, `/officers.php`, and `/login.php` returned HTTP 200 after the site's JavaScript cookie check. Titles and content broadly matched this repository. The homepage presented AY 2025–2026 while the officers page included 2026–2027.

These observations do not prove that every deployed source file matches Git, that all database operations work, or that the local SQL export represents live records. Visual screenshots have not been captured.

The source contains InfinityFree-related configuration and an external attendance integration at `https://sscattendance.iceiy.com/`. The owner reports being logged into InfinityFree. The hosting account/domain association still needs to be inspected directly.

## Hosting access blocker

The current session's browser inventory returned no browsers or native applications:

- Browser connection: `The browser access host is unavailable`.
- Native computer connection: native pipe unavailable, Windows error 2.

The logged-in InfinityFree account cannot currently be inspected through the available UI connection. Restoring that connection, or providing privately downloaded hosting files and a database export, will allow backup and comparison work to continue. Do not provide account passwords in chat.

## Production inventory to complete

- [ ] Identify the account/domain association and actual document root from the hosting panel.
- [ ] Record the active PHP version, required extension availability, database engine/version, and relevant upload/storage limits.
- [ ] Identify the database used by this deployment without publishing credentials.
- [ ] Determine how files are currently deployed: file manager, FTP, or another existing process.
- [ ] Record `.htaccess`, hidden files, HTTPS/domain configuration, and relevant hosting settings.
- [ ] Confirm whether a separate staging location exists.
- [ ] Identify the complete upload tree, production-only assets, and any external storage dependencies.

Keep private account identifiers, database exports, and credentials in the private backup folder rather than this document.

## Backup procedure to complete when access is available

1. Create a timestamped private production-backup folder outside the repository and public document root.
2. Download all deployed application files, hidden configuration files, dependencies, and uploads. If the hosting tool cannot download a whole directory, use its supported download method or an existing FTP connection. Do not install new tooling or create credentials merely to bypass an access problem.
3. Export the correct live database, including structure and data. Include supported database objects needed by this application. Do not modify or import into the live database during backup.
4. Record backup start/end times. Compare file and upload counts where possible. Account for uploads or database writes that could occur between the two backups before calling the recovery point consistent.
5. Verify archives can be opened, expected files are present, and SQL contains the expected tables and records. Record hashes and sizes privately.
6. Test extraction and database restoration into a separate local environment once phase 2 provides a database. Do not test restoration against production.
7. Mark production backup and recovery verification complete only after the corresponding evidence exists.

## Source and schema comparison to complete

- [ ] Hash deployed application files and compare them with the baseline commit. Exclude private credentials from reports.
- [ ] Record files that exist only in production, including uploads and host-specific files.
- [ ] Compare database structure with `sscwebsite.sql` and current PHP queries. Pay particular attention to `documents.display_name`, required `documents.title`, and `site_settings`.
- [ ] Record production-only changes that must be carried forward into the overhaul.
- [ ] Create a deployment exclusion list protecting production uploads, credentials, and host-specific configuration.

## Visual baseline to complete

- [ ] Homepage, documents, officers, and login at desktop and mobile widths.
- [ ] Document filtering, PDF preview, download, and QR sharing.
- [ ] Authorized dashboard views and management flows when access is available.
- [ ] Current attendance integration and its fallback behavior.

## Recovery procedure draft

This is a draft until the hosting document root, backup contents, and database restoration have been verified.

1. Identify the last verified production file/database backup pair and the matching release.
2. Preserve current files, uploads, and database state separately before restoring anything. Identify content created since the backup so it can be retained or reconciled.
3. Plan a write-free maintenance interval using a supported mechanism; avoid losing uploads or edits during recovery.
4. Restore the appropriate application release and host-specific configuration. Restore a database backup only when required by the failure and after resolving how newer records will be preserved. Application-only regressions may need only a file rollback.
5. Restore or reconcile uploads with the matching document records. Do not blindly replace the uploads directory with an older copy.
6. Verify existing PDF links, public pages, login, dashboard operations, and reports. Check record and upload counts against the recovery manifest.
7. Resume writes only after the restored application and data are consistent. Record the recovery result and any unresolved differences.

## Phase 1 exit criteria

The branch and local source snapshot are prepared. Phase 1 remains open until the hosting inventory, verified production file/database backup, deployed source/schema comparison, visual baseline, and usable recovery instructions are complete. A local restore test may finish during phase 2; this dependency must be recorded rather than treating an untested export as a verified restore.
