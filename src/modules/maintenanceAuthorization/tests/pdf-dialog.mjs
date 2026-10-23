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
await waitFor("document.querySelectorAll('.portal-card').length===7");
const fixture = await ev(`(async()=>{
 const m=await import('/src/modules/maintenanceAuthorization/model.ts'),{storage}=await import('/src/modules/maintenanceAuthorization/storage.ts');
 const r={...m.newReport(),os:'99112233',endereco:'Rua Exemplo',numero:'100',bairro:'Centro',servico:'Manutenção de água',posicaoIntervencao:'Eixo',largura:'1,20',comprimento:'2,50'};
 const expected='Rua Exemplo, 100, Centro – Manutenção de água - OS99112233.pdf';
 if(m.pdfFileName(r)!==expected)throw Error('Filename mismatch');
 if(/[\\/:*?"<>|]/.test(m.pdfFileName({...r,endereco:'Rua / teste: "A"'})))throw Error('Unsafe filename');
 await storage.put(r);return {id:r.id,expected};})()`);
try {
  await ev(
    "[...document.querySelectorAll('.portal-card')].find(b=>b.textContent.includes('Manutenção')).click()",
  );
  await waitFor(
    "[...document.querySelectorAll('.ma-row')].some(r=>r.textContent.includes('99112233'))",
  );
  await ev(
    "window.__maClicks=[];window.__maAnchorClick=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(this.download){window.__maClicks.push({name:this.download,url:this.href});return;}return window.__maAnchorClick.call(this)};[...document.querySelectorAll('.ma-row')].find(r=>r.textContent.includes('99112233')).querySelectorAll('button')[2].click()",
  );
  await waitFor("!!document.querySelector('dialog[open]')");
  assert(
    await ev("window.__maClicks.length===0"),
    "generation must not auto-download",
  );
  assert(
    await ev(
      "document.querySelector('dialog h2').textContent==='PDF gerado'&&document.querySelector('dialog p').textContent==='O arquivo foi criado diretamente no navegador.'",
    ),
    "dialog text",
  );
  assert(
    await ev(
      "JSON.stringify([...document.querySelectorAll('dialog button,dialog a')].map(b=>b.textContent))===JSON.stringify(['Baixar PDF','Compartilhar','Abrir','Fechar'])",
    ),
    "four actions",
  );
  assert(
    await ev("document.activeElement.textContent==='Baixar PDF'"),
    "initial dialog focus",
  );
  await ev("document.querySelector('dialog button').click()");
  const downloaded = await ev("window.__maClicks[0]");
  assert(downloaded.name === fixture.expected, "download filename");
  assert(
    await ev(
      `(async()=>new TextDecoder().decode((await (await fetch(${JSON.stringify(downloaded.url)})).arrayBuffer()).slice(0,5))==='%PDF-')()`,
    ),
    "download is real PDF",
  );
  await ev(
    "window.__maShareDescriptor=Object.getOwnPropertyDescriptor(navigator,'share');window.__maCanShareDescriptor=Object.getOwnPropertyDescriptor(navigator,'canShare');Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.__maShared={name:data.files[0].name,type:data.files[0].type,size:data.files[0].size,title:data.title}}});document.querySelectorAll('dialog button')[1].click()",
  );
  await waitFor("!!window.__maShared");
  const shared = await ev("window.__maShared");
  assert(
    shared.name === fixture.expected &&
      shared.type === "application/pdf" &&
      shared.size > 1000,
    "shared PDF file",
  );
  await ev(
    "Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>false});document.querySelectorAll('dialog button')[1].click()",
  );
  await waitFor(
    "document.querySelector('dialog [role=status]').textContent.includes('não permite')",
  );
  await ev(
    "Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{throw new DOMException('Canceled','AbortError')}});document.querySelectorAll('dialog button')[1].click()",
  );
  await pause();
  assert(
    await ev("document.querySelector('dialog [role=status]').textContent===''"),
    "share cancellation is silent",
  );
  await ev(
    "Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{throw Error('Test failure')}});document.querySelectorAll('dialog button')[1].click()",
  );
  await waitFor(
    "document.querySelector('dialog [role=status]').textContent.includes('Não foi possível')",
  );
  const openedUrl = await ev("document.querySelector('dialog a').href");
  assert(
    await ev(
      `(async()=>new TextDecoder().decode((await (await fetch(${JSON.stringify(openedUrl)})).arrayBuffer()).slice(0,5))==='%PDF-')()`,
    ),
    "open link is real PDF",
  );
  const linkRect = await ev(
    "(()=>{const r=document.querySelector('dialog a').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()",
  );
  await call("Input.dispatchMouseEvent", {
    type: "mousePressed",
    ...linkRect,
    button: "left",
    clickCount: 1,
  });
  await call("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    ...linkRect,
    button: "left",
    clickCount: 1,
  });
  await pause();
  const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
  const opened = tabs.find((t) => t.type === "page" && t.url === openedUrl);
  assert(opened, "PDF opens in new tab");
  await call("Target.closeTarget", { targetId: opened.id });
  await ev(
    "[...document.querySelectorAll('dialog button')].find(b=>b.textContent==='Fechar').click()",
  );
  await waitFor("!document.querySelector('dialog')");
  await ev(
    "[...document.querySelectorAll('.ma-row')].find(r=>r.textContent.includes('99112233')).querySelector('button').click()",
  );
  await waitFor("!!document.querySelector('.ma-form-actions')");
  await ev("document.querySelectorAll('.ma-form-actions button')[1].click()");
  await waitFor("!!document.querySelector('dialog[open]')");
  await call("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  assert(
    await ev(
      "document.querySelector('dialog').getBoundingClientRect().width<=window.innerWidth",
    ),
    "mobile dialog fits",
  );
  const shot = await call("Page.captureScreenshot", { format: "png" });
  writeFileSync(
    `${artifacts}/pdf-dialog.png`,
    Buffer.from(shot.result.data, "base64"),
  );
  await call("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "Escape",
    code: "Escape",
    windowsVirtualKeyCode: 27,
  });
  await call("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "Escape",
    code: "Escape",
    windowsVirtualKeyCode: 27,
  });
  await waitFor("!document.querySelector('dialog')");
  assert(!errors.length, JSON.stringify(errors));
  console.log(
    "PASS: generation from list/editor, no automatic download, four actions, real PDF download/open, filename, share capability/success/cancel/error (simulated), mobile, close and Escape",
  );
} finally {
  await ev(
    `(async()=>{HTMLAnchorElement.prototype.click=window.__maAnchorClick||HTMLAnchorElement.prototype.click;for(const [name,descriptor] of [['share',window.__maShareDescriptor],['canShare',window.__maCanShareDescriptor]]){if(descriptor)Object.defineProperty(navigator,name,descriptor);else delete navigator[name];}const {storage}=await import('/src/modules/maintenanceAuthorization/storage.ts');await storage.remove(${JSON.stringify(fixture.id)});})()`,
  );
  ws.close();
}
