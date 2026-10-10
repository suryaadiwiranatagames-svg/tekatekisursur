'use client';
import {useState,useEffect,useRef} from 'react';
export type Word={id:string;row:number;col:number;direction:'across'|'down';number:number;clue:string;length:number};
export const coords=(w:Word)=>Array.from({length:w.length},(_,i)=>`${w.row+(w.direction==='down'?i:0)},${w.col+(w.direction==='across'?i:0)}`);
export function Board({grid,entries,active,selected,hints=[],incorrectCells=[],onCell,onKey,onText,onDelete,blocked=false,numeric=false,refs}:any){
 const container=useRef<HTMLDivElement|null>(null),[size,setSize]=useState(onCell?43:30);
 useEffect(()=>{const el=container.current;if(!el)return;const resize=()=>{const max=onCell?43:30,min=onCell?32:24;setSize(Math.max(min,Math.min(max,Math.floor((el.clientWidth-8-(grid.cols-1)*2)/grid.cols))))};resize();const observer=new ResizeObserver(resize);observer.observe(el);return()=>observer.disconnect()},[grid.cols,!!onCell]);
 // Native beforeinput also handles mobile backspace on an already empty cell.
 useEffect(()=>{const el=container.current;if(!el||!onCell)return;const before=(event:Event)=>{const e=event as InputEvent;if(e.inputType?.startsWith('delete')&&e.target instanceof HTMLInputElement&&e.cancelable){e.preventDefault();onDelete?.()}};el.addEventListener('beforeinput',before);return()=>el.removeEventListener('beforeinput',before)},[onCell,onDelete]);
 const open=new Set(grid.words.flatMap(coords)),highlight=new Set(active?coords(active):[]),starts:Record<string,number>={};
 grid.words.forEach((w:Word)=>{starts[`${w.row},${w.col}`]=w.number});
 return <><div className="board-scroll" ref={container}><div className="crossword" style={{gridTemplateColumns:`repeat(${grid.cols},var(--cell-size))`,gap:2,...({"--cell-size":`${size}px`} as React.CSSProperties)}} role="group" aria-label="Papan TTS">{Array.from({length:grid.rows*grid.cols},(_,i)=>{
  const k=`${Math.floor(i/grid.cols)},${i%grid.cols}`;
  if(!open.has(k))return <span className="cell-block" key={k}/>;
  const label=`Baris ${Math.floor(i/grid.cols)+1} kolom ${i%grid.cols+1}${starts[k]?` nomor ${starts[k]}`:''}${incorrectCells.includes(k)?', bagian jawaban yang masih salah':''}${hints.includes(k)?', bantuan terkunci':''}`;
  return <div key={k} className={`cell ${highlight.has(k)?'word-active':''} ${selected===k?'cell-active':''} ${hints.includes(k)?'cell-hint':''} ${incorrectCells.includes(k)?'cell-incorrect':''}`}>
   {starts[k]&&<small aria-hidden="true">{starts[k]}</small>}
   {onCell?<input ref={el=>{if(refs)refs.current[k]=el}} className="cell-input" type="text" inputMode={numeric?'numeric':'text'} pattern={numeric?'[0-9]*':'[A-Za-z]*'} autoCapitalize="characters" autoComplete="off" autoCorrect="off" spellCheck={false} aria-label={label} value={entries[k]||''} readOnly={blocked} tabIndex={selected===k?0:-1}
    onFocus={e=>e.currentTarget.select()}
    onClick={e=>{onCell(k);e.currentTarget.select()}}
    onKeyDown={e=>onKey?.(e,k)}
    onChange={e=>{if((e.nativeEvent as InputEvent).isComposing)return;if(!e.currentTarget.value)onDelete?.();else onText?.(e.currentTarget.value.slice(-1))}}
    onCompositionEnd={e=>onText?.(e.currentTarget.value.slice(-1))}
    onPaste={e=>{e.preventDefault();onText?.(e.clipboardData.getData('text'))}}
   />:<span>{entries[k]||''}</span>}
   {hints.includes(k)&&<i aria-hidden="true"/>}
  </div>
 })}</div></div>{onCell&&grid.cols>9&&<p className="board-scroll-tip">Geser papan ke samping untuk melihat seluruh kotak.</p>}</>
}
