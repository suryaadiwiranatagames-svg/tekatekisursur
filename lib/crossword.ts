export type Kind = 'trivia' | 'math' | 'english';
export type Question = { clue: string; answer: string };
export type Word = Question & { id: string; row: number; col: number; direction: 'across' | 'down'; number: number };
export type Grid = { rows: number; cols: number; words: Word[] };
export type Material = { title: string; topic: string; grade: number; kind: Kind; timeLimit: number; hintQuota: number; questions: Question[]; grid: Grid | null };
export const KINDS: Kind[] = ['trivia', 'math', 'english'];

export function material(input: any): Material {
  if (!KINDS.includes(input.kind)) throw new Error('Pilih tipe TTS yang valid.');
  const title = String(input.title ?? '').trim();
  if (!title || title.length > 100) throw new Error('Judul wajib diisi, maksimal 100 karakter.');
  const grade = Number(input.grade);
  if (![4, 5, 6].includes(grade)) throw new Error('Pilih kelas 4, 5, atau 6.');
  const timeLimit = Number(input.timeLimit ?? 0), hintQuota = Number(input.hintQuota ?? 3);
  if (!Number.isInteger(timeLimit) || timeLimit < 0 || timeLimit > 86400) throw new Error('Waktu harus 0 (tanpa batas) atau 1–86400 detik.');
  if (!Number.isInteger(hintQuota) || hintQuota < 0 || hintQuota > 100) throw new Error('Kuota bantuan harus 0–100.');
  if (!Array.isArray(input.questions) || !input.questions.length || input.questions.length > 20) throw new Error('Masukkan 1–20 soal.');
  const questions = input.questions.map((q: any, i: number) => {
    const clue = String(q.clue ?? '').trim();
    const raw = String(q.answer ?? '').trim();
    const answer = input.kind === 'math' ? raw : raw.toUpperCase().replace(/\s/g, '');
    if (!clue || clue.length > 500) throw new Error(`Petunjuk soal ${i + 1} wajib diisi (maksimal 500 karakter).`);
    if (!(input.kind === 'math' ? /^\d+$/ : /^[A-Z]+$/).test(answer) || answer.length > 24) throw new Error(`Kunci soal ${i + 1} harus ${input.kind === 'math' ? 'digit 0–9' : 'huruf A–Z'}, maksimal 24 karakter.`);
    return { clue, answer };
  });
  return { title, topic: String(input.topic ?? '').trim().slice(0, 100), kind: input.kind, grade, timeLimit, hintQuota, questions, grid: null };
}

export function cells(word: Pick<Word, 'row' | 'col' | 'direction' | 'answer'>) {
  return [...word.answer].map((char, i) => ({ row: word.row + (word.direction === 'down' ? i : 0), col: word.col + (word.direction === 'across' ? i : 0), char }));
}
export const key = (row: number, col: number) => `${row},${col}`;
export function solution(grid: Grid) {
  const result: Record<string, string> = {};
  grid.words.forEach(w => cells(w).forEach(c => { result[key(c.row, c.col)] = c.char; }));
  return result;
}

function fits(candidate: Word, placed: Word[], mustCross: boolean) {
  const board = new Map<string, { char: string; dirs: Set<string> }>();
  placed.forEach(w => cells(w).forEach(c => {
    const k = key(c.row, c.col), old = board.get(k);
    if (old) old.dirs.add(w.direction); else board.set(k, { char: c.char, dirs: new Set([w.direction]) });
  }));
  let crosses = 0;
  const positions = cells(candidate), dr = candidate.direction === 'down' ? 1 : 0, dc = 1 - dr;
  if (board.has(key(candidate.row - dr, candidate.col - dc))) return false;
  const last = positions[positions.length - 1];
  if (board.has(key(last.row + dr, last.col + dc))) return false;
  for (const c of positions) {
    const at = board.get(key(c.row, c.col));
    if (at) {
      if (at.char !== c.char || at.dirs.has(candidate.direction)) return false;
      crosses++;
    } else if (board.has(key(c.row - dc, c.col - dr)) || board.has(key(c.row + dc, c.col + dr))) return false;
  }
  const all = [...placed.flatMap(cells), ...positions];
  const height = Math.max(...all.map(c => c.row)) - Math.min(...all.map(c => c.row)) + 1;
  const width = Math.max(...all.map(c => c.col)) - Math.min(...all.map(c => c.col)) + 1;
  return (!mustCross || crosses > 0) && height <= 40 && width <= 40;
}

export function generate(questions: Question[]): { grid: Grid | null; unplaced: string[] } {
  let best: Word[] = [];
  const source = questions.map((q, i) => ({ ...q, id: String(i), row: 0, col: 0, direction: 'across' as const, number: 0 }));
  for (let trial = 0; trial < 50; trial++) {
    const pending: Word[] = [...source].sort((a, b) => b.answer.length - a.answer.length);
    if (trial) pending.sort(() => Math.random() - .5);
    const placed: Word[] = [{ ...pending.shift()!, direction: trial % 2 ? 'down' : 'across' }];
    let progress = true;
    while (pending.length && progress) {
      progress = false;
      for (let i = 0; i < pending.length; i++) {
        const q = pending[i], candidates: Word[] = [];
        for (const w of placed) for (const c of cells(w)) for (let j = 0; j < q.answer.length; j++) {
          if (c.char !== q.answer[j]) continue;
          const direction = w.direction === 'across' ? 'down' : 'across';
          const candidate: Word = { ...q, direction, row: c.row - (direction === 'down' ? j : 0), col: c.col - (direction === 'across' ? j : 0) };
          if (fits(candidate, placed, true)) candidates.push(candidate);
        }
        if (candidates.length) {
          candidates.sort((a, b) => {
            const area = (v: Word) => { const list = [...placed.flatMap(cells), ...cells(v)]; return (Math.max(...list.map(c => c.row)) - Math.min(...list.map(c => c.row)) + 1) * (Math.max(...list.map(c => c.col)) - Math.min(...list.map(c => c.col)) + 1); };
            return area(a) - area(b);
          });
          placed.push(candidates[trial % Math.min(3, candidates.length)]);
          pending.splice(i--, 1); progress = true;
        }
      }
    }
    if (placed.length > best.length) best = placed;
    if (!pending.length) { best = placed; break; }
  }
  if (best.length !== questions.length) return { grid: null, unplaced: source.filter(w => !best.some(b => b.id === w.id)).map(w => w.answer) };
  const list = best.flatMap(cells), minRow = Math.min(...list.map(c => c.row)), minCol = Math.min(...list.map(c => c.col));
  best = best.map(w => ({ ...w, row: w.row - minRow, col: w.col - minCol })).sort((a, b) => a.row - b.row || a.col - b.col);
  let number = 0, previous = '';
  best.forEach(w => { const k = key(w.row, w.col); if (k !== previous) { number++; previous = k; } w.number = number; });
  const grid: Grid = { words: best, rows: Math.max(...list.map(c => c.row)) - minRow + 1, cols: Math.max(...list.map(c => c.col)) - minCol + 1 };
  validateGrid(grid, questions);
  return { grid, unplaced: [] };
}

export function validateGrid(grid: Grid, questions: Question[]) {
  if (grid.words.length !== questions.length || new Set(grid.words.map(w => w.id)).size !== questions.length) throw new Error('Tidak semua soal terpasang.');
  grid.words.forEach((w, i) => {
    const q = questions[Number(w.id)];
    if (!q || w.answer !== q.answer || w.clue !== q.clue || !['across', 'down'].includes(w.direction)) throw new Error('Grid tidak sesuai soal.');
    if (!fits(w, grid.words.filter((_, j) => i !== j), false)) throw new Error('Persilangan atau batas jawaban tidak valid.');
    if (cells(w).some(c => c.row < 0 || c.col < 0 || c.row >= grid.rows || c.col >= grid.cols)) throw new Error('Jawaban berada di luar grid.');
  });
}
