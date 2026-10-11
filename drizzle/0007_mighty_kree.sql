CREATE TABLE `exam_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`exam_id` text NOT NULL,
	`enrollment_id` text NOT NULL,
	`student_id` text NOT NULL,
	`status` text NOT NULL,
	`answers` text DEFAULT '{}' NOT NULL,
	`started_at` integer NOT NULL,
	`deadline` integer NOT NULL,
	`heartbeat` integer NOT NULL,
	`page_token` text NOT NULL,
	`generation` integer DEFAULT 0 NOT NULL,
	`lock_reason` text DEFAULT '' NOT NULL,
	`lock_count` integer DEFAULT 0 NOT NULL,
	`score` real,
	`submitted_at` text,
	`synced` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exam_student` ON `exam_attempts` (`exam_id`,`student_id`);--> statement-breakpoint
CREATE INDEX `exam_attempt_exam` ON `exam_attempts` (`exam_id`);--> statement-breakpoint
CREATE TABLE `exam_events` (
	`id` text PRIMARY KEY NOT NULL,
	`attempt_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`attempt_id`) REFERENCES `exam_attempts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `exam_event_attempt` ON `exam_events` (`attempt_id`);--> statement-breakpoint
CREATE TABLE `exams` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`title` text NOT NULL,
	`kind` text NOT NULL,
	`instructions` text DEFAULT '' NOT NULL,
	`duration` integer NOT NULL,
	`max_score` real NOT NULL,
	`questions` text NOT NULL,
	`unlock_hash` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exam_course_kind` ON `exams` (`course_id`,`kind`);