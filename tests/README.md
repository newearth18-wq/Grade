# Tests

- `node tests/reliability-logic.mjs` checks pending exam answer reconciliation, upload limits, disabled busy buttons and readable network errors.
- `node tests/reliability-worker.mjs` creates disposable D1/R2, checks lost upload responses, concurrent uploads/corrections, group retries, receipt privacy, 30 concurrent requests and exam disconnect/unlock.
- For UI fault testing, set `GRADE_READY_PREVIEW=1` for that suite, then run `node tests/reliability-preview-proxy.mjs`; the proxy targets only loopback `:8788`. Its `:8789/__qa/mode?value=...` accepts `normal`, `exam-outage`, `exam-write-outage`, `drop-submit` and `uncertain-submit`. Stop both processes after QA. These endpoints are not application routes and never ship in the Worker.

- `node tests/integration.mjs` against an empty local development database; optional `GRADE_TEST_URL` chooses another disposable server.
- `node tests/build-tests.mjs` then `node tests/grades-and-export.mjs` verifies score logic, Excel import and SGS template integrity. Test bundles and generated sample files are ignored under `.sites-runtime`.

Never run integration tests against production or a real school database. The suite refuses a database that already has a teacher.

- `node tests/built-worker.mjs` runs the full integration suite against the compiled Worker in an isolated Miniflare instance, with a new in-memory D1 and R2. It avoids the live development proxy and disposes the test runtime after completion. Test-only login/report files are under `../Grade-direct-verification`.

- `node tests/enhancement-logic.mjs` verifies rubric constraints and SGS rounding, including pending/special grades and unchanged in-app results.
- `built-worker.mjs` also runs `enhancements.mjs`: staff access/revocation, rubric/paper grading, individual deadlines, revision-protected annotations, course copying with R2 bytes, private SGS profiles, checksummed complete restore, and concurrent teacher review guards. Run through the isolated harness, not against a school database.
- `seed-browser-fixture.mjs` creates a second student submission for continuous-grading UI QA only on loopback `:5173`, using the disposable integration fixture.

- `node tests/subject-migration.mjs` applies the multi-room migration to legacy fixtures and verifies the section IDs, enrollments, score and submission revision remain intact.
- `built-worker.mjs` also runs `subjects.mjs`: atomic multi-room creation, shared subject metadata, distributed assignments/sample bytes, student/teacher room privacy, term isolation and preserved grouping after restore.

- built-worker.mjs รวม tests/exams.mjs: สิทธิ์/เฉลย, ล็อกและปลดล็อก, รีโหลด, ตรวจและโอนคะแนน, ข้อเขียน, ถังขยะ, สำรองกู้คืน, หมดเวลาและ heartbeat รวม 8 กลุ่มบนฐานข้อมูลจำลองเท่านั้น
