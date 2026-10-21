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
 const field=(label:string,k:keyof MaintenanceAuthReport,type='text',validate?:(s:string)=>boolean)=><label className="field"><span>{label} <b className="required">*</b></span><input type={type} inputMode={validate?'decimal':undefined} value={String(r[k]??'')} onChange={e=>{if(!validate||validate(e.target.value))set(k,e.target.value)}} required/></label>;
 const add=async(files:FileList|null)=>{if(!files)return;const images=Array.from(files).filter(f=>f.type.startsWith('image/'));const stored=await Promise.all(images.map(fileToStored));onChange({...r,fotos:[...r.fotos,...stored]})};
 const move=(i:number,j:number)=>{const fotos=[...r.fotos];[fotos[i],fotos[j]]=[fotos[j],fotos[i]];onChange({...r,fotos})};
 return <main className="container"><div className="page-heading"><div><h2>Relatório Fotográfico Manutenção – Autorização</h2><p>Preencha a solicitação e adicione as fotografias.</p></div></div>
 <section className="card"><h3>1. Dados da solicitação</h3><div className="card-body form-grid">
 {field('Número da OS','os','text',isInteger)}{field('Data do relatório','dataRelatorio','date')}
 <label className="field"><span>Serviço solicitado <b className="required">*</b></span><select value={r.servico} onChange={e=>set('servico',e.target.value)}><option value="">Selecione</option>{services.map(s=><option key={s}>{s}</option>)}</select></label>
 {field('Endereço','endereco')}{field('Número','numero','text',isInteger)}{field('Bairro','bairro')}{field('Data da execução','dataExecucao','date')}
 {field('Largura (m)','largura','text',isDecimal)}{field('Comprimento (m)','comprimento','text',isDecimal)}
 <label className="field"><span>Interdição da via <b className="required">*</b></span><select value={r.interdicao} onChange={e=>set('interdicao',e.target.value)}><option value="">Selecione</option><option>Meia pista</option><option>Total da pista</option></select></label>
 <label className="field"><span>Apoio de agentes de trânsito <b className="required">*</b></span><select value={r.agentes} onChange={e=>set('agentes',e.target.value)}><option value="">Selecione</option><option>SIM</option><option>NÃO</option></select></label>
 <label className="field full"><span>Empresa responsável (fixo)</span><textarea readOnly value={EMPRESA} rows={2}/></label>
 <label className="field full"><span>Solicitante (automático)</span><textarea readOnly value={SOLICITANTES[r.servico]||''} rows={2}/></label>
 </div></section>
 <section className="card"><h3>2. Relatório fotográfico</h3><div className="card-body"><div className="actions"><label className="file-button secondary">Adicionar fotografias<input hidden type="file" accept="image/*" multiple onChange={e=>{void add(e.target.files);e.currentTarget.value=''}}/></label><label className="file-button secondary">Abrir câmera<input hidden type="file" accept="image/*" capture="environment" onChange={e=>{void add(e.target.files);e.currentTarget.value=''}}/></label></div>
 {r.fotos.map((f:StoredFile,i:number)=><article className="evidence-card" key={f.id}><div className="evidence-head"><strong>Foto {String(i+1).padStart(2,'0')}</strong><div className="actions"><button type="button" className="secondary" disabled={i===0} onClick={()=>move(i,i-1)}>↑</button><button type="button" className="secondary" disabled={i===r.fotos.length-1} onClick={()=>move(i,i+1)}>↓</button><button type="button" className="danger" onClick={()=>onChange({...r,fotos:r.fotos.filter(x=>x.id!==f.id)})}>Remover</button></div></div><div className="card-body"><img src={f.data} alt={`Foto ${i+1}`} style={{maxWidth:'100%',maxHeight:300,objectFit:'contain'}}/></div></article>)}
 </div></section><div className="editor-bar"><button className="secondary" onClick={onSaveBack}>Salvar e voltar</button><button className="secondary" onClick={onExport}>Exportar JSON</button><button onClick={onPdf} disabled={busy}>{busy?'Gerando PDF...':'Gerar PDF'}</button></div></main>
}
