# Adventure encouragement features

The existing lavender/pink Grade island now includes seven extensions. Academic scoring, submission APIs, enrollment scopes and course/room/term identifiers remain authoritative.

- **Task map:** phase/due-ordered actual assignments. Received work fills the path; returned work is retryable. Every unsubmitted assignment remains selectable, including later steps. Cosmetic path progression never blocks schoolwork.
- **Companion personality:** gentle, playful or curious, saved in the existing private island profile with its optimistic revision. Dialogue responds to pending corrections/completion. Walking speed, bounce and head tilt vary using stable existing meshes. Pause/reduced-motion/drag still stops motion.
- **Group gardens:** each existing assignment group has a shared garden. The server aggregates active members' non-returned submissions across current live coursework, with no missing-member list or grades. Students receive only their own groups. Garden stages add leaves, bench, tree and home at 25/50/75/100 percent. New work/member changes recalculate this current-progress garden.
- **Teacher praise:** one editable card per submission. Progress, creativity, effort and teamwork themes; optional 500-character note. Owner/editing teachers can create/edit/withdraw; the recipient sees private cards. Withdrawn records retain revision tombstones to prevent stale update resurrection. All writes are audit logged. No points are granted.
- **Growth replay:** the server records the signed-in student's actual points, uploads, XP, house stage/color, name/personality and class decoration stage. One latest sample per Bangkok day, bounded to 180 days per course/room. Saved sample dates replay in a separate on-demand existing 3D viewer. The initial seed is clearly a comparison image; dates before recording have no invented marks. An additional upload event list shows available earlier submission dates. Snapshots never change scores or overwrite other courses/terms.
- **Recovery plan:** private server-derived baseline of unfinished/returned assignment IDs. Student chooses one next task, follows the original upload flow, and receives a small local cosmetic celebration for progress. New assignments are added only when restarting the plan. Deleted assignments disappear from totals. Optimistic updates prevent stale-tab overwrite; API rejects arbitrary task IDs.
- **Class exhibit:** editing teacher nominates a currently graded submission and display text. The owner explicitly consents after reviewing the files; may withdraw at any time. Read access requires current classroom enrollment or an existing staff grant, both consent and selection, and the exact nominated revision/review timestamp. Changed review/text, returned/revised work, trash or revoked enrollment closes access. Original file APIs still reject peer files. A dedicated authenticated exhibit-file route checks all gates on every request. No scores, feedback, roster IDs or public student identities are returned to classmates. Students can toggle a single fixed positive appreciation, without free-text comments or rankings.

## Storage and privacy

New durable records use bounded JSON values in existing indexed `settings` keys:

- `praise:<courseId>:<submissionId>` — private teacher card + revision/tombstone.
- `exhibit:<courseId>:<submissionId>` — nomination, consent and revision gates.
- `exhibit_cheer:<courseId>:<submissionId>:<userId>` — idempotent appreciation.
- `island_memory:<userId>:<courseId>` — up to 180 daily samples.
- `island_recovery:<userId>:<courseId>` — personal baseline and selected task.

No new file copies, dependencies or schema migrations. Queries use indexed key ranges instead of SQL LIKE. Group aggregation uses a single CTE, independent of team count. These cosmetic settings remain in the database; the existing coursework backup/restore format does not reconstruct these extra settings. School marks and original files continue through existing backup paths.

## UI and verification

Students find six additional activity tabs below the existing island panel; personality choice is in บ้านคู่หู. Teachers see สวนกลุ่ม / การ์ดคำชม / ผลงานของห้อง below the class mission. Existing component tokens, native Thai controls, wrapping tabs, readable cards and bounded dialogs are reused. The replay canvas mounts only when explicitly opened and respects reduced motion. Native text and controls remain real HTML.

Automated coverage: `tests/adventure-plus.mjs`, `tests/adventure-plus-pure.mjs`, plus existing adventure/journey regressions. Integration tests run only against disposable local D1/R2 with fictitious teacher/student records. Browser fixture: set `GRADE_PLUS_PREVIEW=1` when running the integration test; it serves port 8797 and writes an ignored fixture descriptor in `.sites-runtime`.
