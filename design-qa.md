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
- Geometry tests project actual tree vertices at desktop, narrow desktop and mobile camera settings through all growth stages. Seedling anatomy, mature roots, reusable geometry and three tree draw calls remain covered.
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
