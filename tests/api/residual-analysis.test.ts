import {it,expect}from'vitest';
import {readFileSync}from'node:fs';
import {createHash}from'node:crypto';
import {gunzipSync}from'node:zlib';
import {canonicalConstraints,classifyDomain,proposeCover,matchRepair,type ResidualDomain}from'../../scripts/residual-analysis';
const root='dictionary/stage3b/batch006_analysis/',json=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
it('distinguishes a full-dictionary gap from exhausted, sampled-out and search-window matches',()=>{
 expect(classifyDomain([],[],[],[],true).type).toBe('A_TRUE_GAP');
 expect(classifyDomain(['BAT'],['BAT'],['BAT'],['BAT'],true)).toMatchObject({type:'B_USED_EXHAUSTION',usedMatches:['BAT']});
 expect(classifyDomain(['BAT','CAT'],['BAT'],['BAT'],['BAT'],true)).toMatchObject({type:'C_API_SAMPLING_LOSS',fullUnused:1,sampledUnused:0,omittedAnswers:['CAT']});
 expect(classifyDomain(['BAT'],[],[],[],true)).toMatchObject({type:'C_API_SAMPLING_LOSS',samplingZero:true,retainedPct:0});
 expect(classifyDomain(['BAT'],['BAT'],[],[],true).type).toBe('WINDOW_RESTRICTION');
 expect(classifyDomain(['BAT'],['BAT'],['BAT'],[],true).type).toBe('PROPAGATION_RESTRICTION');
 expect(classifyDomain(['BAT'],['BAT'],['BAT'],[],false).type).toBe('SUPPORTED_SMALL_DOMAIN');
 expect(classifyDomain(['BAT','CAT','HAT','RAT','SAT'],['BAT'],['BAT'],[],false)).toMatchObject({samplingHealthyToSmall:true,retainedPct:20});
});
it('canonicalizes equivalent inversion constraints and never counts another clue for the same answer as diversity',()=>{
 expect(canonicalConstraints(3,[{position:0,characters:['T']},{position:2,characters:['B']}])).toEqual(canonicalConstraints(3,[{position:2,characters:['T']},{position:0,characters:['B']}]));
 const d:ResidualDomain={id:'one',size:13,mode:'ar_to_en',length:3,pattern:'?AT',constraints:[{position:1,characters:['A']},{position:2,characters:['T']}],type:'B_USED_EXHAUSTION',fullMatches:['BAT'],seeds:[1,2],templates:['a'],observations:2,zeroObservations:2,sampleCounts:[1,1],weight:3};
 expect(matchRepair('BAT',d)).toBe(false);expect(matchRepair('CAT',d)).toBe(true);expect(matchRepair('TAC',d)).toBe(true);
 const cover=proposeCover([{english:'CAT',learnerScore:110,qualityPotential:0,domainIds:['one']},{english:'RAT',learnerScore:100,qualityPotential:0,domainIds:['one']}],[d]);
 expect(cover.selected.map(c=>c.english)).toEqual(['CAT']);expect(cover.coveredDomains).toBe(1);
});
it('proposes only new unresolved reference headwords for recurring A/B gaps and leaves all protected inputs unchanged',()=>{
 const selected=json(root+'proposed_candidates.json')as{english:string;domainIds:string[];unresolved:{arabic:string;status?:string}[]}[];
 const domains=JSON.parse(gunzipSync(readFileSync(root+'residual_domains.json.gz')).toString())as(ResidualDomain&{zeroSeeds:number[]})[];const byId=new Map(domains.map(d=>[d.id,d]));
 const prior=new Set(['dictionary/stage3a/decisions.json',...[1,2,3,4,5].map(n=>`dictionary/stage3b/batch00${n}/decisions.json`)].flatMap(p=>(json(p)as{english:string}[]).map(d=>d.english)));
 expect(selected.length).toBeGreaterThan(0);expect(new Set(selected.map(c=>c.english)).size).toBe(selected.length);
 for(const c of selected){expect(prior.has(c.english)).toBe(false);expect(c.unresolved.length).toBeGreaterThan(0);expect(c.unresolved.every(t=>t.status!=='approved'&&t.status!=='rejected')).toBe(true);
 for(const id of c.domainIds){const d=byId.get(id)!;expect(['A_TRUE_GAP','B_USED_EXHAUSTION']).toContain(d.type);expect(d.zeroSeeds.length).toBeGreaterThanOrEqual(2);}}
 // API import advances with later review layers; the analysis snapshot remains pinned for historical replay.
 // Historical solver hashes identify the measured baseline, not a freeze on future fixes.
 for(const [path,hash]of Object.entries(json(root+'inputs.json')).filter(([path])=>path!=='api/generate.ts')){
  const baseline=path==='src/lib/templates.ts'?'template_feasibility_13x13/baseline/templates.txt':['src/lib/arcConsistency.ts','src/lib/generateCrossword.ts','src/lib/construct.ts'].includes(path)?'benchmarks/search/baseline/'+path.split('/').pop()!.replace('.ts','.txt'):path;
  expect(createHash('sha256').update(readFileSync(baseline)).digest('hex')).toBe(hash);
 }
 expect(readFileSync('api/generate.ts','utf8')).toMatch(/createCandidateIndex\(DICTIONARY_BATCH\d+_QA, 'compatibility'\)/);
 const summary=json(root+'summary.json');expect(summary.proposal.headwords).toBe(selected.length);expect(summary.dictionaryReviewed).toBe(false);expect(summary.productionPolicy).toBe('compatibility');
 const curve=json(root+'selection_curve.json')as{headwords:number;weightedReachableDomainPct:number}[];
 expect(curve.at(-1)!.weightedReachableDomainPct).toBeGreaterThanOrEqual(90);if(curve.length>1)expect(curve.at(-2)!.weightedReachableDomainPct).toBeLessThan(90);
});
