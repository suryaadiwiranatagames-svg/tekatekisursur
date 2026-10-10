import { generate, material, cells, key, solution, validateGrid, KINDS } from './crossword.ts';
import type { Material } from './crossword.ts';

type Bindings = { DB?: D1Database; BOOTSTRAP_ADMIN_PASSWORD?: string; DEMO_USER_PASSWORD?: string };
type User = { id: string; username: string; name: string; role: string; password: string };
type Attempt = { id: string; user_id: string; level_id: string; version_id: string; started: number; deadline: number | null; ended: number | null; status: string; entries: string; hints: string; revision: number; data: string; version_number: number; sequence: number; kind: string };
class ApiError extends Error { status: number; constructor(message: string, status = 400) { super(message); this.status = status; } }
const id = () => crypto.randomUUID();
const publicUser = (u: User) => ({ id: u.id, username: u.username, name: u.name, role: u.role });
const bytes = (s: string) => new TextEncoder().encode(s);
const hex = (a: ArrayBuffer) => [...new Uint8Array(a)].map(v => v.toString(16).padStart(2, '0')).join('');
const tokenHash = async (s: string) => hex(await crypto.subtle.digest('SHA-256', bytes(s)));
export async function passwordHash(password: string, salt = crypto.randomUUID()) {
  const k = await crypto.subtle.importKey('raw', bytes(password), 'PBKDF2', false, ['deriveBits']);
  return `${salt}:${hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: bytes(salt), iterations: 100000, hash: 'SHA-256' }, k, 256))}`;
}
async function passwordMatches(password: string, stored: string) {
  const candidate = await passwordHash(password, stored.split(':')[0]);
  let mismatch = candidate.length ^ stored.length;
  for (let i = 0; i < stored.length; i++) mismatch |= (candidate.charCodeAt(i) || 0) ^ stored.charCodeAt(i);
  return mismatch === 0;
}

const SEEDS = [
  { kind: 'trivia', title: 'Kenali alam sekitar', topic: 'Alam & kehidupan', questions: [ ['Planet tempat kita tinggal', 'BUMI'], ['Benda langit yang bersinar pada malam hari', 'BULAN'], ['Tempat tumbuhnya banyak pohon', 'HUTAN'], ['Hewan yang suka makan wortel', 'KELINCI'], ['Bagian tumbuhan untuk menyerap air', 'AKAR'] ] },
  { kind: 'trivia', title: 'Petualangan pengetahuan', topic: 'Pengetahuan umum', questions: [ ['Benda untuk membaca cerita', 'BUKU'], ['Alat untuk menulis di buku', 'PENSIL'], ['Tempat belajar bersama guru', 'SEKOLAH'], ['Orang yang mengajar di sekolah', 'GURU'], ['Benda untuk duduk', 'KURSI'] ] },
  { kind: 'math', title: 'Serunya berhitung', topic: 'Penjumlahan & perkalian', questions: [ ['10 + 2 = ...', '12'], ['10 × 2 = ...', '20'], ['10 + 11 = ...', '21'], ['10 × 10 = ...', '100'], ['6 × 5 = ...', '30'], ['100 + 2 = ...', '102'] ] },
  { kind: 'math', title: 'Tantangan angka', topic: 'Operasi hitung', questions: [ ['20 + 4 = ...', '24'], ['6 × 7 = ...', '42'], ['12 × 10 = ...', '120'], ['100 ÷ 5 = ...', '20'], ['8 × 5 = ...', '40'], ['24 × 10 = ...', '240'] ] },
  { kind: 'english', title: 'Animals around us', topic: 'Hewan di sekitar kita', questions: [ ['Kucing', 'CAT'], ['Tikus', 'RAT'], ['Semut', 'ANT'], ['Kambing', 'GOAT'], ['Harimau', 'TIGER'] ] },
  { kind: 'english', title: 'My happy home', topic: 'Benda di rumah', questions: [ ['Meja', 'TABLE'], ['Tempat tidur', 'BED'], ['Pintu', 'DOOR'], ['Kursi', 'CHAIR'], ['Buku', 'BOOK'] ] },
];

export async function initialize(db: D1Database, env: Bindings) {
  if (await db.prepare("SELECT id FROM users WHERE role='admin' LIMIT 1").first()) return;
  if (!env.BOOTSTRAP_ADMIN_PASSWORD) throw new ApiError('Kata sandi awal admin belum dikonfigurasi.', 503);
  const now = Date.now(), adminHash = await passwordHash(env.BOOTSTRAP_ADMIN_PASSWORD);
  const statements = [db.prepare('INSERT OR IGNORE INTO users(id,username,name,password,role,created) VALUES(?,?,?,?,?,?)').bind('bootstrap-admin', 'admin', 'Admin Jelajah', adminHash, 'admin', now)];
  if (env.DEMO_USER_PASSWORD) {
    statements.push(db.prepare('INSERT OR IGNORE INTO users(id,username,name,password,role,created) VALUES(?,?,?,?,?,?)').bind('demo-student', 'siswa', 'Siswa Penjelajah', await passwordHash(env.DEMO_USER_PASSWORD), 'user', now));
    const counters: Record<string, number> = {};
    for (const seed of SEEDS) {
      const sequence = counters[seed.kind] = (counters[seed.kind] || 0) + 1;
      const m = material({ ...seed, grade: 4, timeLimit: sequence === 2 ? 600 : 0, hintQuota: 3, questions: seed.questions.map(([clue, answer]) => ({ clue, answer })) });
      const result = generate(m.questions);
      if (!result.grid) throw new Error(`Materi contoh tidak dapat disusun: ${seed.title}: ${result.unplaced.join(', ')}`);
      m.grid = result.grid;
      const levelId = `sample-${seed.kind}-${sequence}`;
      statements.push(db.prepare('INSERT OR IGNORE INTO levels(id,kind,sequence,draft,published,updated) VALUES(?,?,?,?,?,?)').bind(levelId, m.kind, sequence, JSON.stringify(m), 1, now));
      statements.push(db.prepare('INSERT OR IGNORE INTO versions(id,level_id,number,data,created) VALUES(?,?,?,?,?)').bind(`${levelId}-v1`, levelId, 1, JSON.stringify(m), now));
    }
  }
  await db.batch(statements);
}

async function getAttempt(db: D1Database, attemptId: string, userId: string, now: number) {
  await db.prepare("UPDATE attempts SET status='expired',ended=deadline,revision=revision+1 WHERE id=? AND user_id=? AND status='active' AND deadline IS NOT NULL AND deadline<=?").bind(attemptId, userId, now).run();
  const a = await db.prepare('SELECT a.*,v.data,v.number AS version_number,l.sequence,l.kind FROM attempts a JOIN versions v ON v.id=a.version_id JOIN levels l ON l.id=a.level_id WHERE a.id=? AND a.user_id=?').bind(attemptId, userId).first<Attempt>();
  if (!a) throw new ApiError('Permainan tidak ditemukan.', 404);
  return a;
}
function safeAttempt(a: Attempt, now: number) {
  const m = JSON.parse(a.data) as Material, hints = JSON.parse(a.hints) as string[], grid = m.grid!;
  return {
    id: a.id, levelId: a.level_id, kind: a.kind, sequence: a.sequence, title: m.title, version: a.version_number,
    grid: { rows: grid.rows, cols: grid.cols, words: grid.words.map(({ answer, ...w }) => ({ ...w, length: answer.length })) },
    entries: JSON.parse(a.entries), hints, hintsRemaining: Math.max(0, m.hintQuota - hints.length), score: Math.max(0, 100 - 5 * hints.length),
    started: a.started, deadline: a.deadline, ended: a.ended, status: a.status, revision: a.revision, serverNow: now,
    duration: Math.max(0, Math.floor(((a.ended ?? now) - a.started) / 1000)),
  };
}
async function updateAttempt(db: D1Database, a: Attempt, entries: Record<string, string>, hints: string[], now: number) {
  const m = JSON.parse(a.data) as Material, answers = solution(m.grid!);
  const complete = Object.entries(answers).every(([k, v]) => entries[k] === v);
  const status = complete ? 'completed' : 'active';
  const result = await db.batch([
    db.prepare("UPDATE attempts SET entries=?,hints=?,status=?,ended=?,revision=revision+1 WHERE id=? AND revision=? AND status='active' AND (deadline IS NULL OR deadline>?)").bind(JSON.stringify(entries), JSON.stringify(hints), status, complete ? now : null, a.id, a.revision, now),
    db.prepare("INSERT OR IGNORE INTO completions(id,user_id,level_id,created) SELECT ?,user_id,level_id,? FROM attempts WHERE id=? AND status='completed'").bind(id(), now, a.id),
  ]);
  if (!result[0].meta.changes) throw new ApiError('Permainan berubah. Muat kembali sebelum mencoba lagi.', 409);
  return getAttempt(db, a.id, a.user_id, now);
}

async function dispatch(request: Request, env: Bindings) {
  const db = env.DB;
  if (!db) throw new ApiError('Database belum tersedia.', 503);
  const now = Date.now(), url = new URL(request.url), path = url.pathname.replace(/^\/api\/?/, ''), method = request.method;
  if (method !== 'GET') {
    const origin = request.headers.get('origin');
    if ((origin && origin !== url.origin) || request.headers.get('x-tts-request') !== '1') throw new ApiError('Permintaan tidak diizinkan.', 403);
  }
  await initialize(db, env);
  let body: any = {};
  if (method !== 'GET') {
    const raw = await request.text();
    if (raw.length > 30000) throw new ApiError('Data terlalu besar.', 413);
    try { body = JSON.parse(raw || '{}'); } catch { throw new ApiError('Data permintaan tidak valid.'); }
  }
  const rawToken = request.headers.get('cookie')?.match(/(?:^|;\s*)tts_session=([^;]+)/)?.[1];
  const user = rawToken ? await db.prepare('SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token=? AND s.expires>?').bind(await tokenHash(rawToken), now).first<User>() : null;
  const cookie = (value: string, age: number) => `tts_session=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${url.protocol === 'https:' ? '; Secure' : ''}`;
  const respond = (value: unknown, status = 200, extra: Record<string, string> = {}) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store', ...extra } });

  if (path === 'login' && method === 'POST') {
    const username = String(body.username ?? '').trim().toLowerCase(), password = String(body.password ?? '');
    const limitKey = await tokenHash(username + ':' + (request.headers.get('cf-connecting-ip') || 'local'));
    const limit = await db.prepare('SELECT * FROM login_limits WHERE key=?').bind(limitKey).first<{ failures: number; until: number }>();
    if (limit && limit.until > now && limit.failures >= 5) throw new ApiError('Terlalu banyak percobaan login. Coba lagi dalam 10 menit.', 429);
    const account = await db.prepare('SELECT * FROM users WHERE username=?').bind(username).first<User>();
    const valid = password.length <= 128 && await passwordMatches(password, account?.password ?? await passwordHash('invalid-account'));
    if (!account || !valid) {
      await db.prepare('INSERT INTO login_limits(key,failures,until) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET failures=CASE WHEN until>? THEN failures+1 ELSE 1 END,until=CASE WHEN until>? THEN until ELSE excluded.until END').bind(limitKey, now + 600000, now, now).run();
      throw new ApiError('Username atau kata sandi salah.', 401);
    }
    const token = hex(crypto.getRandomValues(new Uint8Array(32)).buffer);
    await db.batch([
      db.prepare('INSERT INTO sessions(token,user_id,expires) VALUES(?,?,?)').bind(await tokenHash(token), account.id, now + 604800000),
      db.prepare('DELETE FROM login_limits WHERE key=?').bind(limitKey),
      db.prepare('DELETE FROM sessions WHERE expires<=?').bind(now),
    ]);
    return respond({ user: publicUser(account) }, 200, { 'Set-Cookie': cookie(token, 604800) });
  }
  if (path === 'logout' && method === 'POST') {
    if (rawToken) await db.prepare('DELETE FROM sessions WHERE token=?').bind(await tokenHash(rawToken)).run();
    return respond({ ok: true }, 200, { 'Set-Cookie': cookie('', 0) });
  }
  if (!user) throw new ApiError('Silakan login terlebih dahulu.', 401);
  if (path === 'me' && method === 'GET') return respond({ user: publicUser(user) });

  if (path.startsWith('admin/')) {
    if (user.role !== 'admin') throw new ApiError('Hanya admin yang dapat mengakses halaman ini.', 403);
    if (path === 'admin/users' && method === 'GET') return respond({ users: (await db.prepare("SELECT id,username,name,role,created FROM users WHERE role='user' ORDER BY created DESC").all()).results });
    if (path === 'admin/users' && method === 'POST') {
      const username = String(body.username ?? '').trim().toLowerCase(), name = String(body.name ?? '').trim(), password = String(body.password ?? '');
      if (!/^[a-z0-9_.-]{3,32}$/.test(username)) throw new ApiError('Username harus 3–32 huruf/angka, titik, garis bawah, atau tanda hubung.');
      if (!name || name.length > 80 || password.length < 8 || password.length > 128) throw new ApiError('Isi nama (maksimal 80 karakter) dan kata sandi 8–128 karakter.');
      if (await db.prepare('SELECT id FROM users WHERE username=?').bind(username).first()) throw new ApiError('Username sudah digunakan.', 409);
      await db.prepare('INSERT INTO users(id,username,name,password,role,created) VALUES(?,?,?,?,?,?)').bind(id(), username, name, await passwordHash(password), 'user', now).run();
      return respond({ ok: true }, 201);
    }
    const reset = path.match(/^admin\/users\/([^/]+)\/reset$/);
    if (reset && method === 'POST') {
      const password = String(body.password ?? '');
      if (password.length < 8 || password.length > 128) throw new ApiError('Kata sandi harus 8–128 karakter.');
      if (!await db.prepare("SELECT id FROM users WHERE id=? AND role='user'").bind(reset[1]).first()) throw new ApiError('User tidak ditemukan.', 404);
      await db.batch([db.prepare('UPDATE users SET password=? WHERE id=?').bind(await passwordHash(password), reset[1]), db.prepare('DELETE FROM sessions WHERE user_id=?').bind(reset[1])]);
      return respond({ ok: true });
    }
    if (path === 'admin/levels' && method === 'GET') return respond({ levels: (await db.prepare('SELECT * FROM levels ORDER BY kind,sequence').all()).results.map((l: any) => ({ ...l, draft: JSON.parse(l.draft) })) });
    if (path === 'admin/levels' && method === 'POST') {
      const m = material(body), levelId = body.id || id();
      const existing = body.id ? await db.prepare('SELECT * FROM levels WHERE id=?').bind(body.id).first<any>() : null;
      if (body.id && !existing) throw new ApiError('Level tidak ditemukan.', 404);
      if (existing && existing.kind !== m.kind) throw new ApiError('Tipe level yang tersimpan tidak dapat diubah.');
      if (existing) {
        const previous = JSON.parse(existing.draft);
        if (JSON.stringify(previous.questions) === JSON.stringify(m.questions)) m.grid = previous.grid;
        await db.prepare('UPDATE levels SET draft=?,updated=? WHERE id=?').bind(JSON.stringify(m), now, levelId).run();
      } else {
        await db.prepare('INSERT INTO levels(id,kind,sequence,draft,published,updated) SELECT ?,?,COALESCE(MAX(sequence),0)+1,?,0,? FROM levels WHERE kind=?').bind(levelId, m.kind, JSON.stringify(m), now, m.kind).run();
      }
      return respond({ level: await db.prepare('SELECT * FROM levels WHERE id=?').bind(levelId).first() });
    }
    const edit = path.match(/^admin\/levels\/([^/]+)\/(generate|publish)$/);
    if (edit && method === 'POST') {
      const l = await db.prepare('SELECT * FROM levels WHERE id=?').bind(edit[1]).first<any>();
      if (!l) throw new ApiError('Level tidak ditemukan.', 404);
      const m = JSON.parse(l.draft) as Material;
      if (edit[2] === 'generate') {
        const result = generate(m.questions); m.grid = result.grid;
        const changed = await db.prepare('UPDATE levels SET draft=?,updated=? WHERE id=? AND draft=?').bind(JSON.stringify(m), now, l.id, l.draft).run();
        if (!changed.meta.changes) throw new ApiError('Draft berubah. Muat ulang dan buat grid lagi.', 409);
        return respond({ material: m, unplaced: result.unplaced });
      }
      if (!m.grid) throw new ApiError('Buat grid yang memuat semua soal sebelum menerbitkan.');
      material(m); validateGrid(m.grid, m.questions);
      const results = await db.batch([
        db.prepare('INSERT INTO versions(id,level_id,number,data,created) SELECT ?,id,published+1,draft,? FROM levels WHERE id=? AND draft=? AND published=?').bind(id(), now, l.id, l.draft, l.published),
        db.prepare('UPDATE levels SET published=published+1,updated=? WHERE id=? AND draft=? AND published=?').bind(now, l.id, l.draft, l.published),
      ]);
      if (!results[0].meta.changes) throw new ApiError('Level berubah. Muat ulang sebelum menerbitkan.', 409);
      return respond({ ok: true, version: l.published + 1 });
    }
    if (path === 'admin/reports' && method === 'GET') {
      await db.prepare("UPDATE attempts SET status='expired',ended=deadline,revision=revision+1 WHERE status='active' AND deadline IS NOT NULL AND deadline<=?").bind(now).run();
      const [users, progress, history, levels] = await Promise.all([
        db.prepare("SELECT id,name,username FROM users WHERE role='user' ORDER BY name").all(),
        db.prepare('SELECT c.user_id,c.level_id,l.kind,l.sequence FROM completions c JOIN levels l ON l.id=c.level_id').all(),
        db.prepare('SELECT a.id,a.user_id,u.name,u.username,a.level_id,l.kind,l.sequence,v.number AS version,v.data,a.started,a.deadline,a.ended,a.status,a.hints FROM attempts a JOIN users u ON u.id=a.user_id JOIN levels l ON l.id=a.level_id JOIN versions v ON v.id=a.version_id ORDER BY a.started DESC').all<any>(),
        db.prepare('SELECT id,kind,sequence FROM levels WHERE published>0 ORDER BY kind,sequence').all(),
      ]);
      return respond({ users: users.results, progress: progress.results, levels: levels.results, history: history.results.map(({ data, hints, ...a }) => ({ ...a, title: JSON.parse(data).title, hints: JSON.parse(hints).length, score: Math.max(0, 100 - 5 * JSON.parse(hints).length), duration: Math.max(0, Math.floor(((a.ended ?? now) - a.started) / 1000)) })) });
    }
    throw new ApiError('Halaman tidak ditemukan.', 404);
  }
  if (user.role !== 'user') throw new ApiError('Gunakan akun siswa untuk bermain.', 403);
  if (path === 'levels' && method === 'GET') {
    const [levels, completed, active, best] = await Promise.all([
      db.prepare('SELECT l.id,l.kind,l.sequence,l.published,v.data FROM levels l JOIN versions v ON v.level_id=l.id AND v.number=l.published WHERE l.published>0 ORDER BY l.kind,l.sequence').all<any>(),
      db.prepare('SELECT level_id FROM completions WHERE user_id=?').bind(user.id).all<any>(),
      db.prepare("SELECT id,level_id FROM attempts WHERE user_id=? AND status='active' AND (deadline IS NULL OR deadline>?) ORDER BY started DESC").bind(user.id, now).all<any>(),
      db.prepare("SELECT level_id,MAX(MAX(0,100-5*json_array_length(hints))) AS score FROM attempts WHERE user_id=? AND status='completed' GROUP BY level_id").bind(user.id).all<any>(),
    ]);
    const finished = new Set(completed.results.map(c => c.level_id));
    return respond({ levels: levels.results.map(l => {
      const m = JSON.parse(l.data) as Material;
      const prerequisites = levels.results.filter(p => p.kind === l.kind && p.sequence < l.sequence);
      return { id: l.id, kind: l.kind, sequence: l.sequence, version: l.published, title: m.title, topic: m.topic, grade: m.grade, count: m.questions.length, timeLimit: m.timeLimit, hintQuota: m.hintQuota, completed: finished.has(l.id), unlocked: prerequisites.every(p => finished.has(p.id)), activeId: active.results.find(a => a.level_id === l.id)?.id ?? null, bestScore: best.results.find(a => a.level_id === l.id)?.score ?? null };
    }) });
  }
  const start = path.match(/^levels\/([^/]+)\/start$/);
  if (start && method === 'POST') {
    const l = await db.prepare('SELECT l.*,v.id AS version_id,v.data FROM levels l JOIN versions v ON v.level_id=l.id AND v.number=l.published WHERE l.id=? AND l.published>0').bind(start[1]).first<any>();
    if (!l) throw new ApiError('Level belum tersedia.', 404);
    const prerequisite = await db.prepare('SELECT l.id FROM levels l LEFT JOIN completions c ON c.level_id=l.id AND c.user_id=? WHERE l.kind=? AND l.sequence<? AND l.published>0 AND c.id IS NULL LIMIT 1').bind(user.id, l.kind, l.sequence).first();
    if (prerequisite) throw new ApiError('Selesaikan level sebelumnya terlebih dahulu.', 403);
    let active = await db.prepare("SELECT id FROM attempts WHERE user_id=? AND level_id=? AND status='active' ORDER BY started DESC LIMIT 1").bind(user.id, l.id).first<{ id: string }>();
    if (active) {
      const current = await getAttempt(db, active.id, user.id, now);
      if (current.status === 'active') return respond({ attempt: safeAttempt(current, now) });
    }
    const m = JSON.parse(l.data) as Material, attemptId = id();
    // Conditional insertion also prevents two devices from creating duplicate active attempts.
    await db.prepare("INSERT INTO attempts(id,user_id,level_id,version_id,started,deadline,status,entries,hints,revision) SELECT ?,?,?,?,?,?,'active','{}','[]',0 WHERE NOT EXISTS(SELECT 1 FROM attempts WHERE user_id=? AND level_id=? AND status='active')").bind(attemptId, user.id, l.id, l.version_id, now, m.timeLimit ? now + m.timeLimit * 1000 : null, user.id, l.id).run();
    active = await db.prepare("SELECT id FROM attempts WHERE user_id=? AND level_id=? AND status='active' ORDER BY started DESC LIMIT 1").bind(user.id, l.id).first<{ id: string }>();
    return respond({ attempt: safeAttempt(await getAttempt(db, active!.id, user.id, now), now) });
  }
  const game = path.match(/^attempts\/([^/]+)(?:\/(save|hint|check))?$/);
  if (game) {
    const a = await getAttempt(db, game[1], user.id, now);
    if (!game[2] && method === 'GET') return respond({ attempt: safeAttempt(a, now) });
    if (method !== 'POST') throw new ApiError('Permintaan tidak diizinkan.', 405);
    if (a.status !== 'active') return respond({ attempt: safeAttempt(a, now), message: a.status === 'expired' ? 'Waktu habis. Coba lagi, ya!' : 'Level sudah selesai.' });
    const m = JSON.parse(a.data) as Material, grid = m.grid!, answers = solution(grid), entries = JSON.parse(a.entries) as Record<string, string>, hints = JSON.parse(a.hints) as string[];
    if (game[2] === 'save') {
      if (body.revision !== a.revision) throw new ApiError('Isian berubah di perangkat lain. Muat kembali permainan.', 409);
      if (!body.entries || typeof body.entries !== 'object' || Array.isArray(body.entries)) throw new ApiError('Isian tidak valid.');
      const next: Record<string, string> = {};
      for (const [k, val] of Object.entries(body.entries)) {
        const v = String(val).toUpperCase();
        if (!(k in answers) || !(m.kind === 'math' ? /^\d?$/ : /^[A-Z]?$/).test(v)) throw new ApiError('Karakter atau kotak tidak valid.');
        if (v) next[k] = v;
      }
      hints.forEach(k => { next[k] = answers[k]; });
      return respond({ attempt: safeAttempt(await updateAttempt(db, a, next, hints, now), now) });
    }
    if (game[2] === 'hint') {
      const k = String(body.cell);
      if (!(k in answers)) throw new ApiError('Pilih kotak jawaban terlebih dahulu.');
      if (hints.includes(k)) return respond({ attempt: safeAttempt(a, now) });
      if (hints.length >= m.hintQuota) throw new ApiError('Kuota bantuan sudah habis.');
      entries[k] = answers[k]; hints.push(k);
      return respond({ attempt: safeAttempt(await updateAttempt(db, a, entries, hints, now), now) });
    }
    if (game[2] === 'check') {
      const w = grid.words.find(w => w.id === String(body.wordId));
      if (!w) throw new ApiError('Pilih petunjuk terlebih dahulu.');
      const chars = cells(w).map(c => entries[key(c.row, c.col)] || '');
      return respond({ result: chars.some(c => !c) ? 'incomplete' : chars.join('') === w.answer ? 'correct' : 'incorrect', attempt: safeAttempt(a, now) });
    }
  }
  throw new ApiError('Halaman tidak ditemukan.', 404);
}

export async function handle(request: Request, env: Bindings) {
  try { return await dispatch(request, env); }
  catch (error) {
    const known = error instanceof ApiError;
    if (!known && error instanceof Error && !/wajib|harus|Pilih|Masukkan|Kunci|Petunjuk|Grid|Persilangan|soal/.test(error.message)) console.error(error);
    const validation = !known && error instanceof Error && /wajib|harus|Pilih|Masukkan|Kunci|Petunjuk|Grid|Persilangan|soal/.test(error.message);
    return Response.json({ error: known || validation ? (error as Error).message : 'Terjadi masalah di server. Coba lagi.' }, { status: known ? error.status : validation ? 400 : 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
