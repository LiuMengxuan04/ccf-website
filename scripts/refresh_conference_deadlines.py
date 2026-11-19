#!/usr/bin/env python3
"""Import MIT CCFDDL entries with exact DBLP + normalized acronym matching.
No inferred submission portals; preserve distinct editions, rounds and raw timezone.
"""
import subprocess
import argparse, datetime as dt, io, json, pathlib, re, tarfile, urllib.request
import yaml
ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/data/conference-deadlines.json'
UPSTREAM = 'https://github.com/ccfddl/ccf-deadlines'
FIELDS = {'abstract_deadline':'abstract', 'deadline':'paper', 'decision_deadline':'notification', 'rebuttal_deadline':'rebuttal'}
def norm(s): return re.sub(r'[^a-z0-9]', '', s.lower())
def url(s):
    return isinstance(s,str) and bool(re.match(r'^https?://[^\s/]+(?:/[^\s]*)?$',s))
def validate(data):
    assert data['schema_version'] == 1 and isinstance(data['conferences'],list)
    cat = {c['id'] for c in json.loads((ROOT/'public/data/ccf_complete.json').read_text())['data']['conferences']}
    seen=set()
    for c in data['conferences']:
        assert c['source_kind']=='community' and c['verified_at'] is None
        assert c['acronym'] != 'HPDC' and c['catalogue_ids'] and set(c['catalogue_ids']) <= cat
        key=(tuple(c['catalogue_ids']),c['edition_id']); assert key not in seen; seen.add(key)
        assert 2000 <= c['year'] <= 2100 and c['timezone']
        assert c['submission']=={'url':None,'status':'not_found'}
        assert all(url(s) for s in c['sources']) and url(c['homepage_url'])
        for r in c['rounds']:
            for k,v in r['dates'].items():
                assert k in FIELDS.values() and isinstance(v,str)
                assert v == 'TBD' or re.fullmatch(r'\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?)?',v),v
        assert c['dates'] == (c['rounds'][0]['dates'] if len(c['rounds'])==1 else {})
    assert len(data['conferences']) >= 200, 'Unexpected coverage drop'
    return data

def build(files,revision):
    cat=json.loads((ROOT/'public/data/ccf_complete.json').read_text())['data']['conferences']
    now=dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds'); output=[]
    for path,content in sorted(files):
        for entry in yaml.safe_load(content) or []:
            if not entry.get('confs') or entry.get('title')=='HPDC': continue
            matches=[c for c in cat if norm(c['abbr'])==norm(entry['title']) and re.search(r'/conf/'+re.escape(str(entry.get('dblp')))+r'(?:/|$)',c['website'])]
            if not matches: continue
            latest=max(int(c['year']) for c in entry['confs'])
            for edition in entry['confs']:
                if int(edition['year']) != latest: continue
                if not url(edition.get('link')): continue
                rounds=[]
                for i,t in enumerate(edition.get('timeline',[])):
                    dates={dest:str(t[src]) for src,dest in FIELDS.items() if t.get(src) is not None}
                    rounds.append({'label':str(t.get('comment') or f'Round {i+1}'),'comment':str(t.get('comment') or ''),'dates':dates})
                output.append({'acronym':entry['title'],'catalogue_ids':[c['id'] for c in matches], 'dblp':entry['dblp'], 'year':latest,'edition_id':str(edition['id']), 'dates':rounds[0]['dates'] if len(rounds)==1 else {}, 'rounds':rounds, 'timezone':str(edition.get('timezone') or '未注明'), 'conference_date':str(edition.get('date') or ''),'place':str(edition.get('place') or ''),'homepage_url':edition['link'],'submission':{'url':None,'status':'not_found'},'sources':[f'{UPSTREAM}/blob/{revision}/{path}',edition['link']], 'source_kind':'community','verified_at':None,'fetched_at':now,'updated_at':now})
    output.sort(key=lambda c:(c['acronym'],c['year'],c['edition_id']))
    return validate({'schema_version':1,'source':{'name':'CCFDDL community','url':UPSTREAM,'license':'MIT','revision':revision,'notice':'社区整理；部分时区和时刻按上游默认规则补充（AoE、23:59:59），非逐条官网核验。以会议官网为准。'},'updated_at':now,'refresh_status':'ok','conferences':output})

def main():
    p=argparse.ArgumentParser();p.add_argument('--source-dir');p.add_argument('--revision');p.add_argument('--validate-only',action='store_true');a=p.parse_args()
    if a.validate_only:
        d=validate(json.loads(OUT.read_text())); print(f"PASS: {len(d['conferences'])} editions"); return
    try:
        if a.source_dir:
            src=pathlib.Path(a.source_dir); files=[(str(f.relative_to(src)),f.read_text()) for f in (src/'conference').rglob('*.yml')]; rev=a.revision
            assert rev and re.fullmatch('[0-9a-f]{40}',rev)
            assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=src,text=True).strip()==rev
            assert (src/'LICENSE').read_text().strip()==(ROOT/'docs/licenses/CCFDDL-MIT.txt').read_text().strip()
        else:
            req=urllib.request.Request('https://api.github.com/repos/ccfddl/ccf-deadlines/commits/main',headers={'User-Agent':'ccf-website-deadline-refresh'})
            with urllib.request.urlopen(req,timeout=30) as r:rev=json.load(r)['sha']
            assert re.fullmatch('[0-9a-f]{40}',rev)
            with urllib.request.urlopen(f'https://codeload.github.com/ccfddl/ccf-deadlines/tar.gz/{rev}',timeout=60) as r: raw=r.read(40_000_001)
            assert len(raw)<=40_000_000,'Archive exceeds limit'
            files=[]; license_ok=False
            with tarfile.open(fileobj=io.BytesIO(raw),mode='r:gz') as archive:
                for member in archive:
                    parts=pathlib.PurePosixPath(member.name).parts
                    if member.isfile() and len(parts)==2 and parts[1]=='LICENSE':
                        assert member.size < 10000
                        license_ok=archive.extractfile(member).read().decode().strip()==(ROOT/'docs/licenses/CCFDDL-MIT.txt').read_text().strip()
                    if member.isfile() and len(parts)>=3 and parts[1]=='conference' and member.name.endswith('.yml'):
                        assert member.size<1_000_000
                        files.append(('/'.join(parts[1:]),archive.extractfile(member).read().decode()))
            assert license_ok,'Upstream license changed; review required'
        result=build(files,rev)
        if OUT.exists():
            previous=json.loads(OUT.read_text())
            assert len(result['conferences']) >= len(previous['conferences'])*.9,'Coverage dropped >10%'
        tmp=OUT.with_suffix('.tmp');tmp.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');tmp.replace(OUT)
        print(f"Imported {len(result['conferences'])} editions from {rev}")
    except Exception as e:
        if not OUT.exists():raise
        previous=validate(json.loads(OUT.read_text()));previous['refresh_status']='stale'; previous['checked_at']=dt.datetime.now(dt.timezone.utc).isoformat(); previous['refresh_error']=type(e).__name__
        tmp=OUT.with_suffix('.tmp');tmp.write_text(json.dumps(previous,ensure_ascii=False,indent=2)+'\n');tmp.replace(OUT)
        print(f'Refresh failed ({type(e).__name__}); retained last valid community snapshot')
if __name__=='__main__':main()
