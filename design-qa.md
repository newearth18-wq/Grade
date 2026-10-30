# Grade classroom experience — reference QA

Reference inspected on 29 October 2026: https://experience.projetbulles.com/
Also reviewed the user's 43.6-second screen recording locally, extracting seven frames.

## Design changes

- The orbit now fills the first viewport. A large growing banyan and terraced floating island anchor the scene; filters and classroom tools are compact peripheral controls.
- A perspective camera and projected sphere targets give foreground and background bubbles different apparent sizes. Dragging, wheel input and arrow controls rotate the orbit.
- A single 700 ms camera flight opens a separate full-screen, dark artwork gallery. Returning reverses the camera path. Reduced motion skips the flight.
- Teacher-provided task images fill bubbles. Gallery navigation shows outstanding tasks, descriptions, due dates, sample-file links and the existing submission/follow-up action.
- Tree progress remains scoped to subject, room, school year and term. It uses actual earned points and hides unpublished examination scores. The seedling still grows new branches, leaves and aerial roots rather than scaling a mature tree.
- Score and administrative pages retain their existing functions.

## Intentional differences

Grade retains its own branding, Thai classroom controls, banyan model and score-dependent growth. It does not copy the reference's children's artwork, recordings, logo or tree asset. Empty subjects show their course code; low-scoring rooms show a genuine young plant. These states will not look like the reference's fully mature showcase tree.

## Checks

- TypeScript and production build.
- Existing tests for outstanding-work visibility, teacher-only sample selection, enrollment/term isolation and independent per-room tree scores.
- Geometry tests project actual tree vertices at desktop, narrow desktop and mobile camera settings through all growth stages. Mobile intentionally crops canopy edges, as in the reference, while keeping vertical growth inside the scene; wider orbits move secondary bubbles beyond the screen edges rather than crowding them. Seedling anatomy, mature roots, reusable geometry and three tree draw calls remain covered.
- Disposable local browser fixture: open a selected bubble; return; switch subjects; view both task samples; move to the next task; enter the correct classroom follow-up page; open a room with no pending tasks.
- Responsive gallery inspected at 1280 × 720 and 390 × 844. Temporary browser viewport settings are reset after verification.
- No production student records were created or changed during QA.

Issues found and fixed during comparison: old dialog translations shifted the full-screen gallery off-screen; the create-course control was anchored below the entire dashboard; mid-growth leaf colors became gray; conservative whole-tree bounding-box corners overstated perspective clipping. Full-screen dialogs now omit centered-dialog transforms, controls anchor to the first viewport, leaves retain distinct colors, and the camera test checks actual vertices.

Local screenshots and side-by-side reference comparisons are saved outside this repository in the task's `outputs` folder. No measured frame-rate guarantee is claimed. Build output retains the existing warning about large client chunks.

## Original background assets

Both backgrounds were generated with ImageGen for this implementation, with no reference artwork used as input. Design briefs (paraphrased):

1. `public/experience/classroom-sky.webp`: atmospheric pastel sky, blue/lavender on the left, pink in the center, peach toward the lower right, soft fine grain, no objects, tree, bubbles, UI, logo or text. A translucent gradient softens the texture in the app.
2. `public/experience/gallery-sky.webp`: dark indigo cosmic atmosphere, fine stars and curved nebula near the edges, open central space, no objects, UI, logo or text.

Generated PNG originals remain in the user's Codex generated-images folder. Optimized WebP assets total 274,222 bytes.


## KRUNIK reference adaptation — 29 October 2026

The user selected the KRUNIK SUPAKIT Google Apps Script learning-media portal as Grade's new design reference. Inspected its public main world, tutorial, rotation/zoom controls and subject constellation. The adaptation uses Grade's own model, original assets, data and branding; it does not connect to or modify the reference's Google Sheet.

- Purple/lavender/pink/coral atmosphere, floating clouds and rounded faceted islands; a woven blue-purple trunk and soft pink canopy retain anatomy-based, score-dependent growth.
- Actual 360-degree horizontal rotation with vertical camera orbit (bounded elevation to avoid flipping), wheel/button/pinch zoom, reset, keyboard controls and on-screen help. Geometry is pooled, clouds/leaves are instanced, pixel ratio capped, and reduced motion/paused/background rendering are supported.
- Course names stay visible inside bubbles with transparent backgrounds and text shadows. Search filters course names/codes while preserving the correct selected course.
- Subject-specific constellation galleries use real three-dimensional shapes and a readable classroom/task panel. All sample files remain teacher-provided; submissions are private.
- Desktop and mobile QA used only the disposable local fixture: math room 6/1=10%, 6/2=80%; course-code search; zoom bounds; reset/rotation controls; open/back navigation; both sample tasks and the teacher follow-up action. Names' computed background color was transparent.
- Production build and TypeScript pass. Existing tree anatomy, independent scope, and pending-work/privacy checks pass. No production school records were changed.

Temporary screenshots are stored outside this repository in outputs/Grade-v27-*.png. The existing large-client-chunk warning remains; no measured FPS guarantee is claimed.

30 October follow-up: read the user-owned Index.html through the school-account Apps Script editor. It uses Three.js OrbitControls with damping, no pan, bounded polar angles and zoom. Grade now supports vertical pointer drags, up/down buttons, keyboard arrows and reset alongside its unrestricted horizontal rotation. Verified actual vertical drag changes the projected view without opening a bubble. Mobile header uses content-sized grid rows so long subject names do not overlap the gallery panel. No source-project code or settings were changed.
