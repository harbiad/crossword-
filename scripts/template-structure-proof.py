"""Independent finite checks of line geometry and the mandatory long-word frame."""
import itertools,json,pathlib
root=pathlib.Path('template_feasibility_13x13')
patterns=[]
for bits in itertools.product('01',repeat=13):
 line=''.join(bits)
 if '000'in line or any(0<len(run)<3 for run in line.split('0')):continue
 patterns.append(line)
forced=[i for i in range(13)if all(p[i]=='1'for p in patterns)]
assert forced==[2,10]
(root/'line_structure_proof.json').write_text(json.dumps({'minimumWhiteRun':3,'maximumBlackRun':2,'validLineLayouts':patterns,'forcedWhitePositions':forced},indent=2)+'\n')
words=[p['answer']for p in json.loads((root/'full-pool.json').read_text())if len(p['answer'])==13]
# Orientation changes character lookup only; canonical identity remains the word.
values=[(word,inverted,word[10 if inverted else 2],word[2 if inverted else 10])for word in words for inverted in [False,True]]
solutions=[]
for top,bottom in itertools.product(values,repeat=2):
 if top[0]==bottom[0]:continue
 for left in values:
  if left[0]in[top[0],bottom[0]]or(left[2],left[3])!=(top[2],bottom[2]):continue
  for right in values:
   if right[0]in[top[0],bottom[0],left[0]]or(right[2],right[3])!=(top[3],bottom[3]):continue
   solutions.append([top,bottom,left,right])
(root/'mandatory_frame_proof.json').write_text(json.dumps({'words':words,'orientedCount':len(values),'solutionCount':len(solutions),'solutions':solutions},indent=2)+'\n')
print('Valid line layouts:',len(patterns),'forced positions:',forced,'distinct-answer frame assignments:',len(solutions))
