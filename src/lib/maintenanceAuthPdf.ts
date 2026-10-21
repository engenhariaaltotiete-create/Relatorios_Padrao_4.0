import jsPDF from 'jspdf';
import type { MaintenanceAuthReport } from '../types';
import { EMPRESA, SOLICITANTES } from '../components/MaintenanceAuthEditor';
import logo from '../assets/sabesp-logo.jpg';
import { anyFileNameBase } from './helpers';

const W=210, M=14;
const EXECUTION='de acordo com autorização da Secretaria de Transporte';
const sentence=(s:string)=>s ? s.charAt(0).toLocaleUpperCase('pt-BR')+s.slice(1).toLocaleLowerCase('pt-BR') : '';
function extDate(s:string){if(!s)return '';const [y,m,d]=s.split('-').map(Number);const date=new Date(y,m-1,d);return `${d} de ${date.toLocaleDateString('pt-BR',{month:'long'})} de ${y}`;}
function decimal(s:string){const n=Number(s.replace(',','.'));return s.trim()&&Number.isFinite(n)?n.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}):s;}
async function dimensions(src:string):Promise<[number,number]>{return new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve([i.naturalWidth,i.naturalHeight]);i.onerror=reject;i.src=src;});}
async function jpeg(src:string):Promise<string>{const [w,h]=await dimensions(src);const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');if(!ctx)throw Error('Não foi possível converter imagem');ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);const i=new Image();await new Promise<void>((resolve,reject)=>{i.onload=()=>resolve();i.onerror=reject;i.src=src;});ctx.drawImage(i,0,0);return canvas.toDataURL('image/jpeg',.9);}

export async function generateMaintenanceAuthPdf(r:MaintenanceAuthReport){
 const d=new jsPDF({unit:'mm',format:'a4',compress:true});
 // Tahoma não acompanha o jsPDF; quando um arquivo TTF autorizado estiver disponível,
 // poderá ser incorporado aqui. Helvetica é usada como alternativa compatível.
 const font=(bold=false,size=11.5)=>{d.setFont('helvetica',bold?'bold':'normal');d.setFontSize(size);d.setTextColor(0,0,0);};
 const footer=()=>{font(false,7.2);let y=280;for(const t of ['Divisão de Manutenção e Serviços Operacionais Suzano – OLMS','Companhia de Saneamento Básico do Estado de São Paulo - Sabesp','Rua Benjamin Constant, 1980 – Centro – CEP 08674-178 – Suzano – SP – Tel. 55 (11) 4746-5300','www.sabesp.com.br']){d.text(t,M,y);y+=3.6;}};
 const head=()=>{d.addImage(logo,'JPEG',179,8,21,21);footer();};
 // Escreve trechos em negrito sem perder a quebra automática entre linhas.
 const rich=(segments:{text:string;bold?:boolean}[],y:number,leading=5.7)=>{
  let x=M;const right=W-M;const tokens=segments.flatMap(seg=>seg.text.split(/(\s+)/).filter(Boolean).map(text=>({text,bold:!!seg.bold})));
  for(const token of tokens){font(token.bold);const width=d.getTextWidth(token.text);if(x+width>right&&x>M){y+=leading;x=M;}if(/^\s+$/.test(token.text)&&x===M)continue;d.text(token.text,x,y);x+=width;}
  return y;
 };
 const line=(label:string,value:string,y:number,after=6)=>rich([{text:label},{text:value,bold:true}],y)+after;
 head();let y=40;
 y=rich([{text:'OLMS – OS ',bold:true},{text:r.os,bold:true}],y)+10;
 y=line('Suzano, ',`${extDate(r.dataRelatorio)}.`,y,13);
 y=rich([{text:'Ref.: Autorização para execução de serviço de manutenção emergencial',bold:true}],y)+15;
 y=rich([{text:'Senhor secretário,'}],y)+15;
 y=line('Solicitamos autorização para execução da ',`${r.servico.toLocaleLowerCase('pt-BR')}.`,y,7);
 y=line('Endereço: ',`${sentence(r.endereco)}, ${r.numero}, ${sentence(r.bairro)} – Suzano/SP`,y,6);
 y=line('Data: ',EXECUTION.charAt(0).toUpperCase()+EXECUTION.slice(1),y,6);
 y=line('Prazo aproximado para execução: ',`${r.prazoExecucao||''} horas`,y,6);
 y=line('Medidas aproximadas: ',`${decimal(r.largura)}m x ${decimal(r.comprimento)}m`,y,6);
 y=line('Interdição da via: ',sentence(r.interdicao),y,6);
 y=line('Necessário apoio de agentes de trânsito? – ',r.agentes,y,6);
 y=line('Empresa responsável pela execução: ',EMPRESA,y,6);
 y=line('Solicitante: ',SOLICITANTES[r.servico]||'',y,13);
 y=rich([{text:'Aproveitamos a oportunidade para apresentar nossos protestos de consideração.'}],y)+16;
 font(false,10.5);d.text('JOCELMA GONÇALVES DA SILVA',W-19,y,{align:'right'});d.text('Coordenadora',W-19,y+5,{align:'right'});
 // Preserva o bloco institucional próximo ao rodapé sem invadir a assinatura.
 const ry=Math.max(247,y+17);font(false,10);let recY=ry;
 for(const [i,t] of ['Excelentíssimo Senhor','Samuel de Oliveira','Secretaria Municipal de Manutenção e Serviços Urbanos','Prefeitura Municipal de Suzano'].entries()){font(i===1,10);d.text(t,M,recY);recY+=5;}
 for(const f of r.fotos){d.addPage();head();const src=await jpeg(f.data);const [w,h]=await dimensions(src);const aw=W-2*M,ah=239;const ratio=Math.min(aw/w,ah/h);const iw=w*ratio,ih=h*ratio;d.addImage(src,'JPEG',M+(aw-iw)/2,34+(ah-ih)/2,iw,ih,undefined,'FAST');}
 const blob=new Blob([d.output('arraybuffer')],{type:'application/pdf'});
 return {blob,url:URL.createObjectURL(blob),fileName:`${anyFileNameBase(r)}.pdf`};
}
