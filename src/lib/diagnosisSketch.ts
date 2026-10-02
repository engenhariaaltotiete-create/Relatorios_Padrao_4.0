import type { DiagnosisSketch, SketchAddress, SketchSegment } from '../types';

const R=6371000;
const rad=(v:number)=>v*Math.PI/180;
export function distanceMeters(a:{lat:number;lng:number},b:{lat:number;lng:number}){const p1=rad(a.lat),p2=rad(b.lat),dp=rad(b.lat-a.lat),dl=rad(b.lng-a.lng);const h=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;return 2*R*Math.asin(Math.sqrt(h));}
export function geometryLength(c:{lat:number;lng:number}[]){return c.slice(1).reduce((n,p,i)=>n+distanceMeters(c[i],p),0);}
export function sketchTotal(s:DiagnosisSketch){return s.segments.reduce((n,x)=>n+(Number(x.lengthMeters)||0),0);}
export function formatLength(v:number){return v>=1000?`${(v/1000).toLocaleString('pt-BR',{maximumFractionDigits:2})} km`:`${Math.round(v).toLocaleString('pt-BR')} m`;}
export function midpoint(c:{lat:number;lng:number}[]){if(!c.length)return null;const total=geometryLength(c);if(!total)return c[0];let acc=0;for(let i=1;i<c.length;i++){const d=distanceMeters(c[i-1],c[i]);if(acc+d>=total/2){const f=(total/2-acc)/d;return{lat:c[i-1].lat+(c[i].lat-c[i-1].lat)*f,lng:c[i-1].lng+(c[i].lng-c[i-1].lng)*f};}acc+=d;}return c[c.length-1];}
export async function searchAddress(query:string):Promise<{lat:number;lng:number;label:string}|null>{try{const u=`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=1&addressdetails=1&accept-language=pt-BR`;const res=await fetch(u,{headers:{Accept:'application/json'}});if(!res.ok)return null;const j=await res.json();if(!Array.isArray(j)||!j.length)return null;const lat=Number(j[0].lat),lng=Number(j[0].lon);if(!Number.isFinite(lat)||!Number.isFinite(lng))return null;return{lat,lng,label:j[0].display_name||query};}catch{return null;}}
export async function reverseGeocode(lat:number,lng:number):Promise<SketchAddress>{const empty={display:'',road:'',neighbourhood:'',city:'',state:'',postcode:''};try{const u=`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1&accept-language=pt-BR`;const res=await fetch(u,{headers:{Accept:'application/json'}});if(!res.ok)return empty;const j=await res.json(),a=j.address||{};return{display:j.display_name||'',road:a.road||a.pedestrian||a.residential||'',neighbourhood:a.neighbourhood||a.suburb||a.quarter||'',city:a.city||a.town||a.municipality||a.village||'',state:a.state||'',postcode:a.postcode||''};}catch{return empty;}}
export function addressLabel(a:SketchAddress){return [a.road,a.neighbourhood,a.city,a.state,a.postcode].filter(Boolean).join(', ')||a.display;}
export function withTotals(s:DiagnosisSketch):DiagnosisSketch{return{...s,totalLengthMeters:sketchTotal(s)}}

function world(lat:number,lng:number,z:number){const n=256*2**z,x=(lng+180)/360*n,s=Math.sin(rad(Math.max(-85.0511,Math.min(85.0511,lat)))),y=(.5-Math.log((1+s)/(1-s))/(4*Math.PI))*n;return{x,y};}
function tileUrl(x:number,y:number,z:number){return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`}
async function img(url:string){return new Promise<HTMLImageElement>((resolve,reject)=>{const i=new Image();i.crossOrigin='anonymous';i.onload=()=>resolve(i);i.onerror=reject;i.src=url})}
export async function renderSketchMap(s:DiagnosisSketch,width=1400,height=1500){
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const c=canvas.getContext('2d')!;c.fillStyle='#eef2f4';c.fillRect(0,0,width,height);
 const coords=s.segments.flatMap(x=>x.coordinates);if(!coords.length)return canvas.toDataURL('image/jpeg',.92);
 // Margem pequena, mas suficiente para os pontos e rótulos dos trechos.
 const padX=Math.max(38,Math.round(width*.035)),padY=Math.max(38,Math.round(height*.035));let zoom=19;
 for(;zoom>=3;zoom--){const ps=coords.map(p=>world(p.lat,p.lng,zoom)),xs=ps.map(p=>p.x),ys=ps.map(p=>p.y);if(Math.max(...xs)-Math.min(...xs)<=width-2*padX&&Math.max(...ys)-Math.min(...ys)<=height-2*padY)break;}
 const pts=coords.map(p=>world(p.lat,p.lng,zoom)),minX=Math.min(...pts.map(p=>p.x)),maxX=Math.max(...pts.map(p=>p.x)),minY=Math.min(...pts.map(p=>p.y)),maxY=Math.max(...pts.map(p=>p.y)),cx=(minX+maxX)/2,cy=(minY+maxY)/2,ox=width/2-cx,oy=height/2-cy;
 const tx0=Math.floor((cx-width/2)/256)-1,tx1=Math.floor((cx+width/2)/256)+1,ty0=Math.floor((cy-height/2)/256)-1,ty1=Math.floor((cy+height/2)/256)+1;
 await Promise.all(Array.from({length:tx1-tx0+1},(_,ix)=>Array.from({length:ty1-ty0+1},(_,iy)=>[tx0+ix,ty0+iy] as const)).flat().map(async([x,y])=>{try{const im=await img(tileUrl(x,y,zoom));c.drawImage(im,x*256+ox,y*256+oy,256,256)}catch{}}));
 c.lineCap='round';c.lineJoin='round';
 for(const seg of s.segments){const ps=seg.coordinates.map(p=>world(p.lat,p.lng,zoom));c.strokeStyle='#ffffff';c.lineWidth=12;c.beginPath();ps.forEach((p,i)=>i?c.lineTo(p.x+ox,p.y+oy):c.moveTo(p.x+ox,p.y+oy));c.stroke();c.strokeStyle='#087faf';c.lineWidth=7;c.stroke();}
 // Na impressão todos os nós usam a mesma cor do traçado.
 for(const p of s.points){const q=world(p.lat,p.lng,zoom);c.beginPath();c.arc(q.x+ox,q.y+oy,8,0,Math.PI*2);c.fillStyle='#087faf';c.fill();c.strokeStyle='#fff';c.lineWidth=3;c.stroke();}
 // Identificação do trecho e extensão junto à própria geometria.
 c.textAlign='center';c.textBaseline='middle';c.font='bold 20px Arial';
 for(const seg of s.segments){const m=midpoint(seg.coordinates);if(!m)continue;const q=world(m.lat,m.lng,zoom),label=`${(seg.name||'TRECHO').toUpperCase()} - ${formatLength(seg.lengthMeters)}`;const tw=c.measureText(label).width+18,x=q.x+ox,y=q.y+oy-22;c.fillStyle='rgba(255,255,255,.90)';c.fillRect(x-tw/2,y-14,tw,28);c.fillStyle='#075f86';c.fillText(label,x,y);}
 c.textAlign='left';c.textBaseline='alphabetic';c.fillStyle='rgba(255,255,255,.88)';c.fillRect(18,height-42,360,28);c.fillStyle='#334155';c.font='18px Arial';c.fillText('© OpenStreetMap contributors',28,height-22);c.fillStyle='#17485f';c.font='bold 26px Arial';c.fillText('N',width-55,45);c.beginPath();c.moveTo(width-43,55);c.lineTo(width-55,85);c.lineTo(width-31,85);c.closePath();c.fill();return canvas.toDataURL('image/jpeg',.92);
}
export function nextSegmentName(segments:SketchSegment[]){return `Trecho ${String(segments.length+1).padStart(2,'0')}`}
