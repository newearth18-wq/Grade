CREATE TABLE `attendance_records` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`student_id` text NOT NULL,
	`status` text NOT NULL,
	`hours` real NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `attendance_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attendance_session_student` ON `attendance_records` (`session_id`,`student_id`);--> statement-breakpoint
CREATE TABLE `attendance_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`date` text NOT NULL,
	`title` text NOT NULL,
	`hours` real NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`deleted` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `backup_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`course_id` text NOT NULL,
	`kind` text NOT NULL,
	`status` text NOT NULL,
	`manifest_key` text NOT NULL,
	`size` integer DEFAULT 0 NOT NULL,
	`error` text DEFAULT '' NOT NULL,
	`day` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `daily_snapshot` ON `backup_snapshots` (`owner_id`,`course_id`,`day`);--> statement-breakpoint
CREATE TABLE `followup_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`student_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`text` text NOT NULL,
	`next_date` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`deleted` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `notification_reads` (
	`user_id` text NOT NULL,
	`key` text NOT NULL,
	`read_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notification_user_key` ON `notification_reads` (`user_id`,`key`);--> statement-breakpoint
CREATE TABLE `question_banks` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`tags` text DEFAULT '' NOT NULL,
	`questions` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`deleted` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `assignments` ADD `individual_weight` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `courses` ADD `attendance_min` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `courses` ADD `required_hours` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `exam_attempts` ADD `question_form` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `exams` ADD `shuffle_questions` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `exams` ADD `shuffle_options` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `submissions` ADD `individual_score` real;