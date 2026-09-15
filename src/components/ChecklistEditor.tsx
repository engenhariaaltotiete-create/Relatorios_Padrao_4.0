import { useMemo } from 'react';
import type { ChecklistReport, ChecklistStatus, StoredFile } from '../types';
import { BASE_OPTIONS, CHECKLIST_STATUS_OPTIONS, RECEIPT_OPTIONS } from '../data/options';
import { fileToStored } from '../lib/helpers';
import { EditableListInput } from './EditableListInput';
import { FileCards } from './FileCards';
import { MemoryTextInput } from './MemoryTextInput';

type Props={report:ChecklistReport;onChange:(r:ChecklistReport)=>void;onSaveBack:()=>void;onPdf:()=>void;onExport:()=>void;busy?:boolean};

export function ChecklistEditor({report,onChange,onSaveBack,onPdf,onExport,busy}:Props){
  const options=useMemo(()=>({
    cargo:[...new Set([...BASE_OPTIONS.cargo,report.responsavel.cargo].filter(Boolean))],
    municipio:[...new Set([...BASE_OPTIONS.municipio,report.obra.municipio].filter(Boolean))],
    tipoObra:[...new Set([...RECEIPT_OPTIONS.tipoObra,report.obra.tipoObra].filter(Boolean))],
    aguaEsgoto:[...new Set([...BASE_OPTIONS.aguaEsgoto,report.obra.aguaEsgoto].filter(Boolean))],
  }),[report]);
  const patch=(partial:Partial<ChecklistReport>)=>onChange({...report,...partial,updatedAt:new Date().toISOString()});
  const updateAttachment=(i:number,p:Partial<StoredFile>)=>patch({anexos:report.anexos.map((a,idx)=>idx===i?{...a,...p}:a)});
  const addAttachments=async(files:FileList|null)=>{if(!files)return;const accepted=Array.from(files).filter(f=>f.type.startsWith('image/')||f.type==='application/pdf'||/\.tiff?$/i.test(f.name));const stored=await Promise.all(accepted.map(fileToStored));patch({anexos:[...report.anexos,...stored]});};
  const statusClass=(value:string)=>value==='SIM'?'status-yes':value==='NÃO'?'status-no':value==='NÃO SE APLICA'?'status-na':'';

  return <main className="container editor">
    <div className="page-heading"><div><h2>CheckList de Liberação de Obra em edição</h2><p>Salvamento local automático ativo.</p></div><button className="secondary" onClick={onSaveBack}>Salvar e voltar</button></div>

    <section className="card"><h3>1. Identificação do responsável pela elaboração do relatório</h3><div className="card-body form-grid">
      <MemoryTextInput label="Elaborado por" required value={report.responsavel.elaboradoPor} memoryKey="responsavel_nome" onChange={elaboradoPor=>patch({responsavel:{...report.responsavel,elaboradoPor}})}/>
      <label className="field"><span>Data <b className="required">*</b></span><input type="date" value={report.responsavel.data} onChange={e=>patch({responsavel:{...report.responsavel,data:e.target.value}})}/></label>
      <MemoryTextInput label="Matrícula" required value={report.responsavel.matricula} memoryKey="matricula" onChange={matricula=>patch({responsavel:{...report.responsavel,matricula}})}/>
      <EditableListInput label="Cargo/Função" required value={report.responsavel.cargo} options={options.cargo} onChange={cargo=>patch({responsavel:{...report.responsavel,cargo}})}/>
      <MemoryTextInput label="Unidade" required value={report.responsavel.unidade} memoryKey="unidade" onChange={unidade=>patch({responsavel:{...report.responsavel,unidade}})}/>
    </div></section>

    <section className="card"><h3>2. Dados da Obra</h3><div className="card-body form-grid">
      <EditableListInput label="Município" required value={report.obra.municipio} options={options.municipio} onChange={municipio=>patch({obra:{...report.obra,municipio}})}/>
      <MemoryTextInput label="Endereço" required value={report.obra.endereco} memoryKey="endereco" onChange={endereco=>patch({obra:{...report.obra,endereco}})}/>
      <EditableListInput label="Tipo de Serviço" required value={report.obra.tipoObra} options={options.tipoObra} onChange={tipoObra=>patch({obra:{...report.obra,tipoObra}})}/>
      <EditableListInput label="Água/Esgoto" required value={report.obra.aguaEsgoto} options={options.aguaEsgoto} onChange={aguaEsgoto=>patch({obra:{...report.obra,aguaEsgoto}})}/>
      <MemoryTextInput label="Empresa Executora" required value={report.obra.empresaExecutora} memoryKey="empresa_executora" onChange={empresaExecutora=>patch({obra:{...report.obra,empresaExecutora}})}/>
      <MemoryTextInput label="Contrato" required value={report.obra.contrato} memoryKey="contrato" onChange={contrato=>patch({obra:{...report.obra,contrato}})}/>
      <label className="field full"><span>Descrição complementar</span><textarea value={report.obra.descricaoComplementar} onChange={e=>patch({obra:{...report.obra,descricaoComplementar:e.target.value}})}/></label>
    </div></section>

    <section className="card"><h3>3. Checklist dos documentos</h3><div className="card-body table-scroll">
      <table className="checklist-table"><thead><tr><th>Documento</th><th>Situação</th><th>Observações do campo</th></tr></thead><tbody>
        {report.checklist.map((item,i)=><tr key={item.id}><td>{item.documento}</td><td className={statusClass(item.situacao)}><select value={item.situacao} onChange={e=>patch({checklist:report.checklist.map((x,idx)=>idx===i?{...x,situacao:e.target.value as ChecklistStatus}:x)})}><option value="">Selecione</option>{CHECKLIST_STATUS_OPTIONS.map(v=><option key={v} value={v}>{v}</option>)}</select></td><td>{item.orientacao}</td></tr>)}
      </tbody></table>
    </div></section>

    <section className="card"><h3>4. Observações gerais</h3><div className="card-body"><label className="field"><span>Observações</span><textarea className="long-text" value={report.observacoesGerais} onChange={e=>patch({observacoesGerais:e.target.value})}/></label></div></section>

    <section className="card"><h3>5. Anexos</h3><div className="card-body">
      <label className="file-button">+ Adicionar anexos<input type="file" hidden multiple accept="image/*,application/pdf,.tif,.tiff" onChange={e=>{void addAttachments(e.target.files);e.currentTarget.value='';}}/></label>
      <p className="hint">Aceita imagens, PDF e TIF/TIFF. No PDF final, as páginas dos anexos manterão o tamanho original do documento.</p>
      <FileCards files={report.anexos} titleRequired descriptionRequired onTitle={(i,text)=>updateAttachment(i,{titulo:text})} onDescription={(i,text)=>updateAttachment(i,{descricao:text})} onRemove={i=>patch({anexos:report.anexos.filter((_,idx)=>idx!==i)})}/>
    </div></section>

    <div className="editor-bar"><button className="secondary" onClick={onSaveBack}>Salvar e voltar</button><button className="secondary" onClick={onExport}>Exportar JSON</button><button disabled={busy} onClick={onPdf}>{busy?'Gerando PDF...':'Gerar PDF'}</button></div>
  </main>;
}
