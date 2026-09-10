"""Summarize the fixed-pool 13x13 template census without treating timeouts as proofs."""
import csv,json,pathlib,collections,statistics
root=pathlib.Path('template_feasibility_13x13')
def read(name):return json.loads((root/name).read_text())
def csvout(name,rows):
 if not rows:return
 with (root/name).open('w',newline='')as f:
  w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader()
  for r in rows:w.writerow({k:json.dumps(v,ensure_ascii=False)if isinstance(v,(dict,list))else v for k,v in r.items()})
rows=read('census.json');templates=read('templates.json');unique={r['id']:r for r in rows}
csvout('template_classification.csv',rows)
csvout('feasibility_scores.csv',[{'id':r['id'],'class':r['classification'],'proofPriority':0 if r['classification']in'ABC'else 100000,'propagationSurvival':r['survival'],'partialDepthFraction':r['depth'],'smallPropagatedSlots':r['propagatedSmall'],'score':(1000000 if r['classification']=='D'else 100000 if r['classification']=='E'else 0)+100*r['depth']+10*r['survival']-r['propagatedSmall']}for r in unique.values()])
domains={}
for word in read('full-pool.json'):domains.setdefault(len(word['answer']),[]).append(word['answer'])
(root/'initial_domains.json').write_text(json.dumps({'canonicalByLength':domains,'orientations':[False,True]},indent=2)+'\n')
slotrows=[];crossings=[];families=collections.Counter()
for tid,t in templates.items():
 slots=[];owners={}
 for direction in ['across','down']:
  for line in range(13):
   start=0
   while start<13:
    if not(t[line][start]if direction=='across'else t[start][line]):start+=1;continue
    end=start
    while end<13 and(t[line][end]if direction=='across'else t[end][line]):end+=1
    if end-start>=2:
     cells=[(line,p)if direction=='across'else(p,line)for p in range(start,end)]
     sid=len(slots);slots.append({'template':tid,'slot':sid,'direction':direction,'row':cells[0][0],'col':cells[0][1],'length':len(cells),'cells':cells})
     for position,cell in enumerate(cells):
      if cell in owners:
       other,op=owners[cell];crossings.append({'template':tid,'slotA':other,'slotB':sid,'positionA':op,'positionB':position,'lengthA':slots[other]['length'],'lengthB':len(cells),'row':cell[0],'col':cell[1]})
      owners[cell]=(sid,position)
    start=end
 for slot in slots:
  slot['initialCanonicalDomainSize']=len(domains.get(slot['length'],[]))
  slot['initialDomainRef']='initial_domains.json:canonicalByLength:'+str(slot['length'])
 slotrows+=slots
 family='rotational'if all(t[r][c]==t[12-r][12-c]for r in range(13)for c in range(13))else'asymmetric'
 families[family]+=1
 assert all(all(t[r][c]for c in range(13))for r in [2,10])
 assert all(all(t[r][c]for r in range(13))for c in [2,10])
csvout('slots.csv',slotrows);csvout('intersection_graph.csv',crossings)
paircounts=collections.Counter(tuple(sorted([r['lengthA'],r['lengthB']]))for r in crossings)
csvout('crossing_length_pairs.csv',[{'lengthA':a,'lengthB':b,'crossings':n,'interpretation':'All census layouts fail; frequency is not evidence of independent causality.'}for(a,b),n in paircounts.most_common()])
summary={'censusOccurrences':len(rows),'uniqueLayouts':len(unique),'classes':dict(collections.Counter(r['classification']for r in rows)),'uniqueClasses':dict(collections.Counter(r['classification']for r in unique.values())),'provablyUnsatisfiablePercent':100*sum(r['classification']in'ABC'for r in unique.values())/len(unique),'classificationMs':sum(r['ms']for r in rows),'families':dict(families),'mandatoryFullLengthLines':{'zeroBasedRows':[2,10],'zeroBasedColumns':[2,10]},'scope':'Every layout from the 30 production seeds, not every mathematically possible grid. No assumption that an unknown is impossible.'}
for name in ['original-family-exploration.json','exploration.json','deep.json']:
 if(root/name).exists():
  x=read(name);summary[name]={'observations':len(x),'solutions':sum(r['success']for r in x),'proofs':sum(bool(r['proof'])for r in x),'unknown':sum(not r['proof']and not r['success']for r in x)}
if(root/'filtering.json').exists():
 x=read('filtering.json')
 for r in x:
  assert r['ms'] < 4400  # All layouts visited before the unchanged 4500ms global deadline.
  r['templatesAttempted']=len({c['id']for c in rows if c['seed']==r['seed']})if r['attempts']else 0
  r['solverCalls']=r.pop('attempts')
 csvout('experiments.csv',x)
 summary['filtering']={v:{'runs':len(g:=[r for r in x if r['variant']==v]),'successes':sum(r['success']for r in g),'medianMs':statistics.median(r['ms']for r in g),'p95Ms':sorted(r['ms']for r in g)[int(.95*len(g)+.999)-1],'medianAttempts':statistics.median(r['solverCalls']for r in g),'impossibleMs':sum(r['impossibleMs']for r in g)}for v in ['A','B','C','D']}
if(root/'independent-stream-census/census.json').exists():
 stream=read('independent-stream-census/census.json')
 summary['independentStreamCensus']={'occurrences':len(stream),'uniqueLayouts':len({r['id']for r in stream}),'classes':dict(collections.Counter(r['classification']for r in stream)),'allInitialDomainsNonempty':all(r['min']>0 for r in stream)}
if(root/'after/summary.json').exists():
 before=read('baseline/summary.json')['configurations'];after=read('after/summary.json')['configurations'];comparison=[]
 for b in before:
  a=next(a for a in after if(a['size'],a['mode'],a['policy'])==(b['size'],b['mode'],b['policy']))
  comparison.append({'grid':a['size'],'mode':a['mode'],'policy':a['policy'],'beforeSuccess':b['successRate'],'afterSuccess':a['successRate'],'beforeMedianMs':b['generationMs']['median'],'afterMedianMs':a['generationMs']['median'],'beforeP95Ms':b['generationMs']['p95'],'afterP95Ms':a['generationMs']['p95'],'beforeWords':b['entries']['median'],'afterWords':a['entries']['median'],'beforeIntersections':b['intersections']['median'],'afterIntersections':a['intersections']['median']})
 csvout('before_after.csv',comparison);summary['comparison']=comparison
 br=read('baseline/runs.json');ar=read('after/runs.json');key=lambda r:(r['size'],r['mode'],r['policy'],r['seed']);old={key(r):r for r in br}
 transitions=[{'grid':r['size'],'mode':r['mode'],'policy':r['policy'],'seed':r['seed'],'beforeSuccess':old[key(r)]['success'],'afterSuccess':r['success']}for r in ar if old[key(r)]['success']!=r['success']]
 csvout('seed_changes.csv',transitions);summary['seedChanges']=transitions
 summary['acceptanceTargetMet']=False
 summary['batch007Started']=False
 summary['productionPolicy']='compatibility'
 summary['dictionaryModified']=False
 summary['validatorModified']=False
 summary['twoLetterExperimentAuthorized']=False
 summary['twoLetterExperimentPerformed']=False
 summary['conclusion']='Acceptance target not met. Filtering an all-impossible catalog cannot yield a solution. No feasible new layout was found under the existing template constraints.'
 summary['remainingBottleneck']='Joint template/canonical-vocabulary feasibility, not raw counts, truncation or reordering of proven contradictions.'
 summary['recommendation']='Keep Batch007 paused. Decide whether to authorize a separate two-letter English template experiment, or continue joint layout search under the three-letter minimum.'
 summary['runtimeChanges']=['13x13 English-only independent template/candidate RNG streams','Bounded exact-canonical-membership complete impossibility proof cache']
 summary['feasibilitySelectorRetained']=False
(root/'summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary,indent=2))
