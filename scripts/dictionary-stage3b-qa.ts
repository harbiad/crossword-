import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { DICTIONARY_STAGE3B } from '../api/_lib/dictionary.stage3b.generated.ts';
import { normalizeArabicWord } from '../api/_lib/dictionary.ts';
import { parseReferenceCsv, type BatchDecision } from './stage3b.ts';
import { reviewCsv } from './stage3a.ts';
import { sampleBatchQa, applyBatchQa, qaKey, QA_SEED } from './stage3b-qa.ts';

const root=new URL('../dictionary/stage3b/batch001/',import.meta.url);
const read=(name:string)=>readFileSync(new URL(name,root),'utf8');
const hash=(content:string)=>createHash('sha256').update(content).digest('hex');
const baseline=JSON.parse(read('decisions.json')) as BatchDecision[];
const selection=JSON.parse(read('qa/selection.json'));
if(selection.seed!==QA_SEED||selection.baselineSha256!==hash(read('decisions.json')))throw new Error('QA baseline changed');
const reference=parseReferenceCsv(readFileSync(new URL('../api/english_arabic_10000_v3.csv',import.meta.url),'utf8'));
const conflicts=new Set(baseline.filter(d=>d.status!=='approved'&&normalizeArabicWord(reference.get(d.english)!)===normalizeArabicWord(d.original)).map(qaKey));
const sample=sampleBatchQa(baseline,conflicts);
if(JSON.stringify(sample)!==JSON.stringify(JSON.parse(read('qa/sample-baseline.json'))))throw new Error('QA sample drift');
const {dictionary,reviews}=applyBatchQa(DICTIONARY_STAGE3B,sample,JSON.parse(read('qa/reviews.json')));
const count=(values:unknown[])=>values.reduce<Record<string,number>>((out,x)=>{const k=String(x??'unset');out[k]=(out[k]??0)+1;return out;},{});
const rate=(values:(boolean|null)[])=>{
  const applicable=values.filter((v):v is boolean=>v!==null),agree=applicable.filter(Boolean).length;
  return {agree,denominator:applicable.length,percent:applicable.length?Number((100*agree/applicable.length).toFixed(2)):null};
};
const proposals=reviews.flatMap(r=>r.changes.map(c=>({sampleIndex:r.sampleIndex,sourceId:qaKey(r),english:r.english,arabic:r.arabic,...c})));
const applied=proposals.filter(c=>c.applied);
const rows=reviews.map(r=>({sampleStratum:sample[r.sampleIndex].sampleStratum,baselineStatus:sample[r.sampleIndex].status,baselineRegister:sample[r.sampleIndex].register,
  baselinePos:sample[r.sampleIndex].partOfSpeech,baselineSense:sample[r.sampleIndex].sense,baselineEnPreference:sample[r.sampleIndex].preferredForEnToAr,baselineArPreference:sample[r.sampleIndex].preferredForArToEn,
  baselineReverseReason:sample[r.sampleIndex].directionReason,referenceConflict:conflicts.has(qaKey(r)),...r}));
const counts=(data:typeof dictionary)=>({headwords:data.length,relationships:data.flatMap(h=>h.translations).length,headwordStatus:count(data.map(h=>h.status)),relationshipStatus:count(data.flatMap(h=>h.translations).map(t=>t.status)),register:count(data.flatMap(h=>h.translations).map(t=>t.register))});
const summary={
  seed:QA_SEED,baselineSha256:selection.baselineSha256,reviewsSha256:hash(read('qa/reviews.json')),sourceSha256:hash(readFileSync(new URL('../api/_lib/dictionary.stage3b.generated.ts',import.meta.url),'utf8')),
  sampleSize:sample.length,distinctHeadwords:new Set(sample.map(d=>d.english)).size,strata:count(sample.map(d=>d.sampleStratum)),statusCoverage:count(sample.map(d=>d.status)),
  posCoverage:count(sample.map(d=>d.partOfSpeech)),multiwordArabic:sample.filter(d=>/\s/.test(d.original.trim())).length,senseLabels:sample.filter(d=>d.sense).length,referenceConflicts:rows.filter(r=>r.referenceConflict).length,
  metrics:{
    approvalAgreement:rate(reviews.filter(r=>sample[r.sampleIndex].status==='approved').map(r=>r.statusAgreement)),
    rejectionAgreement:rate(reviews.filter(r=>sample[r.sampleIndex].status==='rejected').map(r=>r.statusAgreement)),
    unresolvedAgreement:rate(reviews.filter(r=>sample[r.sampleIndex].status==='review').map(r=>r.statusAgreement)),
    enPreferenceAgreement:rate(reviews.map(r=>sample[r.sampleIndex].preferredForEnToAr===undefined?null:!r.changes.some(c=>c.field==='preferredForEnToAr'))),
    enPositivePreferenceAgreement:rate(reviews.map(r=>r.enPreferenceAgreement)),
    arRestrictionAgreement:rate(reviews.map(r=>r.reverseRestrictionAgreement)),arPositivePreferenceAgreement:rate(reviews.map(r=>r.arPreferenceAgreement)),
    posAgreement:rate(reviews.map(r=>r.posAgreement)),senseLabelAgreement:rate(reviews.map(r=>r.senseAgreement)),registerAgreement:rate(reviews.map(r=>r.registerAgreement)),
  },
  reverseClassification:count(reviews.filter(r=>r.reverseClassification!==null).map(r=>r.reverseClassification)),
  disagreementRelationships:reviews.filter(r=>r.changes.length).length,disagreementsByCategory:count(proposals.map(c=>c.category)),
  appliedRelationships:reviews.filter(r=>r.changes.some(c=>c.applied)).length,appliedFieldChanges:applied.length,appliedByField:count(applied.map(c=>c.field)),
  appliedByCategory:count(applied.map(c=>c.category)),unappliedProposals:proposals.filter(c=>!c.applied).length,
  seriousErrors:reviews.filter(r=>r.changes.some(c=>c.category==='serious approval/rejection error')).map(r=>({english:r.english,arabic:r.arabic,from:sample[r.sampleIndex].status,to:r.qaStatus,reason:r.reason})),
  batchBefore:count(baseline.map(d=>d.status)),batchAfter:count(baseline.map(d=>dictionary[d.headwordIndex].translations[d.translationIndex].status)),
  batchPreferencesAfter:{en:baseline.filter(d=>dictionary[d.headwordIndex].translations[d.translationIndex].preferredForEnToAr===true).length,ar:baseline.filter(d=>dictionary[d.headwordIndex].translations[d.translationIndex].preferredForArToEn===true).length,reverseRestrictedApproved:baseline.filter(d=>{const t=dictionary[d.headwordIndex].translations[d.translationIndex];return t.status==='approved'&&t.preferredForArToEn===false;}).length},
  compatibilityFallbackLimitation:'SOURCE → مصدر is now reverse-restricted, but the unsampled definite variant المصدر remains eligible. No restriction is propagated to unsampled relationships; headword-level fallback QA is still required.',
  before:counts(DICTIONARY_STAGE3B),after:counts(dictionary),textChanges:0,relationshipLosses:0,cefrAssignments:0,productionPolicy:'compatibility',
  approvedReversePreferencesNeedingRestriction:reviews.filter(r=>sample[r.sampleIndex].preferredForArToEn===true&&r.arPreferenceAgreement===false).map(r=>({english:r.english,arabic:r.arabic,applied:r.changes.some(c=>c.field==='preferredForArToEn'&&c.applied)})),
  interpretation:'Descriptive agreement on a deliberately stratified, overlapping-category sample, not a population accuracy estimate. Fresh same-assistant QA, not independent human certification. Medium-confidence disagreements count but are not applied.',
  batch002Ready:false,gate:'Do not scale the old method. Follow-up validation of the revised verb/POS and directional rules plus remaining unsampled restrictions is required before Batch 002.',
};
const outputs=new Map<URL,string>([
  [new URL('qa/sample.csv',root),reviewCsv(rows)],
  [new URL('qa/disagreements.csv',root),reviewCsv(proposals)],
  [new URL('qa/corrections.csv',root),reviewCsv(applied)],
  [new URL('qa/reverse_direction_audit.csv',root),reviewCsv(rows.filter(r=>r.baselineArPreference!==undefined))],
  [new URL('qa/summary.json',root),JSON.stringify(summary,null,2)+'\n'],
  [new URL('../api/_lib/dictionary.stage3b.qa.generated.ts',import.meta.url),'// Generated by npm run dictionary:qa3b. Frozen Batch 001 plus logged high-confidence QA metadata corrections.\n'+"import type { DictionaryHeadword } from './dictionary.js';\n"+'export const DICTIONARY_STAGE3B_QA: DictionaryHeadword[] = '+JSON.stringify(dictionary,null,2)+';\n'],
]);
if(process.argv[2]==='generate'){for(const [url,text]of outputs)writeFileSync(url,text);}
else if(process.argv[2]==='audit'){for(const [url,text]of outputs)if(readFileSync(url,'utf8')!==text)throw new Error(`QA output drift: ${url.pathname}`);}
else throw new Error('Use generate or audit');
console.info(JSON.stringify(summary,null,2));
