CREATE TABLE `course_staff` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`user_id` text NOT NULL,
	`permission` text NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `staff_course_user` ON `course_staff` (`course_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `extensions` (
	`id` text PRIMARY KEY NOT NULL,
	`assignment_id` text NOT NULL,
	`student_id` text NOT NULL,
	`due_at` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`assignment_id`) REFERENCES `assignments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `extension_assignment_student` ON `extensions` (`assignment_id`,`student_id`);--> statement-breakpoint
CREATE TABLE `restore_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`asset_id` text NOT NULL,
	`object_key` text NOT NULL,
	`sha256` text NOT NULL,
	`size` integer NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `restore_jobs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `restore_job_asset` ON `restore_assets` (`job_id`,`asset_id`);--> statement-breakpoint
CREATE TABLE `restore_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`manifest` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sgs_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`config` text NOT NULL,
	`template_key` text NOT NULL,
	`template_name` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `assignments` ADD `rubric` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `files` ADD `kind` text DEFAULT 'work' NOT NULL;--> statement-breakpoint
ALTER TABLE `submissions` ADD `rubric_scores` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `submissions` ADD `source` text DEFAULT 'upload' NOT NULL;
--> statement-breakpoint
UPDATE users SET role='admin' WHERE id=(SELECT value FROM settings WHERE key='bootstrap') AND role='teacher';
