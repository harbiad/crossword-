import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { DICTIONARY_STAGE3A } from '../api/_lib/dictionary.stage3a.generated.ts';
import { eligibleTranslation, normalizeArabicWord, type DictionaryHeadword, type DictionaryPolicy } from '../api/_lib/dictionary.ts';
import { registerHooks } from 'node:module';
import type { Mode } from '../api/_lib/candidates.ts';
import { applyBatch001, parseReferenceCsv, selectBatch001 } from './stage3b.ts';
import { reviewCsv } from './stage3a.ts';

// Node's TS runner does not remap Vercel's .js source imports. This hook is
// confined to the audit CLI and existing local API .ts files.
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.endsWith('.js') && specifier.startsWith('.') && context.parentURL?.startsWith(new URL('../api/', import.meta.url).href)) {
    const ts = new URL(specifier.slice(0, -3) + '.ts', context.parentURL);
    if (existsSync(ts)) return nextResolve(ts.href, context);
  }
  return nextResolve(specifier, context);
} });
const { createCandidateIndex } = await import('../api/_lib/candidates.ts');

const root = new URL('../dictionary/stage3b/batch001/', import.meta.url);
const read = (name: string) => readFileSync(new URL(name, root), 'utf8');
const referenceUrl = new URL('../api/english_arabic_10000_v3.csv', import.meta.url);
const reference = parseReferenceCsv(readFileSync(referenceUrl, 'utf8'));
const prior = JSON.parse(readFileSync(new URL('../dictionary/stage3a/decisions.json', import.meta.url), 'utf8')) as {english: string}[];
const selection = selectBatch001(DICTIONARY_STAGE3A, reference, new Set(prior.map(d => d.english)), new Set(Object.keys(JSON.parse(read('deferred.json')))));
if (JSON.stringify(selection) !== JSON.stringify(JSON.parse(read('selection.json')))) throw new Error('Batch selection drift');
const result = applyBatch001(DICTIONARY_STAGE3A, selection, JSON.parse(read('decisions.json')));
const group = (rows: Record<string, unknown>[], key: string) => rows.reduce<Record<string,number>>((out,r) => { const k=String(r[key] ?? 'unset');out[k]=(out[k]??0)+1;return out; },{});
const counts = (data: readonly DictionaryHeadword[]) => ({ headwords: data.length, relationships: data.reduce((n,h)=>n+h.translations.length,0),
  headwordStatus: group([...data],'status'), relationshipStatus:group(data.flatMap(h=>h.translations),'status'), register:group(data.flatMap(h=>h.translations),'register') });
const availability = (data: readonly DictionaryHeadword[]) => {
  const rows = [];
  for (const policy of ['compatibility','approved-only'] as DictionaryPolicy[]) {
    const index = createCandidateIndex(data,policy);
    for (const mode of ['en_to_ar','ar_to_en'] as Mode[]) for (const size of [7,9,11,13]) {
      const eligibleRelationships = data.reduce((n,h)=>n + h.translations.filter(t=> {
        if (!eligibleTranslation(h,t,policy,mode) || h.english.length<2 || h.english.length>size) return false;
        return t.arabic.split(/[/،;|]/).some(v=>{const length=normalizeArabicWord(v).length;return length>=2 && (mode==='ar_to_en'||length<=size);});
      }).length,0);
      const pairs = [...index.get(`${size}:${mode}:advanced`)!.values()].flat(2);
      rows.push({policy,mode,size,eligibleRelationships,actualIndexedCandidates:pairs.length});
    }
  }
  return rows;
};
const reviewedHeadwords = selection.map(s=>{
  const h=result.dictionary[s.headwordIndex], before=DICTIONARY_STAGE3A[s.headwordIndex];
  const statuses=group(h.translations,'status');
  return {...s,beforeStatus:before.status,status:h.status,relationships:h.translations.length,approved:statuses.approved??0,review:statuses.review??0,rejected:statuses.rejected??0,
    reason:h.status==='approved'?'Suitable general vocabulary with at least one high-confidence approved MSA equivalent.':'Suitable headword; no existing equivalent certified with high confidence in this batch.'};
});
const decisions = result.decisions.map(d=>{
  const ref=reference.get(d.english)!;
  const referenceConflict=d.status!=='approved' && normalizeArabicWord(ref)===normalizeArabicWord(d.original);
  return {...d,referenceArabic:ref,referenceConflict,referenceConflictReason:referenceConflict?'Reference supports a relationship not certified by this review; reference is not authoritative.':''};
});
const hash=(url:URL)=>createHash('sha256').update(readFileSync(url)).digest('hex');
const summary = {
  batch:'001',selectionMethod:'First 500 Stage 3A review-status headwords present in the tracked 10k reference, in original dictionary order; exclude all previously Stage 3A-reviewed headwords and explicit deferred list. No alphabetical sorting. Reference presence is selection evidence, not translation approval.',
  sourceSha256:hash(new URL('../api/_lib/dictionary.stage3a.generated.ts',import.meta.url)),referenceSha256:hash(referenceUrl),
  decisionsSha256:hash(new URL('decisions.json',root)),selectionSha256:hash(new URL('selection.json',root)),
  before:counts(DICTIONARY_STAGE3A),after:counts(result.dictionary),batchCounts:counts(selection.map(s=>result.dictionary[s.headwordIndex])),
  decisionConfidence:group(decisions,'confidence'),
  partOfSpeechAssignments:decisions.filter(d=>d.partOfSpeech!==undefined).length,senseAssignments:decisions.filter(d=>d.sense!==undefined).length,
  multiwordDisplaysBefore:DICTIONARY_STAGE3A.flatMap(h=>h.translations).filter(t=>/\s/.test(t.arabic.trim())).length,
  multiwordDisplaysAfter:result.dictionary.flatMap(h=>h.translations).filter(t=>/\s/.test(t.arabic.trim())).length,
  textCorrections:decisions.filter(d=>d.applied).length,relationshipMetadataChanges:decisions.filter(d=>JSON.stringify(DICTIONARY_STAGE3A[d.headwordIndex].translations[d.translationIndex])!==JSON.stringify(result.dictionary[d.headwordIndex].translations[d.translationIndex])).length,
  headwordStatusChanges:reviewedHeadwords.filter(h=>h.beforeStatus!==h.status).length,
  preferredEnToAr:decisions.filter(d=>d.preferredForEnToAr===true).length,preferredArToEn:decisions.filter(d=>d.preferredForArToEn===true).length,
  directionallyRestrictedRelationships:decisions.filter(d=>d.status==='approved'&&(d.preferredForEnToAr===false||d.preferredForArToEn===false)).length,
  multipleSenseHeadwords:new Set(decisions.filter(d=>d.sense).map(d=>d.english)).size,
  rejectedByReason:group(decisions.filter(d=>d.status==='rejected'),'reasonCode'),unresolvedByReason:group(decisions.filter(d=>d.status==='review'),'reasonCode'),
  referenceConflicts:decisions.filter(d=>d.referenceConflict).length,referenceConflictPolicy:'Includes unresolved form/grammar conflicts; not all are proven errors.',
  deferred:JSON.parse(read('deferred.json')),rejectedProperNamesBrandsAbbreviations:0,
  relationshipLosses:0,newRelationships:0,cefrAssignments:0,productionPolicy:'compatibility',
  availabilityBefore:availability(DICTIONARY_STAGE3A),availabilityAfter:availability(result.dictionary),
};
const csv = (rows: Record<string, unknown>[]) => rows.length ? reviewCsv(rows) : '\uFEFF"english","original","replacement","reason","confidence","applied"\r\n';
const outputs = new Map<URL,string>([
  [new URL('../api/_lib/dictionary.stage3b.generated.ts',import.meta.url), '// Generated by npm run dictionary:review3b. Frozen Stage 3A + batch001 decisions.\n'+"import type { DictionaryHeadword } from './dictionary.js';\n"+'export const DICTIONARY_STAGE3B: DictionaryHeadword[] = '+JSON.stringify(result.dictionary,null,2)+';\n'],
  [new URL('summary.json',root),JSON.stringify(summary,null,2)+'\n'],
  [new URL('reviewed_headwords.csv',root),csv(reviewedHeadwords)],
  [new URL('decisions.csv',root),csv(decisions)],
  [new URL('unresolved.csv',root),csv(decisions.filter(d=>d.status==='review'))],
  [new URL('corrections.csv',root),csv(decisions.filter(d=>d.applied))],
  [new URL('rejected.csv',root),csv(decisions.filter(d=>d.status==='rejected'))],
  [new URL('reference_conflicts.csv',root),csv(decisions.filter(d=>d.referenceConflict))],
]);
if (process.argv[2]==='generate') { for(const [url,content] of outputs)writeFileSync(url,content); }
else if(process.argv[2]==='audit') { for(const [url,content] of outputs)if(readFileSync(url,'utf8')!==content)throw new Error(`Stage 3B output drift: ${url.pathname}`); }
else throw new Error('Use generate or audit');
console.info(JSON.stringify(summary,null,2));
