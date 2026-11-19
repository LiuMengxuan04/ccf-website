"""Offline data regression checks; no network or third-party dependencies."""
import json,re
from pathlib import Path
from collections import Counter
root=Path(__file__).resolve().parents[1]
j=json.loads((root/'public/data/ccf_complete.json').read_text());m=j['metadata'];d=j['data'];a=d['journals']+d['conferences']
assert len(a)==m['total_items']==681
assert len(d['journals'])==m['journals_count']==295
assert len(d['conferences'])==m['conferences_count']==386
assert Counter(x['level'] for x in a)=={'A':95,'B':245,'C':341}
assert len({x['id'] for x in a})==len(a)
assert len({x['category'] for x in a})==10
assert {(x['abbr'],x['type']) for x in a if not x['website']}=={('JCC','会议'),('JATS','期刊')}
assert all(x['name_en'] and x['publisher'] and 2<=x['source_page']<=72 for x in a)
assert all(not x['website'] or (x['website'].startswith(('http://','https://')) and not re.search(r'\s',x['website'])) for x in a)
for abbr,level in [('HPDC','A'),('ICLR','A'),('IJCAI','B'),('WINE','B'),('APPT','C')]:
 assert any(x['abbr']==abbr and x['level']==level for x in d['conferences']),abbr
legacy=json.loads((root/'public/data/ccf_all.json').read_text())
assert legacy['metadata']['total_items']==95
assert all(x['level']=='A' for v in legacy['data'].values() for x in v)
assert legacy['data']=={k:[x for x in v if x['level']=='A'] for k,v in d.items()}
print('PASS: 681 rows; unique IDs; metadata, levels, legacy subset, source pages and key changes')
