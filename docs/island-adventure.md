# Island controls and submission rewards

The classroom scene uses one pointer-origin mapping rather than integrating individual move events. While a gesture is active, angle, pitch and pinch zoom are applied directly on the next animation frame. Keyboard/button changes use a single short interpolation. The camera copies the computed orbit position rather than smoothing that position again. Hover movement no longer changes the viewing angle. The final CSS sets `touch-action: none` only on the 3D stage; the rest of the page remains scrollable. Pointer capture, cancellation, window blur and transitions from two fingers back to one clear/rebase gesture state. Pitch limits prevent an inverted view. The standalone `/banyan` viewer also removes damping and the former 32 ms frame throttle; manual interaction stops auto-rotation.

Student islands have a companion and one selectable decoration. Unlocks derive from distinct confirmed submissions using the existing student journey calculation:

| Distinct submitted assignments | Unlock |
| --- | --- |
| 0 | Bunny, fox and owl companions (freely selectable) |
| 1 | Lantern decoration |
| 3 | Mushroom village |
| 5 | Fireflies |
| 10 | Rainbow |

Unlock counts are scoped to the signed-in student and the selected tree's course/room/period. Repeated uploads of the same assignment do not increase the distinct count. Paper marks alone do not grant upload rewards. Returning an assignment for correction does not take away an already-earned decoration. Selecting locked cosmetics from stale or modified browser storage is rejected by the derived appearance function.

Decoration choices remain in local storage, keyed by user, period and course; decoration eligibility is recomputed from authenticated Grade state. Companion species, name and personality are saved in the private server island profile. All three species are available without submissions and can be chosen directly below the island introduction. Existing browser choices remain visible until an explicit account choice is saved; that account choice takes priority on every device. Cosmetics are personal and do not change marks. The 3D tree itself still uses actual teacher-reviewed scores. Scene props reuse geometry and share the existing renderer, with no extra canvas, textures, shadows or per-frame geometry creation.

The island panel links directly to the next actionable assignment, prioritizes returned work and shows remaining assignments needed for the next reward. Submission celebration displays newly unlocked items only after refreshed server state confirms them, then offers the next assignment or a return to the island. The celebration has a viewport height limit and scrolls on short screens.

Validation: `tests/island-adventure.mjs`, `tests/student-journey.mjs`, `tests/student-journey-worker.mjs`, `tests/bubble-work.mjs`, TypeScript and production build. Browser QA uses a disposable local D1/R2 classroom rather than school records.
