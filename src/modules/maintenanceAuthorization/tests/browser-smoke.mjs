import { writeFileSync, mkdirSync } from "node:fs";
const artifacts =
  process.env.MA_TEST_ARTIFACTS || "/tmp/maintenance-authorization-tests";
mkdirSync(artifacts, { recursive: true });
const pages = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const ws = new WebSocket(
  pages.find((p) => p.type === "page").webSocketDebuggerUrl,
);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map(),
  errors = [];
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id) {
    pending.get(m.id)?.(m);
    pending.delete(m.id);
  }
  if (m.method === "Runtime.exceptionThrown")
    errors.push(m.params.exceptionDetails);
};
const call = (method, params = {}) =>
  new Promise((r) => {
    pending.set(++id, r);
    ws.send(JSON.stringify({ id, method, params }));
  });
const ev = async (expression) => {
  const r = await call("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (r.result?.exceptionDetails)
    throw Error(JSON.stringify(r.result.exceptionDetails));
  return r.result.result.value;
};
const assert = (a, b) => {
  if (!a) throw Error(b);
};
const pause = () => new Promise((r) => setTimeout(r, 400));
const waitFor = async (expression) => {
  for (let i = 0; i < 60; i++) {
    if (await ev(expression)) return;
    await pause();
  }
  throw Error("Timeout: " + expression);
};
await call("Runtime.enable");
await call("Page.navigate", { url: "http://127.0.0.1:5173/" });
for (let n = 0; n < 60; n++) {
  if (await ev("document.querySelectorAll('.portal-card').length===7")) break;
  await pause();
}
assert(
  await ev("document.querySelectorAll('.portal-card').length===7"),
  "7 cards",
);
await ev(
  "[...document.querySelectorAll('.portal-card')].find(b=>b.textContent.includes('Manutenção')).click()",
);
await pause();
assert(await ev("!!document.querySelector('.ma-module')"), "module navigation");
await ev(
  "[...document.querySelectorAll('.ma-module button')].find(b=>b.textContent.includes('Novo relatório')).click()",
);
await pause();
assert(
  await ev("document.querySelector('input[type=date]').readOnly"),
  "readonly date",
);
assert(
  await ev(
    "!document.querySelector('.ma-module').textContent.includes('agentes')",
  ),
  "no traffic agents",
);
await ev(
  "(()=>{const s=document.querySelector('.ma-module select');s.value='Manutenção de esgoto';s.dispatchEvent(new Event('change',{bubbles:true}));})()",
);
await pause();
assert(
  await ev(
    "document.querySelector('.ma-module').textContent.includes('Solicitante')&&[...document.querySelectorAll('textarea')].some(e=>e.value.includes('Fábio'))",
  ),
  "requester update",
);
assert(
  await ev(
    "JSON.stringify([...document.querySelectorAll('.ma-form-actions button')].map(b=>b.textContent))===JSON.stringify(['Salvar e voltar','Gerar PDF'])",
  ),
  "two final actions",
);
assert(
  await ev(
    "document.querySelector('.ma-form-actions').previousElementSibling.tagName==='SECTION'",
  ),
  "actions after photos",
);
assert(
  await ev(
    "!/(Data de execução|Prazo de execução|Interdição da via|Exportar JSON)/.test(document.querySelector('.ma-module').textContent)",
  ),
  "removed fields/actions",
);
assert(
  await ev(
    "JSON.stringify([...document.querySelectorAll('.ma-grid select')[1].options].map(o=>o.value))===JSON.stringify(['','Terço','Eixo','Passeio'])",
  ),
  "position options",
);
// Isolated functional tests exercise storage, legacy compatibility, validation, image conversion and real PDF output.
const results = await ev(`(async()=>{
 const m=await import('/src/modules/maintenanceAuthorization/model.ts'),{storage}=await import('/src/modules/maintenanceAuthorization/storage.ts'),{generatePdf}=await import('/src/modules/maintenanceAuthorization/pdf.ts'),{readPhoto}=await import('/src/modules/maintenanceAuthorization/images.ts');
 const assert=(ok,msg)=>{if(!ok)throw Error(msg)};
 const r={...m.newReport(),os:'7654321',endereco:'Rua Benjamin Constant',numero:'1980',bairro:'Centro',posicaoIntervencao:'Terço',largura:'1,25',comprimento:'2,50',dataRelatorio:'2026-10-21'};
 assert(m.decimal('1,2')==='1,20','decimal comma');assert(m.decimal('2.5')==='2,50','decimal dot');
 for(const bad of [{...r,kind:'photo'},{...r,dataRelatorio:'2026-02-30'},{...r,os:'1x'},{...r,fotos:[{data:'data:text/html;base64,AAAA'}]},{...r,version:999},{...r,posicaoIntervencao:'Meia pista'}]){let rejected=false;try{m.parseReport(bad)}catch{rejected=true}assert(rejected,'invalid JSON accepted')}
 for(const version of [1,19]){const {posicaoIntervencao,...old}=r;const legacy=m.parseReport({...old,version,interdicao:'Total da pista',prazoExecucao:'8',agentes:'SIM',dataExecucao:'antiga'});assert(legacy.posicaoIntervencao===''&&legacy.version===2&&!('interdicao'in legacy)&&!('prazoExecucao'in legacy)&&!('dataExecucao'in legacy),'legacy migration');assert(legacy.dataRelatorio===r.dataRelatorio,'legacy original date');let blocked=false;try{m.validate(legacy)}catch{blocked=true}assert(blocked,'legacy position must be selected')}
 for(const posicaoIntervencao of m.POSITIONS)m.validate({...r,posicaoIntervencao});
 assert(m.parseReport({...r,version:19,servico:'',interdicao:''}).servico==='','legacy draft');
 const date=r.dataRelatorio;await storage.put(r);let all=await storage.all();assert(all.find(x=>x.id===r.id)?.dataRelatorio===date,'save/date');
 await storage.put({...r,archivedAt:new Date().toISOString()});assert((await storage.all()).find(x=>x.id===r.id)?.archivedAt,'archive');await storage.put({...r,archivedAt:null});assert(!(await storage.all()).find(x=>x.id===r.id)?.archivedAt,'unarchive');
 const c=document.createElement('canvas');c.width=800;c.height=400;const ctx=c.getContext('2d');ctx.fillStyle='#00abcd';ctx.fillRect(0,0,800,400);const blob=await new Promise(res=>c.toBlob(res,'image/png'));const photo=await readPhoto(new File([blob],'test.png',{type:'image/png'}));assert(photo.data.startsWith('data:image/jpeg'),'image processing');
 const toBase64=blob=>new Promise(res=>{const f=new FileReader();f.onload=()=>res(f.result.split(',')[1]);f.readAsDataURL(blob)});
 const outputs=[];
 for(const count of [0,1,2,5]){const report={...r,fotos:Array.from({length:count},(_,i)=>({...photo,id:crypto.randomUUID(),name:'photo'+i}))};const pdf=await generatePdf(report);outputs.push({count,data:await toBase64(pdf)});}
 const long=await generatePdf({...r,endereco:'A'.repeat(7000),bairro:'Bairro de Teste',fotos:[photo]});outputs.push({count:'long',data:await toBase64(long)});
 const imported=m.parseReport(JSON.parse(JSON.stringify({...r,fotos:[photo]})));await storage.put(imported);assert((await storage.all()).find(x=>x.id===r.id)?.fotos[0].data===photo.data,'photo JSON roundtrip');await storage.remove(r.id);assert(!(await storage.all()).some(x=>x.id===r.id),'delete');
 return {outputs,checks:['decimal','invalid imports','legacy v19','drafts','date preservation','save/read','archive/unarchive','delete','image processing','photo JSON roundtrip']};})()`);
for (const o of results.outputs)
  writeFileSync(
    `${artifacts}/maintenance-${o.count}.pdf`,
    Buffer.from(o.data, "base64"),
  );
// Mobile width and photo interaction via actual file input event, with photos generated locally.
await call("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true,
});
await ev(
  `(async()=>{const c=document.createElement('canvas');c.width=100;c.height=50;const ctx=c.getContext('2d');ctx.fillStyle='red';ctx.fillRect(0,0,100,50);const blob=await new Promise(r=>c.toBlob(r));const dt=new DataTransfer();dt.items.add(new File([blob],'one.png',{type:'image/png'}));dt.items.add(new File([blob],'two.png',{type:'image/png'}));const input=document.querySelector('input[multiple]');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`,
);
await pause();
assert(
  await ev("document.querySelectorAll('.ma-photo').length===2"),
  "add multiple photos",
);
await ev(
  "document.querySelector('[aria-label=\"Mover fotografia 1 para baixo\"]').click()",
);
await pause();
assert(
  await ev("document.querySelectorAll('.ma-photo').length===2"),
  "reorder photos",
);
await ev(
  "document.querySelector('[aria-label=\"Excluir fotografia 1\"]').click()",
);
await pause();
assert(
  await ev("document.querySelectorAll('.ma-photo').length===1"),
  "delete photo",
);
assert(
  await ev("document.documentElement.scrollWidth<=window.innerWidth"),
  "mobile overflow",
);
const shot = await call("Page.captureScreenshot", {
  format: "png",
  captureBeyondViewport: true,
});
writeFileSync(
  `${artifacts}/maintenance-mobile.png`,
  Buffer.from(shot.result.data, "base64"),
);
const beforeSave = await ev(
  "(async()=>{const {storage}=await import('/src/modules/maintenanceAuthorization/storage.ts');return (await storage.all()).map(r=>r.id);})()",
);
await ev("document.querySelector('.ma-form-actions button').click()");
await waitFor(
  "!document.querySelector('.ma-form-actions')&&!!document.querySelector('.ma-module')",
);
const savedDraft = await ev(
  "(async()=>{const {storage}=await import('/src/modules/maintenanceAuthorization/storage.ts');return await storage.all();})()",
);
const created = savedDraft.filter((r) => !beforeSave.includes(r.id));
assert(
  created.length === 1 && created[0].fotos.length === 1,
  "save and back persists photos",
);
await ev(
  `(async()=>{const {storage}=await import('/src/modules/maintenanceAuthorization/storage.ts');await storage.remove(${JSON.stringify(created[0].id)});})()`,
);
await ev("document.querySelector('.ma-heading button').click()");
await pause();
assert(
  await ev("document.querySelectorAll('.portal-card').length===7"),
  "back to portal",
);
for (let index = 0; index < 6; index++) {
  await ev(`document.querySelectorAll('.portal-card')[${index}].click()`);
  await pause();
  assert(
    await ev(
      "!!document.querySelector('main')&&!document.querySelector('.ma-module')",
    ),
    "existing module " + index,
  );
  await call("Page.navigate", { url: "http://127.0.0.1:5173/" });
  await waitFor("document.querySelectorAll('.portal-card').length===7");
}
assert(!errors.length, JSON.stringify(errors));
console.log(
  JSON.stringify({
    passed: [
      ...results.checks,
      "navigation",
      "requester",
      "mobile layout",
      "photo UI",
      "6 existing dashboards",
    ],
    pdfs: results.outputs.map((x) => x.count),
    runtimeErrors: errors.length,
  }),
);
ws.close();
