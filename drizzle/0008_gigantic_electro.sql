DROP INDEX `exam_course_kind`;--> statement-breakpoint
ALTER TABLE `exams` ADD `deleted` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `exam_course_kind` ON `exams` (`course_id`,`kind`) WHERE "exams"."deleted"=0;