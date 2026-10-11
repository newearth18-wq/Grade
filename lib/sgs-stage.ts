export type SgsStage = 'all' | 'midterm' | 'final';
export function sgsStage(value: unknown): SgsStage {
 if(value===undefined||value==='all')return 'all';
 if(value==='midterm'||value==='final')return value;
 throw new Error('ช่วงส่งออก SGS ไม่ถูกต้อง');
}
export const sgsStageLabel=(stage:SgsStage)=>stage==='midterm'?'ช่วงกลางภาค':stage==='final'?'ช่วงปลายภาค':'ตลอดภาคเรียน';
/** Select destinations at the write boundary, even when a saved profile has other mappings. */
export function sgsColumns<T extends {exportStage?:SgsStage;beforeWorkColumn?:string;afterWorkColumn?:string;midColumn:string;finalColumn:string;workColumn:string;totalColumn:string;gradeColumn:string}>(config:T):T {
 const stage=sgsStage(config.exportStage);
 return stage==='all'?config:{...config,
  beforeWorkColumn:stage==='midterm'?config.beforeWorkColumn:'',midColumn:stage==='midterm'?config.midColumn:'',
  afterWorkColumn:stage==='final'?config.afterWorkColumn:'',finalColumn:stage==='final'?config.finalColumn:'',
  workColumn:'',totalColumn:'',gradeColumn:''};
}
