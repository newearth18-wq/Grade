CREATE TABLE drive_backup_jobs (
 id TEXT PRIMARY KEY NOT NULL,
 owner_id TEXT NOT NULL REFERENCES users(id),
 course_id TEXT REFERENCES courses(id),
 kind TEXT NOT NULL,
 day TEXT,
 status TEXT NOT NULL DEFAULT 'queued',
 payload TEXT,
 size INTEGER NOT NULL DEFAULT 0,
 file_count INTEGER NOT NULL DEFAULT 0,
 folder_id TEXT,
 manifest_file_id TEXT,
 manifest_sha256 TEXT,
 worker_id TEXT,
 lease_until INTEGER NOT NULL DEFAULT 0,
 error TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL,
 completed_at TEXT
);
--> statement-breakpoint
CREATE UNIQUE INDEX drive_backup_daily ON drive_backup_jobs(owner_id,day) WHERE day IS NOT NULL;
--> statement-breakpoint
CREATE INDEX drive_backup_queue ON drive_backup_jobs(owner_id,status,created_at);
