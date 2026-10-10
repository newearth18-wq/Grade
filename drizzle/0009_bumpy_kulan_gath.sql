CREATE TABLE `group_members` (
	`group_id` text NOT NULL,
	`assignment_id` text NOT NULL,
	`student_id` text NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `work_groups`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assignment_id`) REFERENCES `assignments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_group_per_assignment` ON `group_members` (`assignment_id`,`student_id`);--> statement-breakpoint
CREATE TABLE `work_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`assignment_id` text NOT NULL,
	`name` text NOT NULL,
	`leader_id` text NOT NULL,
	`member_count` integer DEFAULT 0 NOT NULL,
	`sealed` integer DEFAULT 0 NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`submission_token` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`assignment_id`) REFERENCES `assignments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`leader_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `assignments` ADD `is_group` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `assignments` ADD `group_max` integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE `courses` ADD `course_type` text DEFAULT 'academic' NOT NULL;--> statement-breakpoint
ALTER TABLE `courses` ADD `pass_threshold` real DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE `submissions` ADD `group_id` text;
