ALTER TABLE enrollments ADD COLUMN student_status TEXT NOT NULL DEFAULT 'normal';
--> statement-breakpoint
ALTER TABLE enrollments ADD COLUMN student_note TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE enrollments ADD COLUMN status_date TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE enrollments ADD COLUMN support_updated_at TEXT NOT NULL DEFAULT '';
