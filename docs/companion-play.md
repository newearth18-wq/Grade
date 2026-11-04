# Companion playroom

Students open the new optional playroom below their companion picker. Existing pastel Grade surfaces and the three chosen species are retained.

The character renderer now uses original soft-toy rigs in `lib/models/companion-characters.ts`: articulated heads with attached eyes/muzzles/ears, glossy highlights and blinking, distinct fox tail, rabbit ears and owl wings. Hat and neck mounts belong to the character rig so outfits follow the correct body parts. The wardrobe studio uses a front-facing portrait pose, larger viewport, calibrated ground height and softer tone-mapped lighting; the main island keeps its roaming animation. Shared geometry is allocated only at creation and reused across frames/species changes.

## Care and responses

Feed, play ball and send hearts. Both the main island and the local 3D studio use the existing companion meshes, with a feeding bowl, moving ball and rising hearts. Cues are transient and scoped to the current course so changing classroom cannot replay another room's interaction. Reduced motion and scene pause show static responses; hidden/offscreen studio rendering is skipped. All models share stable geometry and materials, disposed when the studio unmounts.

POST `/api/island/:courseId/care` accepts only `expectedRevision` and one of `feed/play/love`. It requires the student's active, live enrollment. Server Bangkok date and atomic revision comparison govern completion. Each distinct activity is recorded once a day. All three grant one warmth star for that day; repeat play triggers delight without another star or revision. New days clear the activity checks while retaining stars. No absence penalties, school marks, XP changes or paid currency. Cosmetics and daily care use the existing private island profile in D1, without schema changes or new file copies.

## Wardrobe and island props

- Hats: none, flower, crown, explorer cap.
- Accessories: none, pink bow, blue scarf.
- Island corner: none, wood swing, lotus pond, picnic.

All choices are free and changeable, validated by server enums, saved per student/course/room/term with the existing optimistic revision. They appear on the main island, rotatable studio preview and newly recorded daily growth memories. Existing companion choice and academic decoration unlocks still work.

## Two short games

- Garden matching: six shuffled cards, three pairs, move count, short mismatch reveal, replay and completion scene.
- Light sequence: four symbols, three progressively longer stages, optional visible hints, retry the same sequence and completion scene.

Games are browser-session activities, not score submissions. No countdown or leaderboard. A button returns to the student's actual next unfinished assignment. Timers are cleared on unmount or tab hiding; matching clears unfinished flips and sequence returns to idle. Text and controls remain native HTML and keyboard accessible.

## Verification

`tests/companion-play.mjs` covers daily normalization/once-only stars, invalid cosmetic fallback, pair deck and sequence prefix rules and stable 3D resources. `tests/adventure-plus.mjs` adds authenticated care/wardrobe persistence, enum/spoof rejection, other-student isolation, repeated care, rollover and concurrent-tab protection while verifying academic course revision stays unchanged. Existing island, journey and adventure-life pure checks remain relevant.

Browser QA runs on disposable D1/R2 at port 8797 with fictitious accounts, not production students. Coverage includes actual care completion and repeat play, wardrobe persistence after refresh, both games completed through visible controls, next-assignment navigation, studio rendering and mobile overflow checks. Daily care/wardrobe state is durable in D1; the existing coursework backup/restore format does not reconstruct these cosmetic settings.
