// Pure, exact-bound transcript word corrections. Produces a DERIVATIVE document;
// the input report (native/raw/CTC data) is never mutated. Timing fields are
// copied verbatim, never invented. Any invalid edit fails the whole overlay.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const DERIVATIVE_SCHEMA = 'bapi.transcript-corrections.derivative/v1';
const SHA256_RE = /^[0-9a-f]{64}$/;
const SINGLE_WORD_RE = /^\S+$/;

export class CorrectionError extends Error {}

// Full-file correction overlay, bound to an unchanged source and one native
// token at an approved source time. Does not reuse sample-local indices.
export function applySourceCorrections(raw, overlay, sourceSha256) {
  if(!SHA256_RE.test(sourceSha256)||overlay?.sourceSha256!==sourceSha256||!Array.isArray(overlay.edits)||!overlay.edits.length)bad('stale or invalid source correction overlay');
  const result=structuredClone(raw), words=result.segments?.flatMap(s=>s.words??[]);
  if(!Array.isArray(words)||!words.length)bad('full transcript has no timed words');
  const used=new Set(), applied=[];
  for(const edit of overlay.edits){
    if(edit.approval!=='user'||!Number.isFinite(edit.sourceSeconds)||!Number.isFinite(edit.toleranceSeconds)||edit.toleranceSeconds<0||edit.toleranceSeconds>.25||!Array.isArray(edit.expected)||!edit.expected.length||edit.expected.some(x=>typeof x!=='string'||!SINGLE_WORD_RE.test(x))||!SINGLE_WORD_RE.test(edit.replacement??''))bad('invalid source-bound correction');
    const matches=words.map((w,i)=>({w,i})).filter(({w})=>edit.expected.includes(w.word)&&Math.abs(w.start-edit.sourceSeconds)<=edit.toleranceSeconds);
    if(matches.length!==1||used.has(matches[0].i))bad('source correction token absent, ambiguous or duplicated');
    const {w,i}=matches[0];used.add(i);
    applied.push({wordIndex:i,sourceSeconds:w.start,endSeconds:w.end,expected:w.word,replacement:edit.replacement,approval:'user',approvalEvidence:overlay.approvalEvidence});w.word=edit.replacement;
  }
  for(const s of result.segments)s.text=(s.words??[]).map(w=>w.word).join(' ');
  result.text=words.map(w=>w.word).join(' ');
  result.corrections={schema:'bapi.source-bound-word-corrections/1',sourceSha256,applied,timingUnchanged:true};
  return result;
}

function bad(message) {
  throw new CorrectionError(message);
}

function wordText(word, where) {
  if (!word || typeof word !== 'object') bad(`${where}: not a word object`);
  if (typeof word.word === 'string') return 'word';
  if (typeof word.text === 'string') return 'text';
  return bad(`${where}: word has no text field`);
}

// Replace token at index in a single-space-joined text, only if it aligns exactly with words.
function replaceToken(text, words, key, index, replacement, where) {
  if (typeof text !== 'string') bad(`${where}: text missing`);
  const tokens = text.split(' ');
  if (tokens.length !== words.length || tokens.some((t, i) => t !== words[i][key])) {
    bad(`${where}: text does not align one-to-one with words`);
  }
  tokens[index] = replacement;
  return tokens.join(' ');
}

function validateEdits(overlay) {
  if (!Array.isArray(overlay.edits) || overlay.edits.length === 0) bad('overlay.edits must be a non-empty array');
  const seen = new Set();
  for (const [i, e] of overlay.edits.entries()) {
    const where = `edit[${i}]`;
    if (!e || typeof e !== 'object') bad(`${where}: not an object`);
    if (typeof e.sampleId !== 'string' || !e.sampleId) bad(`${where}: sampleId required`);
    if (!Number.isInteger(e.wordIndex) || e.wordIndex < 0) bad(`${where}: wordIndex must be a non-negative integer`);
    if (typeof e.expected !== 'string' || !e.expected) bad(`${where}: expected required`);
    if (typeof e.replacement !== 'string' || !SINGLE_WORD_RE.test(e.replacement)) {
      bad(`${where}: replacement must be a non-empty single word`);
    }
    if (e.replacement === e.expected) bad(`${where}: replacement equals expected`);
    if (e.approval !== 'user') bad(`${where}: approval must be "user"`);
    const key = `${e.sampleId}\u0000${e.wordIndex}`;
    if (seen.has(key)) bad(`${where}: duplicate sampleId/wordIndex`);
    seen.add(key);
  }
}

export function applyCorrections(report, overlay, actualSha256) {
  if (typeof actualSha256 !== 'string' || !SHA256_RE.test(actualSha256)) bad('actualSha256 must be lowercase hex sha256');
  if (!overlay || typeof overlay !== 'object') bad('overlay must be an object');
  if (overlay.sourceSha256 !== actualSha256) bad('stale overlay: sourceSha256 does not match source');
  validateEdits(overlay);
  if (!report || !Array.isArray(report.samples)) bad('report.samples must be an array');

  const src = structuredClone(report);
  const edits = structuredClone(overlay.edits);
  const byId = new Map();
  for (const s of src.samples) {
    if (!s || typeof s.id !== 'string') bad('sample without string id');
    if (byId.has(s.id)) bad(`duplicate sample id: ${s.id}`);
    byId.set(s.id, s);
  }

  const order = [];
  const groups = new Map();
  for (const e of edits) {
    if (!byId.has(e.sampleId)) bad(`unknown sampleId: ${e.sampleId}`);
    if (!groups.has(e.sampleId)) {
      groups.set(e.sampleId, []);
      order.push(e.sampleId);
    }
    groups.get(e.sampleId).push(e);
  }

  const correctedSamples = order.map((id) => {
    const sample = byId.get(id);
    if (!Array.isArray(sample.words) || sample.words.length === 0) bad(`${id}: words missing`);
    const key = wordText(sample.words[0], id);
    sample.words.forEach((w, i) => {
      if (wordText(w, `${id} word ${i}`) !== key) bad(`${id}: inconsistent word text fields`);
    });

    let absoluteWords = null;
    if (sample.absoluteWords !== undefined) {
      const abs = sample.absoluteWords;
      if (!Array.isArray(abs) || abs.length !== sample.words.length) bad(`${id}: absoluteWords length mismatch`);
      abs.forEach((w, i) => {
        if (w?.[key] !== sample.words[i][key]) bad(`${id}: absoluteWords[${i}] text mismatch`);
      });
      absoluteWords = structuredClone(abs);
    }

    let segments = null;
    if (sample.segments !== undefined) {
      if (!Array.isArray(sample.segments) || sample.segments.length !== 1) {
        bad(`${id}: only a single original segment is supported`);
      }
      segments = structuredClone(sample.segments);
    }

    const words = structuredClone(sample.words);
    let text = sample.text ?? sample.native?.text;
    for (const e of groups.get(id)) {
      const where = `${id} word ${e.wordIndex}`;
      if (e.wordIndex >= words.length) bad(`${where}: index out of range`);
      if (sample.words[e.wordIndex][key] !== e.expected) bad(`${where}: expected token mismatch`);
      text = replaceToken(text, words, key, e.wordIndex, e.replacement, `${id} text`);
      if (segments) {
        const seg = segments[0];
        seg.text = replaceToken(seg.text, words, key, e.wordIndex, e.replacement, `${id} segment`);
        if (seg.words !== undefined) {
          if (!Array.isArray(seg.words) || seg.words.length !== words.length) bad(`${id}: segment words mismatch`);
          if (seg.words[e.wordIndex]?.[key] !== e.expected) bad(`${id}: segment word mismatch`);
          seg.words[e.wordIndex][key] = e.replacement;
        }
      }
      words[e.wordIndex][key] = e.replacement;
      if (absoluteWords) absoluteWords[e.wordIndex][key] = e.replacement;
    }
    return { id, text, words, absoluteWords, segments };
  });

  return {
    schema: DERIVATIVE_SCHEMA,
    sourceSha256: actualSha256,
    edits,
    correctedSamples,
    productionEligible: false,
    humanTimingGate: 'pending',
  };
}

// ---- optional CLI ----
// Folders the CLI must never write into (e.g. your production output). Optional; set TCT_PROTECTED_DIRS to a
// list separated by the platform path delimiter (';' on Windows, ':' elsewhere). Empty by default.
const FORBIDDEN_OUT_ROOTS = (process.env.TCT_PROTECTED_DIRS ?? '').split(path.delimiter).filter(Boolean).map((p) => path.win32.resolve(p).replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase());

function norm(p) {
  return path.win32.resolve(p).replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
}

export function assertOutputAllowed(out) {
  if (!path.win32.isAbsolute(out) && !path.posix.isAbsolute(out)) bad('--out must be absolute');
  const n = norm(out);
  for (const root of FORBIDDEN_OUT_ROOTS) {
    if (n === root || n.startsWith(root + '/')) bad(`--out may not be under ${root}`);
  }
  if (out.startsWith('\\\\') || out.startsWith('//')) bad('--out must be a local file');
  let ancestor = path.dirname(out);
  while (!existsSync(ancestor) && path.dirname(ancestor) !== ancestor) ancestor = path.dirname(ancestor);
  if (existsSync(ancestor)) {
    const actual = norm(realpathSync(ancestor));
    if (FORBIDDEN_OUT_ROOTS.some(root => actual === root || actual.startsWith(root + '/'))) bad('--out resolves into a protected folder');
  }
}

function parseArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i += 2) {
    const k = argv[i];
    const v = argv[i + 1];
    if (!['--source', '--overlay', '--out'].includes(k) || k in opts || v === undefined || v.startsWith('--')) {
      bad(`bad argument: ${k}`);
    }
    opts[k] = v;
  }
  for (const k of ['--source', '--overlay', '--out']) {
    if (!opts[k]) bad(`${k} is required`);
    if (!path.isAbsolute(opts[k])) bad(`${k} must be an absolute path`);
  }
  return opts;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const opts = parseArgs(process.argv.slice(2));
    assertOutputAllowed(opts['--out']);
    const bytes = readFileSync(opts['--source']);
    const sha = createHash('sha256').update(bytes).digest('hex');
    const report = JSON.parse(bytes.toString('utf8'));
    const overlay = JSON.parse(readFileSync(opts['--overlay'], 'utf8'));
    const result = applyCorrections(report, overlay, sha);
    writeFileSync(opts['--out'], JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
    process.stdout.write(JSON.stringify({ ok: true, out: opts['--out'], sourceSha256: sha }) + '\n');
  } catch (err) {
    process.stdout.write(JSON.stringify({ ok: false, error: String(err?.message ?? err) }) + '\n');
    process.exitCode = 1;
  }
}
