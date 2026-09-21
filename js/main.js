/* Game coordinator: deck instances, forecasts and the day-by-day flow. */
(function () {
  const data = window.IslandData;
  const eco = window.Ecosystem;
  const ui = window.IslandUI;
  const audio = window.IslandAudio;
  const HAND_SIZE = 5;

  function shuffle(items) {
    const copy = items.slice();
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const other = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[other]] = [copy[other], copy[index]];
    }
    return copy;
  }

  const Game = {
    state: null,
    busy: false,
    uidCounter: 0,

    makeInstance(cardId) { this.uidCounter += 1; return { uid: `card-${this.uidCounter}`, cardId }; },

    setupDeck() {
      this.state.upgrades = {};
      this.state.energy = { current: 3, max: 3, reserve: 0 };
      this.state.deck = {
        drawPile: shuffle(data.starterDeck.map((id) => this.makeInstance(id))),
        discardPile: [], hand: [], exhaustPile: []
      };
      this.state.cardsPlayedThisRound = 0;
      this.drawCards(HAND_SIZE);
    },

    getInstance(uid) {
      return ['hand', 'drawPile', 'discardPile', 'exhaustPile'].reduce((found, key) => found || this.state.deck[key].find((item) => item.uid === uid), null);
    },
    getInstanceCard(uid) {
      const instance = this.getInstance(uid);
      return instance ? eco.getCard(instance.cardId, this.state) : null;
    },
    getHandCards() {
      return this.state.deck.hand.map((instance) => ({ instance, card: eco.getCard(instance.cardId, this.state) })).filter((entry) => entry.card);
    },

    getRecommendation() {
      const playable = this.getHandCards().filter(({ card }) => {
        if (card.cost > this.state.energy.current) return false;
        return !card.target || eco.validTargets(this.state, card).length > 0;
      });
      if (!playable.length) return null;
      const status = playable.find(({ card }) => card.type === '负面');
      if (status) return { ...status, reason: '负面牌会继续伤害岛屿，能处理时优先处理。' };

      const nextForecast = this.state.forecasts && this.state.forecasts[0];
      const crisis = nextForecast ? data.crises.find((item) => item.id === nextForecast.crisisId) : null;
      const counters = {
        drought: ['restore_wetland', 'groundwater', 'water_watch', 'restore_stream'],
        flood: ['restore_wetland', 'plant_forest', 'groundwater'],
        rabbit_boom: ['fox_sanctuary', 'eco_corridor', 'plant_shrubs'],
        spill: ['cleanup', 'aquatic_plants', 'restore_wetland'],
        visitors: ['visitor_limits', 'ranger_patrol', 'shore_cleanup'],
        wildfire: ['controlled_burn', 'groundwater', 'restore_wetland'],
        invasion: ['invasive_control', 'ranger_patrol', 'plant_shrubs'],
        cold_snap: ['insect_hotel', 'pollinator_garden', 'plant_forest']
      };
      if (crisis) {
        const preferred = counters[crisis.id] || [];
        const counter = preferred.map((id) => playable.find(({ card }) => card.id === id)).find(Boolean);
        if (counter) return { ...counter, reason: `它能为“${crisis.name}”提前做准备。` };
      }

      const score = ({ card }) => {
        let value = card.action === 'project' ? 9 : card.action === 'trait' ? 7 : card.action === 'clean' ? 6 : card.action === 'policy' ? 5 : 3;
        if (card.id === 'cleanup') value += eco.totalPollution(this.state) * 2;
        if (card.id === 'native_flowers' && !eco.hasTrait(this.state, 'flowers')) value += 6;
        if (card.id === 'sow_meadow' && eco.terrainCount(this.state, 'meadow') < 2) value += 5;
        if (card.id === 'plant_forest' && eco.terrainCount(this.state, 'forest') < 2) value += 4;
        if (card.policy && this.state.policies[card.policy]) value -= 8;
        value -= card.cost * 0.4;
        return value;
      };
      playable.sort((a, b) => score(b) - score(a));
      const chosen = playable[0];
      const reasons = {
        project: '先建立基础栖息地，后续物种和 Combo 才有条件出现。',
        trait: '它能补上生态结构缺少的一环。',
        clean: '污染会削弱整个岛屿，尽早治理更安全。',
        policy: '政策一旦生效，会在之后的日子持续提供保护。',
        draw: '它能增加今天的选择。',
        focus: '它能补充行动力并带来更多选择。',
        purge: '它能保持牌组干净，避免坏牌越积越多。'
      };
      return { ...chosen, reason: reasons[chosen.card.action] || '它符合当前岛屿的恢复条件。' };
    },

    recycleDeck() {
      if (this.state.deck.drawPile.length || !this.state.deck.discardPile.length) return;
      this.state.deck.drawPile = shuffle(this.state.deck.discardPile);
      this.state.deck.discardPile = [];
    },
    drawCards(count) {
      let drawn = 0;
      while (drawn < count && this.state.deck.hand.length < 8) {
        this.recycleDeck();
        if (!this.state.deck.drawPile.length) break;
        this.state.deck.hand.push(this.state.deck.drawPile.pop());
        drawn += 1;
      }
      return drawn;
    },

    ensureForecasts() {
      const queue = this.state.forecasts;
      while (queue.length < 3) {
        const lastDue = queue.length ? queue[queue.length - 1].dueTurn : Math.max(2, this.state.turn + 1);
        const lastIds = queue.slice(-2).map((item) => item.crisisId);
        let pool = data.crises.filter((crisis) => !lastIds.includes(crisis.id));
        if (this.state.turn < 25) pool = pool.filter((crisis) => !['wildfire', 'rabbit_boom'].includes(crisis.id));
        if (this.state.turn < 40) pool = pool.filter((crisis) => crisis.id !== 'rabbit_boom' || this.state.species.rabbit > 0);
        if (!pool.length) pool = data.crises;
        const crisis = pool[Math.floor(Math.random() * pool.length)];
        const spacing = this.state.policies.water_watch && crisis.id === 'drought' ? 15 : 10;
        const dueTurn = lastDue + spacing;
        if (dueTurn > this.state.totalTurns) break;
        queue.push({ crisisId: crisis.id, dueTurn });
      }
      queue.sort((a, b) => a.dueTurn - b.dueTurn);
    },

    startNew(showTutorial) {
      this.busy = false;
      this.uidCounter = 0;
      this.state = eco.createInitialState();
      this.setupDeck();
      this.ensureForecasts();
      ui.showScreen('game-screen');
      ui.render(this.state, this);
      if (showTutorial) ui.openGuide();
    },

    chooseAutomaticTarget(card, validIds) {
      const scored = validIds.map((id) => {
        const tile = eco.tileById(this.state, id);
        const nearby = eco.neighbors(this.state, id);
        let score = tile.maturity * 2 - tile.pollution * 2 - tile.stress;
        if (card.action === 'clean') score = tile.pollution * 12 + tile.stress * 2;
        if (card.action === 'cleanse_tile') score = tile.stress * 12 + tile.pollution * 3;
        if (card.action === 'project') {
          score = (tile.terrain === 'barren' ? 8 : 2) - tile.pollution * 3;
          score += eco.terrainCount(this.state, tile.terrain) * 3;
          if (card.terrain === 'forest' && nearby.some((other) => ['stream', 'wetland'].includes(other.terrain))) score += 10;
          if (card.terrain === 'meadow' && nearby.some((other) => other.terrain === 'shrub')) score += 8;
          if (card.terrain === 'shrub' && nearby.some((other) => ['meadow', 'forest'].includes(other.terrain))) score += 8;
          if (card.terrain === 'wetland' && nearby.some((other) => other.terrain === 'stream')) score += 14;
        }
        if (card.action === 'trait') {
          if (card.trait === 'flowers' && nearby.some((other) => other.terrain === 'shrub')) score += 14;
          if (card.trait === 'aquatic' && nearby.some((other) => other.terrain === 'stream')) score += 14;
          if (card.trait === 'insect_hotel' && (tile.traits.includes('flowers') || nearby.some((other) => other.traits.includes('flowers')))) score += 12;
          if (card.trait === 'nest_boxes' && tile.terrain === 'forest') score += tile.maturity * 5;
          if (card.trait === 'corridor') score += new Set(nearby.map((other) => other.terrain)).size * 5;
          if (card.trait === 'frog_pond' && tile.traits.includes('aquatic')) score += 15;
          if (card.trait === 'old_tree') score += tile.maturity * 6;
          if (card.trait === 'water_storage') score += tile.stress * 4 + (tile.terrain === 'forest' ? 5 : 0);
        }
        if (card.action === 'introduce') {
          score += tile.maturity * 5;
          if (card.species === 'fox' && (tile.traits.includes('corridor') || nearby.some((other) => other.traits.includes('corridor')))) score += 15;
        }
        return { id, score };
      });
      scored.sort((a, b) => b.score - a.score || a.id - b.id);
      return scored[0].id;
    },

    async selectCard(uid) {
      if (this.busy || !this.state) return;
      const instance = this.state.deck.hand.find((item) => item.uid === uid);
      if (!instance) return;
      const card = eco.getCard(instance.cardId, this.state);
      if (this.state.energy.current < card.cost) { ui.toast(`能量不足：${card.title}需要 ${card.cost} 点。`); return; }
      let targetId = null;
      if (card.target) {
        const valid = eco.validTargets(this.state, card);
        if (!valid.length) {
          ui.toast(card.action === 'project' ? '当前没有安全的改造位置；系统不会覆盖最后一块生境。' : '当前岛屿还不满足这张牌的生态条件。');
          return;
        }
        targetId = this.chooseAutomaticTarget(card, valid);
      }
      await this.playInstance(uid, targetId);
    },

    removeStatusFromDiscard(preferredId) {
      const index = this.state.deck.discardPile.findIndex((instance) => {
        const card = eco.getCard(instance.cardId, this.state);
        return card.type === '负面' && (!preferredId || instance.cardId === preferredId);
      });
      if (index < 0) return null;
      return this.state.deck.discardPile.splice(index, 1)[0];
    },

    resolvePlayedStatus(card) {
      let candidates;
      if (card.status === 'dry_soil') candidates = this.state.tiles.filter((tile) => ['forest', 'meadow', 'shrub'].includes(tile.terrain) && tile.stress > 0);
      if (card.status === 'toxic_sediment') candidates = this.state.tiles.filter((tile) => ['stream', 'wetland'].includes(tile.terrain) && tile.pollution > 0);
      if (card.status === 'overgrazing') candidates = this.state.tiles.filter((tile) => ['meadow', 'shrub'].includes(tile.terrain) && tile.stress > 0);
      if (card.status === 'invasive_vine') candidates = this.state.tiles.filter((tile) => tile.stress > 0);
      if (candidates && candidates.length) {
        candidates.sort((a, b) => (b.stress + b.pollution) - (a.stress + a.pollution));
        candidates[0].stress = Math.max(0, candidates[0].stress - 1);
        candidates[0].pollution = Math.max(0, candidates[0].pollution - 1);
      }
      this.state.lastLog = { icon: card.icon, title: `处理：${card.title}`, text: '这张负面牌已从本局移除，并缓解了对应生态压力。' };
    },

    async playInstance(uid, targetId) {
      const instance = this.state.deck.hand.find((item) => item.uid === uid);
      if (!instance || this.busy) return;
      const card = eco.getCard(instance.cardId, this.state);
      if (this.state.energy.current < card.cost) return;
      this.busy = true;
      await ui.playCardAnimation(uid);
      this.state.energy.current -= card.cost;
      const discoveredBefore = new Set(this.state.discoveredNetworks);

      const handIndex = this.state.deck.hand.findIndex((item) => item.uid === uid);
      this.state.deck.hand.splice(handIndex, 1);
      if (card.exhaust || card.type === '负面') this.state.deck.exhaustPile.push(instance);
      else this.state.deck.discardPile.push(instance);

      eco.playCard(this.state, card, targetId);
      if (card.action === 'status') this.resolvePlayedStatus(card);
      if (card.action === 'purge') {
        const removed = this.removeStatusFromDiscard();
        if (removed) this.state.lastLog = { icon: card.icon, title: card.title, text: `永久移除了「${eco.getCard(removed.cardId, this.state).title}」。` };
        else { this.state.energy.current += 1; this.state.lastLog = { icon: card.icon, title: card.title, text: '弃牌堆没有负面牌，返还了1点能量。' }; }
      }
      if (card.action === 'cleanse_tile') {
        const removed = this.removeStatusFromDiscard('invasive_vine');
        if (removed) this.state.lastLog.text += ' 同时永久移除一张入侵藤蔓。';
      }
      if (card.energy) this.state.energy.current += card.energy;
      if (card.draw) this.drawCards(card.draw);
      this.state.cardsPlayedThisRound += 1;
      eco.derive(this.state);
      const newNetworks = this.state.discoveredNetworks.filter((id) => !discoveredBefore.has(id));
      this.busy = false;
      audio.choice();
      ui.render(this.state, this);
      if (newNetworks.length) { audio.success(); ui.flashNetwork(newNetworks); }
    },

    addStatus(cardId) { this.state.deck.discardPile.push(this.makeInstance(cardId)); },

    rewardOptions() {
      const ownedCounts = {};
      ['drawPile', 'discardPile', 'hand', 'exhaustPile'].forEach((key) => this.state.deck[key].forEach((instance) => { ownedCounts[instance.cardId] = (ownedCounts[instance.cardId] || 0) + 1; }));
      const pool = data.cards.filter((card) => card.rarity !== '状态' && (card.unlockTurn || 0) <= this.state.turn + 1 && (ownedCounts[card.id] || 0) < 2);
      return shuffle(pool).slice(0, 3).map((card) => eco.getCard(card.id, this.state));
    },

    upgradeOptions() {
      const owned = new Set();
      ['drawPile', 'discardPile', 'hand', 'exhaustPile'].forEach((key) => this.state.deck[key].forEach((instance) => owned.add(instance.cardId)));
      return shuffle(data.cards.filter((card) => owned.has(card.id) && card.upgrade && !this.state.upgrades[card.id])).slice(0, 3);
    },

    async handleRewards(milestoneResult) {
      if (this.state.turn % 10 === 0) {
        const options = this.rewardOptions();
        if (options.length) {
          const choice = await ui.showReward(options);
          if (choice) {
            this.state.deck.discardPile.push(this.makeInstance(choice));
            this.state.lastLog = { icon: '▰', title: '牌组获得新方案', text: `「${eco.getCard(choice, this.state).title}」已加入弃牌堆。` };
          } else {
            this.state.energy.reserve += 1;
            this.state.lastLog = { icon: '⚡', title: '保持精简', text: '你跳过了卡牌奖励，明天获得额外1点能量。' };
          }
        }
      }
      if (milestoneResult && milestoneResult.success && milestoneResult.turn % 20 === 0) {
        const options = this.upgradeOptions();
        if (options.length) {
          const choice = await ui.showUpgrade(options);
          this.state.upgrades[choice] = true;
          this.state.lastLog = { icon: '✦', title: '行动方案已升级', text: `此后所有「${data.cards.find((card) => card.id === choice).title}」都会以强化形态出现。` };
        }
      }
    },

    async endRound() {
      if (this.busy || !this.state) return;
      this.busy = true;
      const heldStatusIds = this.state.deck.hand.map((instance) => eco.getCard(instance.cardId, this.state)).filter((card) => card.type === '负面').map((card) => card.id);
      this.state.deck.discardPile.push(...this.state.deck.hand);
      this.state.deck.hand = [];
      eco.processRound(this.state, heldStatusIds);
      if (heldStatusIds.includes('invasive_vine') && Math.random() < 0.08 && !this.state.policies.ranger_patrol) this.addStatus('invasive_vine');

      const due = this.state.forecasts.filter((forecast) => forecast.dueTurn <= this.state.turn);
      this.state.forecasts = this.state.forecasts.filter((forecast) => forecast.dueTurn > this.state.turn);
      for (const forecast of due) {
        const crisis = data.crises.find((item) => item.id === forecast.crisisId);
        const result = eco.resolveCrisis(this.state, crisis);
        result.statusIds.forEach((id) => this.addStatus(id));
        if (result.success && this.state.policies.ranger_patrol) this.removeStatusFromDiscard('disturbance');
        audio.event();
        await ui.showCrisis(crisis, result);
      }
      this.ensureForecasts();

      const milestone = data.milestones.find((item) => item.turn === this.state.turn);
      let milestoneResult = null;
      if (milestone) {
        milestoneResult = eco.evaluateMilestone(this.state, milestone);
        this.state.milestones.records.push({ turn: milestone.turn, success: milestoneResult.success });
        await ui.showMilestone(milestoneResult);
      }
      if (this.state.turn < this.state.totalTurns) await this.handleRewards(milestoneResult);

      if (this.state.turn >= this.state.totalTurns) {
        this.busy = false;
        ui.renderResults(this.state, () => this.startNew(false));
        return;
      }
      this.state.turn += 1;
      this.state.day = this.state.turn;
      if ([35, 70].includes(this.state.turn)) {
        this.state.energy.max += 1;
        ui.toast(`生态行动力上限提升为 ${this.state.energy.max}。`);
      }
      this.state.energy.current = this.state.energy.max + this.state.energy.reserve;
      this.state.energy.reserve = 0;
      this.state.cardsPlayedThisRound = 0;
      this.drawCards(HAND_SIZE);
      eco.derive(this.state);
      this.busy = false;
      ui.render(this.state, this);
    }
  };

  window.Game = Game;

  let suppressCardClickUntil = 0;
  document.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]');
    if (action) {
      const name = action.dataset.action;
      if (name === 'start') Game.startNew(true);
      if (name === 'open-codex') ui.openCodex(Game.state);
      if (name === 'open-network') ui.openNetwork(Game.state);
      if (name === 'open-guide' || name === 'show-guide') ui.openGuide();
      if (name === 'end-day') Game.endRound();
      if (name === 'restart' && Game.state && window.confirm('放弃当前岛屿并重新开始吗？')) Game.startNew(false);
      return;
    }
    const card = event.target.closest('[data-card-uid]');
    if (card && Date.now() >= suppressCardClickUntil && !card.classList.contains('dragging-card')) ui.toast('请把卡牌向上拖动并松手使用。');
  });

  document.addEventListener('keydown', (event) => {
    const card = event.target.closest && event.target.closest('[data-card-uid]');
    if (card && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      Game.selectCard(card.dataset.cardUid);
    }
  });

  let drag = null;
  const DRAG_THRESHOLD = 92;
  function restoreDraggedCard(animate) {
    if (!drag) return;
    const current = drag;
    const restore = () => {
      if (current.placeholder && current.placeholder.parentNode) current.placeholder.replaceWith(current.card);
      current.card.classList.remove('dragging-card', 'drag-return');
      current.card.removeAttribute('style');
      document.body.classList.remove('card-drag-active');
    };
    if (animate && current.active) {
      current.card.classList.add('drag-return');
      current.card.style.left = `${current.rect.left}px`;
      current.card.style.top = `${current.rect.top}px`;
      setTimeout(restore, 170);
    } else restore();
  }

  document.addEventListener('pointerdown', (event) => {
    const card = event.target.closest('[data-card-uid]');
    if (!card || event.button !== 0 || Game.busy) return;
    const rect = card.getBoundingClientRect();
    drag = {
      card, uid: card.dataset.cardUid, pointerId: event.pointerId,
      startX: event.clientX, startY: event.clientY, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top,
      rect, active: false, placeholder: null, lastY: event.clientY
    };
    card.setPointerCapture && card.setPointerCapture(event.pointerId);
  });

  document.addEventListener('pointermove', (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag.lastY = event.clientY;
    const upward = drag.startY - event.clientY;
    const horizontal = Math.abs(event.clientX - drag.startX);
    if (!drag.active && upward > 7 && upward > horizontal * 0.65) {
      drag.active = true;
      drag.placeholder = document.createElement('div');
      drag.placeholder.className = 'card-placeholder';
      drag.placeholder.style.width = `${drag.rect.width}px`;
      drag.placeholder.style.height = `${drag.rect.height}px`;
      drag.card.parentNode.insertBefore(drag.placeholder, drag.card);
      document.body.appendChild(drag.card);
      drag.card.classList.add('dragging-card');
      Object.assign(drag.card.style, { position: 'fixed', width: `${drag.rect.width}px`, height: `${drag.rect.height}px`, zIndex: 4000, margin: '0', transform: 'none' });
      document.body.classList.add('card-drag-active');
    }
    if (drag.active) {
      event.preventDefault();
      drag.card.style.left = `${event.clientX - drag.offsetX}px`;
      drag.card.style.top = `${event.clientY - drag.offsetY}px`;
      drag.card.classList.toggle('ready-to-play', drag.startY - event.clientY >= DRAG_THRESHOLD);
      const zone = document.querySelector('#play-drop-zone');
      if (zone) zone.classList.toggle('active', drag.startY - event.clientY >= DRAG_THRESHOLD);
    }
  }, { passive: false });

  function finishDrag(event) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const current = drag;
    const success = current.active && current.startY - event.clientY >= DRAG_THRESHOLD;
    document.querySelector('#play-drop-zone')?.classList.remove('active');
    if (success) {
      suppressCardClickUntil = Date.now() + 350;
      restoreDraggedCard(false);
      drag = null;
      Game.selectCard(current.uid);
    } else {
      restoreDraggedCard(true);
      drag = null;
    }
  }
  document.addEventListener('pointerup', finishDrag);
  document.addEventListener('pointercancel', finishDrag);

  ui.showScreen('start-screen');
})();
