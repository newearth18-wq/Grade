/** Grade -> private Google Drive. No credentials belong in this source file.
 * Set GRADE_URL and GRADE_BACKUP_KEY in Project Settings -> Script Properties.
 * Run setupDriveBackup yourself, review Google's permissions, and authorize once.
 * Daily trigger: approximately 02:00 Asia/Bangkok. Follow-up runs resume large jobs.
 */
function gradeConfig_() {
  var p=PropertiesService.getScriptProperties();
  var base=(p.getProperty('GRADE_URL')||'').replace(/\/$/,'');
  var key=p.getProperty('GRADE_BACKUP_KEY')||'';
  if(!/^https:\/\/(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+chatgpt\.site$/.test(base)||!/^[a-f0-9]{64}$/.test(key))throw Error('ตั้ง GRADE_URL และ GRADE_BACKUP_KEY ใน Script Properties ก่อน');
  var worker=p.getProperty('GRADE_WORKER_ID');if(!worker){worker=Utilities.getUuid();p.setProperty('GRADE_WORKER_ID',worker);}
  return {base:base,key:key,worker:worker,properties:p};
}
function gradeCall_(c,path,body,raw) {
  var options={method:body===undefined?'get':'post',headers:{'X-Grade-Backup-Key':c.key,'X-Grade-Backup-Worker':c.worker},muteHttpExceptions:true,followRedirects:false};
  if(body!==undefined){options.contentType='application/json';options.payload=JSON.stringify(body);}
  var r=UrlFetchApp.fetch(c.base+'/api/drive-backup/remote/'+path,options);
  // Do not forward the backup key through redirects or log provider response bodies.
  if(r.getResponseCode()!==200){var error=new Error('Grade backup request failed ('+r.getResponseCode()+')');error.gradeStatus=r.getResponseCode();throw error;}
  return raw?r:JSON.parse(r.getContentText());
}
function gradeHash_(bytes) {return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,bytes).map(function(x){return ('0'+((x+256)%256).toString(16)).slice(-2);}).join('');}
function gradeFolder_(parent,name) {var it=parent.getFoldersByName(name);if(it.hasNext()){var f=it.next();if(it.hasNext())throw Error('พบโฟลเดอร์ชื่อซ้ำ ต้องตรวจด้วยตนเอง');return f;}return parent.createFolder(name);}
function gradeFile_(parent,name) {var it=parent.getFilesByName(name);if(!it.hasNext())return null;var f=it.next();if(it.hasNext())throw Error('พบไฟล์ชื่อซ้ำ ต้องตรวจด้วยตนเอง');return f;}
function gradeFollowUp_(delay) {
  ScriptApp.getProjectTriggers().filter(function(t){return t.getHandlerFunction()==='resumeDriveBackup';}).forEach(function(t){ScriptApp.deleteTrigger(t);});
  ScriptApp.newTrigger('resumeDriveBackup').timeBased().after(delay||60000).create();
}
function setupDriveBackup() {
  var c=gradeConfig_(),remote=gradeCall_(c,'status'),email=Session.getEffectiveUser().getEmail().toLowerCase();
  if(email!==remote.account)throw Error('ต้องอนุญาตด้วยบัญชีปลายทางที่ตั้งใน Grade');
  var folder=DriveApp.getFolderById(remote.folderId);
  if(!folder.getOwner()||folder.getOwner().getEmail().toLowerCase()!==remote.account||folder.getSharingAccess()!==DriveApp.Access.PRIVATE||folder.getEditors().length||folder.getViewers().length)throw Error('ต้องใช้โฟลเดอร์ส่วนตัวที่เป็นเจ้าของโดยบัญชีปลายทาง');
  ScriptApp.getProjectTriggers().filter(function(t){return t.getHandlerFunction()==='runDriveBackup'||t.getHandlerFunction()==='resumeDriveBackup';}).forEach(function(t){ScriptApp.deleteTrigger(t);});
  c.properties.setProperty('GRADE_RETRY_COUNT','0');
  ScriptApp.newTrigger('runDriveBackup').timeBased().everyDays(1).atHour(2).inTimezone('Asia/Bangkok').create();
  runDriveBackup();
}
function resumeDriveBackup() {runDriveBackup();}
function runDriveBackup() {
  var lock=LockService.getScriptLock();if(!lock.tryLock(1000))return;
  var c=null,job=null,deadline=Date.now()+240000;
  try {
    c=gradeConfig_();var remote=gradeCall_(c,'status'),email=Session.getEffectiveUser().getEmail().toLowerCase();
    if(email!==remote.account)throw Error('บัญชี Google ไม่ตรง');
    var root=DriveApp.getFolderById(remote.folderId);
    if(!root.getOwner()||root.getOwner().getEmail().toLowerCase()!==remote.account||root.getSharingAccess()!==DriveApp.Access.PRIVATE||root.getEditors().length||root.getViewers().length)throw Error('โฟลเดอร์สำรองต้องเป็นส่วนตัว');
    var recent=gradeCall_(c,'recent').jobs;recent.forEach(function(j){var f=DriveApp.getFolderById(j.folder_id),parents=f.getParents();if(!parents.hasNext()||parents.next().getId()!==root.getId())throw Error('ปลายทางชุดเดิมไม่ตรง');f.setName('Grade-Backup-'+j.backup_date+'-'+j.id.slice(0,8));var progress=gradeFile_(f,'progress.json');if(progress)progress.setTrashed(true);});
    gradeCall_(c,'daily',{});
    while(Date.now()<deadline) {
      job=gradeCall_(c,'next').job;if(!job){c.properties.setProperty('GRADE_RETRY_COUNT','0');return;}
      var packet=gradeCall_(c,'claim',{jobId:job.id,workerId:c.worker});
      var directory=gradeFolder_(root,job.name+'.partial'),assetsFolder=gradeFolder_(directory,'assets');
      var progressFile=gradeFile_(directory,'progress.json'),progress=progressFile?JSON.parse(progressFile.getBlob().getDataAsString('UTF-8')):{jobId:job.id,assets:[]};
      if(progress.jobId!==job.id)throw Error('ไฟล์ความคืบหน้าไม่ตรงชุด');
      if(!progressFile)progressFile=directory.createFile('progress.json',JSON.stringify(progress),'application/json');
      for(var i=0;i<packet.sources.length;i++) {
        var s=packet.sources[i],record=progress.assets.filter(function(a){return a.id===s.id;})[0];if(record)continue;
        if(Date.now()>=deadline){gradeFollowUp_();return;}
        gradeCall_(c,'claim',{jobId:job.id,workerId:c.worker});
        var response=gradeCall_(c,'jobs/'+encodeURIComponent(job.id)+'/assets/'+encodeURIComponent(s.id),undefined,true),bytes=response.getBlob().getBytes();
        if(bytes.length!==s.size)throw Error('ขนาดไฟล์ต้นฉบับไม่ตรง');var hash=gradeHash_(bytes),headers=response.getAllHeaders(),expected=Object.keys(headers).filter(function(k){return k.toLowerCase()==='x-grade-backup-sha256';})[0];if(!expected||String(headers[expected])!==hash)throw Error('ลายนิ้วมือจาก Grade ไม่ตรง');var file=gradeFile_(assetsFolder,s.id);
        if(!file)file=assetsFolder.createFile(Utilities.newBlob(bytes,s.mime,s.id));
        var stored=file.getBlob().getBytes();if(stored.length!==s.size||gradeHash_(stored)!==hash)throw Error('ตรวจไฟล์บน Drive ไม่ผ่าน');
        progress.assets.push({id:s.id,size:s.size,sha256:hash,driveFileId:file.getId()});progressFile.setContent(JSON.stringify(progress));
      }
      packet.manifest.assets=packet.sources.map(function(s){var a=progress.assets.filter(function(a){return a.id===s.id;})[0];return {id:s.id,kind:s.kind,referenceId:s.referenceId,size:s.size,mime:s.mime,sha256:a.sha256};});
      var text=JSON.stringify(packet.manifest),manifest=gradeFile_(directory,'manifest.json');
      if(!manifest)manifest=directory.createFile('manifest.json',text,'application/json');else manifest.setContent(text);
      var manifestBytes=manifest.getBlob().getBytes(),manifestHash=gradeHash_(Utilities.newBlob(text,'application/json').getBytes());
      if(gradeHash_(manifestBytes)!==manifestHash)throw Error('ตรวจ manifest บน Drive ไม่ผ่าน');
      gradeCall_(c,'claim',{jobId:job.id,workerId:c.worker});
      gradeCall_(c,'complete',{jobId:job.id,workerId:c.worker,account:email,parentFolderId:root.getId(),folderId:directory.getId(),manifestFileId:manifest.getId(),manifestSha256:manifestHash,assets:progress.assets});
      // Rename only after Grade has independently checked every original hash.
      directory.setName(job.name);progressFile.setTrashed(true);c.properties.setProperty('GRADE_RETRY_COUNT','0');job=null;
    }
    gradeFollowUp_();
  } catch(e) {
    if(c&&job){try{gradeCall_(c,'error',{jobId:job.id,workerId:c.worker});}catch(ignore){}}
    if(c&&e.gradeStatus!==403){var retries=Number(c.properties.getProperty('GRADE_RETRY_COUNT')||'0');if(retries<3){c.properties.setProperty('GRADE_RETRY_COUNT',String(retries+1));try{gradeFollowUp_(Math.pow(2,retries)*60000);}catch(ignore){}}}
    // Throw a generic error so Google trigger failures can notify the script owner.
    // No key, source record, file bytes or provider response body is logged.
    throw Error('Grade Drive backup failed. ตรวจสถานะใน Grade และ Executions ของโปรเจกต์นี้');
  } finally {lock.releaseLock();}
}
