"""Import CCF 2026 official tables. Usage: python scripts/import_ccf_pdf.py PDF
Requires PyMuPDF 1.26.6. PDF downloaded separately from metadata.source_document.
"""
import sys, json, re, hashlib
from pathlib import Path
from collections import Counter
import fitz
ROOT=Path(__file__).resolve().parents[1]
PDF=Path(sys.argv[1])
SOURCE='https://www.ccf.org.cn/ccf/contentcore/resource/download?ID=112CF3BF7E1140ACEB271ADAED12A67ADFABB8FF099E40C2759502A85C8A281F'
CATS=[(2,'计算机体系结构/并行与分布计算/存储系统'),(10,'计算机网络'),(17,'网络与信息安全'),(24,'软件工程/系统软件/程序设计语言'),(32,'数据库/数据挖掘/内容检索'),(38,'计算机科学理论'),(44,'计算机图形学与多媒体'),(51,'人工智能'),(61,'人机交互与普适计算'),(67,'交叉/综合/新兴')]
def clean(s):return re.sub(r'\s+',' ',s or '').strip()
old=json.loads((ROOT/'public/data/ccf_complete.json').read_text())
old_by_name={(x['type'],x['name_en'].lower()):x for arr in old['data'].values() for x in arr}
data={'journals':[],'conferences':[]}; level=None; kind=None; seq=0; pages=[]
for no,page in enumerate(fitz.open(PDF),1):
 if no==1:continue
 text=page.get_text();m=re.search(r'[一二三]、\s*([ABC])\s*类',text)
 if m:level=m[1];seq=0
 category=[c for start,c in CATS if no>=start][-1]
 tables=page.find_tables().tables
 assert len(tables)==1,(no,len(tables))
 rows=tables[0].extract()
 if rows[0][0]=='序号':
  kind='journals' if '期刊' in rows[0][1] else 'conferences'; rows=rows[1:]
 for row in rows:
  assert len(row)==5,(no,row)
  n,abbr,name,pub,url=map(clean,row)
  assert n.isdigit() and int(n)==seq+1,(no,seq,row)
  seq=int(n); typ='期刊' if kind=='journals' else '会议'
  # URLs and short labels wrap at arbitrary line breaks in PDF cells.
  url=re.sub(r'\s+','',row[4] or '').replace('\x02','')
  abbr=re.sub(r'\s*\n\s*','',row[1] or '').strip()
  assert name and pub and (not url or url.startswith(('http://','https://'))),(no,row)
  former=old_by_name.get((typ,name.lower()))
  ident=re.sub(r'[^a-z0-9]+','_',f'{abbr}_{name}'.lower()).strip('_')+'_'+hashlib.sha256(f'{typ}|{category}|{name}'.encode()).hexdigest()[:8]
  entry=dict(id=ident,name_en=name,name_cn=(former or {}).get('name_cn',name),abbr=abbr,type=typ,level=level,category=category,publisher=pub,website=url,description=f'{category} · CCF {level}类{typ}',source='CCF Official Directory 2026 (7th edition, 2026-04-09 correction)',last_updated='2026-11-19',source_page=no)
  data[kind].append(entry)
 pages.append(dict(page=no,rows=len(rows)))
allrows=data['journals']+data['conferences'];counts=Counter(x['level'] for x in allrows)
# IDs are HTML attributes, and must be unique even where abbreviations overlap.
seen=set()
for x in allrows:
 if x['id'] in seen:x['id']+='_'+('journal' if x['type']=='期刊' else 'conference')
 assert x['id'] not in seen,x;seen.add(x['id'])
meta=dict(title='中国计算机学会推荐国际学术期刊和会议目录',version='2026.1',last_updated='2026-11-19',description='CCF推荐的A/B/C类国际学术期刊和会议目录（2026年第七版正式版，4月9日勘误）',total_items=len(allrows),journals_count=len(data['journals']),conferences_count=len(data['conferences']),a_class_count=counts['A'],b_class_count=counts['B'],c_class_count=counts['C'],data_sources=['https://www.ccf.org.cn/Academic_Evaluation/By_category/2026-03-31/870181.shtml',SOURCE],source_document=SOURCE,source_sha256=hashlib.sha256(PDF.read_bytes()).hexdigest(),source_edition_date='2026-03-31',source_correction_date='2026-04-09')
(ROOT/'public/data/ccf_complete.json').write_text(json.dumps(dict(metadata=meta,data=data),ensure_ascii=False,indent=2)+'\n')
print(json.dumps(meta,ensure_ascii=False,indent=2));print('Page rows:',pages)
# Retain the legacy A-only endpoint with the same schema, without stale ranks.
legacy={'metadata':dict(meta),'data':{k:[x for x in v if x['level']=='A'] for k,v in data.items()}}
legacy['metadata'].update(total_items=counts['A'],journals_count=len(legacy['data']['journals']),conferences_count=len(legacy['data']['conferences']),a_class_count=counts['A'],b_class_count=0,c_class_count=0,description='2026年第七版正式版 A 类目录子集；完整数据请使用 ccf_complete.json')
(ROOT/'public/data/ccf_all.json').write_text(json.dumps(legacy,ensure_ascii=False,indent=2)+'\n')
