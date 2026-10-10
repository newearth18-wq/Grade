import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
await build({stdin:{contents:"export * from './lib/exam-drafts';export * from './lib/submission-drafts';export * from './lib/client';export {BusyButton} from './components/grade/shared';",resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic',outfile:'.sites-runtime/reliability-test.mjs'});
const {acknowledgeAnswers,mergePendingAnswers,parsePendingAnswers,validateSubmissionFiles,api,ApiError,BusyButton}=await import('../.sites-runtime/reliability-test.mjs');
assert.deepEqual(mergePendingAnswers({q0:0,q1:'server'},{q1:'unsaved',q2:1}),{q0:0,q1:'unsaved',q2:1});
assert.deepEqual(mergePendingAnswers({q0:0},{q0:2,q9:1},[{id:'q0'}]),{q0:2});
assert.deepEqual(acknowledgeAnswers({q0:2,q1:'newer'},{q0:2,q1:'older'}),{q1:'newer'});
assert.deepEqual(parsePendingAnswers('{"q0":0,"q1":"","q2":false,"secret":"x","q3":99}'),{q0:0,q1:''});
assert.deepEqual(parsePendingAnswers('not json'),{});
const file=(name,size)=>({name,size});validateSubmissionFiles([file('งาน.jpeg',10)]);
for(const files of [[],Array(6).fill(file('a.png',1)),[file('a.png',0)],[file('a.png',10*1024*1024+1)],[file('a.png',10*1024*1024),file('b.png',10*1024*1024),file('c.png',6*1024*1024)],[file('a.exe',10)]])assert.throws(()=>validateSubmissionFiles(files));
for(const props of [{busy:true,disabled:false},{busy:false,disabled:true}])assert.match(renderToStaticMarkup(createElement(BusyButton,props,'ส่ง')),/disabled=""/);
const original=globalThis.fetch;let calls=0;
try{
 globalThis.fetch=async()=>{calls++;throw new TypeError('fetch failed');};await assert.rejects(()=>api('submit',new FormData()),e=>e instanceof ApiError&&e.status===0&&e.message.includes('อินเทอร์เน็ต'));assert.equal(calls,1,'mutations never retry automatically');
 globalThis.fetch=async()=>new Response('<html>gateway error</html>',{status:503});await assert.rejects(()=>api('state'),e=>e.status===503&&!e.message.includes('<html>'));
 globalThis.fetch=async()=>Response.json({error:'ไม่มีสิทธิ์'},{status:403});await assert.rejects(()=>api('state'),e=>e.status===403&&e.message==='ไม่มีสิทธิ์');
 globalThis.fetch=async()=>Response.json({ok:true});assert.deepEqual(await api('state'),{ok:true});
}finally{globalThis.fetch=original;}
console.log('PASS pending exam answers survive locked readback, newer edits survive stale acknowledgements, client upload limits, busy buttons and understandable API failures');
