/* Official CFP snapshot is isolated from the CCF ranking catalogue. */
(async () => {
  const host = document.querySelector('main .container') || document.querySelector('main');
  if (!host) return;
  const panel = document.createElement('section');
  panel.className = 'conference-update'; panel.setAttribute('aria-label', '会议最新投稿信息');
  const el = (tag, text) => { const e = document.createElement(tag); e.textContent = text; return e; };
  const link = (label, href) => {
    const e = el('a', label); e.href = href; e.target = '_blank'; e.rel = 'noopener noreferrer'; return e;
  };
  try {
    const response = await fetch('public/data/hpdc-2027.json', {cache: 'no-cache'});
    if (!response.ok) throw new Error('snapshot unavailable');
    const snapshot = await response.json(), data = snapshot.data;
    if (snapshot.schema_version !== 1 || data.conference !== 'HPDC' || data.year !== 2027) throw new Error('schema');
    panel.append(el('h2', 'HPDC 2027 · 官方投稿信息'));
    const grid = el('div', ''); grid.className = 'conference-update-dates';
    for (const [key, label] of [['abstract','摘要注册'], ['paper','全文投稿'], ['notification','录用通知']]) {
      if (!/^2027-\d{2}-\d{2}$/.test(data.dates[key])) throw new Error('date');
      const cell = el('div', ''); cell.append(el('span', label), el('strong', data.dates[key])); grid.append(cell);
    }
    panel.append(grid, el('p', '截止时区：AoE（UTC−12）。日期与要求以官方 CFP 为准。'));
    if (data.submission.status === 'linked' && /^https:\/\/hpdc27\.hotcrp\.com(?:\/[^\s]*)?$/.test(data.submission.url || '')) {
      panel.append(link('官方给出的投稿入口 ↗', data.submission.url), el('p', '已发现官方入口链接；是否开放投稿请进入系统查看。'));
    } else panel.append(el('p', '投稿入口：本次核验的官方页面中未找到明确链接。'));
    const sources = el('p', '来源：');
    sources.append(link('官方 CFP ↗', 'https://hpdc.sci.utah.edu/2027/calls-cfp.html'), document.createTextNode(' · '), link('会议主页 ↗', 'https://hpdc.sci.utah.edu/2027/'));
    panel.append(sources);
    const format = value => { const d = new Date(value); return Number.isFinite(+d) ? d.toISOString().replace('T', ' ').replace('.000Z', ' UTC') : '未知'; };
    const stale = Date.now() - Date.parse(snapshot.verified_at) > 3 * 86400000;
    panel.append(el('small', `信息变更：${format(snapshot.updated_at)} · 最后核验：${format(snapshot.verified_at)} · 最近检查：${format(snapshot.checked_at)}`));
    if (snapshot.refresh_status !== 'ok' || stale) {
      panel.append(el('p', '最近刷新失败或核验已超过 3 天，当前展示最后有效记录，请核对官方来源。'));
      panel.classList.add('is-stale');
    }
  } catch (_) {
    panel.replaceChildren(el('h2', '会议最新投稿信息'), el('p', '暂时无法加载会议快照。'), link('查看 HPDC 2027 官方 CFP ↗', 'https://hpdc.sci.utah.edu/2027/calls-cfp.html'));
  }
  host.prepend(panel);
})();
