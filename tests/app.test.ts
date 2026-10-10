import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {generate,validateGrid,material,solution} from '../lib/crossword.ts';
import {handle} from '../lib/server.ts';

class Statement {
 sql:string; values:any[]=[]; db:DatabaseSync;
 constructor(db:DatabaseSync,sql:string){this.db=db;this.sql=sql}
 bind(...values:any[]){const s=new Statement(this.db,this.sql);s.values=values;return s}
 async first(){return this.db.prepare(this.sql).get(...this.values)??null}
 async all(){return {results:this.db.prepare(this.sql).all(...this.values)}}
 async run(){const r=this.db.prepare(this.sql).run(...this.values);return {success:true,meta:{changes:Number(r.changes)}}}
}
class TestDB {
 raw=new DatabaseSync(':memory:');
 prepare(sql:string){return new Statement(this.raw,sql)}
 async batch(statements:Statement[]){this.raw.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());this.raw.exec('COMMIT');return results}catch(e){this.raw.exec('ROLLBACK');throw e}}
}

test('generator validates letters, digits, zero and invalid material',()=>{
 for(const answers of [['CAT','RAT','ANT','GOAT','TIGER'],['12','20','21','100','30','102'],['0'],['123','321']]){
  const q=answers.map(answer=>({clue:`Question ${answer}`,answer}));const r=generate(q);assert.ok(r.grid,answers.join(','));validateGrid(r.grid!,q);
  assert.equal(r.grid!.words.length,q.length);assert.deepEqual(new Set(Object.values(solution(r.grid!))),new Set(answers.join('')));
 }
 assert.equal(generate([{clue:'A',answer:'AAA'},{clue:'B',answer:'BBB'}]).grid,null);
 const input={kind:'math',title:'Test',grade:4,timeLimit:0,hintQuota:2,questions:[{clue:'One',answer:'-1'}]};
 assert.throws(()=>material(input));assert.throws(()=>material({...input,questions:[{clue:'',answer:'1'}]}));
 assert.equal(material({...input,kind:'english',questions:[{clue:'cat',answer:' c a t '}]}).questions[0].answer,'CAT');
});

test('full server flow: accounts, drafts, versioning, timer, hints, progression and reports',async t=>{
 const db=new TestDB();
 const migrations=readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort();assert.ok(migrations.length,'Generate migrations first');
 for(const name of migrations)db.raw.exec(readFileSync(new URL(`../drizzle/${name}`,import.meta.url),'utf8').replaceAll('--> statement-breakpoint',''));
 const env:any={DB:db,BOOTSTRAP_ADMIN_PASSWORD:'TestAdmin#123',DEMO_USER_PASSWORD:'TestStudent#123'};
 async function call(path:string,body?:any,cookie=''){const response=await handle(new Request(`http://localhost/api/${path}`,{method:body===undefined?'GET':'POST',headers:{'cookie':cookie,...(body===undefined?{}:{'content-type':'application/json','x-tts-request':'1','origin':'http://localhost'})},body:body===undefined?undefined:JSON.stringify(body)}),env);return {status:response.status,data:await response.json() as any,cookie:response.headers.get('set-cookie')?.split(';')[0]||''}}
 let admin='',student='',second='';let active:any,createdId='';
 await t.test('seed and authentication',async()=>{
  assert.equal((await call('me')).status,401);
  const a=await call('login',{username:'admin',password:'TestAdmin#123'});assert.equal(a.status,200);admin=a.cookie;assert.equal(a.data.user.role,'admin');
  const s=await call('login',{username:'siswa',password:'TestStudent#123'});assert.equal(s.status,200);student=s.cookie;
  assert.equal((await call('login',{username:'siswa',password:'wrong'})).status,401);
  assert.equal((await call('admin/levels',undefined,student)).status,403);
  assert.equal((await call('levels',undefined,admin)).status,403);
 });
 await t.test('six sample levels, isolated progression and no answer leak',async()=>{
  const list=(await call('levels',undefined,student)).data.levels;assert.equal(list.length,6);
  assert.equal(list.filter((l:any)=>l.unlocked).length,3);assert.ok(!JSON.stringify(list).includes('BUMI'));
  assert.equal((await call('levels/sample-trivia-2/start',{},student)).status,403);
  active=(await call('levels/sample-trivia-1/start',{},student)).data.attempt;
  assert.ok(active);assert.ok(active.grid.words.every((w:any)=>!('answer'in w)&&w.length>0));
  const again=(await call('levels/sample-trivia-1/start',{},student)).data.attempt;assert.equal(again.id,active.id);
 });
 await t.test('create user, deny other user attempt access, reset revokes sessions',async()=>{
  assert.equal((await call('admin/users',{username:'tester',name:'Tester',password:'TestUser#123'},admin)).status,201);
  assert.equal((await call('admin/users',{username:'tester',name:'Tester',password:'TestUser#123'},admin)).status,409);
  second=(await call('login',{username:'tester',password:'TestUser#123'})).cookie;
  assert.equal((await call(`attempts/${active.id}`,undefined,second)).status,404);
  const u=(await call('admin/users',undefined,admin)).data.users.find((u:any)=>u.username==='tester');
  assert.equal((await call(`admin/users/${u.id}/reset`,{password:'NewPassword#123'},admin)).status,200);
  assert.equal((await call('me',undefined,second)).status,401);
  assert.equal((await call('login',{username:'tester',password:'TestUser#123'})).status,401);
  second=(await call('login',{username:'tester',password:'NewPassword#123'})).cookie;
 });
 await t.test('draft, generator failure, preview, publish',async()=>{
  const m={kind:'english',title:'New level',topic:'Test',grade:4,timeLimit:0,hintQuota:2,questions:[{clue:'A',answer:'AAA'},{clue:'B',answer:'BBB'}]};
  const r=await call('admin/levels',m,admin);assert.equal(r.status,200);createdId=r.data.level.id;
  assert.equal((await call('levels',undefined,student)).data.levels.length,6);
  const failed=await call(`admin/levels/${createdId}/generate`,{},admin);assert.ok(failed.data.unplaced.length);assert.equal(failed.data.material.grid,null);
  assert.equal((await call(`admin/levels/${createdId}/publish`,{},admin)).status,400);
  await call('admin/levels',{...m,id:createdId,questions:[{clue:'Kucing',answer:'CAT'},{clue:'Tikus',answer:'RAT'}]},admin);
  assert.ok((await call(`admin/levels/${createdId}/generate`,{},admin)).data.material.grid);
  assert.equal((await call(`admin/levels/${createdId}/publish`,{},admin)).status,200);
  const l=(await call('levels',undefined,student)).data.levels.find((l:any)=>l.id===createdId);assert.equal(l.sequence,3);assert.equal(l.unlocked,false);
 });
 await t.test('hint quota, idempotency, immutable hint and score',async()=>{
  const w=active.grid.words[0],k=`${w.row},${w.col}`;
  let r=await call(`attempts/${active.id}/hint`,{cell:k},student);active=r.data.attempt;assert.equal(active.score,95);assert.equal(active.hintsRemaining,2);
  r=await call(`attempts/${active.id}/hint`,{cell:k},student);assert.equal(r.data.attempt.score,95);
  r=await call(`attempts/${active.id}/save`,{revision:active.revision,entries:{}},student);active=r.data.attempt;assert.ok(active.entries[k]);assert.equal(active.score,95);
  const m=JSON.parse(db.raw.prepare('SELECT data FROM versions WHERE id=?').get('sample-trivia-1-v1')!.data as string),keys=Object.keys(solution(m.grid)).filter(v=>v!==k);
  for(const cell of keys.slice(0,2)){r=await call(`attempts/${active.id}/hint`,{cell},student);active=r.data.attempt}
  assert.equal(active.score,85);assert.equal(active.hintsRemaining,0);
  assert.equal((await call(`attempts/${active.id}/hint`,{cell:keys[2]},student)).status,400);
  const check=await call(`attempts/${active.id}/check`,{wordId:w.id},student);assert.equal(check.status,200);assert.equal(check.data.attempt.score,85);
 });
 await t.test('incorrect full board stays active, revision conflict and server input validation',async()=>{
  const m=JSON.parse(db.raw.prepare('SELECT data FROM versions WHERE id=?').get('sample-trivia-1-v1')!.data as string),bad=Object.fromEntries(Object.keys(solution(m.grid)).map(k=>[k,'Z']));
  const r=await call(`attempts/${active.id}/save`,{revision:active.revision,entries:bad},student);active=r.data.attempt;assert.equal(active.status,'active');
  assert.equal((await call(`attempts/${active.id}/save`,{revision:0,entries:{}},student)).status,409);
  assert.equal((await call(`attempts/${active.id}/save`,{revision:active.revision,entries:{'0,0':'7'}},student)).status,400);
 });
 await t.test('check identifies every wrong and incomplete word without exposing keys or charging points',async()=>{
  const m=JSON.parse(db.raw.prepare('SELECT data FROM versions WHERE id=?').get('sample-trivia-1-v1')!.data as string);
  const expected=(entries:Record<string,string>)=>m.grid.words.map((w:any)=>{
   const chars=Array.from({length:w.answer.length},(_,i)=>entries[`${w.row+(w.direction==='down'?i:0)},${w.col+(w.direction==='across'?i:0)}`]||'');
   return {wordId:w.id,status:chars.some(c=>!c)?'incomplete':chars.join('')===w.answer?'correct':'incorrect'};
  });
  const check=async()=>{
   const r=await call(`attempts/${active.id}/check`,{wordId:active.grid.words[0].id},student);
   assert.equal(r.status,200);assert.deepEqual(r.data.checks,expected(active.entries));
   assert.equal(r.data.attempt.score,active.score);assert.equal(r.data.attempt.revision,active.revision);
   assert.ok(r.data.checks.every((v:any)=>Object.keys(v).sort().join(',')==='status,wordId'));
   assert.ok(!JSON.stringify(r.data).includes('"answer"'));return r.data;
  };
  assert.ok((await check()).checks.some((v:any)=>v.status==='incorrect'));
  const partial={...active.entries},editable=Object.keys(partial).find(k=>!active.hints.includes(k))!;delete partial[editable];
  active=(await call(`attempts/${active.id}/save`,{revision:active.revision,entries:partial},student)).data.attempt;
  assert.ok((await check()).checks.some((v:any)=>v.status==='incomplete'));
  const mixed={...solution(m.grid),[editable]:'Z'};
  active=(await call(`attempts/${active.id}/save`,{revision:active.revision,entries:mixed},student)).data.attempt;
  const checked=(await check()).checks;
  assert.ok(checked.some((v:any)=>v.status==='correct'));assert.ok(checked.some((v:any)=>v.status==='incorrect'));
  assert.equal((await call(`attempts/${active.id}/check`,{wordId:'missing'},student)).status,400);
 });
 await t.test('published revision preserves active snapshot',async()=>{
  const l=(await call('admin/levels',undefined,admin)).data.levels.find((l:any)=>l.id==='sample-trivia-1');
  const draft={...l.draft,id:l.id,title:'Updated title',hintQuota:10,questions:l.draft.questions.map((q:any,i:number)=>i? q:{...q,clue:'Updated clue'})};
  await call('admin/levels',draft,admin);
  assert.equal((await call(`admin/levels/${l.id}/publish`,{},admin)).status,400);
  await call(`admin/levels/${l.id}/generate`,{},admin);await call(`admin/levels/${l.id}/publish`,{},admin);
  const old=(await call(`attempts/${active.id}`,undefined,student)).data.attempt;assert.equal(old.version,1);assert.notEqual(old.title,'Updated title');assert.equal(old.hintsRemaining,0);
 });
 await t.test('correct solve unlocks only same type; new attempts use current version',async()=>{
  const m=JSON.parse(db.raw.prepare('SELECT data FROM versions WHERE id=?').get('sample-trivia-1-v1')!.data as string);
  active=(await call(`attempts/${active.id}/save`,{revision:active.revision,entries:solution(m.grid)},student)).data.attempt;assert.equal(active.status,'completed');assert.equal(active.score,85);
  const list=(await call('levels',undefined,student)).data.levels;
  assert.equal(list.find((l:any)=>l.id==='sample-trivia-2').unlocked,true);assert.equal(list.find((l:any)=>l.id==='sample-math-2').unlocked,false);
  const fresh=(await call('levels/sample-trivia-1/start',{},student)).data.attempt;assert.notEqual(fresh.id,active.id);assert.equal(fresh.version,2);assert.equal(fresh.title,'Updated title');assert.equal(fresh.score,100);assert.equal(fresh.hintsRemaining,10);
  assert.equal((await call(`attempts/${active.id}`,undefined,student)).data.attempt.version,1);
 });
 await t.test('resume across sessions, timed expiry, retry and numeric answers',async()=>{
  const m=(await call('levels/sample-math-1/start',{},student)).data.attempt;
  assert.equal((await call(`attempts/${m.id}/save`,{revision:m.revision,entries:{'0,0':'A'}},student)).status,400);
  const emptyCheck=await call(`attempts/${m.id}/check`,{wordId:m.grid.words[0].id},student);
  assert.equal(emptyCheck.data.checks.length,m.grid.words.length);assert.ok(emptyCheck.data.checks.every((v:any)=>v.status==='incomplete'));
  const data=JSON.parse(db.raw.prepare('SELECT data FROM versions WHERE id=?').get('sample-math-1-v1')!.data as string);
  assert.equal((await call(`attempts/${m.id}/save`,{revision:m.revision,entries:solution(data.grid)},student)).data.attempt.status,'completed');
  const timed=(await call('levels/sample-math-2/start',{},student)).data.attempt;assert.ok(timed.deadline);
  const newSession=(await call('login',{username:'siswa',password:'TestStudent#123'})).cookie;
  assert.equal((await call(`attempts/${timed.id}`,undefined,newSession)).data.attempt.deadline,timed.deadline);
  db.raw.prepare('UPDATE attempts SET deadline=? WHERE id=?').run(Date.now()-1,timed.id);
  const end=await call(`attempts/${timed.id}/save`,{revision:timed.revision,entries:{}},student);assert.equal(end.data.attempt.status,'expired');
  const retry=(await call('levels/sample-math-2/start',{},student)).data.attempt;assert.notEqual(retry.id,timed.id);assert.ok(retry.deadline>Date.now());
 });
 await t.test('reports preserve version, score and completion; request protection and logout',async()=>{
  const r=(await call('admin/reports',undefined,admin)).data;const h=r.history.find((a:any)=>a.id===active.id);assert.equal(h.version,1);assert.equal(h.score,85);assert.equal(h.hints,3);assert.equal(h.status,'completed');assert.ok(r.progress.some((p:any)=>p.level_id==='sample-trivia-1'));
  const unsafe=await handle(new Request('http://localhost/api/logout',{method:'POST',body:'{}'}),env);assert.equal(unsafe.status,403);
  assert.equal((await call('logout',{},student)).status,200);assert.equal((await call('me',undefined,student)).status,401);
 });
 db.raw.close();
});
