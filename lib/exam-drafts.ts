export type ExamAnswers=Record<string,string|number|null>;
// Only acknowledge values included in this save; newer edits stay pending.
export function acknowledgeAnswers(pending:ExamAnswers,sent:ExamAnswers){return Object.fromEntries(Object.entries(pending).filter(([key,value])=>sent[key]!==value));}
export function mergePendingAnswers(saved:ExamAnswers,pending:ExamAnswers,questions?:{id:string}[]){const allowed=questions?new Set(questions.map(q=>q.id)):null;return {...saved,...Object.fromEntries(Object.entries(pending).filter(([key])=>!allowed||allowed.has(key)))};}
export function parsePendingAnswers(raw:string|null):ExamAnswers{try{const data=JSON.parse(raw||'{}');if(!data||Array.isArray(data)||typeof data!=='object')return {};return Object.fromEntries(Object.entries(data).filter(([key,value])=>/^q\d{1,3}$/.test(key)&&(value===null||typeof value==='string'&&value.length<=10000||typeof value==='number'&&Number.isInteger(value)&&value>=0&&value<6))) as ExamAnswers;}catch{return {};}}
