DROP INDEX `course_scope`;--> statement-breakpoint
ALTER TABLE `courses` ADD `deleted` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `course_scope` ON `courses` (`period_id`,`code`,`classroom`) WHERE "courses"."deleted"=0;--> statement-breakpoint
DROP INDEX `enrollment_course_student`;--> statement-breakpoint
ALTER TABLE `enrollments` ADD `deleted` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `enrollment_course_student` ON `enrollments` (`course_id`,`student_id`) WHERE "enrollments"."deleted"=0;--> statement-breakpoint
DROP INDEX `extension_assignment_student`;--> statement-breakpoint
ALTER TABLE `extensions` ADD `deleted` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `extension_assignment_student` ON `extensions` (`assignment_id`,`student_id`) WHERE "extensions"."deleted"=0;--> statement-breakpoint
DROP INDEX `period_owner_year_term`;--> statement-breakpoint
ALTER TABLE `periods` ADD `deleted` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `period_owner_year_term` ON `periods` (`owner_id`,`year`,`term`) WHERE "periods"."deleted"=0;--> statement-breakpoint
DROP INDEX `subject_scope`;--> statement-breakpoint
ALTER TABLE `subjects` ADD `deleted` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `subject_scope` ON `subjects` (`owner_id`,`period_id`,`code`) WHERE "subjects"."deleted"=0;--> statement-breakpoint
DROP INDEX `submission_assignment_student`;--> statement-breakpoint
ALTER TABLE `submissions` ADD `deleted` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `submission_assignment_student` ON `submissions` (`assignment_id`,`student_id`) WHERE "submissions"."deleted"=0;