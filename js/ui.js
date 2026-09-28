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
  const tutorialKey = 'island-tutorial-v1-seen';
  const tutorialSteps = [
    { target: '#day-label', closest: '.day-meter', title: '守护岛屿30天', text: '每天结束只前进一天。第30天生命仍在、三项生态课题都已完成，就能获胜；点击「生态课题」可看条件。' },
    { target: '.metric-strip', title: '认识六项资源', text: '生命归零会失败，护盾抵挡今晚伤害；种子和水分用于建设，研究用于课题。生态压力过高会减产、少抽牌。' },
    { target: '#forecast-strip', title: '先看危机再出牌', text: '这里公开今晚的冲击。湿地、草灌、森林分别抵挡对应危机；旁边的预计伤害会随出牌更新。' },
    { target: '#combo-strip', title: '行动力与连携', text: '每天恢复3行动力。按水 → 草 → 林 → 水接牌，可额外获得护盾和研究；通用牌不断链。' },
    { target: '#action-cards', title: '向上拖牌使用', text: '牌面显示实际收益，向上拖动后松手即可出牌。每天可换牌两次：首次免费，第二次耗1行动力。' },
    { target: '#end-day-button', title: '确认伤害，结束今天', text: '看过预计伤害再结束当天。右下角可跳过引导，以后也能从「规则」重看。' }
  ];
  let tutorialIndex = -1, tutorialBound = false, tutorialTimer;
  function tutorialSeen() { try { return localStorage.getItem(tutorialKey) === '1'; } catch (_) { return false; } }
  function stopTutorial() {
    if (tutorialIndex < 0) return;
    tutorialIndex = -1; clearTimeout(tutorialTimer);
    const overlay = $('#tutorial-overlay');
    overlay.classList.remove('open'); overlay.setAttribute('aria-hidden', 'true');
    try { localStorage.setItem(tutorialKey, '1'); } catch (_) { /* A private browser can still run the guide. */ }
    $('#game-screen [data-action="guide"]')?.focus?.();
  }
  function positionTutorial() {
    if (tutorialIndex < 0) return;
    const step = tutorialSteps[tutorialIndex], selected = $(step.target);
    const target = step.closest ? selected?.closest(step.closest) : selected;
    if (!target) return;
    const rect = target.getBoundingClientRect(), width = window.innerWidth, height = window.innerHeight, pad = 6;
    const left = Math.max(8, Math.min(rect.left - pad, width - 32));
    const top = Math.max(8, Math.min(rect.top - pad, height - 32));
    const spotlight = $('#tutorial-spotlight'), panel = $('#tutorial-panel');
    Object.assign(spotlight.style, { left: left + 'px', top: top + 'px',
      width: Math.max(24, Math.min(rect.right + pad, width - 8) - left) + 'px',
      height: Math.max(24, Math.min(rect.bottom + pad, height - 8) - top) + 'px' });
    const panelWidth = panel.offsetWidth || Math.min(370, width - 32), panelHeight = panel.offsetHeight || 130;
    const panelLeft = Math.max(16, Math.min(rect.left, width - panelWidth - 16));
    const below = rect.bottom + 16, above = rect.top - panelHeight - 16;
    const preferredTop = below + panelHeight < height - 65 ? below : above > 12 ? above : height - panelHeight - 75;
    const panelTop = Math.max(12, Math.min(preferredTop, height - panelHeight - 65));
    Object.assign(panel.style, { left: panelLeft + 'px', top: panelTop + 'px' });
  }
  function showTutorialStep() {
    if (tutorialIndex >= tutorialSteps.length) { stopTutorial(); return; }
    const step = tutorialSteps[tutorialIndex], selected = $(step.target);
    const target = step.closest ? selected?.closest(step.closest) : selected;
    if (!target) { tutorialIndex++; showTutorialStep(); return; }
    $('#tutorial-panel').innerHTML = '<span class="tutorial-progress">新手引导 · ' + (tutorialIndex + 1) + ' / ' + tutorialSteps.length + '</span><h2>' + step.title + '</h2><p>' + step.text + '</p><small>点击任意地方继续 · 右下角可跳过</small>';
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView?.({ block: 'center', inline: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
    positionTutorial(); clearTimeout(tutorialTimer);
    if (!reduceMotion) tutorialTimer = setTimeout(positionTutorial, 350);
  }
  function nextTutorial() { if (tutorialIndex >= 0) { tutorialIndex++; showTutorialStep(); } }
  function startTutorial({ auto = false } = {}) {
    if (auto && tutorialSeen()) return false;
    const overlay = $('#tutorial-overlay');
    if (!overlay || isModalOpen()) return false;
    if (!tutorialBound) {
      overlay.addEventListener('click', nextTutorial);
      $('#tutorial-skip').addEventListener('click', event => { event.stopPropagation(); stopTutorial(); });
      overlay.addEventListener('keydown', event => {
        if (event.key === 'Escape') { event.preventDefault(); stopTutorial(); }
        else if (event.target === overlay && ['Enter', ' '].includes(event.key)) { event.preventDefault(); nextTutorial(); }
      });
      window.addEventListener('scroll', positionTutorial, true);
      window.addEventListener('resize', positionTutorial);
      tutorialBound = true;
    }
    tutorialIndex = 0; overlay.classList.add('open'); overlay.setAttribute('aria-hidden', 'false');
    showTutorialStep(); overlay.focus(); return true;
  }
  document.addEventListener('keydown', event => {
    if (event.key !== 'Tab' || !isModalOpen()) return;
    const nodes = [...$('#modal-root').querySelectorAll('button:not(:disabled),[tabindex="0"]')];
    const first = nodes[0], last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });
  function cardHTML(c, s, uid, layout = {}) {
    const p = E.previewCard(s, c);
    const cost = E.effectiveCost(s, c);
    const unavailable = s.energy < cost || (c.hurt && s.hp <= c.hurt);
    const retained = uid && s.retained === uid;
    const effect = c.speciesChoice && E.speciesOptions(s).length ? '选择一只可定居物种' : c.facilityChoice ? '选择一座设施永久建造' : c.replaceChoice ? '选择1张手牌，换取' + c.draw + '张新牌' : E.effectText(p);
    const fanStyle = uid ? ' style="--fan-angle:' + (layout.angle || 0) + 'deg;--fan-drop:' + (layout.drop || 0) + 'px;--fan-layer:' + (layout.layer || 1) + ';--deal-delay:' + (layout.delay || 0) + 'ms"' : '';
    return '<article class="action-card route-' + c.route + (p.combo ? ' combo-ready' : '') + (unavailable ? ' unplayable' : '') + (retained ? ' retained' : '') + (layout.drawn ? ' card-dealt' : '') + '"' + fanStyle + ' ' +
      (uid ? 'data-card-uid="' + uid + '" tabindex="0" role="button" aria-label="向上拖动使用' + esc(c.title) + '" data-unavailable="' + !!unavailable + '"' : '') + '>' +
      '<div class="card-top"><span class="card-cost">' + cost + '⚡</span><small>' + routeLabel(c.route) + (c.upgraded ? ' · 强化' : '') + '</small></div>' +
      '<div class="card-art"><span>' + c.icon + '</span><i>' + (c.build ? '生境建设' : c.speciesChoice ? '物种引入' : c.facilityChoice ? '永久设施' : c.redrawHand || c.replaceChoice ? '手牌调度' : c.waterSpend ? '行动力转换' : p.combo ? '连携就绪' : '生态行动') + '</i></div>' +
      '<h3>' + esc(c.title) + (c.upgraded ? '+' : '') + '</h3>' +
      '<div class="card-effect" title="' + esc(effect) + '"><small>现在打出' + (p.combo ? ' · 含连携' : '') + '</small><b>' + esc(effect) + '</b></div>' +
      '<p class="card-description" title="' + esc(c.text) + '">' + esc(c.text) + '</p>' +
      (uid ? '<button class="keep-button" data-keep="' + uid + '" aria-pressed="' + !!retained + '">' + (retained ? '✓ 已留到明天' : '◇ 留到明天') + '</button><div class="drag-instruction">' + (unavailable ? '暂缺行动力或生命' : '↑ 向上拖动使用') + '</div>' : '') + '</article>';
  }
  function render(s, game, visual = {}) {
    showScreen('game-screen');
    $('#day-label').textContent = '第 ' + s.day + ' / 30 天';
    $('#act-label').textContent = ['第一幕 · 扎下根系', '第二幕 · 构建共生', '第三幕 · 守过风暴'][Math.floor((s.day - 1) / 10)];
    $('#day-progress').style.width = (s.day / 30 * 100) + '%';
    $('#hp-value').textContent = s.hp + ' / ' + s.maxHp;
    $('#hp-fill').style.width = (s.hp / s.maxHp * 100) + '%';
    $('#block-value').textContent = s.block;
    $('#seeds-value').textContent = s.seeds + ' / 12';
    $('#research-value').textContent = s.research;
    $('#moisture-value').textContent = s.moisture + ' / ' + E.moistureMax(s);
    $('#pressure-value').textContent = s.pressure + ' / 10';
    $('#pressure-value').closest('article').classList.toggle('metric-danger', s.pressure >= 7);
    $('#energy-value').textContent = s.energy;
    const threat = s.forecasts[s.day - 1], d = E.defense(s);
    const weather = D.weathers[E.weatherForDay(s.day)];
    $('#weather-strip').innerHTML = weather ? '<span>' + weather.icon + ' ' + weather.name + '</span><small>' + weather.text + '</small>' : '<span>🌤 常态天气</span><small>留意第6、13、18、23天开始的连续天气</small>';
    $('#forecast-strip').innerHTML = '<article class="tonight route-' + threat.route + '"><span>' + threat.icon + '</span><div><small>' + (threat.boss ? '阶段大考验 · 今晚' : '今晚') + ' · ' + routeLabel(threat.route) + '</small><h2>' + threat.name + '</h2></div><b>' + d.attack + '<small>当前冲击</small></b></article>' +
      '<div class="upcoming">' + s.forecasts.slice(s.day, s.day + (s.facilities.includes('weather_station') ? 5 : 2)).map(t => '<span>第' + t.day + '天 · ' + t.icon + t.name + ' <b>' + t.attack + '</b></span>').join('') + '</div>';
    $('#defense-preview').innerHTML = '<div class="damage-math ' + (d.damage ? 'danger' : 'safe') + '"><span>冲击 ' + d.attack + ' − 生境抵抗 ' + d.habitat + ' − 护盾 ' + d.block + (d.overload ? ' + 高压反噬 ' + d.overload : '') + '</span><strong>' + (d.damage ? '今晚损失 ' + d.damage + ' 生命' : '今晚平安') + '</strong></div>';
    const o = E.objectives(s);
    const boss = s.forecasts.find(t => t.boss && t.day >= s.day);
    $('#objective-strip').innerHTML = '<strong>第30天胜利条件 <small>' + (boss ? '下一考验：第' + boss.day + '天 · ' + routeLabel(boss.route) + boss.attack + '冲击' : '最后一天') + '</small></strong><span class="' + (o.topics === 3 ? 'done' : '') + '">' + (o.topics === 3 ? '✓' : '○') + ' 完成三项生态课题 · ' + o.topics + '/3</span><span>○ 生命大于0，守到第30天</span>';
    $('#forecast-token').textContent = '预警 ' + s.forecastTokens + '/4 · 今晚已削弱' + (s.forecastReduction || 0);
    $('#mitigate-button').disabled = s.forecastTokens < 1 || (s.forecastReduction || 0) >= 12;
    $('#habitat-bars').innerHTML = ['water', 'meadow', 'forest'].map(r => '<article class="habitat route-' + r + '"><div><b>' + D.routes[r].icon + ' ' + D.routes[r].name + '</b><span>' + s.habitats[r] + '/3级</span></div><div class="habitat-pips">' + [1,2,3].map(n => '<i class="' + (s.habitats[r] >= n ? 'on' : '') + '"></i>').join('') + '</div><p>' + D.routes[r].benefit + '</p></article>').join('');
    const foliage = s.habitats.forest, grass = s.habitats.meadow, water = s.habitats.water;
    $('#island-world').innerHTML = '<div class="scene-sun"></div><div class="scene-cloud"></div><div class="scene-island"></div><div class="scene-river"></div><div class="scene-forest">' + (foliage ? '🌲'.repeat(foliage) + '🌳' : '🌱') + '</div><div class="scene-meadow">' + (grass ? '🌾'.repeat(grass) + '🌼' : '🌱') + '</div><div class="scene-water">' + (water ? '🪷'.repeat(water) : '〰') + '</div><div class="scene-animals">' + s.species.map(id => D.species.find(x => x.id === id).icon).join(' ') + '</div><span class="scene-caption">' + (s.species.length ? s.species.length + ' 种物种已定居' : '从生境开始，逐步恢复食物网') + '</span>';
    $('#system-strip').innerHTML = '<span>物种 ' + s.species.length + '/6：' + (s.species.length ? s.species.map(id => D.species.find(x => x.id === id).icon).join(' ') : '尚未引入') + '</span><span>设施 ' + s.facilities.length + '/3：' + (s.facilities.length ? s.facilities.map(id => D.facilities.find(x => x.id === id).icon).join(' ') : '尚未建设') + '</span>';
    const next = E.nextRoute[s.lastRoute];
    $('#combo-strip').innerHTML = '<span class="chain-label">生态连携</span><b class="' + (next === 'water' ? 'next' : '') + '">💧 水</b><span>→</span><b class="' + (next === 'meadow' ? 'next' : '') + '">🌼 草</b><span>→</span><b class="' + (next === 'forest' ? 'next' : '') + '">🌲 林</b><span>→ 💧</span><small>' + (next ? '接' + routeLabel(next) + '：额外护盾+3、研究+1' : '任意一系起手，顺序相接：护盾+3、研究+1') + ' · 通用牌不断链</small>';
    const hand = game.getHandCards(), center = (hand.length - 1) / 2, drawn = new Set(visual.drawnUids || []);
    $('#action-cards').innerHTML = hand.map(({ instance, card }, index) => {
      const distance = index - center;
      return cardHTML(card, s, instance.uid, {
        angle: +(distance * 2.2).toFixed(1), drop: Math.round(Math.pow(Math.abs(distance), 1.7) * 3),
        layer: Math.round(20 - Math.abs(distance) * 3), delay: index * 55, drawn: drawn.has(instance.uid)
      });
    }).join('') || '<div class="empty-hand">今日手牌已用完。可以巡护，或留1行动力给明天。</div>';
    $('#deck-counts').textContent = '抽牌 ' + s.deck.draw.length + ' · 弃牌 ' + s.deck.discard.length + ' · 今日已用 ' + s.deck.played.length + ' · 牌组 ' + Object.values(s.deck).flat().length;
    $('#daily-hint').textContent = s.day === 1 ? '先建草灌与湿地；物种迁入需有合适生境。' : s.pressure >= 7 ? '生态压力已使明日手牌减少；留意堆肥和高压反噬。' : '明天恢复3行动力，最多额外保留1点；手牌补至5张。';
    $('#last-log').textContent = s.lastLog;
    $('#guard-button').disabled = s.energy < 1;
    const swapsUsed = s.swapsUsed ?? (s.swapped ? 1 : 0);
    $('#swap-button').disabled = swapsUsed >= 2 || (swapsUsed === 1 && s.energy < 1) || !s.deck.hand.some(c => c.uid !== s.retained);
    $('#swap-button').textContent = swapsUsed === 0 ? '免费换牌 · 1/2' : swapsUsed === 1 ? '换牌 · 1⚡ · 2/2' : '今天已换2次';
    $('#end-day-button').textContent = d.damage ? '结束 · −' + d.damage + '生命' : '结束今天 →';
    $('#end-day-button').classList.toggle('risky', d.damage > 0);
  }
  function openGuide(s) {
    modal('<p class="eyebrow">30 DAYS / ECOLOGY CARD GAME</p><h2>先有生境，再形成食物网</h2><div class="guide-grid">' +
      '<article><b>01 · 守过今晚</b><p>冲击减去对应生境抵抗与护盾，剩余扣生命。预警标记可随时减轻今晚冲击3点。</p></article>' +
      '<article><b>02 · 建设与水分</b><p>草灌消耗2种子；湿地与森林还消耗2水分。资源不足时，建设牌会先补资源，不会空过。</p></article>' +
      '<article><b>03 · 引入物种</b><p>拖出「物种迁入」后选可定居的物种。蜜蜂与猫头鹰是完成课题的关键；兔群增产但可能推高压力。</p></article>' +
      '<article><b>04 · 设施只能放3座</b><p>拖出「设施规划」选永久设施；满槽时可替换。气象站、实验室等各自改变运营策略。</p></article>' +
      '<article><b>05 · 管理压力与天气</b><p>水分溢出、兔群失衡和入侵季会增加压力。压力≥4降低每天种子收入；≥7次日少抽1张；达到10今晚额外受4伤害。</p></article>' +
      '<article><b>06 · 完成三项课题</b><p>点击「生态课题」查看具体条件。每项需花5研究点提交。第30天结束时三项都完成且生命大于0，即获胜。</p></article></div>' +
      '<p class="modal-note">每天最多换牌两次：第一次免费，第二次花1行动力；已标记留到明天的牌不会被换掉。功能牌提示：接力行动零费获得1行动力；水力调度用2水分换1行动力；重新勘察换掉其余手牌；定向检索可指定1张手牌换新牌。换出的牌今天不会立刻抽回。连携顺序：水 → 草 → 林 → 水，每接对一次额外护盾+3、研究+1。每天3行动力，剩余最多带1点到次日；每5天可在营地调整牌组。存档保存在本浏览器；旧版远征仍在原存档键下，但本版不能继续。</p><button class="button primary" data-action="close-modal">开始规划</button>');
    if (s?.status === 'playing') $('#modal-root .modal-card > .button.primary')?.insertAdjacentHTML('beforebegin', '<button class="button" data-action="tutorial">重看逐步引导</button> ');
  }
  function openSpecies(s, uid) {
    const options = E.speciesOptions(s);
    modal('<p class="eyebrow">PERMANENT / FOOD WEB</p><h2>选择迁入物种</h2><p>物种永久生效；只有具备所需生境时才会出现。也可先做观察记录。</p><div class="choice-grid">' + options.map(x => '<button class="choice-card" data-permanent="species" data-uid="' + uid + '" data-id="' + x.id + '"><b>' + x.icon + ' ' + x.name + '</b><small>需要：' + x.needs + '</small><span>' + x.effect + '</span></button>').join('') +
      '<button class="choice-card" data-permanent="species" data-uid="' + uid + '" data-id="observe"><b>🔎 观察记录</b><small>不引入物种</small><span>立即获得2研究点。</span></button></div>');
  }
  function openFacilities(s, uid) {
    modal('<p class="eyebrow">PERMANENT / FACILITIES</p><h2>选择一座设施</h2><p>最多保留3座。满槽时选择新设施后，再指定替换哪一座。</p><div class="choice-grid">' + E.facilityOptions(s).map(x => '<button class="choice-card" data-permanent="facility" data-uid="' + uid + '" data-id="' + x.id + '"><b>' + x.icon + ' ' + x.name + '</b><small>永久设施 · ' + s.facilities.length + '/3槽</small><span>' + x.effect + '</span></button>').join('') + '<button class="choice-card" data-permanent="facility" data-uid="' + uid + '" data-id="survey"><b>📡 环境测绘</b><small>不建设</small><span>获得1个预警标记。</span></button></div>');
  }
  function openExchange(s, uid) {
    const card = E.getCard('targeted_exchange', s);
    const available = s.deck.draw.length + s.deck.discard.length;
    modal('<p class="eyebrow">TACTICS / HAND EXCHANGE</p><h2>定向检索：换哪张？</h2><p>选一张其他手牌移到「今日已用」，从牌组抽最多' + card.draw + '张新牌。当前可抽牌 ' + available + ' 张；旧牌明天才回到循环。</p><div class="choice-grid">' + s.deck.hand.filter(x => x.uid !== uid).map(x => {
      const target = E.getCard(x.cardId, s);
      return '<button class="choice-card" data-exchange="' + x.uid + '" data-uid="' + uid + '"' + (!available ? ' disabled' : '') + '><b>' + target.icon + ' ' + esc(target.title) + '</b><small>换掉这张</small><span>抽最多' + Math.min(card.draw, available) + '张新牌</span></button>';
    }).join('') + '<button class="choice-card" data-exchange="skip" data-uid="' + uid + '"><b>📡 保留手牌</b><small>不换牌</small><span>获得1个预警标记。</span></button></div>');
  }
  function openReplaceFacility(s, uid, id) {
    const target = D.facilities.find(x => x.id === id);
    modal('<h2>替换哪座旧设施？</h2><p>新设施：' + target.icon + ' ' + target.name + '。被替换设施的永久效果立即消失。</p><div class="choice-grid">' + s.facilities.map(old => { const x = D.facilities.find(f => f.id === old); return '<button class="choice-card" data-permanent="facility" data-uid="' + uid + '" data-id="' + id + '" data-replace="' + old + '"><b>替换 ' + x.icon + ' ' + x.name + '</b><span>' + x.effect + '</span></button>'; }).join('') + '</div><button class="button" data-action="close-modal">暂不建设</button>');
  }
  function openTopics(s) {
    if (!s) { openGuide(); return; }
    modal('<p class="eyebrow">ECOLOGICAL RESEARCH / ' + s.topics.length + ' OF 3</p><h2>生态课题</h2><p>每项完成时花费5研究点；当前有' + s.research + '点。三项都完成并守到第30天，即获胜。</p><div class="topic-list">' + D.topics.map(t => {
      const status = E.topicStatus(s, t.id), done = s.topics.includes(t.id);
      const labels = t.id === 'water_cycle' ? ['湿地≥2级', '水系危机至少一次无伤', '水分≥3'] : t.id === 'pollinator_web' ? ['草灌≥2级', '蜜蜂定居', '累计连携≥3次'] : ['森林≥2级', '猫头鹰定居', '林系危机至少一次无伤', '压力≤6'];
      return '<article class="topic-card ' + (done ? 'completed' : '') + '"><div><b>' + t.icon + ' ' + t.name + '</b><small>' + (done ? '已完成' : '花费5研究点') + '</small></div><p>' + labels.map((label,i) => '<span class="' + (status.checks[i] ? 'done' : '') + '">' + (status.checks[i] ? '✓ ' : '○ ') + label + '</span>').join('') + '</p><button class="button small ' + (status.ready ? 'primary' : '') + '" data-topic="' + t.id + '"' + (!status.ready ? ' disabled' : '') + '>' + (done ? '已经完成' : status.ready ? '提交课题 · −5研究' : '条件尚未满足') + '</button></article>';
    }).join('') + '</div>');
  }
  function openSystems(s) {
    if (!s) { openGuide(); return; }
    modal('<h2>食物网与设施</h2><p>物种 ' + s.species.length + '/6 · 设施 ' + s.facilities.length + '/3。设施满槽可用新设施替换。</p><div class="system-list"><h3>物种</h3>' + D.species.map(x => '<article class="' + (s.species.includes(x.id) ? 'owned' : '') + '"><b>' + x.icon + ' ' + x.name + (s.species.includes(x.id) ? ' ✓' : '') + '</b><small>' + x.needs + '</small><span>' + x.effect + '</span></article>').join('') + '<h3>设施</h3>' + D.facilities.map(x => '<article class="' + (s.facilities.includes(x.id) ? 'owned' : '') + '"><b>' + x.icon + ' ' + x.name + (s.facilities.includes(x.id) ? ' ✓' : '') + '</b><span>' + x.effect + '</span></article>').join('') + '</div>');
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
  function playSwapAnimation(uids) {
    const cards = uids.map(uid => document.querySelector('[data-card-uid="' + uid + '"]')).filter(Boolean);
    cards.forEach(card => card.classList.add('card-swap-out'));
    if (!cards.length || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return Promise.resolve();
    return new Promise(resolve => setTimeout(resolve, 220));
  }
  function flashCombo(count = 1) {
    const banner = $('#combo-banner');
    const tier = count >= 3 ? { name: 'excellent', label: 'EXCELLENT!' } :
      count === 2 ? { name: 'great', label: 'GREAT!' } : { name: 'good', label: 'GOOD!' };
    const sparks = [[-82,-24],[-48,-50],[0,-58],[50,-48],[84,-18],[62,38],[4,52],[-60,36]];
    clearTimeout(comboTimer);
    ['visible', 'combo-good', 'combo-great', 'combo-excellent'].forEach(name => banner.classList.remove(name));
    banner.innerHTML = '<strong>' + tier.label + '</strong><span>生态连携 ×' + count + '</span><small>护盾 +3 · 研究 +1</small>' +
      sparks.map((point, index) => '<i style="--spark-x:' + point[0] + 'px;--spark-y:' + point[1] + 'px;--spark-delay:' + index * 22 + 'ms"></i>').join('');
    void banner.offsetWidth;
    banner.classList.add('combo-' + tier.name, 'visible');
    comboTimer = setTimeout(() => banner.classList.remove('visible'), 1400);
  }
  function renderResults(s) {
    const o = E.objectives(s), won = s.status === 'won';
    $('#results-screen').innerHTML = '<div class="results-wrap"><p class="eyebrow">EXPEDITION / ' + s.seed + '</p><span class="result-icon">' + (won ? '🌳' : '🌱') + '</span><h1>' + (won ? '岛屿，学会了共生' : s.status === 'lost' ? '这次远征止步于第' + s.day + '天' : '守住了岛屿，课题尚未完成') + '</h1><p>' + (won ? '三项生态课题完成，食物网通过了30天的检验。' : s.status === 'lost' ? '生命归零。下次可更早建设对应生境，并在大考验前准备预警与防御。' : '未完成：' + D.topics.filter(t => !s.topics.includes(t.id)).map(t => t.name).join('、') + '。') + '</p><div class="result-stats"><article><b>' + s.hp + '</b><small>剩余生命</small></article><article><b>' + o.topics + '/3</b><small>生态课题</small></article><article><b>' + s.species.length + '</b><small>定居物种</small></article><article><b>' + s.combos + '</b><small>触发连携</small></article></div><details><summary>查看每晚记录</summary><div class="history-list">' + s.history.map(h => '<span>第' + h.day + '天 · ' + h.name + ' · ' + (h.damage ? '损失' + h.damage + '生命' : '平安') + '</span>').join('') + '</div></details><button class="button primary" data-action="confirm-new">再规划一座岛 →</button><button class="button" data-action="deck">回顾牌组</button><button class="button" data-action="topics">回顾课题</button></div>';
    showScreen('results-screen');
  }
  window.IslandUI = { showScreen, render, toast, isModalOpen, closeModal, openGuide, openDeck, openCamp, openCampList, openSpecies, openFacilities, openReplaceFacility, openExchange, openTopics, openSystems, startTutorial, stopTutorial, confirmNew, playCardAnimation, playSwapAnimation, flashCombo, renderResults };
})();
