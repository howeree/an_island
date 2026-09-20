/* DOM rendering. The illustration is CSS and emoji based so the game works without any assets. */
(function () {
  const data = window.IslandData;
  const eco = window.Ecosystem;
  const $ = (selector) => document.querySelector(selector);
  const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  let toastTimer;

  function showScreen(name) {
    ['start-screen', 'game-screen', 'results-screen'].forEach((id) => $("#" + id).classList.toggle('hidden', id !== name));
  }

  function metric(id, value) {
    const element = $(id);
    if (!element) return;
    const next = Math.round(value);
    if (Number(element.textContent) !== next) {
      element.textContent = next;
      element.classList.remove('number-pop');
      requestAnimationFrame(() => element.classList.add('number-pop'));
    }
  }

  function stageFor(state) { return eco.getStage(state.day); }
  function statusPhrase(state) {
    const s = state.stats;
    if (s.biodiversity < 20) return '荒岛正在等待第一株新芽。';
    if (s.wetland < 20) return '草地开始转绿，但水边仍然很脆弱。';
    if (s.foodChain < 28) return '越来越多的生命留下来，食物链还在编织。';
    if (s.stability < 55) return '生态网络已经出现，需要抵御接下来的波动。';
    if (s.pollution > 45) return '生命蓬勃，但污染仍是岛屿的隐患。';
    return '不同栖息地正在互相滋养，这座岛有了自己的节奏。';
  }

  function renderStatus(state) {
    const s = state.stats;
    $('#day-label').textContent = `第 ${state.day} / 100 天`;
    $('#day-progress').style.width = `${Math.max(1, state.turns)}%`;
    $('#stage-label').textContent = stageFor(state).name;
    $('#scene-caption').textContent = statusPhrase(state);
    metric('#metric-biodiversity', s.biodiversity);
    metric('#metric-stability', s.stability);
    metric('#metric-habitat', s.habitat);
    metric('#metric-food-chain', s.foodChain);
  }

  function position(index, seed, vertical) {
    const left = 9 + ((seed * 17 + index * 29 + index * index * 5) % 78);
    const top = vertical ? 14 + ((seed * 11 + index * 23) % 62) : 20 + ((seed * 19 + index * 17) % 54);
    return `left:${left}%;top:${top}%;`;
  }
  function tokens(icon, className, count, seed) {
    return Array.from({ length: Math.max(0, count) }, (_, index) => `<span class="scene-token ${className}" style="${position(index, seed, false)}">${icon}</span>`).join('');
  }
  function lifeTokens(id, count, state) {
    const item = data.species.find((species) => species.id === id);
    if (!item || state.species[id] < 5) return '';
    const seed = id.split('').reduce((total, character) => total + character.charCodeAt(0), 0);
    return Array.from({ length: count }, (_, index) => `<span class="scene-token creature ${id}" style="${position(index, seed, true)}" title="${item.name}">${item.icon}</span>`).join('');
  }

  function renderIsland(state) {
    const s = state.stats;
    const p = state.species;
    const green = Math.round(31 + s.vegetation * 0.37);
    const hue = Math.round(60 + s.vegetation * 0.42);
    const treeCount = Math.min(10, Math.floor(p.trees / 9));
    const flowerCount = Math.min(11, Math.floor(p.wildflowers / 7));
    const grassCount = Math.min(15, 3 + Math.floor(p.grass / 7));
    const shrubCount = Math.min(7, Math.floor(p.shrubs / 10));
    const wetlandSize = Math.min(100, Math.max(0, s.wetland));
    const animals = [
      lifeTokens('bee', p.bee > 18 ? 2 : 1, state), lifeTokens('butterfly', p.butterfly > 18 ? 2 : 1, state), lifeTokens('dragonfly', 1, state),
      lifeTokens('frog', 1, state), lifeTokens('waterbird', 1, state), lifeTokens('songbird', p.songbird > 24 ? 2 : 1, state),
      lifeTokens('rabbit', p.rabbit > 25 ? 2 : 1, state), lifeTokens('deer', 1, state), lifeTokens('fox', 1, state), lifeTokens('owl', 1, state)
    ].join('');
    $('#island-world').innerHTML = `
      <div class="sea-layer"><i class="wave-line line-one"></i><i class="wave-line line-two"></i><i class="wave-line line-three"></i></div>
      <div class="sun-reflection"></div>
      <div class="island-base" style="--land-hue:${hue};--land-light:${green}%;--wetland-size:${wetlandSize}%;">
        <span class="shore shore-one"></span><span class="shore shore-two"></span>
        ${s.wetland > 8 ? `<span class="wetland-pool"><i></i><b>〰</b></span>` : ''}
        ${s.water > 42 ? '<span class="stream-path">〰</span>' : ''}
        ${tokens('🌱', 'grass', grassCount, 7)}
        ${tokens('🌿', 'shrub', shrubCount, 13)}
        ${tokens('🌳', 'tree', treeCount, 23)}
        ${tokens('🌼', 'flower', flowerCount, 31)}
        ${s.wetland > 20 ? tokens('🪷', 'aquatic', Math.min(5, Math.floor(p.aquatic / 11)), 45) : ''}
        ${animals}
        ${s.pollution > 55 ? '<span class="smog smog-one">☁</span><span class="smog smog-two">☁</span>' : ''}
      </div>
      <span class="flying-bird bird-one">⌁</span><span class="flying-bird bird-two">⌁</span>
      <div class="island-vignette"></div>`;
    const discovered = eco.getDiscovered(state);
    $('#island-legend').innerHTML = `<span><b>${discovered.length}</b> / 15 种已发现</span><span class="legend-dot"></span><span>水资源 ${Math.round(s.water)}</span><span class="legend-dot"></span><span>污染 ${Math.round(s.pollution)}</span>`;
  }

  function renderBars(state) {
    const items = [
      { id: 'vegetation', icon: '🌱', name: '草地与植被', value: state.stats.vegetation, color: 'green' },
      { id: 'forest', icon: '🌲', name: '森林', value: state.stats.forest, color: 'forest' },
      { id: 'wetland', icon: '💧', name: '湿地', value: state.stats.wetland, color: 'water' },
      { id: 'water', icon: '〰', name: '水资源', value: state.stats.water, color: 'blue' }
    ];
    $('#habitat-bars').innerHTML = items.map((item) => `<div class="habitat-row"><span>${item.icon}</span><div><div class="bar-label"><b>${item.name}</b><em>${Math.round(item.value)}</em></div><div class="bar-track"><i class="${item.color}" style="width:${item.value}%"></i></div></div></div>`).join('');
  }

  function renderStrategy(state) {
    const preview = eco.getMilestonePreview(state);
    if (preview.complete) {
      $('#strategy-card').innerHTML = `<div class="strategy-title"><span class="strategy-badge done">✦</span><div><p class="kicker">战略节点</p><h3>完整生态已解锁</h3></div></div><p class="strategy-copy">四个阶段目标均已完成。现在请守住这份来之不易的平衡。</p><div class="cap-note">核心指标上限：<b>100</b></div>`;
      return;
    }
    const milestone = preview.milestone;
    const daysLeft = Math.max(0, milestone.day - state.day + 1);
    $('#strategy-card').innerHTML = `<div class="strategy-title"><span class="strategy-badge">${preview.completed + 1}</span><div><p class="kicker">阶段目标 · 第 ${milestone.day} 天前</p><h3>${escapeHtml(milestone.name)}</h3></div></div><p class="strategy-copy">${escapeHtml(milestone.description)}</p><div class="goal-list">${preview.checks.map((check) => `<div class="goal ${check.passed ? 'met' : ''}"><span>${check.passed ? '✓' : '○'}</span><b>${escapeHtml(check.label)}</b><em>${check.value} / ${check.target}</em></div>`).join('')}</div><div class="strategy-footer"><span>剩余 ${daysLeft} 天</span><span>${escapeHtml(milestone.reward)}</span></div>`;
  }

  function renderInsight(state) {
    const log = state.lastLog;
    const eventClass = log.type === 'event' ? 'is-event' : log.type === 'choice' || log.type === 'milestone' ? 'is-choice' : '';
    const label = log.type === 'event' ? '生态事件' : log.type === 'milestone' ? '战略节点结算' : log.type === 'choice' ? '今日回响' : '岛屿观察';
    $('#insight-card').innerHTML = `<div class="insight-icon ${eventClass}">${log.icon}</div><div><p class="kicker">${label}</p><h3>${escapeHtml(log.title)}</h3><p>${escapeHtml(log.text)}</p></div>`;
  }

  function formatEffects(card) {
    const effects = eco.effectText(card.effects, 3);
    return effects.map((effect) => `<span class="effect ${effect.value < 0 ? 'negative' : ''}">${effect.value > 0 ? '+' : ''}${effect.value} ${escapeHtml(effect.label)}</span>`).join('');
  }
  function renderCards(cards) {
    $('#action-cards').innerHTML = cards.map((card, index) => {
      const rule = data.strategyRules[card.id] || {};
      const prerequisites = (rule.requirements || []).map((requirement) => requirement.label).join('、');
      return `<button class="action-card action-${index}" data-card-id="${card.id}" aria-label="选择行动：${card.title}">
      <span class="card-top"><span class="card-icon">${card.icon}</span><span class="card-arrow">→</span></span>
      <span class="card-title">${escapeHtml(card.title)}</span>
      <span class="card-description">${escapeHtml(card.description)}</span>
      <span class="effects">${formatEffects(card)}</span>
      ${prerequisites ? `<span class="card-prerequisite">前提：${escapeHtml(prerequisites)}</span>` : ''}
      <span class="card-reason">${escapeHtml(card.reason)}</span>
    </button>`;
    }).join('');
  }

  function render(state, cards) {
    renderStatus(state); renderIsland(state); renderBars(state); renderStrategy(state); renderInsight(state); renderCards(cards);
  }

  function showModal(title, content, extraClass) {
    $('#modal-root').innerHTML = `<div class="modal-backdrop"><section class="modal ${extraClass || ''}" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}"><button class="modal-close" data-action="close-modal" aria-label="关闭">×</button><header class="modal-header"><p class="kicker">一座岛的100天</p><h2>${escapeHtml(title)}</h2></header>${content}</section></div>`;
  }
  function closeModal() { $('#modal-root').innerHTML = ''; }

  function openGuide() {
    showModal('如何让岛屿苏醒？', `<div class="guide-content"><div class="guide-step"><b>1</b><div><h3>每天一个选择</h3><p>从三张生态行动卡中选择一张。水、植物、栖息地和保护都很重要。</p></div></div><div class="guide-step"><b>2</b><div><h3>观察连锁反应</h3><p>花朵支持昆虫，昆虫支持鸟类；草地支持兔子，而狐狸会让兔子不过度繁殖。</p></div></div><div class="guide-step"><b>3</b><div><h3>别只堆一种生命</h3><p>物种、森林、湿地与洁净水都要有，生态稳定性才会提升。</p></div></div><div class="guide-step"><b>4</b><div><h3>抵御自然波动</h3><p>干旱、污染或游客潮会发生。提前让生态多样、连通，就更有韧性。</p></div></div><button class="button primary full" data-action="close-modal">我明白了</button></div>`);
  }

  function codexContent(state, selectedId) {
    const current = state || eco.createInitialState();
    const selected = data.species.find((item) => item.id === selectedId) || data.species[0];
    const isKnown = current.species[selected.id] >= 6;
    const cards = data.species.map((item) => {
      const known = current.species[item.id] >= 6;
      return `<button class="species-tile ${known ? '' : 'locked'} ${item.id === selected.id ? 'selected' : ''}" data-species-id="${item.id}"><span>${known ? item.icon : '？'}</span><b>${known ? item.name : '？？？'}</b><small>${known ? item.category : '等待发现'}</small></button>`;
    }).join('');
    return `<div class="codex-summary"><span>已发现 <b>${eco.getDiscovered(current).length}</b> / 15</span><p>点选物种，理解它在岛屿中的位置。</p></div><div class="codex-layout"><div class="species-grid">${cards}</div><article class="species-detail ${isKnown ? '' : 'unknown'}"><span class="detail-icon">${isKnown ? selected.icon : '？'}</span><div><p class="kicker">${isKnown ? selected.category : '尚未发现'}</p><h3>${isKnown ? selected.name : '？？？'}</h3><p>${isKnown ? selected.description : '恢复对应生态环境后，这位岛民可能出现。'}</p></div>${isKnown ? `<dl><div><dt>偏好栖息地</dt><dd>${selected.preferredHabitat}</dd></div><div><dt>需要</dt><dd>${selected.dependencies}</dd></div><div><dt>食物</dt><dd>${selected.food}</dd></div><div><dt>天敌 / 消费者</dt><dd>${selected.predators}</dd></div><div class="full-row"><dt>生态作用</dt><dd>${selected.role}</dd></div></dl>` : ''}</article></div>`;
  }
  function openCodex(state, selectedId) { showModal('生态图鉴', codexContent(state, selectedId), 'wide-modal'); }
  function refreshCodex(state, selectedId) { openCodex(state, selectedId); }

  function active(state, ids) { return ids.every((id) => state.species[id] >= 6); }
  function openNetwork(state) {
    const chains = [
      { title: '花丛食物链', nodes: [['🌼', '野花'], ['🐝', '蜜蜂 / 蝴蝶'], ['🐦', '小型鸣禽'], ['🦊', '狐狸']], ids: ['wildflowers', 'bee', 'songbird', 'fox'] },
      { title: '草地食物链', nodes: [['🌱', '草'], ['🐇', '兔子'], ['🦊', '狐狸']], ids: ['grass', 'rabbit', 'fox'] },
      { title: '湿地食物链', nodes: [['🪷', '水生植物'], ['🪰', '蜻蜓'], ['🐸', '青蛙'], ['🦆', '水鸟']], ids: ['aquatic', 'dragonfly', 'frog', 'waterbird'] },
      { title: '森林夜行链', nodes: [['🌳', '乔木'], ['🐦', '鸣禽'], ['🦉', '猫头鹰']], ids: ['trees', 'songbird', 'owl'] }
    ];
    const html = chains.map((chain) => `<article class="network-chain ${active(state, chain.ids) ? 'complete' : ''}"><div><h3>${chain.title}</h3><span>${active(state, chain.ids) ? '已形成' : '等待连结'}</span></div><div class="network-nodes">${chain.nodes.map((node, index) => `<span class="network-node ${state.species[chain.ids[index]] >= 6 ? 'known' : ''}"><i>${state.species[chain.ids[index]] >= 6 ? node[0] : '？'}</i><b>${state.species[chain.ids[index]] >= 6 ? node[1] : '未知'}</b></span>${index < chain.nodes.length - 1 ? '<em>→</em>' : ''}`).join('')}</div></article>`).join('');
    showModal('生态网络', `<p class="network-intro">每条链都不是孤立的。栖息地越完整，越多箭头会亮起来。</p><div class="network-list">${html}</div><p class="network-tip">提示：捕食者不是坏消息。狐狸与猫头鹰能减轻食草动物对植被的压力。</p>`, 'network-modal');
  }

  function showEvent(event, conditional) {
    showModal(event.title, `<article class="event-modal"><div class="event-symbol">${event.icon}</div><p class="event-why"><b>为什么发生？</b>${escapeHtml(event.why)}</p><p><b>发生了什么？</b>${escapeHtml(event.description)}</p><div class="event-effects">${eco.effectText(event.effects).map((effect) => `<span class="effect ${effect.value < 0 ? 'negative' : ''}">${effect.value > 0 ? '+' : ''}${effect.value} ${escapeHtml(effect.label)}</span>`).join('')}</div>${conditional ? `<p class="event-warning">${escapeHtml(conditional)}</p>` : ''}<button class="button primary full" data-action="close-modal">继续照看岛屿</button></article>`, 'event-dialog');
  }

  function showMilestone(result) {
    const headline = result.success ? '阶段目标达成！' : '阶段目标尚未达成';
    const description = result.success ? `你完成了「${result.name}」。${result.reward}，四项核心指标可以继续成长。` : `你完成了 ${result.passed} / ${result.checks.length} 项「${result.name}」目标。未完成的修复工程让岛屿付出了稳定性代价，后续的核心指标上限也会受限。`;
    showModal(headline, `<article class="milestone-modal"><div class="milestone-symbol ${result.success ? 'success' : ''}">${result.success ? '✦' : '◌'}</div><h3>${escapeHtml(result.name)}</h3><p>${escapeHtml(description)}</p><div class="milestone-checks">${result.checks.map((check) => `<div class="${check.passed ? 'passed' : ''}"><span>${check.passed ? '✓' : '×'}</span><b>${escapeHtml(check.label)}</b><em>${check.value} / ${check.target}</em></div>`).join('')}</div><button class="button primary full" data-action="close-modal">继续照看岛屿</button></article>`, 'event-dialog');
  }

  const tutorialSteps = [
    ['这是你的岛。', '现在它有些疲惫：水源脆弱、植被稀少。你会亲眼看见它随选择改变。', '🏝️'],
    ['每天选择一种生态行动。', '行动卡会马上改变数值，也会在之后的日子里影响物种。', '🃏'],
    ['生命彼此相连。', '花、昆虫、鸟类、食草动物与捕食者会组成不同的食物链。', '⛓️'],
    ['追求平衡，而非单一数量。', '只养大兔群会伤害植被；完整的森林、湿地和食物链才是目标。', '✦']
  ];
  function showTutorial(index) {
    const step = tutorialSteps[index];
    showModal(`新手引导 ${index + 1} / 4`, `<article class="tutorial"><div class="tutorial-icon">${step[2]}</div><h3>${step[0]}</h3><p>${step[1]}</p><div class="tutorial-dots">${tutorialSteps.map((_, i) => `<i class="${i === index ? 'active' : ''}"></i>`).join('')}</div><div class="tutorial-actions"><button class="text-button" data-action="skip-tutorial">跳过</button><button class="button primary" data-tutorial-index="${index + 1}">${index === tutorialSteps.length - 1 ? '开始照看岛屿' : '下一步 →'}</button></div></article>`, 'tutorial-modal');
  }

  function ending(state) {
    const metrics = eco.calculateMetrics(state, false);
    const recovery = Math.round((state.stats.biodiversity * 0.34 + state.stats.stability * 0.26 + state.stats.habitat * 0.22 + state.stats.foodChain * 0.18));
    let title = '生态荒漠'; let text = '岛屿仍很脆弱，但你已经看见水、土壤和生命之间的联系。下一次可从水源、植物和栖息地的连结开始。'; let tone = 'dawn';
    if (recovery >= 80) { title = '生物多样性天堂'; text = '森林、湿地和草地互相支持。传粉者、鸟类、食草动物与捕食者形成了有韧性的生态网络，这座岛重新成为生命的家园。'; tone = 'paradise'; }
    else if (recovery >= 60) { title = '繁荣生态岛'; text = '岛上已形成多种栖息地。生命不再只是零星出现，而是在彼此支持的食物链中稳定下来。'; tone = 'lush'; }
    else if (recovery >= 40) { title = '生态复苏'; text = '绿色正在扩大，新的居民陆续抵达。继续让湿地、森林与草地均衡发展，这张生态网会更牢固。'; tone = 'growing'; }
    else if (recovery >= 20) { title = '开始恢复'; text = '岛屿已经有了回春迹象。现在最需要的是把零散的恢复成果连成完整栖息地。'; tone = 'sprout'; }
    return { recovery, title, text, tone, metrics };
  }
  function showResults(state) {
    const result = ending(state);
    showScreen('results-screen');
    $('#results-screen').innerHTML = `<div class="result-shell"><section id="share-card" class="result-card ${result.tone}"><div class="result-top"><span>100 DAYS OF BIODIVERSITY</span><span>第 100 天</span></div><div class="result-island"><span>🌳</span><span>🌼</span><span>🦋</span><span>🐦</span><span>🦊</span><span>〰</span></div><p class="kicker">你的生态岛报告</p><h1>${result.title}</h1><p class="result-story">${result.text}</p><div class="recovery-score"><b>${result.recovery}</b><span>/ 100<br>生态恢复度</span></div><div class="result-metrics"><div><b>${Math.round(state.stats.biodiversity)}</b><span>生物多样性</span></div><div><b>${Math.round(state.stats.stability)}</b><span>生态稳定</span></div><div><b>${Math.round(state.stats.habitat)}</b><span>栖息地</span></div><div><b>${Math.round(state.stats.foodChain)}</b><span>食物链</span></div></div><div class="result-facts"><span>发现 <b>${result.metrics.discovered}</b> / 15 种生物</span><span>恢复 <b>${result.metrics.habitatCount}</b> 种栖息地</span><span>形成 <b>${result.metrics.chainCount}</b> 条主要食物链</span><span>达成 <b>${state.milestones.completed}</b> / 4 战略节点</span></div></section><div class="result-actions"><button class="button primary large" data-action="restart">再照看一座岛 <span>↻</span></button><button class="button ghost" data-action="share">分享我的生态岛</button><button class="text-button" data-action="open-network">回看生态网络</button></div><p id="share-note" class="share-note">结果卡已为截图分享而设计。</p></div>`;
  }

  function toast(message) {
    const element = $('#toast');
    element.textContent = message; element.classList.add('visible');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => element.classList.remove('visible'), 2800);
  }

  window.IslandUI = { showScreen, render, openGuide, openCodex, refreshCodex, openNetwork, showEvent, showMilestone, showTutorial, showResults, closeModal, toast, ending };
})();
