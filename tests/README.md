# Tests

- `node tests/integration.mjs` against an empty local development database; optional `GRADE_TEST_URL` chooses another disposable server.
- `node tests/build-tests.mjs` then `node tests/grades-and-export.mjs` verifies score logic, Excel import and SGS template integrity. Test bundles and generated sample files are ignored under `.sites-runtime`.

Never run integration tests against production or a real school database. The suite refuses a database that already has a teacher.

- `node tests/built-worker.mjs` runs the full integration suite against the compiled Worker in an isolated Miniflare instance, with a new in-memory D1 and R2. It avoids the live development proxy and disposes the test runtime after completion. Test-only login/report files are under `../Grade-direct-verification`.

- `node tests/enhancement-logic.mjs` verifies rubric constraints and SGS rounding, including pending/special grades and unchanged in-app results.
- `built-worker.mjs` also runs `enhancements.mjs`: staff access/revocation, rubric/paper grading, individual deadlines, revision-protected annotations, course copying with R2 bytes, private SGS profiles, checksummed complete restore, and concurrent teacher review guards. Run through the isolated harness, not against a school database.
- `seed-browser-fixture.mjs` creates a second student submission for continuous-grading UI QA only on loopback `:5173`, using the disposable integration fixture.

- `node tests/subject-migration.mjs` applies the multi-room migration to legacy fixtures and verifies the section IDs, enrollments, score and submission revision remain intact.
- `built-worker.mjs` also runs `subjects.mjs`: atomic multi-room creation, shared subject metadata, distributed assignments/sample bytes, student/teacher room privacy, term isolation and preserved grouping after restore.
