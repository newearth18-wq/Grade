ALTER TABLE `assignments` ADD `work_phase` text DEFAULT 'before' NOT NULL;--> statement-breakpoint
ALTER TABLE `courses` ADD `before_work_weight` real;--> statement-breakpoint
ALTER TABLE `courses` ADD `grading_mode` text DEFAULT 'weighted' NOT NULL;