"""Experimental layout and vocabulary-use report; no dictionary edits."""
import csv,json,pathlib,statistics,math,collections,hashlib,html,itertools
root=pathlib.Path('template_family_13x13')
def read(p):return json.loads((root/p).read_text())
def csvout(name,rows):
 if not rows:return
 with(root/name).open('w',newline='')as f:
  w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader()
  for r in rows:w.writerow({k:json.dumps(v,ensure_ascii=False)if isinstance(v,(dict,list))else v for k,v in r.items()})
def stats(v):return {'median':statistics.median(v)if v else None,'p95':sorted(v)[math.ceil(.95*len(v))-1]if v else None,'max':max(v)if v else None,'min':min(v)if v else None}
line_control=[]
for allow_single_axis in [False,True]:
 patterns=[]
 for bits in itertools.product('01',repeat=13):
  line=''.join(bits)
  if '000'in line:continue
  if any(0<len(run)<3 and not(allow_single_axis and len(run)==1)for run in line.split('0')):continue
  patterns.append(line)
 line_control.append({'allowSingleCellPerpendicularRun':allow_single_axis,'lineLayouts':len(patterns),'forcedWhitePositions':[i for i in range(13)if all(p[i]=='1'for p in patterns)],'note':'A singleton is not an entry; in a full grid it must belong to a 3+ entry in the other direction.'})
(root/'line_rule_control.json').write_text(json.dumps(line_control,indent=2)+'\n')
discovery=read('discovery.json');runs=read('comparison.json')+read('two-letter.json')+read('balanced.json')
assert len(discovery)==2000 and len(runs)==420
csvout('discovery.csv',discovery);csvout('runs.csv',runs)
summaries=[]
for family,policy in sorted({(r['family'],r['policy'])for r in runs}):
 g=[r for r in runs if(r['family'],r['policy'])==(family,policy)];ok=[r for r in g if r['success']];assert len(g)==30
 row={'family':family,'policy':policy,'attempts':len(g),'successful':len(ok),'successRate':len(ok)/len(g)*100,'generationMs':stats([r['ms']for r in g]),'templateDiversity':len({r['signature']for r in ok})}
 for key in ['words','intersections','whitePct','checkedPct','averageLength','shortPct','three','long','fullLength']:row[key]=stats([r[key]for r in ok])
 row['twoLetterPct']=stats([100*r['twoCount']/r['words']for r in ok]);summaries.append(row)
csvout('benchmark_summary.csv',summaries)
isolation=[]
for family,density in sorted({(r['family'],r['density'])for r in discovery}):
 g=[r for r in discovery if(r['family'],r['density'])==(family,density)];ok=[r for r in g if r['validatorPassed']]
 isolation.append({'family':family,'densityCeiling':density,'layouts':len(g),'fills':sum(r['solutionFound']for r in g),'validPuzzles':len(ok),'impossibleProofs':sum(bool(r['proof'])for r in g),'unknownWithin150ms':sum(not r['proof']and not r['solutionFound']for r in g),'medianFullLengthSlots':statistics.median(r['fullLength']for r in g),'validZeroFullLength':sum(r['fullLength']==0 for r in ok),'validOneFullLength':sum(r['fullLength']==1 for r in ok),'validTwoFullLength':sum(r['fullLength']==2 for r in ok)})
csvout('rule_isolation.csv',isolation)
# English use categories describe selected tokens, not new dictionary decisions.
function_words=set('AN AS AT BY HE IF IN MY NO OF ON OR TO UP WE'.split())
ordinary=set('AX DO GO OX'.split());short_forms={'ID','OK'}
known_interjections=set('AY EH ER HA HO LO MM OW SH TA UM WO YO'.split())
source_flags=collections.defaultdict(set)
for filename in ['priority-1.csv','priority-2.csv']:
 for r in csv.DictReader(open('dictionary/stage2/'+filename,encoding='utf-8-sig')):
  source_flags[r['english']].add(r['category'])
freq=[]
for family,policy in sorted({(r['family'],r['policy'])for r in runs if r['family'].startswith('two-')}):
 group=[r for r in runs if(r['family'],r['policy'])==(family,policy)]
 count=collections.Counter(w['answer']for r in group for w in r['two'])
 for word,n in count.most_common():
  clues=sorted({w['clue']for r in group for w in r['two']if w['answer']==word})
  category='function word'if word in function_words else'ordinary lexical word'if word in ordinary else'common short form'if word in short_forms else'interjection/sound'if word in known_interjections else'lexical role unresolved'
  learner_review=word not in function_words|ordinary|short_forms
  freq.append({'family':family,'policy':policy,'answer':word,'occurrences':n,'arabicClues':clues,'category':category,'functionWord':word in function_words,'commonShortForm':word in short_forms,'historicalAbbreviationFlag':'abbreviation'in source_flags[word],'historicalNameFlag':bool(source_flags[word]&{'proper-name','place','brand'}),'learnerReviewRecommended':learner_review,'reason':'Experimental-use triage, not a rejection: sound/clipped/specialist/unresolved token needs a separate two-letter learner policy.'if learner_review else'Common English use; this is not a fresh approval of every Arabic mapping.','priorAuditCategories':sorted(source_flags[word])})
csvout('two_letter_frequency.csv',freq)
usage=[]
for policy in ['approved-only','compatibility']:
 f=[r for r in freq if r['policy']==policy];total=sum(r['occurrences']for r in f)
 usage.append({'policy':policy,'successfulControlPuzzles':sum(r['success']for r in runs if r['policy']==policy and r['family'].startswith('two-')),'distinctTwoLetterAnswers':len({r['answer']for r in f}),'twoLetterPlacements':total,**{key:sum(r['occurrences']for r in f if r[key])for key in ['functionWord','commonShortForm','historicalAbbreviationFlag','historicalNameFlag','learnerReviewRecommended']}})
csvout('two_letter_categories.csv',usage)
# Historical experiment inputs: production promotion is reported separately.
inputs=read('input_hashes.json'); snapshots={'src/lib/'+name+'.ts': root/'baseline'/f'{name}.txt' for name in ['templates','generateCrossword']}
unchanged={p:hashlib.sha256(snapshots.get(p,pathlib.Path(p)).read_bytes()).hexdigest()==h for p,h in inputs.items()};assert all(unchanged.values())
(root/'protected_inputs.json').write_text(json.dumps(unchanged,indent=2)+'\n')
summary={'productionChanged':False,'dictionaryChanged':False,'validatorChanged':False,'minimumProductionEnglishAnswer':3,'band':'advanced','seeds':list(range(1,31)),'warmupSeed':0,'requestBudgetMs':4500,'innerBudgetMs':350,'templateCount':24,'discoveryLayouts':2000,'validDiscoverySolutions':sum(r['validatorPassed']for r in discovery),'isolatedBlockRuleInvalidFills':sum(r['solutionFound']and not r['validatorPassed']for r in discovery),'lineRuleControl':line_control,'ruleIsolation':isolation,'benchmarks':summaries,'twoLetterUsage':usage,'vocabularyClassificationCaveat':'Categories are read-only triage. Historical abbreviation flags do not prove abbreviation status. Name count means existing name flags, not independent certification. Learner-review flags are not confirmed errors or rejected dictionary decisions.','qualityGate':{'maximumThreeLetterShare':.60,'basis':'Rounded current compatibility median 59.38%; removes the 70%+ outliers. Evaluated as a separate paired control.'},'recommendation':'A: Keep minimum three and adopt the tested 13x13 partially checked family after product review. Experimental only in this task. Do not enable two-letter English or approved-only production automatically.'}
(root/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
# Actual, representative solved layouts for visual comparison; no production UI changes.
solutions=read('comparison-solutions.json')+read('two-letter-solutions.json')+read('balanced-solutions.json')
panels=[]
for family,policy,label in [('current','compatibility','Current / compatibility'),('balanced-symmetric','approved-only','3+ balanced / approved'),('two-symmetric-unchecked','approved-only','2+ symmetric / approved')]:
 candidates=[x for x in solutions if x['family']==family and x['policy']==policy];median=next(x['words']['median']for x in summaries if x['family']==family and x['policy']==policy)
 choice=min(candidates,key=lambda x:(abs(len(x['cw']['entries'])-median),x['seed']));panels.append((choice,label))
svg=['<svg xmlns="http://www.w3.org/2000/svg" width="1170" height="465" viewBox="0 0 1170 465"><rect width="1170" height="465" fill="#f4f5f7"/><style>text{font-family:Arial,sans-serif;fill:#17212d}.title{font-size:17px;font-weight:600}.small{font-size:12px}</style>']
for col,(choice,label)in enumerate(panels):
 x0=20+col*390;y0=54;cw=choice['cw'];row=next(r for r in runs if r['family']==choice['family']and r['policy']==choice['policy']and r['seed']==choice['seed'])
 svg.append(f'<text class="title" x="{x0}" y="28">{html.escape(label)}</text>')
 for r in range(13):
  for c in range(13):
   cell=cw['grid'][r][c];isblock=cell['type']=='block';fill='#243447'if isblock else'#ffffff';x=x0+c*26;y=y0+r*26
   svg.append(f'<rect x="{x}" y="{y}" width="26" height="26" fill="{fill}" stroke="#c3cad2" stroke-width=".6"/>')
   if not isblock:svg.append(f'<text x="{x+13}" y="{y+18}" text-anchor="middle" font-size="13">{html.escape(cell["char"])}</text>')
 svg.append(f'<text class="small" x="{x0}" y="418">Seed {choice["seed"]}: {row["words"]} words, {row["intersections"]} crossings</text>')
 svg.append(f'<text class="small" x="{x0}" y="440">{row["whitePct"]:.1f}% white; {row["twoCount"]} two-letter answers</text>')
svg.append('</svg>');(root/'examples.svg').write_text(''.join(svg)+'\n')
print(json.dumps({'results':[(r['family'],r['policy'],r['successRate'],round(r['generationMs']['median']))for r in summaries],'twoLetterUsage':usage},indent=2))
