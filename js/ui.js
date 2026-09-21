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
    setText('#day-label', `第 ${state.day} / 100 天`);
    $('#day-progress').style.width = `${Math.min(100, state.day)}%`;
    const stage = eco.getStage(state.turn);
    setText('#stage-label', stage.name);
    setText('#scene-caption', stage.text);
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
        <div><small>${distance === 0 ? '今天结算' : `${distance} 天后`}</small><strong>${escapeHtml(crisis.name)}</strong><p>${escapeHtml(crisis.intent)}</p></div>
        <span class="forecast-help" title="应对：${escapeHtml(crisis.counter)}">?</span>
      </article>`;
    }).join('')}`;
  }

  function renderIsland(state) {
    const root = $('#island-world');
    const scenerySpots = [[18, 34], [28, 22], [40, 31], [54, 20], [68, 30], [76, 45], [63, 56], [45, 53], [29, 59], [17, 50], [52, 68], [72, 66]];
    const creatureSpots = [[23, 43], [37, 41], [51, 36], [65, 43], [31, 66], [47, 62], [61, 64], [76, 56]];
    let sceneryIndex = 0;
    const scenery = [];
    state.tiles.filter((tile) => ['meadow', 'shrub', 'forest'].includes(tile.terrain)).forEach((tile) => {
      const amount = Math.max(1, tile.maturity);
      for (let count = 0; count < amount; count += 1) {
        const spot = scenerySpots[sceneryIndex % scenerySpots.length];
        scenery.push(`<span class="unified-token terrain-token terrain-${tile.terrain}" style="--x:${spot[0]}%;--y:${spot[1]}%;--delay:${(sceneryIndex % 5) * -.4}s">${data.terrainMeta[tile.terrain].icon}</span>`);
        sceneryIndex += 1;
      }
    });
    const traits = state.tiles.flatMap((tile) => tile.traits).slice(0, 8).map((trait, index) => {
      const spot = scenerySpots[(index * 2 + 1) % scenerySpots.length];
      return `<span class="unified-token trait-token" style="--x:${spot[0] + 3}%;--y:${spot[1] + 8}%" title="${escapeHtml(data.traitMeta[trait].name)}">${data.traitMeta[trait].icon}</span>`;
    }).join('');
    const creatures = eco.getDiscovered(state).filter((item) => !['植物'].includes(item.category)).slice(0, creatureSpots.length).map((item, index) => {
      const spot = creatureSpots[index];
      return `<span class="unified-token creature-token" style="--x:${spot[0]}%;--y:${spot[1]}%;--delay:${(index % 4) * -.55}s" title="${escapeHtml(item.name)}">${item.icon}</span>`;
    }).join('');
    const projects = state.tiles.filter((tile) => tile.project).map((tile) => `<span><i></i>${escapeHtml(tile.project.name)} · ${tile.project.remaining}天</span>`).join('');
    const totalStress = state.tiles.reduce((sum, tile) => sum + tile.stress, 0);
    const totalPollution = eco.totalPollution(state);
    const wetland = eco.terrainCount(state, 'wetland') > 0;
    const stream = eco.terrainCount(state, 'stream') > 0;
    root.className = 'island-world unified-world';
    root.setAttribute('aria-label', '一座连续生长、没有分区边界的生态岛屿');
    root.innerHTML = `<div class="board-water water-a"></div><div class="board-water water-b"></div><div class="unified-island">
      ${stream ? '<span class="unified-stream">〰</span>' : ''}${wetland ? '<span class="unified-wetland">🪷</span>' : ''}
      ${scenery.join('')}${traits}${creatures}
      <div class="unified-projects">${projects}</div>
      <div class="unified-alerts">${totalPollution ? `<span class="pollution">☣ 污染 ${totalPollution}</span>` : ''}${totalStress ? `<span class="stress">! 压力 ${totalStress}</span>` : ''}</div>
    </div>`;
    $('#island-legend').innerHTML = `<span><i class="legend-dot project"></i>向上拖牌后立即执行</span><span><i class="legend-dot pressure"></i>系统会自动安排生态位置，变化直接呈现在整座岛上</span>`;
  }

  function renderSidebar(state) {
    const root = $('#habitat-bars');
    const terrainOrder = ['stream', 'meadow', 'shrub', 'forest', 'wetland', 'coast'];
    root.innerHTML = terrainOrder.map((terrain) => {
      const meta = data.terrainMeta[terrain];
      const tiles = state.tiles.filter((tile) => tile.terrain === terrain);
      const maturity = tiles.length ? Math.round(tiles.reduce((sum, tile) => sum + tile.maturity, 0) / tiles.length) : 0;
      const condition = !tiles.length ? '缺失' : tiles.some((tile) => tile.stress || tile.pollution > 1) ? '承压' : maturity >= 3 ? '成熟' : maturity >= 2 ? '成长' : '幼年';
      return `<div class="habitat-row"><span class="habitat-symbol" style="background:${meta.color}">${meta.icon}</span><div><b>${meta.name}</b><small>${tiles.length ? '已形成' : '尚缺失'} · ${condition}</small></div><i class="habitat-pips">${[1, 2, 3].map((level) => `<em class="${maturity >= level ? 'on' : ''}"></em>`).join('')}</i></div>`;
    }).join('');

    const preview = eco.getMilestonePreview(state);
    $('#strategy-card').innerHTML = preview ? `<div class="card-heading"><div><p class="kicker">阶段目标 · 第${preview.day}天</p><h2>${escapeHtml(preview.name)}</h2></div><span>${preview.success ? '已就绪' : '规划中'}</span></div><p>${escapeHtml(preview.description)}</p><div class="milestone-mini">${preview.checks.map((check) => `<span class="${check.ok ? 'done' : ''}">${check.ok ? '✓' : '○'} ${escapeHtml(check.label)}</span>`).join('')}</div>` : `<p class="kicker">最终目标</p><h2>让岛屿能自己运转</h2><p>剩余时间用于补强最脆弱的生态结构。</p>`;

    const networks = state.activeNetworks.map((id) => data.comboMeta[id]);
    $('#insight-card').innerHTML = `<p class="kicker">现场记录</p><h2>${escapeHtml(state.lastLog.title)}</h2><p>${escapeHtml(state.lastLog.text)}</p>${networks.length ? `<div class="network-chips">${networks.map((network) => `<span title="${escapeHtml(network.text)}">${network.icon} ${network.name}</span>`).join('')}</div>` : '<small class="no-network">尚未形成稳定生态结构。不同栖息地的组合比单项数值更重要。</small>'}`;
  }

  function simpleEffect(card) {
    if (card.action === 'project') return `建设${data.terrainMeta[card.terrain].name}${card.duration ? `，${card.duration}天完成` : '，立即完成'}`;
    if (card.action === 'trait') return `为岛屿加入「${data.traitMeta[card.trait].name}」`;
    if (card.action === 'clean') return `降低 ${card.power} 层污染`;
    if (card.action === 'cleanse_tile') return '清除生态压力与入侵影响';
    if (card.action === 'policy') return '打出后整局持续生效';
    if (card.action === 'draw') return `立刻再抽 ${card.draw} 张牌`;
    if (card.action === 'focus') return `获得 ${card.energy || 0} 行动力，再抽 ${card.draw || 0} 张牌`;
    if (card.action === 'purge') return '永久移除一张负面牌';
    if (card.action === 'introduce') return `让${data.species.find((item) => item.id === card.species).name}回到岛上`;
    if (card.action === 'status') return '花费行动力处理这张负面牌';
    if (card.action === 'rewild') return '让健康生境自然成长';
    return '立即执行生态行动';
  }

  function renderCoach(state, game) {
    const root = $('#tutorial-coach');
    const recommendation = game.getRecommendation();
    const played = state.cardsPlayedThisRound || 0;
    const endButton = $('#end-day-button');
    endButton.classList.toggle('coach-highlight', !recommendation || state.energy.current <= 0);
    if (!recommendation) {
      root.className = 'tutorial-coach end-step';
      root.innerHTML = `<span class="coach-number">2</span><div><small>现在做这一步</small><h3>点击“结束今天”</h3><p>${state.energy.current <= 0 ? '行动力已经用完。' : '当前手牌暂时没有可用行动。'}明天工程会继续推进，行动力和手牌也会刷新。</p></div><div class="coach-arrow">→</div>`;
      return;
    }
    const firstMove = state.turn === 1 && played === 0;
    root.className = `tutorial-coach ${firstMove ? 'first-step' : ''}`;
    root.innerHTML = `<span class="coach-number">${firstMove ? '1' : '✓'}</span><div class="coach-copy"><small>${firstMove ? '先学会出牌，其他暂时不用管' : played ? `今天已打出 ${played} 张牌` : '今日建议'}</small><h3>${firstMove ? '按住推荐牌，向上拖动后松手' : `推荐：${escapeHtml(recommendation.card.title)}`}</h3><p>${firstMove ? `先试试「${escapeHtml(recommendation.card.title)}」。看到绿色“松手使用”提示时放开鼠标。` : escapeHtml(recommendation.reason)}</p></div><div class="coach-gesture"><span>${recommendation.card.icon}</span><i>↑</i><b>拖动</b></div>`;
  }

  function renderCards(state, game) {
    const root = $('#action-cards');
    const cards = game.getHandCards();
    const recommendation = game.getRecommendation();
    root.innerHTML = cards.map(({ instance, card }, index) => {
      const canAfford = state.energy.current >= card.cost;
      const targets = card.target ? eco.validTargets(state, card).length : 1;
      const unplayable = !canAfford || targets === 0 || game.busy;
      const recommended = recommendation && recommendation.instance.uid === instance.uid;
      const targetText = card.target ? '自动选择最合适位置' : card.action === 'policy' ? '持续生效' : card.action === 'status' ? '打出后移除' : '立即行动';
      return `<article class="action-card ${card.type === '负面' ? 'status-card' : ''} ${recommended ? 'recommended' : ''} ${unplayable ? 'unplayable' : ''}" data-card-uid="${instance.uid}" data-card-index="${index}" tabindex="0" role="button" aria-label="向上拖动使用${escapeHtml(card.title)}">
        ${recommended ? '<div class="recommend-ribbon">推荐先用</div>' : ''}<div class="card-cost"><span>⚡</span>${card.cost}</div><div class="card-rarity">${escapeHtml(card.rarity)}</div>
        <div class="card-art"><span>${card.icon}</span><i></i></div>
        <div class="card-copy"><small>${escapeHtml(card.type)}${card.upgraded ? ' · 已升级' : ''}</small><h3>${escapeHtml(card.title)}</h3><div class="card-simple-effect"><em>效果</em><b>${escapeHtml(simpleEffect(card))}</b></div><p>${escapeHtml(card.text)}</p></div>
        <div class="card-target-hint">${card.target ? '⌖' : '◇'} ${escapeHtml(targetText)}</div>
        <div class="drag-instruction"><span>↑</span> 向上拖动</div>
      </article>`;
    }).join('') || '<div class="empty-hand">手牌已空。你可以结束今天。</div>';
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
    renderIsland(state);
    renderSidebar(state);
    renderCoach(state, game);
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
    openModal(`<button class="modal-close" data-modal-close aria-label="关闭">×</button><p class="kicker">30秒上手</p><h2>每天只做三件事</h2>
      <div class="quick-guide">
        <article><span>1</span><div><b>拖一张牌</b><p>按住卡牌向上拖，看到绿色提示后松手。黄色“推荐”牌可以直接照着用。</p></div></article>
        <article><span>2</span><div><b>看看行动力</b><p>牌左上角是消耗。行动力不够时，这张牌今天就不能用。</p></div></article>
        <article><span>3</span><div><b>结束今天</b><p>工程会推进一天，危机可能发生，明天会获得新的手牌与行动力。</p></div></article>
      </div><div class="guide-callout"><b>时间现在一天一天前进。</b> 第一局不必理解全部规则，跟着黄色推荐牌操作即可。</div><button class="button primary full" data-guide-start>明白了，开始拖牌</button>`, 'guide-modal');
    $('[data-modal-close]').addEventListener('click', closeModal);
    $('[data-guide-start]').addEventListener('click', closeModal);
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
    openModal(`<button class="modal-close" data-modal-close aria-label="关闭">×</button><p class="kicker">结构性 Combo</p><h2>生态网络</h2><p class="modal-lead">网络来自真实的栖息地组合。形成后会改写危机判定与物种定居。</p><div class="combo-library">${Object.entries(data.comboMeta).map(([id, combo]) => {
      const active = state.activeNetworks.includes(id);
      const discovered = state.discoveredNetworks.includes(id);
      return `<article class="${active ? 'active' : discovered ? 'discovered' : ''}"><span>${combo.icon}</span><div><b>${combo.name}${active ? ' · 生效中' : discovered ? ' · 曾形成' : ''}</b><p>${combo.text}</p></div></article>`;
    }).join('')}</div>`, 'wide-modal');
    $('[data-modal-close]').addEventListener('click', closeModal);
  }

  function chooseCards(title, subtitle, cards, mode) {
    return new Promise((resolve) => {
      openModal(`<p class="kicker">${mode === 'upgrade' ? '牌组升级' : '阶段奖励'}</p><h2>${escapeHtml(title)}</h2><p class="modal-lead">${escapeHtml(subtitle)}</p><div class="reward-grid">${cards.map((card) => `<button class="reward-card ${card.type === '负面' ? 'status-card' : ''}" data-choice="${card.id}"><span class="reward-icon">${card.icon}</span><small>${escapeHtml(card.rarity)} · ${escapeHtml(card.type)}</small><b>${escapeHtml(card.title)}${mode === 'upgrade' ? ' → +' : ''}</b><p>${escapeHtml(mode === 'upgrade' && card.upgrade && card.upgrade.text ? card.upgrade.text : card.text)}</p><em>${mode === 'upgrade' ? '升级此牌的所有副本' : `${card.cost} 能量`}</em></button>`).join('')}</div>${mode === 'reward' ? '<button class="button ghost reward-skip" data-skip>跳过，明天 +1 行动力</button>' : ''}`, 'wide-modal reward-modal');
      document.querySelectorAll('[data-choice]').forEach((button) => button.addEventListener('click', () => { const choice = button.dataset.choice; closeModal(); resolve(choice); }));
      const skip = $('[data-skip]');
      if (skip) skip.addEventListener('click', () => { closeModal(); resolve(null); });
    });
  }

  function showReward(cards) { return chooseCards('选择一张加入牌组', '不是所有好牌都该拿：更厚的牌组会降低抽到关键牌的概率。', cards, 'reward'); }
  function showUpgrade(cards) { return chooseCards('强化一项长期方案', '升级会作用于牌组内该牌的全部副本。', cards, 'upgrade'); }

  function showCrisis(crisis, result) {
    const body = `<div class="crisis-result ${result.success ? 'success' : 'failure'}"><span>${crisis.icon}</span><b>${result.success ? '结构经受住了考验' : '岛屿付出了代价'}</b></div><p>${escapeHtml(result.text)}</p>${result.statusIds.length ? `<div class="status-warning">负面牌加入弃牌堆：${result.statusIds.map((id) => data.cards.find((card) => card.id === id).title).join(' × ')}</div>` : ''}<div class="guide-callout"><b>原预警：</b>${escapeHtml(crisis.intent)}<br><b>应对思路：</b>${escapeHtml(crisis.counter)}</div>`;
    return infoModal(`${crisis.name} · ${result.success ? '成功化解' : '防御失败'}`, body, '进入下一天');
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
    root.innerHTML = `<div class="results-wrap"><p class="eyebrow">100 DAYS LATER</p><h1>${grade}</h1><p class="results-lead">这次评价来自你建立的生态结构、危机应对与牌库健康度，而不是四个数字是否全满。</p><div class="score-ring"><strong>${score}</strong><small>综合韧性</small></div><div class="result-stats"><span><b>${state.activeNetworks.length}</b><small>生效结构</small></span><span><b>${discovered.length}</b><small>定居物种</small></span><span><b>${successRate}%</b><small>危机化解率</small></span><span><b>${eco.statusCount(state)}</b><small>残留负面牌</small></span></div><div class="result-networks">${state.discoveredNetworks.length ? state.discoveredNetworks.map((id) => `<span>${data.comboMeta[id].icon} ${data.comboMeta[id].name}</span>`).join('') : '<span>本次没有形成完整结构，下一局尝试让不同栖息地互相支撑。</span>'}</div><button class="button primary large" id="result-restart">重新规划一座岛 <span>↻</span></button></div>`;
    showScreen('results-screen');
    $('#result-restart').addEventListener('click', onRestart);
  }

  window.IslandUI = {
    showScreen, render, toast, closeModal, openGuide, openCodex, openNetwork,
    showReward, showUpgrade, showCrisis, showMilestone, flashNetwork, playCardAnimation, renderResults
  };
})();
