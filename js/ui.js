/* Rendering and lightweight modal helpers for the strategy-card interface. */
(function () {
  const data = window.IslandData;
  const eco = window.Ecosystem;
  const $ = (selector) => document.querySelector(selector);
  const escapeHtml = (value) => String(value == null ? '' : value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  let toastTimer;

  function showScreen(name) {
    ['start-screen', 'game-screen', 'results-screen'].forEach((id) => {
      const element = $(`#${id}`);
      if (element) element.classList.toggle('hidden', id !== name);
    });
  }

  function setText(selector, text, title) {
    const element = $(selector);
    if (!element) return;
    if (element.textContent !== String(text)) {
      element.textContent = text;
      element.classList.remove('number-pop');
      requestAnimationFrame(() => element.classList.add('number-pop'));
    }
    if (title) element.title = title;
  }

  function qualityClass(value) {
    if (value < 22) return 'critical';
    if (value < 42) return 'fragile';
    if (value < 62) return 'recovering';
    if (value < 82) return 'stable';
    return 'thriving';
  }

  function renderStatus(state) {
    const startDay = (state.turn - 1) * 5 + 1;
    const endDay = Math.min(100, state.turn * 5);
    setText('#day-label', `第 ${startDay}–${endDay} 天 · 回合 ${state.turn}/20`);
    $('#day-progress').style.width = `${Math.min(100, state.turn * 5)}%`;
    const stage = eco.getStage(state.turn);
    setText('#stage-label', stage.name);
    setText('#scene-caption', state.pendingCardUid ? '选择发光地块以执行行动。' : stage.text);
    [
      ['#metric-biodiversity', state.stats.biodiversity],
      ['#metric-stability', state.stats.stability],
      ['#metric-habitat', state.stats.habitat],
      ['#metric-food-chain', state.stats.foodChain]
    ].forEach(([selector, value]) => {
      setText(selector, eco.qualitative(value), `内部评估：${value}/100`);
      const element = $(selector);
      element.className = `quality-text ${qualityClass(value)}`;
    });
  }

  function renderForecast(state) {
    const root = $('#forecast-strip');
    const forecasts = (state.forecasts || []).slice(0, 3);
    root.innerHTML = `<div class="forecast-title"><small>危机预警</small><b>未来动向</b></div>${forecasts.map((forecast, index) => {
      const crisis = data.crises.find((item) => item.id === forecast.crisisId);
      const distance = Math.max(0, forecast.dueTurn - state.turn);
      return `<article class="forecast-card ${index === 0 ? 'next' : ''}">
        <span class="forecast-icon">${crisis.icon}</span>
        <div><small>${distance === 0 ? '本回合结算' : `${distance} 回合后`}</small><strong>${escapeHtml(crisis.name)}</strong><p>${escapeHtml(crisis.intent)}</p></div>
        <span class="forecast-help" title="应对：${escapeHtml(crisis.counter)}">?</span>
      </article>`;
    }).join('')}`;
  }

  function speciesForTile(state, tile) {
    const ids = [];
    if (tile.terrain === 'meadow') ids.push('grass');
    if (tile.terrain === 'shrub') ids.push('shrubs');
    if (tile.terrain === 'forest') ids.push('trees', 'songbird');
    if (tile.terrain === 'wetland') ids.push('aquatic', 'dragonfly', 'frog');
    if (tile.terrain === 'coast') ids.push('waterbird');
    if (state.introduced.rabbit === tile.id) ids.push('rabbit');
    if (state.introduced.fox === tile.id) ids.push('fox');
    if (tile.traits.includes('old_tree')) ids.push('owl');
    return ids.filter((id) => state.species[id] >= 8).slice(-3).map((id) => data.species.find((item) => item.id === id).icon).join('');
  }

  function renderIsland(state, game) {
    const root = $('#island-world');
    const pending = game && game.pendingCardUid ? game.getInstanceCard(game.pendingCardUid) : null;
    const validIds = pending ? eco.validTargets(state, pending) : [];
    state.pendingCardUid = game ? game.pendingCardUid : null;
    root.className = `island-world strategy-board${pending ? ' targeting' : ''}`;
    root.setAttribute('aria-label', '七块相连的岛屿生态地块');
    root.innerHTML = `<div class="board-water water-a"></div><div class="board-water water-b"></div><div class="habitat-board">${state.tiles.map((tile) => {
      const terrain = data.terrainMeta[tile.terrain];
      const traits = tile.traits.map((trait) => `<span title="${escapeHtml(data.traitMeta[trait].name)}">${data.traitMeta[trait].icon}</span>`).join('');
      const project = tile.project ? `<span class="tile-project"><i></i>${escapeHtml(tile.project.name)} · ${tile.project.remaining}回合</span>` : '';
      const indicators = `${tile.pollution ? `<span class="tile-warning pollution" title="污染 ${tile.pollution}层">☣${tile.pollution}</span>` : ''}${tile.stress ? `<span class="tile-warning stress" title="生态压力 ${tile.stress}层">!${tile.stress}</span>` : ''}`;
      const valid = validIds.includes(tile.id);
      return `<button class="habitat-tile tile-${tile.id} terrain-${tile.terrain}${valid ? ' target-valid' : ''}${tile.project ? ' has-project' : ''}" data-tile-id="${tile.id}" ${pending && !valid ? 'aria-disabled="true"' : ''} style="--tile-color:${terrain.color}" title="${escapeHtml(terrain.hint)}">
        <span class="tile-top"><b>${terrain.icon} ${terrain.name}</b><small>${tile.maturity ? `阶段 ${tile.maturity}/3` : '尚未恢复'}</small></span>
        <span class="tile-life">${speciesForTile(state, tile)}</span>
        <span class="tile-traits">${traits}</span>${indicators}${project}
      </button>`;
    }).join('')}</div>`;
    const cancel = $('#cancel-target-button');
    cancel.classList.toggle('hidden', !pending);
    if (pending) cancel.textContent = `取消「${pending.title}」选址`;
    $('#island-legend').innerHTML = `<span><i class="legend-dot project"></i>工程会跨回合推进</span><span><i class="legend-dot pressure"></i>污染与压力会削弱生境</span><span><i class="legend-dot target"></i>发光地块可选</span>`;
  }

  function renderSidebar(state) {
    const root = $('#habitat-bars');
    const terrainOrder = ['stream', 'meadow', 'shrub', 'forest', 'wetland', 'coast'];
    root.innerHTML = terrainOrder.map((terrain) => {
      const meta = data.terrainMeta[terrain];
      const tiles = state.tiles.filter((tile) => tile.terrain === terrain);
      const maturity = tiles.length ? Math.round(tiles.reduce((sum, tile) => sum + tile.maturity, 0) / tiles.length) : 0;
      const condition = !tiles.length ? '缺失' : tiles.some((tile) => tile.stress || tile.pollution > 1) ? '承压' : maturity >= 3 ? '成熟' : maturity >= 2 ? '成长' : '幼年';
      return `<div class="habitat-row"><span class="habitat-symbol" style="background:${meta.color}">${meta.icon}</span><div><b>${meta.name}</b><small>${tiles.length} 块 · ${condition}</small></div><i class="habitat-pips">${[1, 2, 3].map((level) => `<em class="${maturity >= level ? 'on' : ''}"></em>`).join('')}</i></div>`;
    }).join('');

    const preview = eco.getMilestonePreview(state);
    $('#strategy-card').innerHTML = preview ? `<div class="card-heading"><div><p class="kicker">阶段目标 · 第${preview.day}天</p><h2>${escapeHtml(preview.name)}</h2></div><span>${preview.success ? '已就绪' : '规划中'}</span></div><p>${escapeHtml(preview.description)}</p><div class="milestone-mini">${preview.checks.map((check) => `<span class="${check.ok ? 'done' : ''}">${check.ok ? '✓' : '○'} ${escapeHtml(check.label)}</span>`).join('')}</div>` : `<p class="kicker">最终目标</p><h2>让岛屿能自己运转</h2><p>剩余回合用于补强最脆弱的生态结构。</p>`;

    const networks = state.activeNetworks.map((id) => data.comboMeta[id]);
    $('#insight-card').innerHTML = `<p class="kicker">现场记录</p><h2>${escapeHtml(state.lastLog.title)}</h2><p>${escapeHtml(state.lastLog.text)}</p>${networks.length ? `<div class="network-chips">${networks.map((network) => `<span title="${escapeHtml(network.text)}">${network.icon} ${network.name}</span>`).join('')}</div>` : '<small class="no-network">尚未形成稳定生态结构。卡牌之间的空间关系比单项数值更重要。</small>'}`;
  }

  function renderCards(state, game) {
    const root = $('#action-cards');
    const cards = game.getHandCards();
    root.innerHTML = cards.map(({ instance, card }, index) => {
      const canAfford = state.energy.current >= card.cost;
      const targets = card.target ? eco.validTargets(state, card).length : 1;
      const unplayable = !canAfford || targets === 0 || game.busy;
      const selected = game.pendingCardUid === instance.uid;
      const targetText = card.target ? `${targets} 个可选地块` : card.action === 'policy' ? '持续生效' : card.action === 'status' ? '打出后移除' : '立即行动';
      return `<article class="action-card ${card.type === '负面' ? 'status-card' : ''} ${selected ? 'selected' : ''} ${unplayable ? 'unplayable' : ''}" data-card-uid="${instance.uid}" data-card-index="${index}" tabindex="0" role="button" aria-label="向上拖动使用${escapeHtml(card.title)}">
        <div class="card-cost">${card.cost}</div><div class="card-rarity">${escapeHtml(card.rarity)}</div>
        <div class="card-art"><span>${card.icon}</span><i></i></div>
        <div class="card-copy"><small>${escapeHtml(card.type)}${card.upgraded ? ' · 已升级' : ''}</small><h3>${escapeHtml(card.title)}</h3><p>${escapeHtml(card.text)}</p></div>
        <div class="card-target-hint">${card.target ? '⌖' : '◇'} ${escapeHtml(targetText)}</div>
        <div class="drag-instruction"><span>↑</span> 向上拖动</div>
      </article>`;
    }).join('') || '<div class="empty-hand">手牌已空。你仍可提前结束本回合。</div>';
    setText('#energy-current', state.energy.current);
    setText('#energy-max', state.energy.max);
    setText('#draw-count', state.deck.drawPile.length);
    setText('#discard-count', state.deck.discardPile.length);
    $('#end-day-button').disabled = game.busy;
  }

  function render(state, game) {
    eco.derive(state);
    renderStatus(state);
    renderForecast(state);
    renderIsland(state, game);
    renderSidebar(state);
    renderCards(state, game);
  }

  function toast(message) {
    const element = $('#toast');
    clearTimeout(toastTimer);
    element.textContent = message;
    element.classList.add('show');
    toastTimer = setTimeout(() => element.classList.remove('show'), 2600);
  }

  function openModal(content, className) {
    const root = $('#modal-root');
    root.innerHTML = `<div class="modal-backdrop"><section class="modal-card ${className || ''}">${content}</section></div>`;
    root.classList.add('open');
  }
  function closeModal() { const root = $('#modal-root'); root.classList.remove('open'); root.innerHTML = ''; }

  function infoModal(title, body, buttonText) {
    return new Promise((resolve) => {
      openModal(`<button class="modal-close" data-modal-close aria-label="关闭">×</button><h2>${title}</h2>${body}<button class="button primary modal-confirm" data-modal-confirm>${buttonText || '继续'}</button>`, 'info-modal');
      const finish = () => { closeModal(); resolve(); };
      $('[data-modal-confirm]').addEventListener('click', finish);
      $('[data-modal-close]').addEventListener('click', finish);
    });
  }

  function openGuide() {
    openModal(`<button class="modal-close" data-modal-close aria-label="关闭">×</button><p class="kicker">新核心玩法</p><h2>不是把四个数字堆满</h2>
      <div class="guide-grid">
        <article><b>1 · 看预警</b><p>未来三次危机始终公开。每轮代表5天，你要决定是发展，还是提前防灾。</p></article>
        <article><b>2 · 经营七块土地</b><p>工程需要时间，而且会占用有限地块。草地改成森林后，兔群也可能失去食物。</p></article>
        <article><b>3 · 拼生态结构</b><p>“溪流旁的水草湿地”才会形成湿地复苏；单独增加某个数值没有 Combo。</p></article>
        <article><b>4 · 管理牌库污染</b><p>危机失败会加入负面牌，挤占手牌并持续伤害生境。用治理牌移除它们。</p></article>
      </div><div class="guide-callout">操作仍然是：把卡牌向上拖动释放。需要地块的牌会进入选址状态，再点击发光地块。</div>`, 'wide-modal');
    $('[data-modal-close]').addEventListener('click', closeModal);
  }

  function openCodex(state) {
    const species = state ? data.species : data.species.slice(0, 5);
    openModal(`<button class="modal-close" data-modal-close aria-label="关闭">×</button><p class="kicker">生态图鉴</p><h2>岛屿居民</h2><div class="codex-grid">${species.map((item) => {
      const population = state ? state.species[item.id] : 0;
      const seen = !state || population >= 8;
      return `<article class="codex-item ${seen ? '' : 'locked'}"><span>${seen ? item.icon : '？'}</span><div><b>${seen ? item.name : '尚未发现'}</b><small>${seen ? item.category : '需要合适的栖息结构'}</small><p>${seen ? item.role : '继续恢复岛屿以发现线索。'}</p></div></article>`;
    }).join('')}</div>`, 'wide-modal');
    $('[data-modal-close]').addEventListener('click', closeModal);
  }

  function openNetwork(state) {
    if (!state) { openGuide(); return; }
    openModal(`<button class="modal-close" data-modal-close aria-label="关闭">×</button><p class="kicker">结构性 Combo</p><h2>生态网络</h2><p class="modal-lead">网络来自真实地块关系。形成后会改写危机判定与物种定居。</p><div class="combo-library">${Object.entries(data.comboMeta).map(([id, combo]) => {
      const active = state.activeNetworks.includes(id);
      const discovered = state.discoveredNetworks.includes(id);
      return `<article class="${active ? 'active' : discovered ? 'discovered' : ''}"><span>${combo.icon}</span><div><b>${combo.name}${active ? ' · 生效中' : discovered ? ' · 曾形成' : ''}</b><p>${combo.text}</p></div></article>`;
    }).join('')}</div>`, 'wide-modal');
    $('[data-modal-close]').addEventListener('click', closeModal);
  }

  function showTileDetails(state, tileId) {
    const tile = eco.tileById(state, tileId);
    const meta = data.terrainMeta[tile.terrain];
    const neighborsText = eco.neighbors(state, tile.id).map((item) => data.terrainMeta[item.terrain].name).join('、');
    const traits = tile.traits.length ? tile.traits.map((id) => `${data.traitMeta[id].icon}${data.traitMeta[id].name}`).join('、') : '暂无营造设施';
    openModal(`<button class="modal-close" data-modal-close aria-label="关闭">×</button><div class="tile-detail-title"><span>${meta.icon}</span><div><p class="kicker">地块 ${tile.id + 1}</p><h2>${meta.name}</h2></div></div><p>${meta.hint}</p><div class="tile-detail-grid"><span><small>成熟阶段</small><b>${tile.maturity}/3</b></span><span><small>污染</small><b>${tile.pollution}层</b></span><span><small>压力</small><b>${tile.stress}层</b></span></div><p><b>相邻：</b>${neighborsText}</p><p><b>结构：</b>${traits}</p>${tile.project ? `<div class="guide-callout">${tile.project.name}还有 ${tile.project.remaining} 回合完成。</div>` : ''}`, 'tile-modal');
    $('[data-modal-close]').addEventListener('click', closeModal);
  }

  function chooseCards(title, subtitle, cards, mode) {
    return new Promise((resolve) => {
      openModal(`<p class="kicker">${mode === 'upgrade' ? '牌组升级' : '阶段奖励'}</p><h2>${escapeHtml(title)}</h2><p class="modal-lead">${escapeHtml(subtitle)}</p><div class="reward-grid">${cards.map((card) => `<button class="reward-card ${card.type === '负面' ? 'status-card' : ''}" data-choice="${card.id}"><span class="reward-icon">${card.icon}</span><small>${escapeHtml(card.rarity)} · ${escapeHtml(card.type)}</small><b>${escapeHtml(card.title)}${mode === 'upgrade' ? ' → +' : ''}</b><p>${escapeHtml(mode === 'upgrade' && card.upgrade && card.upgrade.text ? card.upgrade.text : card.text)}</p><em>${mode === 'upgrade' ? '升级此牌的所有副本' : `${card.cost} 能量`}</em></button>`).join('')}</div>${mode === 'reward' ? '<button class="button ghost reward-skip" data-skip>跳过，获得下回合 +1 能量</button>' : ''}`, 'wide-modal reward-modal');
      document.querySelectorAll('[data-choice]').forEach((button) => button.addEventListener('click', () => { const choice = button.dataset.choice; closeModal(); resolve(choice); }));
      const skip = $('[data-skip]');
      if (skip) skip.addEventListener('click', () => { closeModal(); resolve(null); });
    });
  }

  function showReward(cards) { return chooseCards('选择一张加入牌组', '不是所有好牌都该拿：更厚的牌组会降低抽到关键牌的概率。', cards, 'reward'); }
  function showUpgrade(cards) { return chooseCards('强化一项长期方案', '升级会作用于牌组内该牌的全部副本。', cards, 'upgrade'); }

  function showCrisis(crisis, result) {
    const body = `<div class="crisis-result ${result.success ? 'success' : 'failure'}"><span>${crisis.icon}</span><b>${result.success ? '结构经受住了考验' : '岛屿付出了代价'}</b></div><p>${escapeHtml(result.text)}</p>${result.statusIds.length ? `<div class="status-warning">负面牌加入弃牌堆：${result.statusIds.map((id) => data.cards.find((card) => card.id === id).title).join(' × ')}</div>` : ''}<div class="guide-callout"><b>原预警：</b>${escapeHtml(crisis.intent)}<br><b>应对思路：</b>${escapeHtml(crisis.counter)}</div>`;
    return infoModal(`${crisis.name} · ${result.success ? '成功化解' : '防御失败'}`, body, '查看下一轮');
  }

  function showMilestone(result) {
    const body = `<p>${escapeHtml(result.description)}</p><div class="milestone-result-list">${result.checks.map((check) => `<span class="${check.ok ? 'done' : 'miss'}">${check.ok ? '✓' : '×'} ${escapeHtml(check.label)}</span>`).join('')}</div><div class="guide-callout">${result.success ? '目标达成：获得一次卡牌升级机会。' : '目标未完全达成：仍可继续，但最终韧性评价会受影响。'}</div>`;
    return infoModal(`${result.name} · ${result.success ? '达成' : '未完成'}`, body, '继续经营');
  }

  function flashNetwork(ids) {
    if (!ids || !ids.length) return;
    const root = $('#combo-banner');
    root.innerHTML = ids.map((id) => { const combo = data.comboMeta[id]; return `<span>${combo.icon}</span><div><small>新生态结构形成</small><b>${combo.name}</b><p>${combo.text}</p></div>`; }).join('');
    root.classList.add('show');
    setTimeout(() => root.classList.remove('show'), 3300);
  }

  function playCardAnimation(uid) {
    return new Promise((resolve) => {
      const card = document.querySelector(`[data-card-uid="${uid}"]`);
      if (!card) { resolve(); return; }
      const rect = card.getBoundingClientRect();
      const clone = card.cloneNode(true);
      clone.className = `${card.className} playing-clone`;
      Object.assign(clone.style, { position: 'fixed', left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, margin: '0', zIndex: 3000, pointerEvents: 'none' });
      document.body.appendChild(clone);
      card.style.opacity = '0';
      requestAnimationFrame(() => clone.classList.add('release-flight'));
      setTimeout(() => { clone.remove(); resolve(); }, 380);
    });
  }

  function renderResults(state, onRestart) {
    const score = eco.finalScore(state);
    const grade = score >= 82 ? '共生之岛' : score >= 66 ? '韧性群岛' : score >= 48 ? '恢复中的岛' : '脆弱的新生';
    const discovered = eco.getDiscovered(state);
    const successRate = state.crisesHandled ? Math.round(state.crisesSucceeded / state.crisesHandled * 100) : 0;
    const root = $('#results-screen');
    root.innerHTML = `<div class="results-wrap"><p class="eyebrow">100 DAYS LATER</p><h1>${grade}</h1><p class="results-lead">这次评价来自你建立的生态结构、危机应对与牌库健康度，而不是四个数字是否全满。</p><div class="score-ring"><strong>${score}</strong><small>综合韧性</small></div><div class="result-stats"><span><b>${state.activeNetworks.length}</b><small>生效结构</small></span><span><b>${discovered.length}</b><small>定居物种</small></span><span><b>${successRate}%</b><small>危机化解率</small></span><span><b>${eco.statusCount(state)}</b><small>残留负面牌</small></span></div><div class="result-networks">${state.discoveredNetworks.length ? state.discoveredNetworks.map((id) => `<span>${data.comboMeta[id].icon} ${data.comboMeta[id].name}</span>`).join('') : '<span>本次没有形成完整结构，下一局尝试让地块相互连接。</span>'}</div><button class="button primary large" id="result-restart">重新规划一座岛 <span>↻</span></button></div>`;
    showScreen('results-screen');
    $('#result-restart').addEventListener('click', onRestart);
  }

  window.IslandUI = {
    showScreen, render, toast, closeModal, openGuide, openCodex, openNetwork, showTileDetails,
    showReward, showUpgrade, showCrisis, showMilestone, flashNetwork, playCardAnimation, renderResults
  };
})();
