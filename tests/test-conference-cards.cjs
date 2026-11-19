const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm');
const api = require('../js/conference-updates.js');
const hpdc = JSON.parse(fs.readFileSync('public/data/hpdc-2027.json'));
assert.equal(api.records(null,hpdc)[0].acronym,'HPDC');
assert.equal(api.safeURL('javascript:alert(1)'),null);
assert.equal(api.safeURL('https://name:secret@example.com/'),null);
assert.equal(api.normalize({acronym:'x',year:2027,dates:{paper:'TBD'}}),null);
const community = {acronym:'TEST',catalogue_ids:[123],year:2026,source_kind:'community',verified_at:null,fetched_at:'2026-11-19T00:00:00Z',timezone:'AoE',rounds:[{label:'Spring',dates:{paper:'2026-01-01 23:59:59'}},{label:'Fall',dates:{paper:'2026-09-01 23:59:59'}}],sources:['https://example.com/']};
assert.equal(api.normalize(community).rounds.length,2);
assert.equal(api.records({schema_version:1,conferences:[community]},hpdc).length,2);
class Element {
 constructor(tag){this.tag=tag;this.children=[];this.textContent='';this.listeners={};}
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(...nodes){this.children=nodes;}
 addEventListener(name,fn){this.listeners[name]=fn;}
 insertBefore(node){this.children.push(node);}
 querySelector(){return null;}
 get text(){return this.textContent+this.children.map(c=>typeof c==='string'?c:c.text).join(' ');}
}
const document={createElement:tag=>new Element(tag),createTextNode:text=>text};
const script = fs.readFileSync('js/conference-updates.js','utf8');
class FixtureDate extends Date { static now(){ return Date.parse('2026-11-19T09:00:00Z'); } }
function browserFixture(refresh_status, fetched_at = community.fetched_at) {
 const window={document};
 const snapshot={schema_version:1,refresh_status,checked_at:'2026-11-19T08:00:00Z',conferences:[{...community,fetched_at}]};
 vm.runInNewContext(script,{window,document,URL,Date:FixtureDate,console,fetch:async url=>({ok:true,json:async()=>url.includes('hpdc')?hpdc:snapshot})});
 return window.ConferenceDeadlines;
}
const window={ConferenceDeadlines:browserFixture('ok')};
(async()=>{
 const cards=[new Element('div'),new Element('div'),new Element('div')];
 window.ConferenceDeadlines.attach(cards[0],{abbr:'HPDC',id:'HPDC'});
 window.ConferenceDeadlines.attach(cards[1],{abbr:'OTHER',id:'other'});
 window.ConferenceDeadlines.attach(cards[2],{abbr:'alias',id:123});
 await new Promise(resolve=>setImmediate(resolve));
 assert.match(cards[0].text,/2027-01-18/);assert.match(cards[0].text,/核验时间/);
 assert.match(cards[1].text,/暂无核实数据/);assert.doesNotMatch(cards[1].text,/未公布/);
 assert.match(cards[2].text,/2 轮投稿/);assert.match(cards[2].text,/Spring/);assert.match(cards[2].text,/Fall/);assert.match(cards[2].text,/社区整理/);
 assert.doesNotMatch(cards[2].text,/deadline-warning|刷新失败/);
 for (const [status,fetchedAt] of [['stale',community.fetched_at],['failed',community.fetched_at],['ok','2026-11-15T00:00:00Z']]) {
  const cached=new Element('div');
  browserFixture(status,fetchedAt).attach(cached,{abbr:'alias',id:123});
  await new Promise(resolve=>setImmediate(resolve));
  assert.match(cached.text,/最近检查：2026-11-19T08:00:00Z/);
  assert.match(cached.text,/当前为最后有效记录/, status + ' · ' + fetchedAt);
 }
 let stopped=false;cards[0].children[0].listeners.click({stopPropagation(){stopped=true}});assert.ok(stopped);
 // New cards made by search/filter receive their own details; removed old cards don't affect them.
 const repeated=new Element('div');window.ConferenceDeadlines.attach(repeated,{abbr:'HPDC',id:'HPDC'});
 await new Promise(resolve=>setImmediate(resolve));assert.match(repeated.text,/2027-01-18/);
 const main=fs.readFileSync('js/main.js','utf8');assert.match(main,/if \(type === 'conference'\) window.ConferenceDeadlines\?\.attach/);
 const index=fs.readFileSync('index.html','utf8');assert.ok(index.indexOf('src="js/conference-updates.js"')<index.indexOf('src="js/main.js"'));
 console.log('PASS normalization, safe URLs, HPDC fallback, multi-round community, every conference, click isolation, repeat rendering, journal guard');
})().catch(error=>{console.error(error);process.exitCode=1});
