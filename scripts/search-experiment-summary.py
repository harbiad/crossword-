import json,sys,collections,statistics,pathlib,csv
root=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else 'search_feasibility_analysis/experiments')
runs=json.load((root/'runs.json').open());groups=collections.defaultdict(list)
for r in runs:groups[(r['size'],r['mode'],r['variant'])].append(r)
rows=[]
for (size,mode,variant),rs in groups.items():
 rows.append({'size':size,'mode':mode,'variant':variant,'runs':len(rs),'successes':sum(r['success']for r in rs),'medianMs':round(statistics.median(r['ms']for r in rs),1),'nodes':sum(r['nodes']for r in rs),'deadEnds':sum(r['deadEnds']for r in rs),'backtracks':sum(r['backtracks']for r in rs),'rootContradictions':sum(r['rootContradictions']for r in rs),'exhaustiveFailures':sum(r['exhaustiveFailures']for r in rs),'hallContradictions':sum(r['hallContradictions']for r in rs)})
(root/'summary.json').write_text(json.dumps(rows,indent=2)+'\n')
with(root/'summary.csv').open('w')as f:
 w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
for r in rows:print(r)
