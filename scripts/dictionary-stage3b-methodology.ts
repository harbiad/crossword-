import { readFileSync,writeFileSync,existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { registerHooks } from 'node:module';
import { DICTIONARY_STAGE3B_QA as source } from '../api/_lib/dictionary.stage3b.qa.generated.ts';
import { eligibleTranslation, type DictionaryHeadword, type DictionaryPolicy } from '../api/_lib/dictionary.ts';
import { legacyDirectionalView } from './legacy-directional-view.ts';
import { methodSample,applyMethodReview,METHOD_SEED } from './stage3b-methodology.ts';
import { qaKey, type QaReview } from './stage3b-qa.ts';
import type { BatchDecision } from './stage3b.ts';
import { reviewCsv } from './stage3a.ts';
registerHooks({resolve(specifier,context,next){
  if(specifier.endsWith('.js')&&specifier.startsWith('.')&&context.parentURL?.startsWith(new URL('../api/',import.meta.url).href)){
    const ts=new URL(specifier.slice(0,-3)+'.ts',context.parentURL);if(existsSync(ts))return next(ts.href,context);
  }return next(specifier,context);
}});
const {createCandidateIndex}=await import('../api/_lib/candidates.ts');
const root=new URL('../dictionary/stage3b/batch001/',import.meta.url),out=new URL('methodology/',root);
const read=(name:string)=>readFileSync(new URL(name,root),'utf8');
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const baseline=JSON.parse(read('decisions.json')) as BatchDecision[],qa=JSON.parse(read('qa/reviews.json')) as QaReview[];
const sample=methodSample(source,baseline,qa),selection=JSON.parse(read('methodology/selection.json'));
if(selection.seed!==METHOD_SEED||selection.sourceSha256!==hash(readFileSync(new URL('../api/_lib/dictionary.stage3b.qa.generated.ts',import.meta.url),'utf8'))||selection.proposalsSha256!==hash(read('methodology/proposals.json')))throw new Error('Methodology baseline/proposal drift');
if(JSON.stringify(sample)!==JSON.stringify(JSON.parse(read('methodology/sample.json'))))throw new Error('Methodology sample drift');
const proposals=sample.map(r=>({sourceId:qaKey(r),allowedForArToEn:r.translation.status==='approved'&&r.translation.register==='msa'?true:r.translation.status==='rejected'||r.translation.register==='dialect'?false:null,
 reason:'Correct approved MSA relationships are not excluded for synonyms; rejected/dialect records remain excluded; review records require judgment.'}));
if(JSON.stringify(proposals)!==JSON.stringify(JSON.parse(read('methodology/proposals.json'))))throw new Error('Frozen proposal logic drift');
const result=applyMethodReview(source,sample,JSON.parse(read('methodology/reviews.json')));
const group=(xs:unknown[])=>xs.reduce<Record<string,number>>((o,v)=>{const k=String(v??'unset');o[k]=(o[k]??0)+1;return o;},{});
const rows=result.reviews.map(r=>{const s=sample[r.sampleIndex];return {...r,stratum:s.stratum,effectiveDecision:result.dictionary[s.headwordIndex].translations[s.translationIndex],proposalArAllowed:proposals[r.sampleIndex].allowedForArToEn,proposalAgreement:proposals[r.sampleIndex].allowedForArToEn===r.revisedDecision.allowedForArToEn};});
const legacy=legacyDirectionalView(source);
const counts=(d:readonly DictionaryHeadword[])=>({headwords:d.length,relationships:d.flatMap(h=>h.translations).length,status:group(d.flatMap(h=>h.translations).map(t=>t.status)),register:group(d.flatMap(h=>h.translations).map(t=>t.register)),headwordStatus:group(d.map(h=>h.status))});
const directionCounts=(d:readonly DictionaryHeadword[])=>Object.fromEntries((['en_to_ar','ar_to_en'] as const).map(mode=>{
 const allowed=mode==='en_to_ar'?'allowedForEnToAr':'allowedForArToEn',preferred=mode==='en_to_ar'?'preferredForEnToAr':'preferredForArToEn';
 return [mode,{explicitAllowed:d.flatMap(h=>h.translations).filter(t=>t[allowed]===true).length,explicitDisallowed:d.flatMap(h=>h.translations).filter(t=>t[allowed]===false).length,preferred:d.flatMap(h=>h.translations).filter(t=>t[preferred]===true).length,
 compatibilityEligible:d.reduce((n,h)=>n+h.translations.filter(t=>eligibleTranslation(h,t,'compatibility',mode)).length,0),approvedOnlyEligible:d.reduce((n,h)=>n+h.translations.filter(t=>eligibleTranslation(h,t,'approved-only',mode)).length,0)}];
}));
const availability=[];
for(const policy of ['compatibility','approved-only'] as DictionaryPolicy[]){
 const index=createCandidateIndex(result.dictionary,policy);
 for(const size of [7,9,11,13])for(const mode of ['en_to_ar','ar_to_en'])availability.push({policy,size,mode,indexedCandidates:[...index.get(`${size}:${mode}:advanced`)!.values()].flat(2).length});
}
const changes=result.changes.filter(c=>c.applied);
const headwordChanges=result.dictionary.flatMap((h,i)=>h.status===source[i].status?[]:[{headwordIndex:i,english:h.english,before:source[i].status,after:h.status,reason:'Suitable reviewed headword now has a high-confidence approved MSA relationship.'}]);
const restrictedBefore=sample.filter(s=>s.translation.status==='approved'&&s.translation.preferredForArToEn===false);
const metrics=(xs:typeof rows)=>({agree:xs.filter(r=>r.proposalAgreement).length,total:xs.length,percent:xs.length?Number((100*xs.filter(r=>r.proposalAgreement).length/xs.length).toFixed(2)):null});
const vetoTransitions=(scope:typeof baseline)=>{
 let removed=0,retained=0,added=0;
 for(const b of scope){const old=legacy[b.headwordIndex].translations[b.translationIndex],next=result.dictionary[b.headwordIndex].translations[b.translationIndex];
 if(old.allowedForArToEn===false){if(next.allowedForArToEn===false)retained++;else removed++;}
 else if(next.allowedForArToEn===false)added++;
 }return {removed,retained,added};
};
const summary={seed:METHOD_SEED,sourceSha256:selection.sourceSha256,proposalsSha256:selection.proposalsSha256,reviewsSha256:hash(read('methodology/reviews.json')),
 sampleSize:sample.length,headwordsInSample:new Set(sample.map(s=>s.english)).size,strata:group(sample.map(s=>s.stratum)),
 unappliedQaProposalsCovered:sample.filter(s=>s.stratum==='unapplied-qa').length,
 revisedArProposalAgreement:metrics(rows),formerlyRestrictedArAgreement:metrics(rows.filter(r=>restrictedBefore.some(s=>qaKey(s)===r.sourceId))),
 metricInterpretation:'Frozen revised-policy proposals versus subsequent explicit same-assistant linguistic review. Unknown counts as a third outcome. Not independent-human agreement, not a population accuracy estimate, and not directly comparable to the old 150-row QA sample.',
 before:counts(source),after:counts(result.dictionary),directionCounts:directionCounts(result.dictionary),availability,
 migrationActions:result.migrationActions.length,migrationObsoleteVetoesRemoved:result.migrationActions.filter(a=>a.after).length,migrationExclusionsPreserved:result.migrationActions.filter(a=>!a.after).length,
 arVetoTransitionsAllBatch001:vetoTransitions(baseline),arVetoTransitionsTargeted:vetoTransitions(sample.map(s=>s.originalDecision)),
 highConfidenceFieldChanges:changes.length,changedRelationships:new Set(changes.map(c=>c.sourceId)).size,changesByField:group(changes.map(c=>c.field)),headwordChanges,
 rejectionChanges:changes.filter(c=>c.field==='status'&&c.before==='rejected'),registerChanges:changes.filter(c=>c.field==='register'),
 verbInflectionChanges:changes.filter(c=>['partOfSpeech','sense'].includes(c.field)),
 unresolved:rows.filter(r=>r.revisedDecision.status==='review').length,unappliedFieldProposals:result.changes.filter(c=>!c.applied).length,
 validationOutcomes:group(rows.map(r=>r.revisedDecision.status)),
 textChanges:0,relationshipLosses:0,newRelationships:0,cefrAssignments:0,productionPolicy:'compatibility',
 batch002ReadyUnderRevisedRules:true,readinessLimit:'Ready for another bounded, explicitly reviewed batch under the new rules, not unattended bulk approval. Keep unresolved rows in review and repeat targeted QA; this is not independent human certification.',
};
const outputs=new Map<URL,string>([
 [new URL('summary.json',out),JSON.stringify(summary,null,2)+'\n'],
 [new URL('sample.csv',out),reviewCsv(sample.map(s=>({sourceId:qaKey(s),english:s.english,arabic:s.translation.arabic,stratum:s.stratum,oldDecision:s.translation})))],
 [new URL('decisions.csv',out),reviewCsv(rows)],
 [new URL('corrections.csv',out),reviewCsv(changes)],
 [new URL('headword_corrections.csv',out),reviewCsv(headwordChanges)],
 [new URL('proposals_unapplied.csv',out),reviewCsv(result.changes.filter(c=>!c.applied))],
 [new URL('unresolved.csv',out),reviewCsv(rows.filter(r=>r.revisedDecision.status==='review'))],
 [new URL('migration_actions.csv',out),reviewCsv(result.migrationActions)],
 [new URL('../api/_lib/dictionary.stage3b.methodology.generated.ts',import.meta.url),'// Generated by npm run dictionary:methodology. Preserved Batch 001 QA + direction-model migration + explicit targeted review.\n'+"import type { DictionaryHeadword } from './dictionary.js';\n"+'export const DICTIONARY_STAGE3B_METHOD: DictionaryHeadword[] = '+JSON.stringify(result.dictionary,null,2)+';\n'],
]);
if(process.argv[2]==='generate'){for(const [url,text]of outputs)writeFileSync(url,text);}
else if(process.argv[2]==='audit'){for(const [url,text]of outputs)if(readFileSync(url,'utf8')!==text)throw new Error(`Methodology output drift: ${url.pathname}`);}
else throw new Error('Use generate or audit');
const {rejectionChanges,registerChanges,verbInflectionChanges,...short}=summary;
console.info(JSON.stringify({...short,rejectionChanges:rejectionChanges.length,registerChanges:registerChanges.length,verbInflectionChanges:verbInflectionChanges.length},null,2));
