// Fault injection for the disposable localhost classroom only. Never targets production.
import http from 'node:http';
let mode='normal';
http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://127.0.0.1:8789');if(url.pathname==='/__qa/mode'){mode=url.searchParams.get('value')||'normal';res.end(mode);return;}
 const exam=url.pathname.startsWith('/api/exam-attempts/');if(mode==='exam-outage'&&exam||mode==='exam-write-outage'&&exam&&/\/(save|lock)$/.test(url.pathname)||mode==='uncertain-submit'&&url.pathname==='/api/submission-status'){res.writeHead(503,{'Content-Type':'text/plain'});res.end('Disposable QA connection fault');return;}
 const chunks=[];for await(const chunk of req)chunks.push(chunk);const headers={...req.headers,host:'127.0.0.1:8788'};if(headers.origin==='http://127.0.0.1:8789')headers.origin='http://127.0.0.1:8788';delete headers['content-length'];
 const response=await fetch('http://127.0.0.1:8788'+req.url,{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)});
 if(['drop-submit','uncertain-submit'].includes(mode)&&url.pathname==='/api/submit'&&req.method==='POST'&&response.ok){await response.arrayBuffer();res.writeHead(503,{'Content-Type':'text/plain'});res.end('Disposable QA lost response');return;}
 const output=Object.fromEntries(response.headers);delete output['content-encoding'];delete output['content-length'];res.writeHead(response.status,output);res.end(Buffer.from(await response.arrayBuffer()));
}catch{res.writeHead(503);res.end('Disposable QA upstream unavailable');}}).listen(8789,'127.0.0.1',()=>console.log('Fault preview http://127.0.0.1:8789/; modes normal, exam-outage, drop-submit, uncertain-submit'));
