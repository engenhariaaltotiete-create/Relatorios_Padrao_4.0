import jsPDF from 'jspdf';
import type { MaintenanceAuthReport } from '../types';
import { EMPRESA, SOLICITANTES } from '../components/MaintenanceAuthEditor';
import logo from '../assets/sabesp-logo.jpg';
import { anyFileNameBase } from './helpers';
const W=210,H=297,M=14;
function extDate(s:string){if(!s)return '';const [y,m,d]=s.split('-').map(Number);const date=new Date(y,m-1,d);return `${d} de ${date.toLocaleDateString('pt-BR',{month:'long'})} de ${y}`}
function shortDate(s:string){if(!s)return '';const [y,m,d]=s.split('-');return `${d}/${m}/${y}`}
function decimal(s:string){const n=Number(s.replace(',','.'));return Number.isFinite(n)?n.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}):s}
async function dimensions(src:string):Promise<[number,number]>{return new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve([i.naturalWidth,i.naturalHeight]);i.onerror=reject;i.src=src})}
async function jpeg(src:string):Promise<string>{const [w,h]=await dimensions(src);const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');if(!ctx)throw Error('Não foi possível converter imagem');ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);const i=new Image();await new Promise<void>((resolve,reject)=>{i.onload=()=>resolve();i.onerror=reject;i.src=src});ctx.drawImage(i,0,0);return canvas.toDataURL('image/jpeg',.9)}
export async function generateMaintenanceAuthPdf(r:MaintenanceAuthReport){
 const d=new jsPDF({unit:'mm',format:'a4',compress:true});
 const footer=()=>{d.setFont('helvetica','normal');d.setFontSize(7.2);d.setTextColor(30,30,30);let y=280;for(const t of ['Divisão de Manutenção e Serviços Operacionais Suzano – OLMS','Companhia de Saneamento Básico do Estado de São Paulo - Sabesp','Rua Benjamin Constant, 1980 – Centro – CEP 08674-178 – Suzano – SP – Tel. 55 (11) 4746-5300','www.sabesp.com.br']){d.text(t,M,y);y+=3.6}};
 const head=()=>{d.addImage(logo,'JPEG',179,8,21,20);footer();d.setTextColor(0,0,0)};
 const write=(text:string,y:number,bold=false)=>{d.setFont('helvetica',bold?'bold':'normal');d.setFontSize(10.2);const lines=d.splitTextToSize(text,W-2*M) as string[];d.text(lines,M,y);return y+lines.length*5.7};
 head();let y=42;
 y=write(`OLMS – OS ${r.os}`,y,true)+10;
 y=write(`Suzano, ${extDate(r.dataRelatorio)}.`,y)+14;
 y=write('Ref.: Autorização para execução de serviço de manutenção emergencial',y,true)+15;
 y=write('Senhor secretário,',y)+16;
 y=write(`Solicitamos autorização para ${r.servico.toLowerCase()}.`,y)+7;
 y=write(`Endereço: ${r.endereco}, ${r.numero}, ${r.bairro} – SUZANO/SP`,y)+5;
 y=write(`Data: ${shortDate(r.dataExecucao)}`,y)+5;
 y=write(`Medidas aproximadas: ${decimal(r.largura)}m x ${decimal(r.comprimento)}m`,y)+5;
 y=write(`Interdição da via: ${r.interdicao}`,y)+5;
 y=write(`Necessário apoio de agentes de trânsito? – ${r.agentes}`,y)+5;
 y=write(`Empresa responsável pela execução: ${EMPRESA}`,y)+5;
 y=write(`Solicitante: ${SOLICITANTES[r.servico]||''}`,y)+14;
 y=write('Aproveitamos a oportunidade para apresentar nossos protestos de consideração.',y)+16;
 d.setFont('helvetica','normal');d.setFontSize(9.8);d.text('JOCELMA GONÇALVES DA SILVA',W-19,y,{align:'right'});d.text('Coordenadora',W-19,y+5,{align:'right'});
 d.setFontSize(9.5);const rec=['Excelentíssimo Senhor','Samuel de Oliveira','Secretaria Municipal de Manutenção e Serviços Urbanos','Prefeitura Municipal de Suzano'];let ry=248;for(const t of rec){d.text(t,M,ry);ry+=5}
 for(const f of r.fotos){d.addPage();head();const src=await jpeg(f.data);const [w,h]=await dimensions(src);const aw=W-2*M,ah=250;const ratio=Math.min(aw/w,ah/h);const iw=w*ratio,ih=h*ratio;d.addImage(src,'JPEG',M+(aw-iw)/2,31+(ah-ih)/2,iw,ih,undefined,'FAST')}
 const blob=new Blob([d.output('arraybuffer')],{type:'application/pdf'});return {blob,url:URL.createObjectURL(blob),fileName:`${anyFileNameBase(r)}.pdf`};
}
