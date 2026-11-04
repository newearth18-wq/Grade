import { build } from 'esbuild';
await build({entryPoints:['lib/files-client.ts'],bundle:true,platform:'node',format:'esm',packages:'external',outfile:'.sites-runtime/files-client-test.mjs'});
await build({entryPoints:['lib/grades.ts'],bundle:true,platform:'node',format:'esm',outfile:'.sites-runtime/grades-test.mjs'});
