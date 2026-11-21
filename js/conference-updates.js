/* Separate verified deadlines from the CCF catalogue. No remote HTML is rendered. */
(function (root) {
  const dateLabels = {abstract:'摘要注册', paper:'全文投稿', notification:'录用通知', camera_ready:'终稿', rebuttal:'作者回复'};
  function safeURL(value) {
    try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch (_) { return null; }
  }
  function normalize(item) {
    if (!item || typeof item !== 'object' || !/^[\w .&/-]{1,60}$/.test(item.acronym || item.conference || '') || !Number.isInteger(item.year)) return null;
    const cleanDates = values => Object.fromEntries(Object.entries(values || {}).filter(([key, value]) => key in dateLabels && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?)?$/.test(value) && Number.isFinite(Date.parse(value))));
    const dates = cleanDates(item.dates);
    const rounds = (Array.isArray(item.rounds) ? item.rounds : []).filter(r => r && typeof r === 'object').map(r => ({...r, comment:typeof r.comment === 'string' ? r.comment.trim() : '', dates:cleanDates(r.dates)})).filter(r => Object.keys(r.dates).length || r.comment);
    const sources = (Array.isArray(item.sources) ? item.sources : []).map(safeURL).filter(Boolean);
    const community = item.source_kind === 'community';
    if ((!Object.keys(dates).length && !rounds.length && !item.conference_date) || !sources.length || !Number.isFinite(Date.parse(community ? item.fetched_at : item.verified_at))) return null;
    return {...item, acronym:item.acronym || item.conference, dates, rounds, sources};
  }
  function records(general, hpdc, official) {
    const list = general?.schema_version === 1 && Array.isArray(general.conferences) ? general.conferences.map(r => normalize({...r, refresh_status:general.refresh_status, checked_at:general.checked_at})).filter(Boolean) : [];
    if (hpdc?.schema_version === 1 && hpdc.data?.conference === 'HPDC') {
      const h = normalize({...hpdc.data, verified_at:hpdc.verified_at, updated_at:hpdc.updated_at, checked_at:hpdc.checked_at, refresh_status:hpdc.refresh_status});
      if (h) { const i = list.findIndex(r => r.acronym === 'HPDC' && r.year === h.year); if (i < 0) list.push(h); else list[i] = h; }
    }
    if (official?.schema_version === 1 && Array.isArray(official.conferences)) {
      for (const entry of official.conferences) {
        const record = normalize({...entry, source_kind:'official_snapshot'});
        if (record?.catalogue_ids?.length) list.push(record);
      }
    }
    return list;
  }
  const api = {safeURL, normalize, records};
  if (typeof module !== 'undefined') module.exports = api;
  if (!root.document) return;
  const el = (tag, text, cls) => { const e = document.createElement(tag); if (text) e.textContent = text; if (cls) e.className = cls; return e; };
  const link = (text, url) => { const a = el('a', text); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a; };
  const get = url => fetch(url, {cache:'no-cache'}).then(r => r.ok ? r.json() : null).catch(() => null);
  const ready = Promise.all([get('public/data/conference-deadlines.json'), get('public/data/hpdc-2027.json'), get('public/data/official-deadline-snapshots.json')]).then(([a,b,c]) => records(a,b,c));
  function populate(details, item, data) {
    const matches = data.filter(r => Array.isArray(r.catalogue_ids) ? r.catalogue_ids.map(String).includes(String(item.id)) : r.acronym === 'HPDC' && item.abbr === 'HPDC').sort((a,b) => b.year-a.year);
    const officialYears = new Set(matches.filter(r => r.source_kind === 'official_snapshot').map(r => r.year));
    const editions = matches.filter(r => r.source_kind !== 'community' || !officialYears.has(r.year));
    // Use the end of the calendar day in UTC−12 as the latest possible end of a date.
    const past = value => Boolean(value) && Date.now() >= Date.parse(value.slice(0,10)+'T00:00:00Z') + 36*3600000;
    const milestones = record => [
      ...Object.entries(record.dates),
      ...record.rounds.flatMap(round => Object.entries(round.dates)),
    ].filter(([, date]) => !past(date)).sort((a,b) => a[1].localeCompare(b[1]));
    // A later TBD placeholder must not hide an earlier edition's upcoming milestone.
    const selected = editions.find(record => milestones(record).length) || editions[0];
    const upcoming = selected ? milestones(selected) : [];
    const next = upcoming.find(([key]) => key === 'paper') || upcoming[0];
    const paper = selected?.dates.paper || selected?.rounds[0]?.dates.paper;
    const roundCount = selected?.rounds.filter(round => Object.keys(round.dates).length).length || 0;
    const prefix = roundCount > 1 ? roundCount + ' 轮投稿 · ' : '';
    const headline = !selected ? '暂无核实数据' : next
      ? prefix + (next[0] === 'paper' ? '全文' : dateLabels[next[0]]) + '：' + next[1]
      : roundCount > 1 ? prefix + '展开查看'
      : paper ? '全文（已过）：' + paper
      : selected.rounds.some(round => round.comment) ? '投稿说明 · 展开查看'
      : selected.conference_date ? '会期：' + selected.conference_date : '全文日期暂无 · 展开查看';
    details.replaceChildren();
    const summary = el('summary', '', 'deadline-summary');
    summary.append(el('span', selected ? `${selected.year} 投稿信息` : '投稿信息'));
    summary.append(el('strong', headline));
    details.append(summary);
    const body = el('div', '', 'deadline-body'); details.append(body);
    if (!editions.length) body.append(el('p', '本站暂无已核实的届次与投稿日期。可通过下方原目录链接进一步查询。'));
    for (const record of editions) {
      body.append(el('h4', `${record.acronym} ${record.year}`));
      body.append(el('p',record.source_kind === 'community' ? '社区整理 · 尚未经本站逐项官方核实，时间以官网为准。' : record.source_kind === 'official_snapshot' ? '官网日期快照 · 以会议官网的最新公告为准。' : '官方来源核验记录。', 'deadline-provenance'));
      if (record.conference_date) body.append(el('p', '会议日期：' + record.conference_date));
      if (record.place) body.append(el('p', '地点：' + record.place));
      const rounds = record.rounds.length ? record.rounds : [{label:'投稿日期',dates:record.dates}];
      for (const round of rounds) {
        if (record.rounds.length) body.append(el('h5', round.label && round.label !== round.comment ? round.label : '投稿说明'));
        if (Object.keys(round.dates).length) {
          const dl = el('dl');
          for (const [key,label] of Object.entries(dateLabels)) if (round.dates[key]) dl.append(el('dt',label),el('dd',round.dates[key]));
          body.append(dl);
        }
        // Only show elapsed status once it is safely past in all timezones.
        if (past(round.dates.paper)) body.append(el('p','该轮所列全文日期已过。'));
        if (round.comment) body.append(el('p',round.comment));
      }
      body.append(el('p', `时区：${record.timezone || '暂无核实信息'}`));
      const url = safeURL(record.submission?.url);
      if (url && record.submission?.status === 'linked') body.append(link('官方列出的投稿入口 ↗',url),el('p','是否开放投稿请进入官方系统查看。'));
      else body.append(el('p','投稿入口：暂无核实链接。'));
      const sources = el('p', record.source_kind === 'community' ? '参考来源：' : '官方来源：'); record.sources.forEach((url,i) => { if (i) sources.append(document.createTextNode(' · ')); sources.append(link(`来源 ${i+1} ↗`,url)); }); body.append(sources);
      body.append(el('small',`${record.source_kind === 'community' ? '社区数据获取：'+record.fetched_at : '核验时间：'+record.verified_at} · ${record.source_kind === 'official_snapshot' ? '手动核验快照' : '信息变更：' + (record.updated_at || record.verified_at || record.fetched_at)}`));
      if (record.checked_at) body.append(el('small',`最近检查：${record.checked_at}`));
      const refreshFailed = ['failed', 'stale'].includes(record.refresh_status);
      if (refreshFailed) body.append(el('p','本次刷新失败，当前为最后有效记录，请核对来源。','deadline-warning'));
      else if (record.source_kind !== 'official_snapshot' && Date.now()-Date.parse(record.verified_at || record.fetched_at)>3*86400000) body.append(el('p','距离上次成功更新已超过 3 天，当前为最后有效记录，请核对来源。','deadline-warning'));
    }
  }
  api.attach = function(card,item) {
    const details = el('details','','conference-deadlines');
    details.append(el('summary','投稿信息 · 正在加载'));
    // Links and native summary keyboard/mouse controls must never trigger card navigation.
    details.addEventListener('click',event => event.stopPropagation());
    card.insertBefore(details,card.querySelector('.item-footer'));
    ready.then(data => populate(details,item,data));
  };
  root.ConferenceDeadlines = api;
})(typeof window === 'undefined' ? globalThis : window);
