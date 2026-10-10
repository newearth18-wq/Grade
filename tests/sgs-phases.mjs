import assert from 'node:assert/strict';
import {build} from 'esbuild';
import ExcelJS from 'exceljs';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
await build({stdin:{contents:"export {resultRows,fillTemplate} from './lib/files-client';export {roundedResults} from './lib/sgs-rounding';export {Results} from './components/grade/results';export {ScoreSummary} from './components/grade/score-summary';",resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic',loader:{'.css':'empty'},outfile:'.sites-runtime/sgs-phases-test.mjs'});
const {resultRows,fillTemplate,roundedResults,Results,ScoreSummary}=await import('../.sites-runtime/sgs-phases-test.mjs');
const course={id:'c',code:'TEST',name:'รายวิชาทดสอบ',classroom:'ม.3/4',work_weight:60,before_work_weight:30,mid_weight:20,final_weight:20,can_edit:true,published:1};
const enrollment={id:'e',course_id:'c',student_id:'s',student_code:'00001',name:'นักเรียนจำลอง',number:1,active:1,mid:20,final:13,special:''};
const state={user:{id:'s',role:'student'},periods:[],enrollments:[enrollment],assignments:[{id:'before',course_id:'c',max_score:30,work_phase:'before'},{id:'after',course_id:'c',max_score:30,work_phase:'after'}],submissions:[{assignment_id:'before',student_id:'s',status:'graded',score:30},{assignment_id:'after',student_id:'s',status:'graded',score:29}]};
const rows=resultRows(state,course);
assert.equal(rows[0]['คะแนนรวม'],92);
const expected=['คะแนนเก็บก่อนกลางภาค','กลางภาค','คะแนนเก็บหลังกลางภาค','ปลายภาค'];
const keys=Object.keys(rows[0]);assert.deepEqual(keys.slice(keys.indexOf(expected[0]),keys.indexOf(expected[0])+4),expected);
const config={sheet:'ปพ.5',startRow:3,idColumn:'B',beforeWorkColumn:'E',midColumn:'F',afterWorkColumn:'G',finalColumn:'H',workColumn:'',totalColumn:'I',gradeColumn:'K',allowOverwrite:false};
const wb=new ExcelJS.Workbook(),ws=wb.addWorksheet(config.sheet);ws.getCell('B3').value='00001';ws.getCell('J3').value={formula:'I3'};ws.getCell('L3').value=2;ws.getCell('E3').numFmt='0.0';ws.getCell('E3').fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFEEDDCC'}};
assert.equal(fillTemplate(wb,config,rows).changes.length,6);assert.equal(ws.getCell('E3').value,null);
fillTemplate(wb,config,rows,true);
const loaded=new ExcelJS.Workbook();await loaded.xlsx.load(await wb.xlsx.writeBuffer());const out=loaded.getWorksheet(config.sheet);
assert.deepEqual(['E3','F3','G3','H3','I3','K3'].map(c=>out.getCell(c).value),[30,20,29,13,92,'4']);assert.deepEqual(out.getCell('J3').value,{formula:'I3'});assert.equal(out.getCell('L3').value,2);assert.equal(out.getCell('E3').numFmt,'0.0');assert.equal(out.getCell('E3').fill.fgColor.argb,'FFEEDDCC');assert.equal(out.getCell('B3').value,'00001');
assert.throws(()=>fillTemplate(wb,{...config,afterWorkColumn:'E'},rows),/ไม่ซ้ำ/);
assert.throws(()=>fillTemplate(wb,config,[{...rows[0],'คะแนนเก็บ':60}]),/ไม่ตรง/);
const merged=new ExcelJS.Workbook(),ms=merged.addWorksheet(config.sheet);ms.getCell('B3').value='00001';ms.mergeCells('G3:H3');assert.throws(()=>fillTemplate(merged,config,rows,true),/รวม/);assert.equal(ms.getCell('E3').value,null);
console.log('PASS Separate 30/20/30/20 SGS columns, total 92, leading-zero IDs, preserved formulas/styles/assessment cells and atomic rejection');
const decimals={...rows[0],'คะแนนเก็บก่อนกลางภาค':29.6,'คะแนนเก็บหลังกลางภาค':29.6,'คะแนนเก็บ':59.2,'กลางภาค':19.6,'ปลายภาค':19.6,'คะแนนรวม':98.4};
for(const [mode,work,total] of [['nearest',60,100],['floor',58,96],['ceil',60,100]]){
 const rounded=roundedResults([decimals],{...config,rounding:mode,precision:0})[0];assert.equal(rounded['คะแนนเก็บ'],work);assert.equal(rounded['คะแนนรวม'],total);assert.equal(rounded['คะแนนเก็บ'],rounded['คะแนนเก็บก่อนกลางภาค']+rounded['คะแนนเก็บหลังกลางภาค']);
}
assert.equal(roundedResults([decimals],{rounding:'nearest',precision:0})[0]['คะแนนเก็บ'],59);
assert.equal(roundedResults([{...decimals,'คะแนนรวม':''}],{...config,rounding:'nearest',precision:0})[0]['คะแนนรวม'],'');
assert.throws(()=>roundedResults([{...decimals,'คะแนนเก็บ':60}],{...config,rounding:'nearest',precision:0}),/ไม่ตรง/);
console.log('PASS Phase rounding totals match displayed/exported parts; legacy combined profiles and incomplete totals retain behavior');
const tiny=resultRows({...state,submissions:[{...state.submissions[0],score:10}],enrollments:[{...enrollment,mid:null,final:null}]},course)[0];assert.equal(tiny['คะแนนเก็บก่อนกลางภาค'],10);assert.equal(tiny['คะแนนเก็บ'],10);assert.equal(tiny['คะแนนรวม'],'');
const order=(html,labels)=>{html=html.replace(/<th\b[^>]*>/g,'<th>');let previous=-1;for(const label of labels){const index=html.indexOf(label);assert(index>previous,`Out-of-order or missing ${label}`);previous=index;}};
order(renderToStaticMarkup(createElement(ScoreSummary,{state,course,enrollment})),['<span>ก่อนกลางภาค','<span>สอบกลางภาค','<span>หลังกลางภาค','<span>สอบปลายภาค']);
for(const role of ['student','admin']){const html=renderToStaticMarkup(createElement(Results,{state:{...state,user:{id:role==='student'?'s':'teacher',role}},course:{...course,can_edit:role==='admin'},refresh:async()=>{}}));order(html,['<th>ก่อนกลางภาค / 30','<th>สอบกลางภาค / 20','<th>หลังกลางภาค / 30','<th>สอบปลายภาค / 20']);}
const activity={...course,course_type:'activity',work_weight:100,before_work_weight:50,mid_weight:0,final_weight:0,pass_threshold:50};const activityHtml=renderToStaticMarkup(createElement(Results,{state,course:activity,refresh:async()=>{}}));assert(!activityHtml.includes('<th>สอบกลางภาค'));assert(!activityHtml.includes('<th>สอบปลายภาค'));
console.log('PASS Teacher/student four-part display order, actual 10-point accumulation, and activity courses without exams');
