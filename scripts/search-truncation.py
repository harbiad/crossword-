"""Read frozen Batch006 failed-call traces; no generator/dictionary mutations."""
import csv,gzip,json,collections,pathlib
root=pathlib.Path('search_feasibility_analysis');out=root/'solver_window_domains.csv.gz'
counts=collections.Counter({'observations':0,'windowLoss':0,'windowZero':0,'windowCritical':0}); by_config=collections.defaultdict(collections.Counter)
with gzip.open(out,'wt',newline='') as f:
 w=csv.writer(f);w.writerow(['size','mode','seed','attempt','template','slot','pattern','constraints','fullMatchingCanonical','windowMatchingCanonical','liveCanonical','omittedByWindow','knownSolutionOmitted'])
 for path in sorted(pathlib.Path('dictionary/stage3b/batch006/diagnostics/traces').glob('*.gz')):
  j=json.load(gzip.open(path,'rt'));group=(j['size'],j['mode']);buckets=collections.defaultdict(set)
  for answer in j['sampledAnswers']:buckets[len(answer)].add(answer)
  cache={}
  for a in j['attempts']:
   for o in a['observations']:
    length=o['slot']['length']; constraints=o['constraints'];key=(length,json.dumps(constraints,sort_keys=True))
    if key not in cache:
     cache[key]={word for word in buckets[length] if any(all(word[length-1-c['position'] if inv else c['position']] in c['characters'] for c in constraints) for inv in [False,True])}
    full=cache[key]-set(o['used']);win=full&set(a['windowAnswers'].get(str(length),[]));omitted=full-win
    n=o['occurrences'];counts['observations']+=n;by_config[group]['observations']+=n
    if omitted:counts['windowLoss']+=n;by_config[group]['windowLoss']+=n
    if full and not win:counts['windowZero']+=n;by_config[group]['windowZero']+=n
    if len(full)>3 and 0<len(win)<=3:counts['windowCritical']+=n;by_config[group]['windowCritical']+=n
    w.writerow([*group,j['seed'],a['id'],a['template'],json.dumps(o['slot']),o['pattern'],json.dumps(constraints),len(full),len(win),o['liveUnique'],json.dumps(sorted(omitted)),'none' if not omitted else 'not-established'])
(root/'solver_window_summary.json').write_text(json.dumps({'totals':dict(counts),'configurations':[{'size':k[0],'mode':k[1],**{name:v.get(name,0)for name in counts}}for k,v in by_config.items()],'scope':'All captured failed-call observations from Batch006 QA. Full means the API pool received by the solver, before per-length attempt windows; removes canonical used answers. Matching supports include both structural orientations. Arc-pruned live domains can be smaller for sound simultaneous-support reasons, not truncation. No maxCandidatesPerSlot is applied on production fill/arc paths. No omitted match means no omitted known-solution match.'},indent=2)+'\n')
print(dict(counts))
