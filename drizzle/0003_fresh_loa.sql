CREATE TABLE `subjects` (
	`id` text PRIMARY KEY NOT NULL,
	`period_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`period_id`) REFERENCES `periods`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subject_scope` ON `subjects` (`owner_id`,`period_id`,`code`);--> statement-breakpoint
ALTER TABLE `courses` ADD `subject_id` text REFERENCES subjects(id);
--> statement-breakpoint
INSERT INTO subjects (id,period_id,owner_id,code,name,created_at)
SELECT 'subject-' || c.id,c.period_id,c.owner_id,c.code,c.name,strftime('%Y-%m-%dT%H:%M:%fZ','now')
FROM courses c WHERE c.id=(SELECT MIN(c2.id) FROM courses c2 WHERE c2.period_id=c.period_id AND c2.owner_id=c.owner_id AND c2.code=c.code);
--> statement-breakpoint
UPDATE courses SET subject_id=(SELECT s.id FROM subjects s WHERE s.period_id=courses.period_id AND s.owner_id=courses.owner_id AND s.code=courses.code);
