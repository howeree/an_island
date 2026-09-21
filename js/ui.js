/* Compact expedition UI. Card previews always use the same rules as actual play. */
(function () {
  const E = window.Ecosystem, D = window.IslandData;
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  let toastTimer, comboTimer, focusBefore;
  const routeLabel = r => ({ water: '水系', meadow: '草系', forest: '林系', neutral: '通用' }[r]);
  function showScreen(id) { document.querySelectorAll('.screen').forEach(el => el.classList.toggle('hidden', el.id !== id)); }
  function toast(text) { $('#toast').textContent = text; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3000); }
  function isModalOpen() { return $('#modal-root').classList.contains('open'); }
  function closeModal() { $('#modal-root').classList.remove('open'); $('#modal-root').innerHTML = ''; focusBefore?.focus?.(); }
  function modal(html, closable = true) {
    if (!isModalOpen()) focusBefore = document.activeElement;
    $('#modal-root').innerHTML = '<section class="modal-card" role="dialog" aria-modal="true" aria-label="远征面板">' + (closable ? '<button class="modal-close button small" data-action="close-modal" aria-label="关闭">×</button>' : '') + html + '</section>';
    $('#modal-root').classList.add('open');
    $('#modal-root button')?.focus();
  }
  document.addEventListener('keydown', event => {
    if (event.key !== 'Tab' || !isModalOpen()) return;
    const nodes = [...$('#modal-root').querySelectorAll('button:not(:disabled),[tabindex="0"]')];
    const first = nodes[0], last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });
  function cardHTML(c, s, uid) {
    const p = E.previewCard(s, c);
    const unavailable = s.energy < c.cost || (c.hurt && s.hp <= c.hurt);
    const retained = uid && s.retained === uid;
    return '<article class="action-card route-' + c.route + (p.combo ? ' combo-ready' : '') + (unavailable ? ' unplayable' : '') + (retained ? ' retained' : '') + '" ' +
      (uid ? 'data-card-uid="' + uid + '" tabindex="0" role="button" aria-label="向上拖动使用' + esc(c.title) + '" data-unavailable="' + !!unavailable + '"' : '') + '>' +
      '<div class="card-top"><span class="card-cost">' + c.cost + '⚡</span><small>' + routeLabel(c.route) + (c.upgraded ? ' · 强化' : '') + '</small></div>' +
      '<div class="card-art"><span>' + c.icon + '</span><i>' + (c.build ? '生境建设' : p.combo ? '连携就绪' : '生态行动') + '</i></div>' +
      '<h3>' + esc(c.title) + (c.upgraded ? '+' : '') + '</h3>' +
      '<div class="card-effect"><small>现在打出' + (p.combo ? ' · 含连携' : '') + '</small><b>' + esc(E.effectText(p)) + '</b></div>' +
      '<p class="card-description">' + esc(c.text) + '</p>' +
      (uid ? '<button class="keep-button" data-keep="' + uid + '" aria-pressed="' + !!retained + '">' + (retained ? '✓ 已留到明天' : '◇ 留到明天') + '</button><div class="drag-instruction">' + (unavailable ? '暂缺行动力或生命' : '↑ 向上拖动使用') + '</div>' : '') + '</article>';
  }
  function render(s, game) {
    showScreen('game-screen');
    $('#day-label').textContent = '第 ' + s.day + ' / 30 天';
    $('#act-label').textContent = ['第一幕 · 扎下根系', '第二幕 · 构建共生', '第三幕 · 守过风暴'][Math.floor((s.day - 1) / 10)];
    $('#day-progress').style.width = (s.day / 30 * 100) + '%';
    $('#hp-value').textContent = s.hp + ' / ' + s.maxHp;
    $('#hp-fill').style.width = (s.hp / s.maxHp * 100) + '%';
    $('#block-value').textContent = s.block;
    $('#seeds-value').textContent = s.seeds + ' / 12';
    $('#research-value').textContent = s.research + ' / 24';
    $('#energy-value').textContent = s.energy;
    const threat = s.forecasts[s.day - 1], d = E.defense(s);
    $('#forecast-strip').innerHTML = '<article class="tonight route-' + threat.route + '"><span>' + threat.icon + '</span><div><small>' + (threat.boss ? '阶段大考验 · 今晚' : '今晚') + ' · ' + routeLabel(threat.route) + '</small><h2>' + threat.name + '</h2></div><b>' + threat.attack + '<small>冲击</small></b></article>' +
      '<div class="upcoming">' + s.forecasts.slice(s.day, s.day + 2).map(t => '<span>第' + t.day + '天 · ' + t.icon + t.name + ' <b>' + t.attack + '</b></span>').join('') + '</div>';
    $('#defense-preview').innerHTML = '<div class="damage-math ' + (d.damage ? 'danger' : 'safe') + '"><span>冲击 ' + d.attack + ' − 生境抵抗 ' + d.habitat + ' − 护盾 ' + d.block + '</span><strong>' + (d.damage ? '今晚损失 ' + d.damage + ' 生命' : '今晚平安') + '</strong></div>';
    const o = E.objectives(s);
    const boss = s.forecasts.find(t => t.boss && t.day >= s.day);
    $('#objective-strip').innerHTML = '<strong>第30天胜利条件 <small>大考验：第' + boss.day + '天 · ' + routeLabel(boss.route) + boss.attack + '冲击</small></strong><span class="' + (o.networks >= 2 ? 'done' : '') + '">' + (o.networks >= 2 ? '✓' : '○') + ' 两种生境达到2级 · ' + o.networks + '/2</span><span class="' + (s.research >= 24 ? 'done' : '') + '">' + (s.research >= 24 ? '✓' : '○') + ' 研究达到24 · ' + Math.min(24, s.research) + '/24</span><span>○ 坚持到第30天，生命大于0</span>';
    $('#habitat-bars').innerHTML = ['water', 'meadow', 'forest'].map(r => '<article class="habitat route-' + r + '"><div><b>' + D.routes[r].icon + ' ' + D.routes[r].name + '</b><span>' + s.habitats[r] + '/3级</span></div><div class="habitat-pips">' + [1,2,3].map(n => '<i class="' + (s.habitats[r] >= n ? 'on' : '') + '"></i>').join('') + '</div><p>' + D.routes[r].benefit + '</p></article>').join('');
    const foliage = s.habitats.forest, grass = s.habitats.meadow, water = s.habitats.water;
    $('#island-world').innerHTML = '<div class="scene-sun"></div><div class="scene-cloud"></div><div class="scene-island"></div><div class="scene-river"></div><div class="scene-forest">' + (foliage ? '🌲'.repeat(foliage) + '🌳' : '🌱') + '</div><div class="scene-meadow">' + (grass ? '🌾'.repeat(grass) + '🌼' : '🌱') + '</div><div class="scene-water">' + (water ? '🪷'.repeat(water) : '〰') + '</div><div class="scene-animals">' + (grass >= 2 ? '🐝 ' : '') + (foliage >= 2 ? '🦊 ' : '') + (water >= 2 ? '🐸' : '') + '</div><span class="scene-caption">' + (o.networks ? o.networks + ' 条生态网络已经开始运转' : '从种子开始，让生境持续回报') + '</span>';
    const next = E.nextRoute[s.lastRoute];
    $('#combo-strip').innerHTML = '<span class="chain-label">生态连携</span><b class="' + (next === 'water' ? 'next' : '') + '">💧 水</b><span>→</span><b class="' + (next === 'meadow' ? 'next' : '') + '">🌼 草</b><span>→</span><b class="' + (next === 'forest' ? 'next' : '') + '">🌲 林</b><span>→ 💧</span><small>' + (next ? '接' + routeLabel(next) + '：额外护盾+3、研究+1' : '任意一系起手，顺序相接：护盾+3、研究+1') + ' · 通用牌不断链</small>';
    $('#action-cards').innerHTML = game.getHandCards().map(({ instance, card }) => cardHTML(card, s, instance.uid)).join('') || '<div class="empty-hand">今日手牌已用完。可以巡护，或留1行动力给明天。</div>';
    $('#deck-counts').textContent = '抽牌 ' + s.deck.draw.length + ' · 弃牌 ' + s.deck.discard.length + ' · 今日已用 ' + s.deck.played.length + ' · 牌组 ' + Object.values(s.deck).flat().length;
    $('#daily-hint').textContent = s.day === 1 ? '第一天可试：雨水 → 传粉调查 → 本地苗圃，体验两次连携。' : '明天恢复3行动力，最多额外保留1点；手牌补至5张。';
    $('#last-log').textContent = s.lastLog;
    $('#guard-button').disabled = s.energy < 1;
    $('#swap-button').disabled = s.energy < 1 || s.swapped || !s.deck.hand.length;
    $('#swap-button').textContent = s.swapped ? '今天已换牌' : '换牌 · 1⚡';
    $('#end-day-button').textContent = d.damage ? '结束 · −' + d.damage + '生命' : '结束今天 →';
    $('#end-day-button').classList.toggle('risky', d.damage > 0);
  }
  function openGuide() {
    modal('<p class="eyebrow">30 DAYS / THREE CHAPTERS</p><h2>每张牌都在为明天做准备</h2><div class="guide-grid">' +
      '<article><b>01 · 看今晚</b><p>冲击减去对应生境抵抗与护盾，剩下的扣生命。可以承受少量伤害，换取永久建设。</p></article>' +
      '<article><b>02 · 排出连携</b><p>水 → 草 → 林 → 水。每接对一次，额外护盾+3、研究+1。通用牌不断链，次日重新开始。</p></article>' +
      '<article><b>03 · 建设会回报</b><p>建设花2种子，立即升1级；没有种子也能打，改为收集种子。每种生境最多3级，互不覆盖。</p></article>' +
      '<article><b>04 · 整理手牌</b><p>每天3行动力，最多留1点到明天；勾选一张牌留到明天。1行动力可换牌一次，也可直接巡护获得3护盾。</p></article>' +
      '<article><b>05 · 营地四选一</b><p>每5天，选一张新卡、强化一种卡、移除一张卡或恢复10生命。不是所有新卡都值得拿。</p></article>' +
      '<article><b>06 · 明确的胜负</b><p>第30天生命大于0、两种生境至少2级、研究至少24，就胜利。生命归零立即失败。阶段考验发生在10/20/30天。</p></article></div>' +
      '<div class="guide-grid habitat-guide">' + ['water', 'meadow', 'forest'].map(r => '<article><b>' + D.routes[r].icon + ' ' + D.routes[r].name + '</b><p>' + D.routes[r].benefit + '</p></article>').join('') + '</div><p class="modal-note">第一局可以先尝试：收集雨水 → 传粉调查 → 本地苗圃。卡牌上“现在打出”已经包含连携收益，手牌上限7张。存档保存在当前浏览器，旧版远征不兼容。</p><button class="button primary" data-action="close-modal">开始规划</button>');
  }
  function openDeck(s) {
    if (!s) { openGuide(); return; }
    const counts = {};
    Object.values(s.deck).flat().forEach(c => counts[c.cardId] = (counts[c.cardId] || 0) + 1);
    modal('<p class="eyebrow">DECK / ' + Object.values(counts).reduce((a,b) => a+b,0) + ' CARDS</p><h2>你的行动方案</h2><p>今天用过的牌会暂时离开抽牌循环，明天才进入弃牌堆；抽牌堆耗尽后洗入弃牌堆。</p><div class="deck-list">' + Object.entries(counts).map(([id,n]) => {
      const c = E.getCard(id,s);
      return '<article><b>' + c.icon + ' ' + c.title + (c.upgraded ? '+' : '') + ' ×' + n + '</b><small>' + c.cost + '行动力 · ' + routeLabel(c.route) + '</small><p>' + esc(c.upgraded ? E.effectText(E.previewCard({ ...s, lastRoute: null }, c)) : c.text) + '</p></article>';
    }).join('') + '</div>');
  }
  function openCamp(s, options) {
    modal('<p class="eyebrow">CAMP / DAY ' + (s.day - 1) + '</p><h2>稍作停留，调整方向</h2><p>只选一项。下个白天是第' + s.day + '天；当前生命 ' + s.hp + '/' + s.maxHp + '。</p><div class="reward-grid">' + options.map(id => {
      const c = E.getCard(id, s);
      return '<button class="reward-card route-' + c.route + '" data-reward="add" data-id="' + id + '"><span>' + c.icon + '</span><small>加入一张 · ' + c.cost + '⚡ · ' + routeLabel(c.route) + '</small><b>' + c.title + '</b><p>' + c.text + '</p></button>';
    }).join('') + '</div><div class="camp-alternatives"><button class="button" data-action="camp-upgrade">强化一种已有牌</button><button class="button" data-action="camp-remove">移除一张牌</button><button class="button" data-reward="rest">休整 · 恢复10生命</button></div><small>强化作用于同名牌的所有副本。精简牌组会提高抽到核心卡的概率。</small>', false);
  }
  function openCampList(s, mode) {
    const all = Object.values(s.deck).flat();
    const list = mode === 'upgrade' ? [...new Set(all.map(c => c.cardId))].filter(id => !s.upgrades[id]).map(id => ({ cardId: id, uid: id })) : all;
    modal('<h2>' + (mode === 'upgrade' ? '强化一种方案' : '移除一张方案') + '</h2><p>' + (mode === 'upgrade' ? '同名副本一起升级。以下显示强化后的实际效果。' : '牌组至少保留6张，三种建设牌建议保留。') + '</p><div class="camp-list">' + list.map(item => {
      const c = E.getCard(item.cardId, s), upgraded = { ...c, ...c.upgrade };
      const preview = E.previewCard({ ...s, lastRoute: null }, upgraded);
      const protectedCard = mode === 'remove' && !E.canRemove(s, item.uid);
      return '<button class="button" data-reward="' + mode + '" data-id="' + item.uid + '"' + (protectedCard ? ' disabled' : '') + '><b>' + c.icon + ' ' + c.title + '</b><span>' + (protectedCard ? '暂不可移除：保留关键建设牌及至少6张牌' : mode === 'upgrade' ? upgraded.cost + '⚡ · ' + esc(E.effectText(preview)) : c.cost + '⚡ · ' + esc(c.text)) + '</span></button>';
    }).join('') + '</div><button class="button" data-action="camp-back">← 返回营地</button>', false);
  }
  function confirmNew() { modal('<h2>重新开始远征？</h2><p>当前存档将被新远征替换。</p><button class="button primary" data-action="confirm-new">重新开始</button> <button class="button" data-action="close-modal">继续当前远征</button>'); }
  function playCardAnimation(uid) {
    const c = document.querySelector('[data-card-uid="' + uid + '"]');
    if (!c) return Promise.resolve();
    c.classList.add('card-played');
    return new Promise(resolve => setTimeout(resolve, 180));
  }
  function flashCombo() { $('#combo-banner').classList.add('visible'); clearTimeout(comboTimer); comboTimer = setTimeout(() => $('#combo-banner').classList.remove('visible'), 1300); }
  function renderResults(s) {
    const o = E.objectives(s), won = s.status === 'won';
    $('#results-screen').innerHTML = '<div class="results-wrap"><p class="eyebrow">EXPEDITION / ' + s.seed + '</p><span class="result-icon">' + (won ? '🌳' : '🌱') + '</span><h1>' + (won ? '岛屿，学会了共生' : s.status === 'lost' ? '这次远征止步于第' + s.day + '天' : '守住了岛屿，复苏尚未完成') + '</h1><p>' + (won ? '你的牌组经受住了三次考验，持续成长的生态网络留了下来。' : s.status === 'lost' ? '生命归零。下次可以更早建设对应生境，并在大考验前保留防御牌。' : '还欠缺：' + (o.networks < 2 ? '两种2级生境；' : '') + (s.research < 24 ? '24点研究。' : '')) + '</p><div class="result-stats"><article><b>' + s.hp + '</b><small>剩余生命</small></article><article><b>' + o.networks + '/2</b><small>生态网络</small></article><article><b>' + s.research + '/24</b><small>研究成果</small></article><article><b>' + s.combos + '</b><small>触发连携</small></article></div><details><summary>查看每晚记录</summary><div class="history-list">' + s.history.map(h => '<span>第' + h.day + '天 · ' + h.name + ' · ' + (h.damage ? '损失' + h.damage + '生命' : '平安') + '</span>').join('') + '</div></details><button class="button primary" data-action="confirm-new">再规划一座岛 →</button><button class="button" data-action="deck">回顾牌组</button></div>';
    showScreen('results-screen');
  }
  window.IslandUI = { showScreen, render, toast, isModalOpen, closeModal, openGuide, openDeck, openCamp, openCampList, confirmNew, playCardAnimation, flashCombo, renderResults };
})();
