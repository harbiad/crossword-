import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { registerHooks } from 'node:module';
import { DICTIONARY_BATCH004_QA as source } from '../api/_lib/dictionary.stage3b.batch004.qa.generated.ts';
import { eligibleTranslation, normalizeArabicWord, type DictionaryHeadword } from '../api/_lib/dictionary.ts';
import { parseReferenceCsv } from './stage3b.ts';
import { compileBatch003Notes,applyBatch003,applyBatch003Qa,referenceConflict,relationshipKey } from './stage3b-batch003.ts';
import { selectBatch005,sampleBatch005Qa,compileBatch005QaNotes,BATCH005_QA_SEED,type DomainNeed } from './stage3b-batch005.ts';
import { qaFields } from './stage3b-batch002.ts';
import { reviewCsv } from './stage3a.ts';
registerHooks({resolve(specifier,context,next){
 if(specifier.endsWith('.js')&&specifier.startsWith('.')&&context.parentURL?.startsWith(new URL('../api/',import.meta.url).href)){
  const ts=new URL(specifier.slice(0,-3)+'.ts',context.parentURL);if(existsSync(ts))return next(ts.href,context);
 }return next(specifier,context);
}});
const {createCandidateIndex}=await import('../api/_lib/candidates.ts');
const root=new URL('../',import.meta.url),out=new URL('dictionary/stage3b/batch005/',root);
const read=(p:string)=>readFileSync(new URL(p,root),'utf8'),readOut=(p:string)=>readFileSync(new URL(p,out),'utf8');
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const inputs=JSON.parse(readOut('inputs.json')) as Record<string,string>;
for(const [file,pinned]of Object.entries(inputs))if(hash(read(file))!==pinned)throw new Error(`Batch005 immutable input drift ${file}`);
const prior=new Set(['dictionary/stage3a/decisions.json','dictionary/stage3b/batch001/decisions.json','dictionary/stage3b/batch002/decisions.json','dictionary/stage3b/batch003/decisions.json','dictionary/stage3b/batch004/decisions.json'].flatMap(f=>(JSON.parse(read(f)) as {english:string}[]).map(d=>d.english)));
const reference=parseReferenceCsv(read('api/english_arabic_10000_v3.csv'));
const needs=JSON.parse(readOut('domain_needs.json')) as DomainNeed[];
const selection=selectBatch005(source,reference,prior,JSON.parse(readOut('deferred.json')),needs);
if(JSON.stringify(selection)!==JSON.stringify(JSON.parse(readOut('selection.json'))))throw new Error('Batch005 selection drift');
const compiled=compileBatch003Notes(source,selection,readOut('review-notes.txt'),JSON.parse(readOut('review-details.json')));
if(JSON.stringify(compiled)!==JSON.stringify(JSON.parse(readOut('proposals.json'))))throw new Error('Batch005 explicit-note proposal drift');
const initial=applyBatch003(source,selection,compiled,JSON.parse(readOut('rejection_checks.json'))),sample=sampleBatch005Qa(initial.decisions,reference,selection,needs);
if(JSON.stringify(sample)!==JSON.stringify(JSON.parse(readOut('qa/sample.json'))))throw new Error('Batch005 QA sample drift');
if(JSON.stringify(initial.decisions)!==JSON.stringify(JSON.parse(readOut('decisions.json'))))throw new Error('Batch005 post-rejection decision drift');
if(JSON.stringify(compileBatch005QaNotes(sample,readOut('qa/review-notes.txt')))!==JSON.stringify(JSON.parse(readOut('qa/reviews.json'))))throw new Error('Batch005 explicit QA note drift');
const qa=applyBatch003Qa(initial.dictionary,sample,JSON.parse(readOut('qa/reviews.json')));
const group=(values:unknown[])=>values.reduce<Record<string,number>>((o,v)=>{const k=String(v??'unset');o[k]=(o[k]??0)+1;return o;},{});
const counts=(d:readonly DictionaryHeadword[])=>{
 const ts=d.flatMap(h=>h.translations);
 return {headwords:d.length,relationships:ts.length,headwordStatus:group(d.map(h=>h.status)),relationshipStatus:group(ts.map(t=>t.status)),register:group(ts.map(t=>t.register)),
 allowedEnToAr:ts.filter(t=>t.allowedForEnToAr===true).length,allowedArToEn:ts.filter(t=>t.allowedForArToEn===true).length,
 preferredEnToAr:ts.filter(t=>t.preferredForEnToAr===true).length,preferredArToEn:ts.filter(t=>t.preferredForArToEn===true).length,
 restrictedEnToAr:ts.filter(t=>t.allowedForEnToAr===false).length,restrictedArToEn:ts.filter(t=>t.allowedForArToEn===false).length,
 allowedNonpreferredArToEn:ts.filter(t=>t.allowedForArToEn===true&&t.preferredForArToEn===false).length,
 posAssignments:ts.filter(t=>!!t.partOfSpeech&&t.partOfSpeech!=='uncertain').length,unresolvedPos:ts.filter(t=>!t.partOfSpeech||t.partOfSpeech==='uncertain').length,senseAssignments:ts.filter(t=>!!t.sense).length,multiword:ts.filter(t=>/\s/.test(t.arabic.trim())).length};
};
function availability(data:readonly DictionaryHeadword[]){
 const rows=[];
 for(const policy of ['compatibility','approved-only']as const){const index=createCandidateIndex(data,policy);
  for(const size of [7,9,11,13])for(const mode of ['en_to_ar','ar_to_en']as const){
   const eligibleRelationships=data.reduce((n,h)=>n+h.translations.filter(t=>eligibleTranslation(h,t,policy,mode)).length,0);
   rows.push({policy,size,mode,eligibleRelationshipsBeforeLengthLimits:eligibleRelationships,indexedCandidates:[...index.get(`${size}:${mode}:advanced`)!.values()].flat(2).length});
  }
 }return rows;
}
const csv=(rows:Record<string,unknown>[])=>rows.length?reviewCsv(rows):'\uFEFF"sourceId","english","original","replacement","reason","confidence","applied"\r\n';
const initialRows=initial.decisions.map(d=>({...d,sourceId:relationshipKey(d),referenceArabic:reference.get(d.english)??'',referenceConflict:referenceConflict(d,reference)}));
const finalRows=initialRows.map(d=>({...d,effectiveTranslation:qa.dictionary[d.headwordIndex].translations[d.translationIndex]}));
const finalBatch=selection.map(s=>qa.dictionary[s.headwordIndex]);
const reviewedHeadwords=selection.map(s=>({...s,oldStatus:source[s.headwordIndex].status,initialStatus:initial.dictionary[s.headwordIndex].status,finalStatus:qa.dictionary[s.headwordIndex].status,
 reason:'Selected general vocabulary. Approval requires at least one approved MSA relationship; an unsuitable translation alone does not reject the headword.',
 ...counts([qa.dictionary[s.headwordIndex]])}));
const agreements=Object.fromEntries(qaFields.map(field=>{
 const applicable=qa.reviews.filter(r=>field!=='sense'||r.originalDecision.sense!==undefined||r.revisedDecision.sense!==undefined);
 const agree=applicable.filter(r=>(r.originalDecision[field]??null)===(r.revisedDecision[field]??null)).length;
 return [field,{agree,total:applicable.length,percent:applicable.length?Number((100*agree/applicable.length).toFixed(2)):null}];
}));
const diagnosticNotes=qa.reviews.filter(r=>r.originalDecision.status===r.revisedDecision.status&&r.originalDecision.reasonCode!==r.revisedDecision.reasonCode).map(r=>({sourceId:r.sourceId,english:r.originalDecision.english,arabic:r.originalDecision.original,before:r.originalDecision.reasonCode,after:r.revisedDecision.reasonCode,reason:r.reason,confidence:r.confidence,productionMetadataChanged:false}));
const qaSummary={seed:BATCH005_QA_SEED,sampleSize:sample.length,headwords:new Set(sample.map(s=>s.english)).size,strata:group(sample.map(s=>s.stratum)),
 sampleBaseline:counts([...new Set(sample.map(s=>s.headwordIndex))].map(i=>({...initial.dictionary[i],translations:sample.filter(s=>s.headwordIndex===i).map(s=>initial.dictionary[i].translations[s.translationIndex])}))),
 originalDecisionSha256:hash(readOut('decisions.json')),qaReviewSha256:hash(readOut('qa/reviews.json')),
 agreements,diagnosticNotes,disagreeingRelationships:new Set(qa.disagreements.map(d=>d.sourceId)).size,fieldDisagreements:qa.disagreements.length,
 highConfidenceFieldCorrections:qa.disagreements.filter(d=>d.applied).length,unapplied:qa.disagreements.filter(d=>!d.applied).length,
 disagreementsByField:group(qa.disagreements.map(d=>d.field)),textCorrections:0,
 assessment:'Bounded same-assistant QA with controlled relationship-specific POS and short senses. See measured agreement and all disagreements; no independent-human certification. Batch006 has not begun.',
 measurement:'Original frozen judgments versus a fresh second pass shown English and Arabic without original status/preferences/reference. Same assistant retains conversation context; not blinded independent-human accuracy. Unknown allowance is a third outcome. Sense denominator is rows with an old or new label; disagreements include label wording and scope, not only semantic errors.',
};
const summary={batch:'005',selectionMethod:'500 new review headwords. Reference membership and decreasing dictionary-order score plus capped recurrence-weighted support-domain matches (priority by configuration), and reference-agreement potential. No raw length bonus or quota. Prior Stage3A and Batches001-004 excluded. Approval is a separate explicit linguistic judgment.',
 inputs,rejectionSecondPass:{proposed:initial.checks.length,retained:initial.checks.filter(r=>r.finalStatus==='rejected').length,softened:initial.checks.filter(r=>r.finalStatus==='review').length},before:counts(source),afterInitial:counts(initial.dictionary),afterQa:counts(qa.dictionary),batchInitial:counts(selection.map(s=>initial.dictionary[s.headwordIndex])),batchAfterQa:counts(finalBatch),
 initialConfidence:group(initial.decisions.map(d=>d.confidence)),referenceConflicts:initialRows.filter(d=>d.referenceConflict).length,
 referenceConflictDefinition:'The reference supports a normalized-identical relationship left unresolved or rejected; matching reference is supporting evidence, never automatic approval.',
 textCorrections:0,relationshipLosses:0,newRelationships:0,cefrAssignments:0,productionPolicy:'compatibility',
 relationshipMetadataChanges:finalRows.filter(d=>JSON.stringify(source[d.headwordIndex].translations[d.translationIndex])!==JSON.stringify(d.effectiveTranslation)).length,
 headwordStatusChanges:reviewedHeadwords.filter(h=>h.oldStatus!==h.finalStatus).length,
 availabilityBefore:availability(source),availabilityAfter:availability(qa.dictionary),
 rejectedByReason:group(finalRows.filter(d=>d.effectiveTranslation.status==='rejected').map(d=>d.reasonCode)),
 unresolvedAfterQa:finalRows.filter(d=>d.effectiveTranslation.status==='review').length,
 qa:qaSummary,batch006Started:false,
};
const distributionRows=[1,2,3,4,5].flatMap(batch=>{
 const selected=JSON.parse(read(`dictionary/stage3b/batch00${batch}/selection.json`)) as {english:string}[];
 const selectedWords=new Set(selected.map(s=>s.english)),heads=source.filter(h=>selectedWords.has(h.english));
 return ['english','arabic'].flatMap(language=>{
  const lengths=language==='english'?heads.map(h=>h.english.length):heads.flatMap(h=>h.translations.map(t=>normalizeArabicWord(t.arabic).length));
  return Object.entries(group(lengths)).map(([length,count])=>({batch,language,length:Number(length),count,unit:language==='english'?'headwords':'source relationships; variants retained'}));
 });
});
// Check each record with satisfies, then widen its type before array inference.
// This avoids pairwise subtype comparisons between thousands of literal shapes.
// Both operators erase at runtime; values and original row order are unchanged.
const generated=(name:string,data:readonly DictionaryHeadword[])=>{
 const chunks=Array.from({length:Math.ceil(data.length/100)},(_,i)=>`const chunk${i}: DictionaryHeadword[] = [\n${data.slice(i*100,(i+1)*100).map(h=>`(${JSON.stringify(h,null,2)} satisfies DictionaryHeadword) as DictionaryHeadword`).join(',\n')}\n];\n`);
 return '// Generated by npm run dictionary:batch005. Preserves all prior source layers; do not edit.\n'+"import type { DictionaryHeadword } from './dictionary.js';\n"+chunks.join('')+`export const ${name}: DictionaryHeadword[] = [${chunks.map((_,i)=>`...chunk${i}`).join(',')}];\n`;
};
const outputs=new Map<URL,string>([
 [new URL('api/_lib/dictionary.stage3b.batch005.generated.ts',root),generated('DICTIONARY_BATCH005',initial.dictionary)],
 [new URL('api/_lib/dictionary.stage3b.batch005.qa.generated.ts',root),generated('DICTIONARY_BATCH005_QA',qa.dictionary)],
 [new URL('summary.json',out),JSON.stringify(summary,null,2)+'\n'],
 [new URL('selection.csv',out),csv(selection)],
 [new URL('candidate_availability.csv',out),csv(summary.availabilityAfter)],
 [new URL('selection_length_distribution.csv',out),csv(distributionRows)],
 [new URL('reviewed_headwords.csv',out),csv(reviewedHeadwords)],
 [new URL('decisions.csv',out),csv(initialRows)],
 [new URL('unresolved.csv',out),csv(initialRows.filter(d=>d.status==='review'))],
 [new URL('rejected.csv',out),csv(initialRows.filter(d=>d.status==='rejected'))],
 [new URL('corrections.csv',out),csv([])],
 [new URL('reference_conflicts.csv',out),csv(initialRows.filter(d=>d.referenceConflict))],
 [new URL('rejection_checks.csv',out),csv(initial.checks)],
 [new URL('qa/sample.csv',out),csv(sample)],
 [new URL('qa/decisions.csv',out),csv(qa.reviews)],
 [new URL('qa/disagreements.csv',out),csv(qa.disagreements)],
 [new URL('qa/diagnostic_notes.csv',out),csv(diagnosticNotes)],
 [new URL('qa/corrections.csv',out),csv(qa.disagreements.filter(d=>d.applied))],
 [new URL('qa/proposals_unapplied.csv',out),csv(qa.disagreements.filter(d=>!d.applied))],
 [new URL('qa/unresolved.csv',out),csv(finalRows.filter(d=>d.effectiveTranslation.status==='review'))],
 [new URL('qa/rejected.csv',out),csv(finalRows.filter(d=>d.effectiveTranslation.status==='rejected'))],
 [new URL('qa/summary.json',out),JSON.stringify(qaSummary,null,2)+'\n'],
]);
if(process.argv[2]==='generate'){for(const [url,text]of outputs)writeFileSync(url,text);}
else if(process.argv[2]==='audit'){for(const [url,text]of outputs)if(readFileSync(url,'utf8')!==text)throw new Error(`Batch005 output drift ${url.pathname}`);}
else throw new Error('Use generate or audit');
console.info(JSON.stringify({batch:'005',before:summary.before,after:summary.afterQa,batchAfterQa:summary.batchAfterQa,referenceConflicts:summary.referenceConflicts,qa:qaSummary},null,2));
