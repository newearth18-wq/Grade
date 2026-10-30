CREATE TABLE `attendance_qr` (
 `session_id` text PRIMARY KEY NOT NULL REFERENCES `attendance_sessions`(`id`),
 `token_hash` text NOT NULL,
 `expires_at` integer NOT NULL,
 `late_at` integer,
 `created_by` text NOT NULL REFERENCES `users`(`id`),
 `created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attendance_qr_token` ON `attendance_qr` (`token_hash`);
