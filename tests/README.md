# Tests

- `node tests/integration.mjs` against an empty local development database; optional `GRADE_TEST_URL` chooses another disposable server.
- `node tests/build-tests.mjs` then `node tests/grades-and-export.mjs` verifies score logic, Excel import and SGS template integrity. Test bundles and generated sample files are ignored under `.sites-runtime`.

Never run integration tests against production or a real school database. The suite refuses a database that already has a teacher.

- `node tests/built-worker.mjs` runs the full integration suite against the compiled Worker in an isolated Miniflare instance, with a new in-memory D1 and R2. It avoids the live development proxy and disposes the test runtime after completion. Test-only login/report files are under `../Grade-direct-verification`.
