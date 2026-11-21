const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm');
const api = require('../js/conference-updates.js');
const official = JSON.parse(fs.readFileSync('public/data/official-deadline-snapshots.json'));
const catalogue = JSON.parse(fs.readFileSync('public/data/ccf_complete.json')).data.conferences;
assert.equal(api.records(null,null,official).length, official.conferences.length);
assert.ok(official.conferences.every(r=>r.catalogue_ids.length===1 && catalogue.some(c=>r.catalogue_ids.includes(c.id))));
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
function browserFixture(refresh_status, fetched_at = community.fetched_at, extras = [], officialData = official, date = FixtureDate) {
 const window={document};
 const snapshot={schema_version:1,refresh_status,checked_at:'2026-11-19T08:00:00Z',conferences:[{...community,fetched_at}, ...extras]};
 vm.runInNewContext(script,{window,document,URL,Date:date,console,fetch:async url=>({ok:true,json:async()=>url.includes('hpdc')?hpdc:url.includes('official-deadline')?officialData:snapshot})});
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
 const [atc,sc,middleware]=['ATC','SC','Middleware'].map(acronym=>official.conferences.find(r=>r.acronym===acronym));
 const scCommunity={...community,acronym:'SC',catalogue_ids:sc.catalogue_ids,rounds:[],dates:{paper:'2027-01-01'}};
 const sourceFixture=browserFixture('ok',community.fetched_at,[{...scCommunity,year:2026},{...scCommunity,year:2027}]);
 const atcCard=new Element('div'),scCard=new Element('div'),futureCard=new Element('div'),middlewareCard=new Element('div');
 sourceFixture.attach(middlewareCard,{abbr:'Middleware',id:middleware.catalogue_ids[0]});
 sourceFixture.attach(atcCard,{abbr:'ACM SIGOPS ATC（原USENIX ATC）',id:atc.catalogue_ids[0]});
 sourceFixture.attach(scCard,{abbr:'SC',id:sc.catalogue_ids[0]});
 browserFixture('ok',community.fetched_at,[{...scCommunity,year:2028,dates:{paper:'2028-04-01'}}]).attach(futureCard,{abbr:'SC',id:sc.catalogue_ids[0]});
 await new Promise(resolve=>setImmediate(resolve));
 assert.match(atcCard.text,/全文：2027-01-19/);
 assert.match(atcCard.text,/官方列出的投稿入口/);
 assert.doesNotMatch(atcCard.text,/摘要注册/);
 assert.match(scCard.text,/全文：2027-04-01 23:59/);
 assert.match(scCard.text,/摘要注册 2027-03-25 23:59/);
 assert.match(scCard.text,/官网日期快照/);
 assert.match(scCard.text,/SC 2026/);
 assert.equal((scCard.text.match(/SC 2027/g) || []).length,1);
 assert.match(futureCard.text,/全文：2028-04-01/);
 assert.match(middlewareCard.text,/2 轮投稿/);
 assert.match(middlewareCard.text,/摘要注册 2026-11-27 00:00/);
 assert.match(middlewareCard.text,/全文投稿 2026-12-04 00:00/);
 assert.match(middlewareCard.text,/摘要注册 2027-05-28(?! \d{2}:)/);
 assert.match(middlewareCard.text,/全文投稿 2027-06-04(?! \d{2}:)/);
 assert.match(middlewareCard.text,/夏季投稿时刻及时区：官方暂未公布/);
 // End-to-end regressions with the checked-in community placeholders and the actual official snapshots.
 const communityData = JSON.parse(fs.readFileSync('public/data/conference-deadlines.json'));
 const watched = ['FAST','NSDI','CSCW','LICS'];
 const examples = communityData.conferences.filter(r => watched.includes(r.acronym));
 class November21 extends Date { static now(){ return Date.parse('2026-11-21T18:00:00Z'); } }
 const renderer = browserFixture('ok',community.fetched_at,examples,official,November21);
 const watchCards = {};
 for (const name of watched) {
  const record = official.conferences.find(r => r.acronym === name);
  watchCards[name] = new Element('div');
  renderer.attach(watchCards[name],{abbr:name,id:record.catalogue_ids[0]});
 }
 const rollingDoc = examples.find(r => r.acronym === 'CSCW');
 const fallback = new Element('div');
 browserFixture('ok',community.fetched_at,[rollingDoc],null,November21).attach(fallback,{abbr:'CSCW',id:rollingDoc.catalogue_ids[0]});
 await new Promise(resolve=>setImmediate(resolve));
 for (const name of ['FAST','NSDI']) {
  const summary = watchCards[name].children[0].children[0].text;
  assert.match(summary,/2027 投稿信息.*录用通知：2026-12-08/);
  assert.doesNotMatch(summary,/2028 投稿信息|全文：2026-09/);
  assert.match(watchCards[name].text,new RegExp(name+' 2028'));
  assert.match(watchCards[name].text,/春季轮.*秋季轮/);
 }
 assert.match(watchCards.FAST.text,/终稿 2027-01-26 23:59/);
 assert.match(watchCards.NSDI.text,/终稿 2027-03-04(?! \d{2}:)/);
 assert.match(watchCards.CSCW.text,/没有单独的会议投稿截止/);
 assert.match(watchCards.CSCW.text,/PACM HCI\/CSCW.*ToCHI/);
 assert.match(fallback.text,/投稿说明 · 展开查看/);
 assert.equal(fallback.text.split(rollingDoc.rounds[0].comment).length-1,1);
 assert.match(watchCards.LICS.text,/摘要注册 2027-01-14.*全文投稿 2027-01-21.*录用通知 2027-04-15/);
 assert.match(watchCards.LICS.text,/3 月 25–28 日/);
 assert.doesNotMatch(watchCards.LICS.text,/官方列出的投稿入口/);
 let stopped=false;cards[0].children[0].listeners.click({stopPropagation(){stopped=true}});assert.ok(stopped);
 // New cards made by search/filter receive their own details; removed old cards don't affect them.
 const repeated=new Element('div');window.ConferenceDeadlines.attach(repeated,{abbr:'HPDC',id:'HPDC'});
 await new Promise(resolve=>setImmediate(resolve));assert.match(repeated.text,/2027-01-18/);
 const main=fs.readFileSync('js/main.js','utf8');assert.match(main,/if \(type === 'conference'\) window.ConferenceDeadlines\?\.attach/);
 const index=fs.readFileSync('index.html','utf8');assert.ok(index.indexOf('src="js/conference-updates.js"')<index.indexOf('src="js/main.js"'));
 console.log('PASS normalization, safe URLs, HPDC fallback, multi-round community, every conference, click isolation, repeat rendering, journal guard');
})().catch(error=>{console.error(error);process.exitCode=1});
