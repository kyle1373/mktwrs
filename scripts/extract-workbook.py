import openpyxl,json,datetime,collections,re
from pathlib import Path
w=openpyxl.load_workbook('archive/raw/course-leaderboard.xlsx',data_only=True)
f=openpyxl.load_workbook('archive/raw/course-leaderboard.xlsx',data_only=False)
def value(v):
 if isinstance(v,(datetime.datetime,datetime.date,datetime.time)):return v.isoformat()
 return v
s=w['Admin Panel'];headers=[]
for row in s:
 for c in row:
  if c.value=='Player:' and c.row<15:headers.append((c.column,c.row))
headers.sort();blocks=[]
for i,(col,h) in enumerate(headers):
 width=min(10,(headers[i+1][0]-col) if i+1<len(headers) else 8)
 titles=[(r,s.cell(r,col).value) for r in range(5,h) if s.cell(r,col).value]
 title=titles[-1][1] if titles else None
 labels=[s.cell(h,col+j).value for j in range(width)]
 rows=[]
 for r in range(h+1,s.max_row+1):
  if s.cell(r,col).value is None:continue
  cells=[]
  for j in range(width):
   cell=s.cell(r,col+j);fc=f['Admin Panel'].cell(r,col+j)
   cells.append({'cell':cell.coordinate,'value':value(cell.value),'formula':fc.value if fc.data_type=='f' else None,'link':cell.hyperlink.target if cell.hyperlink else None})
  rows.append({'row':r,'cells':cells})
 blocks.append({'course':title,'headerRow':h,'column':col,'labels':labels,'rows':rows})
other={}
for name in ['Player Profiles','Player Names','Player Flags','3DS Rainbow Road R','Ghost Valley']:
 other[name]=[[value(c.value) for c in row]for row in w[name] if any(c.value is not None for c in row)]
result={'source':'https://docs.google.com/spreadsheets/d/1fTkcCluvL4frXvvFw4qBvkHBpj7mVtw7sCgDs6TGGno/edit','capturedAt':'2026-09-30','blocks':blocks,'sheets':other}
Path('archive/raw/workbook-extracted.json').write_text(json.dumps(result,ensure_ascii=False))
print('Blocks:',len(blocks),'Populated:',sum(bool(b['rows'])for b in blocks),'Rows:',sum(len(b['rows'])for b in blocks))
print('Header schemas:',collections.Counter(tuple(b['labels']) for b in blocks))
print('Unmapped titles:',[(b['column'],b['headerRow'])for b in blocks if not b['course']])
print('Sample:',json.dumps(blocks[-1],ensure_ascii=False)[:3000])
