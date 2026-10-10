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
--> statement-breakpoint
CREATE TRIGGER group_join_guard BEFORE INSERT ON group_members BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM work_groups g JOIN assignments a ON a.id=g.assignment_id JOIN courses c ON c.id=a.course_id WHERE g.id=NEW.group_id AND g.assignment_id=NEW.assignment_id AND g.sealed=0 AND a.is_group=1 AND g.member_count<a.group_max AND c.archived=0 AND c.published=0) THEN RAISE(ABORT,'group_full_or_sealed') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM enrollments e JOIN assignments a ON a.course_id=e.course_id WHERE a.id=NEW.assignment_id AND e.student_id=NEW.student_id AND e.active=1 AND e.deleted=0 AND NOT EXISTS(SELECT 1 FROM trash_entries t WHERE (t.kind='student' AND t.record_id=e.student_id) OR (t.kind='enrollment' AND t.record_id=e.id))) THEN RAISE(ABORT,'member_not_enrolled') END;
END;
--> statement-breakpoint
CREATE TRIGGER group_join_count AFTER INSERT ON group_members BEGIN
 UPDATE work_groups SET member_count=member_count+1,revision=revision+1 WHERE id=NEW.group_id;
END;
--> statement-breakpoint
CREATE TRIGGER group_leave_count AFTER DELETE ON group_members BEGIN
 UPDATE work_groups SET member_count=member_count-1,revision=revision+1 WHERE id=OLD.group_id;
END;
