import json,csv,pathlib,statistics,collections
root=pathlib.Path('search_feasibility_analysis')
before=json.load((root/'before/summary.json').open());after=json.load((root/'after/summary.json').open())
rows=[]
for a in after['configurations']:
 b=next(b for b in before['configurations']if all(a[k]==b[k]for k in ['size','mode','policy']))
 rows.append({**{k:a[k]for k in ['size','mode','policy']},'beforeSuccess':b['successRate'],'afterSuccess':a['successRate'],'beforeMedianMs':b['generationMs']['median'],'afterMedianMs':a['generationMs']['median'],'beforeP95Ms':b['generationMs']['p95'],'afterP95Ms':a['generationMs']['p95'],'beforeWords':b['entries']['median'],'afterWords':a['entries']['median'],'beforeIntersections':b['intersections']['median'],'afterIntersections':a['intersections']['median']})
with(root/'before_after.csv').open('w')as f:
 w=csv.DictWriter(f,fieldnames=rows[0].keys());w.writeheader();w.writerows(rows)
fmt=lambda x:'—' if x is None else f'{x:.1f}'
lines=['# Same-pool solver comparison','','30 seeds per configuration; both policies; unchanged dictionary, API limits, validation and total search budgets. Times include failures. Word/intersection medians include successful puzzles only.','','| Grid | Mode | Policy | Success % before → after | Median ms | P95 ms | Median words | Median crossings |','|---|---|---|---:|---:|---:|---:|---:|']
for r in rows:
 lines.append('| '+ ' | '.join([str(r['size']),r['mode'],r['policy']]+[f"{fmt(r['before'+k])} → {fmt(r['after'+k])}"for k in ['Success','MedianMs','P95Ms','Words','Intersections']])+' |')
lines+=['',f"Returned-puzzle quality failures: {after['returnedPuzzleQualityFailures']}.",'','Historical Batch005→Batch006 seed transitions and the freshly repeated Batch006 baseline are separate evidence layers. Wall-clock deadlines introduce timing sensitivity; fixed seeds do not imply a deterministic wall-clock cutoff.','']
(root/'RESULTS.md').write_text('\n'.join(lines))
summary={'comparison':rows,'qualityFailures':after['returnedPuzzleQualityFailures'],'productionPolicy':'compatibility','dictionaryChanged':False,'cefrAssigned':False,'batch007Started':False}
(root/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
for r in rows:print(r['size'],r['mode'],r['policy'],round(r['beforeSuccess'],1),'->',round(r['afterSuccess'],1))
