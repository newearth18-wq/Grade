'use client';
import {Check} from 'lucide-react';
import {companions,type IslandCompanion} from '@/lib/adventure-catalog';
import './companion-picker.css';

export function CompanionPicker({selected,persisted,busy,onSelect}:{selected:IslandCompanion;persisted:boolean;busy:boolean;onSelect:(id:IslandCompanion)=>Promise<boolean>}){
 const buddy=companions.find(c=>c.id===selected)!;
 return <section className='companion-picker' aria-label='เลือกคู่หูของฉัน'>
  <div className='companion-picker-heading'><div><h3>เลือกคู่หูของฉัน</h3><p>ชวนเพื่อนตัวโปรดมาอยู่บนเกาะ เลือกได้ทุกตัวตั้งแต่เริ่ม</p></div><span>เปลี่ยนได้เสมอ</span></div>
  <div className='companion-picker-options' role='group' aria-label='ชนิดคู่หู'>{companions.map(c=><button key={c.id} type='button' disabled={busy} aria-label={`เลือก${c.name}`} aria-pressed={selected===c.id} onClick={()=>void onSelect(c.id)}>
   <span className='companion-portrait' aria-hidden='true'>{c.icon}</span><strong>{c.name}</strong><small>{selected===c.id?<><Check size={12}/> คู่หูของฉัน</>:'ชวนมาอยู่ด้วยกัน'}</small>
  </button>)}</div>
  <p className='companion-picker-status' role='status'>{busy?'กำลังบันทึกคู่หู…':persisted?`คู่หูตอนนี้: ${buddy.name} · บันทึกกับบัญชี ใช้ต่อบนอุปกรณ์อื่นได้`:'เลือกตัวที่ชอบเพื่อบันทึกกับบัญชี และพาคู่หูไปใช้บนอุปกรณ์อื่น'}</p>
 </section>;
}
