'use client';
import {useEffect,useRef,useState} from 'react';
import {api,ApiError} from '@/lib/client';
import {readSubmissionDraft,saveSubmissionDraft,removeSubmissionDraft,validateSubmissionFiles,type SubmissionDraft} from '@/lib/submission-drafts';
export function useSubmissionDraft(key:string|undefined){
 const [draft,setDraft]=useState<SubmissionDraft>({requestId:'',note:'',files:[],savedAt:0}),[loadedKey,setLoadedKey]=useState<string>(),[message,setMessage]=useState('');const ready=!key||loadedKey===key;
 const current=useRef(draft),queue=useRef<Promise<any>>(Promise.resolve()),cleared=useRef(false);current.current=draft;
 useEffect(()=>{if(!key)return;cleared.current=false;let alive=true;void readSubmissionDraft(key).then(saved=>{if(!alive)return;const valid=saved&&typeof saved.requestId==='string'&&typeof saved.note==='string'&&Array.isArray(saved.files)&&saved.files.every(f=>f instanceof File);const next=valid?saved!:{requestId:crypto.randomUUID(),note:'',files:[],savedAt:0};current.current=next;setDraft(next);setMessage(valid?'เปิดฉบับร่างที่เก็บไว้บนอุปกรณ์นี้แล้ว':'');}).catch(()=>{if(alive){const next={requestId:crypto.randomUUID(),note:'',files:[],savedAt:0};current.current=next;setDraft(next);setMessage('อุปกรณ์นี้เก็บฉบับร่างไม่ได้ กรุณาคงหน้าต่างนี้ไว้จนส่งสำเร็จ');}}).finally(()=>{if(alive)setLoadedKey(key);});return ()=>{alive=false;};},[key]);
 const persist=async(value=current.current)=>{if(!key||cleared.current)return;const stored={...value,savedAt:Date.now()};queue.current=queue.current.catch(()=>{}).then(()=>saveSubmissionDraft(key,stored));try{await queue.current;setMessage('เก็บฉบับร่างบนอุปกรณ์นี้แล้ว · ยังไม่ได้ส่งให้ครู');}catch{setMessage('เก็บฉบับร่างบนอุปกรณ์ไม่สำเร็จ กรุณาคงหน้าต่างนี้ไว้จนส่งสำเร็จ');}};
 useEffect(()=>{if(!key||!ready||(!draft.note&&!draft.files.length))return;const timer=setTimeout(()=>void persist(),300);return ()=>clearTimeout(timer);},[draft,key,ready]);
 const update=(change:Partial<SubmissionDraft>)=>{const next={...current.current,...change};current.current=next;setDraft(next);};
 const send=async(assignmentId:string,form:FormData)=>{
  const value=current.current;validateSubmissionFiles(value.files);await persist(value);form.delete('files');value.files.forEach(f=>form.append('files',f));form.set('note',value.note);form.set('assignmentId',assignmentId);form.set('requestId',value.requestId);
  let result:any;try{result=await api('submit',form);}catch(error){if(error instanceof ApiError&&(error.status===0||error.status>=500||error.status===409)){try{result=(await api(`submission-status?assignmentId=${encodeURIComponent(assignmentId)}&requestId=${encodeURIComponent(value.requestId)}`)).receipt;}catch{}if(!result)throw error;}else throw error;}
  cleared.current=true;await queue.current.catch(()=>{});if(key)await removeSubmissionDraft(key).catch(()=>{});return result;
 };
 const discard=async()=>{if(!key)return;const previous=current.current;cleared.current=true;update({requestId:crypto.randomUUID(),note:'',files:[],savedAt:0});await queue.current.catch(()=>{});try{await removeSubmissionDraft(key);setMessage('ลบฉบับร่างบนอุปกรณ์นี้แล้ว');}catch{update(previous);setMessage('ลบฉบับร่างไม่ได้ กรุณาลองอีกครั้ง');}finally{cleared.current=false;}};
 return {draft,ready,message,update,send,discard,flush:()=>ready?persist():Promise.resolve()};
}
