import {Compass,Calculator,Languages} from 'lucide-react';
import type {Kind} from '../lib/crossword';
export const TYPES = {
 trivia:{label:'Bahasa Indonesia (Pengetahuan Umum)',short:'Bahasa Indonesia (Pengetahuan Umum)',subtitle:'Temukan hal luar biasa di sekitarmu.',icon:Compass,color:'orange'},
 math:{label:'Matematika',short:'Matematika',subtitle:'Asah logikamu, satu angka setiap langkah.',icon:Calculator,color:'blue'},
 english:{label:'Bahasa Inggris (Pengetahuan Umum)',short:'Bahasa Inggris (Pengetahuan Umum)',subtitle:'Jelajahi dunia lewat kata-kata baru.',icon:Languages,color:'green'}
};
export const KINDS:Kind[]=['trivia','math','english'];
export const time=(s:number)=>`${Math.floor(Math.max(0,s)/60).toString().padStart(2,'0')}:${Math.floor(Math.max(0,s)%60).toString().padStart(2,'0')}`;
export async function api(path:string,body?:any):Promise<any>{
 const res=await fetch(`/api/${path}`,{method:body===undefined?'GET':'POST',credentials:'same-origin',headers:body===undefined?{}:{'Content-Type':'application/json','X-TTS-Request':'1'},body:body===undefined?undefined:JSON.stringify(body)});
 const data:any=await res.json().catch(()=>({error:'Server tidak merespons. Coba lagi.'}));
 if(!res.ok){const e:any=new Error(data.error||'Permintaan gagal.');e.status=res.status;throw e;}return data;
}
