# Server-side Drive backups

This optional path uses a private Google Apps Script owned by the administrator's selected Google account. It runs on Google servers, not on the teacher's PC. It does not use or copy the agent's Google OAuth tokens, and does not require a public Apps Script web app.

## Setup and activation

1. In Grade, open Backup → Google Drive → setup. The signed-in Grade administrator chooses a private My Drive folder and its owning email, then explicitly generates a 256-bit backup key. Only its SHA-256 digest is stored in Grade; the plaintext is returned once with private/no-store headers.
2. Copy `public/backup/GradeDriveBackup.gs` and `appsscript.json` into a private Apps Script project owned by that Google account.
3. The administrator enters `GRADE_URL` and `GRADE_BACKUP_KEY` in Script Properties themselves. Never put the key in source, URLs, browser local storage, a repository, logs or screenshots.
4. The administrator runs `setupDriveBackup` and reviews Google's authorization. The manifest requests Drive, external requests, trigger management and account email. DriveApp's OAuth access is broader than one folder; the script restricts its own operations to the configured private folder and refuses an unexpected account, owner or sharing state.
5. Setup installs a daily trigger in Asia/Bangkok, around 02:00–03:00. It immediately attempts the initial export. The administrator's Cloudflare backup path remains enabled until a complete verified receipt arrives.

The live configured target is user-specific data, not part of this source repository. Setup must be completed by the human account owner; publishing this feature alone neither grants Google permissions nor enables Drive-only mode.

## Data and storage

The D1 queue captures a bounded metadata manifest and references to immutable original file IDs. It never puts another backup copy of the files into R2. Each authenticated asset request reads one original and records its SHA-256 in D1. Google independently checks that digest, writes the asset to the private folder, and rereads it to verify the stored bytes. It writes `manifest.json` last and sends the per-asset receipts and manifest hash back to Grade. Grade compares every receipt to its own original digest and validates the full restore manifest before completing the job and switching the administrator's backup destination.

Completed queue payloads are cleared; status, sizes and Drive folder IDs remain as receipts. Existing Cloudflare snapshots and original work files are not deleted by this feature. Historical Cloudflare snapshot migration and deletion need a separate reviewed operation; a new current-state backup does not preserve every old version by itself.

Drive jobs use the same version-2 recovery manifest as existing ZIP exports. Download a completed Drive job folder as ZIP and select it in Grade's existing restore panel. The importer accepts one containing folder around `manifest.json` and `assets/`. Restore creates new courses and never overwrites live marks.

## Scheduling, failures and bounds

- Google enforces Apps Script quotas. A run stops after four minutes and schedules a one-minute continuation. Progress is a private Drive JSON file rather than a large Script Property. Up to three bounded retries handle failures; invalid/revoked keys do not keep retrying.
- Script locks and a ten-minute Grade lease prevent concurrent workers from uploading the same job. Existing same-name assets are checked before reuse; mismatches or duplicate names stop completion. A retried completion is idempotent.
- Each job currently allows up to 250 MB of original assets and 800 KB of metadata, matching the existing restore constraints. Oversized jobs report an error rather than silently omitting files. Larger datasets require a future partitioned-backup format or manual course-scoped jobs.
- Up to 50 pending jobs per owner are allowed. Critical mutation checkpoints validate source existence before enqueueing. They become ready for recovery only after Google has uploaded and verified them; they are not synchronous file copies anymore.
- Dashboard errors, pending jobs and a last-success age above 36 hours are visible. Google trigger errors remain available in Executions. No email is sent by Grade itself.
- Revoking the key cancels unfinished jobs, immediately stops authenticated export access and returns to the existing Cloudflare safety path. Rotating a key starts again in pending mode.
- The existing Sites daily scheduler skips Drive-enabled owners and preserves existing Cloudflare behavior for other owners. The Google trigger itself queues an idempotent daily full export and drains all pending checkpoints without depending on the Codex desktop app. This avoids capturing a duplicate daily manifest at a different scheduler time.

## Security and verification

Only active Grade administrators can configure a connection. Unattended endpoints accept only the dedicated backup key, scoped to that administrator's export and queue; they cannot edit grades, rosters or coursework. Unknown assets, other jobs, wrong workers, stale leases, incomplete receipts, wrong account/folder, bad hashes and redirected requests are rejected. Source metadata is private; queue exports omit passwords and keys. No provider credentials are returned to Grade.

Automated checks: `tests/drive-backup.mjs` against disposable Miniflare D1/R2, and `tests/drive-script.mjs` with simulated Google services. They verify ownership, key revocation, incomplete/corrupt backups, exclusive leases, resumable uploads, no premature cutover, no new R2 backup objects after verified activation and the original fallback. These checks do not prove live Google consent or actual trigger execution; those are verified after the owner completes authorization.
