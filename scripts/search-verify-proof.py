"""Independent Python verification of representative complete-template impossibility.
No timeouts are called proofs. This is not used by the production solver.
"""
import gzip,json,pathlib,time,collections
root=pathlib.Path('search_feasibility_analysis');results=[]
for seed in [1,16]:
 path=root/'representative_traces'/f'trace-13-ar_to_en-{seed}-current.json.gz'
 snapshot=json.load(gzip.open(path,'rt'))[0];slots=snapshot['slots'];edges=snapshot['neighbors']
 domains=[set((w[0],bool(w[1]))for w in d)for d in snapshot['domains']]
 deadline=time.monotonic()+30;counts=collections.Counter()
 def char(w,p):return w[0][len(w[0])-1-p if w[1]else p]
 def propagate(ds):
  queue=collections.deque(range(len(ds)));queued=set(queue)
  while queue:
   if time.monotonic()>deadline:raise TimeoutError()
   i=queue.popleft();queued.remove(i)
   if not ds[i]:return False
   for e in edges[i]:
    j=e['other'];supported={char(w,e['here'])for w in ds[i]};nextd={w for w in ds[j]if char(w,e['there'])in supported}
    if nextd!=ds[j]:
     ds[j]=nextd
     if not nextd:counts['crossingContradictions']+=1;return False
     if j not in queued:queue.append(j);queued.add(j)
  return True
 def search(ds,chosen,used):
  counts['nodes']+=1
  if time.monotonic()>deadline:raise TimeoutError()
  if len(chosen)==len(ds):return True
  i=min((i for i in range(len(ds))if i not in chosen),key=lambda i:(len(ds[i]),-len(edges[i]),i))
  for w in sorted(ds[i]):
   if w[0]in used:continue
   nxt=[set(d)for d in ds];nxt[i]={w}
   for j in range(len(ds)):
    if j!=i and j not in chosen:nxt[j]={v for v in nxt[j]if v[0]!=w[0]}
   if any(not d for d in nxt):counts['uniquenessContradictions']+=1;continue
   if propagate(nxt)and search(nxt,chosen|{i},used|{w[0]}):return True
  return False
 start=time.monotonic();initial=[len(d)for d in domains]
 try:
  arc=propagate(domains);after=[len(d)for d in domains];solved=arc and search(domains,set(),set());outcome='satisfiable'if solved else'proved-unsatisfiable'
 except TimeoutError:arc=None;after=[len(d)for d in domains];outcome='timeout-unestablished'
 results.append({'seed':seed,'size':13,'mode':'ar_to_en','source':str(path),'outcome':outcome,'allInitialDomainsNonempty':all(initial),'rootArcConsistent':arc,'initialDomains':initial,'afterArcDomains':after,'elapsedMs':(time.monotonic()-start)*1000,**counts})
(root/'independent_feasibility_proofs.json').write_text(json.dumps(results,indent=2)+'\n')
print([(r['seed'],r['outcome'],r['nodes']if' nodes'in r else r.get('nodes'))for r in results])
