/** QR holds a navigation destination, never credentials or permission to start an exam. */
export function examEntryId(value:string){return /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value)?value.toLowerCase():'';}
export function examEntryHash(hash:string){return hash.startsWith('#exam=')?examEntryId(hash.slice(6)):'';}
export function examEntryUrl(origin:string,id:string){const valid=examEntryId(id);if(!valid)throw new Error('รหัสข้อสอบไม่ถูกต้อง');return new URL('/#exam='+valid,origin).href;}
