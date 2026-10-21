import type { MaintenanceAuthReport, StoredFile } from '../types';
import { fileToStored } from '../lib/helpers';
type Props={report:MaintenanceAuthReport;onChange:(r:MaintenanceAuthReport)=>void;onSaveBack:()=>void;onPdf:()=>void;onExport:()=>void;busy:boolean};
const services=['Manutenção de água','Manutenção de esgoto','Reposição de pavimento'];
export const SOLICITANTES:Record<string,string>={
 'Manutenção de água':'Enc. Tania Maximiano Alves – tmalves@sabesp.com.br - (11) 96326-6138.',
 'Manutenção de esgoto':'Enc. Fábio Donizete Lemes De Godoi – fgodoi@sabesp.com.br - (11) 98684-7029.',
 'Reposição de pavimento':'Enc. Fabiana Da Silva Galvão – fgalvao@sabesp.com.br - (11) 97325-4810.'
};
export const EMPRESA='Zigurate Construção Ltda., CNPJ.: 32.836.259/0001-63, eng. º residente Henrique José da Rocha – (11) 9300-5894.';
const isInteger=(s:string)=>/^\d*$/.test(s);
const isDecimal=(s:string)=>/^\d*(?:[,.]\d{0,2})?$/.test(s);
export function MaintenanceAuthEditor({report:r,onChange,onSaveBack,onPdf,onExport,busy}:Props){
 const set=(k:keyof MaintenanceAuthReport,v:string)=>onChange({...r,[k]:v,updatedAt:new Date().toISOString()});
 const field=(label:string,k:keyof MaintenanceAuthReport,validate?:(s:string)=>boolean,readOnly=false)=><label className="field"><span>{label} {!readOnly&&<b className="required">*</b>}</span><input type="text" inputMode={validate?'decimal':undefined} readOnly={readOnly} value={String(r[k]??'')} onChange={e=>{if(!validate||validate(e.target.value))set(k,e.target.value)}} required={!readOnly}/></label>;
 const select=(label:string,k:'servico'|'interdicao'|'agentes',options:string[])=><label className="field"><span>{label} <b className="required">*</b></span><select value={r[k]} onChange={e=>set(k,e.target.value)}><option value="">Selecione</option>{options.map(o=><option key={o} value={o}>{o}</option>)}</select></label>;
 const add=async(files:FileList|null)=>{if(!files)return;const images=Array.from(files).filter(f=>f.type.startsWith('image/'));const stored=await Promise.all(images.map(fileToStored));onChange({...r,fotos:[...r.fotos,...stored]})};
 const move=(i:number,j:number)=>{const fotos=[...r.fotos];[fotos[i],fotos[j]]=[fotos[j],fotos[i]];onChange({...r,fotos})};
 return <main className="container"><div className="page-heading"><div><h2>Relatório Fotográfico Manutenção – Autorização</h2><p>Preencha a solicitação e adicione as fotografias.</p></div></div>
 <div className="maintenance-auth-form">
 <section className="card"><h3>1. Dados da solicitação</h3><div className="card-body form-grid">
 <label className="field"><span>Data do relatório</span><input type="text" readOnly value={new Date(`${r.dataRelatorio||new Date().toISOString().slice(0,10)}T12:00:00`).toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'})}/></label>
 {field('Número da OS','os',isInteger)}{field('Endereço','endereco')}{field('Número','numero',isInteger)}{field('Bairro','bairro')}
 </div></section>
 <section className="card"><h3>2. Dados da intervenção</h3><div className="card-body form-grid">
 {select('Serviço solicitado','servico',services)}
 <label className="field"><span>Data de execução</span><input type="text" readOnly value="de acordo com autorização da Secretaria de Transporte"/></label>
 {field('Prazo de execução (horas)','prazoExecucao',isInteger)}
 {select('Interdição da via','interdicao',['Meia pista','Total da pista'])}
 {select('Apoio dos agentes de trânsito','agentes',['SIM','NÃO'])}
 </div></section>
 <section className="card"><h3>3. Dimensões da Vala</h3><div className="card-body form-grid">
 {field('Largura (m)','largura',isDecimal)}{field('Comprimento (m)','comprimento',isDecimal)}
 </div></section>
 <section className="card"><h3>4. Responsáveis</h3><div className="card-body form-grid">
 <label className="field full"><span>Empresa responsável (fixo)</span><textarea readOnly value={EMPRESA} rows={2}/></label>
 <label className="field full"><span>Solicitante (automático)</span><textarea readOnly value={SOLICITANTES[r.servico]||''} rows={2}/></label>
 </div></section></div>
 <section className="card"><h3>5. Relatório fotográfico</h3><div className="card-body"><div className="actions"><label className="file-button secondary">Adicionar fotografias<input hidden type="file" accept="image/*" multiple onChange={e=>{void add(e.target.files);e.currentTarget.value=''}}/></label><label className="file-button secondary">Abrir câmera<input hidden type="file" accept="image/*" capture="environment" onChange={e=>{void add(e.target.files);e.currentTarget.value=''}}/></label></div>
 {r.fotos.map((f:StoredFile,i:number)=><article className="evidence-card" key={f.id}><div className="evidence-head"><strong>Foto {String(i+1).padStart(2,'0')}</strong><div className="actions"><button type="button" className="secondary" disabled={i===0} onClick={()=>move(i,i-1)}>↑</button><button type="button" className="secondary" disabled={i===r.fotos.length-1} onClick={()=>move(i,i+1)}>↓</button><button type="button" className="danger" onClick={()=>onChange({...r,fotos:r.fotos.filter(x=>x.id!==f.id)})}>Remover</button></div></div><div className="card-body"><img src={f.data} alt={`Foto ${i+1}`} style={{maxWidth:'100%',maxHeight:300,objectFit:'contain'}}/></div></article>)}
 </div></section><div className="editor-bar"><button className="secondary" onClick={onSaveBack}>Salvar e voltar</button><button className="secondary" onClick={onExport}>Exportar JSON</button><button onClick={onPdf} disabled={busy}>{busy?'Gerando PDF...':'Gerar PDF'}</button></div></main>
}
