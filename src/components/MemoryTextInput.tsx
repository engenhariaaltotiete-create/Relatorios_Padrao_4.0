import { useMemo } from 'react';
import { normalizeText } from '../lib/helpers';

type Props={label:string;value:string;onChange:(v:string)=>void;required?:boolean;placeholder?:string;memoryKey:string};
const key=(k:string)=>`relatorios_text_memory_${k}`;
function load(k:string):string[]{try{return JSON.parse(localStorage.getItem(key(k))||'[]')}catch{return[]}}
function save(k:string,v:string){const t=v.trim();if(!t)return;const vals=[t,...load(k).filter(x=>normalizeText(x)!==normalizeText(t))].slice(0,30);localStorage.setItem(key(k),JSON.stringify(vals))}
export function MemoryTextInput({label,value,onChange,required,placeholder,memoryKey}:Props){
 const id=`memory_${memoryKey.replace(/[^a-z0-9]/gi,'_')}`;
 const options=useMemo(()=>load(memoryKey),[memoryKey,value]);
 return <label className="field"><span>{label}{required&&<b className="required"> *</b>}</span><input list={id} value={value} placeholder={placeholder} required={required} onChange={e=>onChange(e.target.value)} onBlur={e=>save(memoryKey,e.target.value)}/><datalist id={id}>{options.map(x=><option key={x} value={x}/>)}</datalist></label>
}
