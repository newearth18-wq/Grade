CREATE TABLE `trash_entries` (
	`kind` text NOT NULL,
	`record_id` text NOT NULL,
	`job_id` text NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `trash_jobs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `trash_record` ON `trash_entries` (`kind`,`record_id`);--> statement-breakpoint
CREATE INDEX `trash_job` ON `trash_entries` (`job_id`);--> statement-breakpoint
CREATE TABLE `trash_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`kind` text NOT NULL,
	`target_id` text NOT NULL,
	`title` text NOT NULL,
	`counts` text NOT NULL,
	`created_at` text NOT NULL,
	`restored_at` text,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
