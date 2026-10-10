CREATE TABLE `submission_receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`assignment_id` text NOT NULL,
	`request_id` text NOT NULL,
	`revision` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `submission_receipt_request` ON `submission_receipts` (`student_id`,`request_id`);