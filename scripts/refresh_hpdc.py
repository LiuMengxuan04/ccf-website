#!/usr/bin/env python3
"""Strict, dependency-free adapter. External HTML is parsed, never executed."""
import argparse
import datetime as dt
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.request import Request, urlopen
from urllib.parse import urljoin, urlsplit

HOME = 'https://hpdc.sci.utah.edu/2027/'
CFP = HOME + 'calls-cfp.html'
OUTPUT = Path('public/data/hpdc-2027.json')

class Page(HTMLParser):
    def __init__(self, html):
        super().__init__(); self.fields = {}; self.stack = []; self.links = []; self.text = []
        self.feed(html)
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'span':
            self.stack.append((attrs.get('class', ''), []))
        if tag == 'a':
            self.links.append([attrs.get('href', ''), ''])
        if tag == 'button':
            # Recognize one literal call only. Never evaluate JavaScript or accept
            # expressions, escapes, extra statements, or additional arguments.
            match = re.fullmatch(r"\s*parent\.open\(\s*(['\"])(https://[A-Za-z0-9./_-]+)\1\s*\)\s*;?\s*", attrs.get('onclick', ''))
            self.links.append([match.group(2) if match else '', ''])
        self.in_link = tag in ('a', 'button') or getattr(self, 'in_link', False)
    def handle_data(self, data):
        self.text.append(data)
        for _, buf in self.stack: buf.append(data)
        if getattr(self, 'in_link', False) and self.links: self.links[-1][1] += data
    def handle_endtag(self, tag):
        if tag in ('a', 'button'): self.in_link = False
        if tag == 'span' and self.stack:
            cls, buf = self.stack.pop()
            self.fields.setdefault(cls, []).append(' '.join(''.join(buf).split()))

def dates(page):
    if not re.search(r'HPDC\s*(?:20)?27\b', ' '.join(page.text)):
        raise ValueError('wrong conference edition')
    if page.fields.get('important-dates-timezone') != ['AoE']:
        raise ValueError('unknown or ambiguous timezone')
    values = page.fields.get('important-date-value', [])
    labels = page.fields.get('important-date-label', [])
    if len(values) != len(labels): raise ValueError('date/label mismatch')
    result = {}
    for label, value in zip(labels, values):
        key = {'Abstract registration': 'abstract', 'Paper submission (firm)': 'paper',
               'Paper submission': 'paper', 'Notification of acceptance': 'notification'}.get(label)
        if key:
            if key in result: raise ValueError('duplicate date label')
            parsed = dt.datetime.strptime(value.rstrip('.'), '%B %d, %Y').date()
            if parsed.year != 2027: raise ValueError('wrong deadline year')
            result[key] = parsed.isoformat()
    if set(result) != {'abstract', 'paper', 'notification'}: raise ValueError('missing dates')
    if not result['abstract'] <= result['paper'] < result['notification']: raise ValueError('invalid order')
    return result

def parse(cfp, home):
    pages = [Page(cfp), Page(home)]
    result = dates(pages[0])
    if result != dates(pages[1]): raise ValueError('official pages disagree')
    # Only a literal, edition-specific official link is accepted. A discovered link
    # says nothing about whether the submission system is open or closed.
    urls = set()
    for page in pages:
        for href, label in page.links:
            url = urljoin(HOME, href); p = urlsplit(url)
            if (p.scheme == 'https' and p.hostname == 'hpdc27.hotcrp.com'
                    and not p.username and not p.password and not p.port
                    and re.search(r'submi|hotcrp', label, re.I)):
                urls.add(url)
    if len(urls) > 1: raise ValueError('ambiguous submission links')
    return {'conference': 'HPDC', 'year': 2027, 'dates': result, 'timezone': 'AoE (UTC−12)',
            'submission': {'url': next(iter(urls), None), 'status': 'linked' if urls else 'not_found'},
            'sources': [CFP, HOME]}

def fetch(url):
    with urlopen(Request(url, headers={'User-Agent': 'CCF-Website-Official-CFP-Refresh/1.0'}), timeout=25) as response:
        if response.url != url: raise ValueError('unexpected redirect')
        raw = response.read(2_000_001)
        if len(raw) > 2_000_000: raise ValueError('response too large')
        return raw.decode('utf-8')

def refresh(path, fetcher=fetch, now=None):
    now = now or dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')
    old = json.loads(path.read_text()) if path.exists() else {}
    try:
        data = parse(fetcher(CFP), fetcher(HOME))
        updated = old.get('updated_at') if old.get('data') == data else now
        output = {'schema_version': 1, 'data': data, 'updated_at': updated,
                  'verified_at': now, 'checked_at': now, 'refresh_status': 'ok'}
    except Exception as exc:
        if not old.get('data'): raise
        output = {**old, 'checked_at': now, 'refresh_status': 'failed'}
        # Do not persist remote error strings or text into displayed content.
        print('Refresh failed; retained last valid snapshot:', type(exc).__name__)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n')
    temporary.replace(path)
    return output

if __name__ == '__main__':
    parser = argparse.ArgumentParser(); parser.add_argument('--output', type=Path, default=OUTPUT)
    refresh(parser.parse_args().output)
