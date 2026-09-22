/* UI coordinator: pure rules, persistence, and pointer-anchored upward release. */
(function () {
  const E = window.Ecosystem, U = window.IslandUI;
  const KEY = 'island-expedition-v4';
  const Game = {
    state: null, busy: false,
    save() {
      try { if (this.state) localStorage.setItem(KEY, JSON.stringify(this.state)); }
      catch (_) { /* Play remains available if browser storage is disabled. */ }
    },
    readSave() {
      try {
        const s = JSON.parse(localStorage.getItem(KEY));
        return s?.version === 4 && s.day >= 1 && s.day <= 30 && s.deck?.hand && s.forecasts?.length === 30 && Array.isArray(s.topics) ? s : null;
      } catch (_) { return null; }
    },
    render(visual = {}) {
      this.save();
      if (this.state.status !== 'playing') U.renderResults(this.state);
      else U.render(this.state, this, visual);
    },
    startNew(seed) {
      if (this.busy) return;
      this.pendingCampDraw = null;
      U.closeModal(); this.state = E.createInitialState(seed);
      U.showScreen('game-screen'); this.render({ drawnUids: this.state.deck.hand.map(card => card.uid) });
      U.startTutorial({ auto: true });
    },
    resume() {
      const s = this.readSave();
      if (!s) { U.toast('没有可继续的远征。'); return; }
      this.pendingCampDraw = null;
      this.state = s; U.showScreen('game-screen'); this.render();
      if (s.rewardPending) this.openCamp();
      else if (s.status === 'playing') U.startTutorial({ auto: true });
    },
    getHandCards() { return this.state.deck.hand.map(instance => ({ instance, card: E.getCard(instance.cardId, this.state) })); },
    async selectCard(uid, choice) {
      if (this.busy || U.isModalOpen() || !this.state || this.state.status !== 'playing') return;
      const c = this.getHandCards().find(x => x.instance.uid === uid)?.card;
      if (!c) return;
      if (this.state.energy < E.effectiveCost(this.state, c)) { U.toast('行动力不足；可留到明天，或结束今天恢复行动力。'); return; }
      if (c.hurt && this.state.hp <= c.hurt) { U.toast('生命不足，无法支付动员代价。'); return; }
      if (!choice && c.speciesChoice) { U.openSpecies(this.state, uid); return; }
      if (!choice && c.facilityChoice) { U.openFacilities(this.state, uid); return; }
      if (!choice && c.replaceChoice) { U.openExchange(this.state, uid); return; }
      this.busy = true;
      try {
        const oldHand = new Set(this.state.deck.hand.map(card => card.uid));
        const effect = E.play(this.state, uid, choice);
        if (effect) {
          this.save(); await U.playCardAnimation(uid);
          window.IslandAudio.choice();
          this.render({ drawnUids: this.state.deck.hand.filter(card => !oldHand.has(card.uid)).map(card => card.uid) });
          if (effect.combo) U.flashCombo();
        }
      } finally { this.busy = false; }
    },
    choosePermanent(kind, uid, id, replace) {
      if (!this.state || this.busy) return;
      if (kind === 'facility' && id !== 'survey' && this.state.facilities.length >= 3 && !replace) {
        U.openReplaceFacility(this.state, uid, id); return;
      }
      U.closeModal();
      return this.selectCard(uid, kind === 'species' ? { species: id } : id === 'survey' ? { facility: null } : { facility: id, replace });
    },
    chooseExchange(uid, targetUid) {
      if (!this.state || this.busy) return;
      U.closeModal();
      return this.selectCard(uid, { replaceCard: targetUid });
    },
    completeTopic(id) {
      if (!this.state || !E.completeTopic(this.state, id)) { U.toast('条件或研究点尚未满足。'); return; }
      U.openTopics(this.state); this.render();
    },
    endRound() {
      if (this.busy || U.isModalOpen() || !this.state) return;
      const previousDay = this.state.day, retained = this.state.retained;
      E.endDay(this.state);
      const drawnUids = this.state.day > previousDay ? this.state.deck.hand.filter(card => card.uid !== retained).map(card => card.uid) : [];
      if (this.state.rewardPending) this.pendingCampDraw = drawnUids;
      this.render({ drawnUids: this.state.rewardPending ? [] : drawnUids });
      if (this.state.rewardPending && this.state.status === 'playing') this.openCamp();
    },
    openCamp() {
      if (!this.state.rewardChoices) { this.state.rewardChoices = E.rewardOptions(this.state); this.save(); }
      U.openCamp(this.state, this.state.rewardChoices);
    },
    chooseReward(type, id) {
      if (!this.state || !E.reward(this.state, type, id, this.state.rewardChoices || [])) return;
      delete this.state.rewardChoices; U.closeModal(); this.render({ drawnUids: this.pendingCampDraw || [] }); this.pendingCampDraw = null;
    },
    async swapHand() {
      if (this.busy || U.isModalOpen() || !this.state) return;
      const oldHand = this.state.deck.hand.map(card => card.uid);
      const retained = this.state.retained;
      if (!E.swap(this.state)) return;
      this.busy = true;
      try {
        this.save();
        await U.playSwapAnimation(oldHand.filter(uid => uid !== retained));
        this.render({ drawnUids: this.state.deck.hand.filter(card => card.uid !== retained).map(card => card.uid) });
      } finally { this.busy = false; }
    },
    retain(uid) {
      if (this.busy || !this.state || this.state.rewardPending || !this.state.deck.hand.some(c => c.uid === uid)) return;
      this.state.retained = this.state.retained === uid ? null : uid; this.render();
    },
    action(name) {
      if (this.busy) return;
      if (name === 'start') {
        const old = this.readSave();
        if (old?.status === 'playing') { U.confirmNew(); return; }
        this.startNew(); return;
      }
      if (name === 'confirm-new') { this.startNew(); return; }
      if (name === 'continue') { this.resume(); return; }
      if (name === 'restart') { U.confirmNew(); return; }
      if (name === 'guide') { U.openGuide(this.state); return; }
      if (name === 'tutorial') {
        if (!this.state || this.state.status !== 'playing') return;
        U.closeModal(); U.startTutorial(); return;
      }
      if (name === 'deck') { U.openDeck(this.state); return; }
      if (name === 'topics') { U.openTopics(this.state); return; }
      if (name === 'systems') { U.openSystems(this.state); return; }
      if (name === 'close-modal') { U.closeModal(); return; }
      if (name === 'camp-upgrade' || name === 'camp-remove') { U.openCampList(this.state, name === 'camp-upgrade' ? 'upgrade' : 'remove'); return; }
      if (name === 'camp-back') { this.openCamp(); return; }
      if (U.isModalOpen()) return;
      if (name === 'end-day') { this.endRound(); return; }
      if (!this.state || this.state.status !== 'playing') return;
      if (name === 'swap') { this.swapHand(); return; }
      if (name === 'guard') E.guard(this.state);
      if (name === 'mitigate') E.mitigate(this.state);
      this.render();
    }
  };
  window.Game = Game;
  let suppressClick = 0, drag = null;
  document.addEventListener('click', event => {
    if (Date.now() < suppressClick) return;
    const reward = event.target.closest('[data-reward]');
    if (reward) { Game.chooseReward(reward.dataset.reward, reward.dataset.id); return; }
    const permanent = event.target.closest('[data-permanent]');
    if (permanent) { Game.choosePermanent(permanent.dataset.permanent, permanent.dataset.uid, permanent.dataset.id, permanent.dataset.replace); return; }
    const exchange = event.target.closest('[data-exchange]');
    if (exchange) { Game.chooseExchange(exchange.dataset.uid, exchange.dataset.exchange); return; }
    const topic = event.target.closest('[data-topic]');
    if (topic) { Game.completeTopic(topic.dataset.topic); return; }
    const keep = event.target.closest('[data-keep]');
    if (keep) { Game.retain(keep.dataset.keep); return; }
    const button = event.target.closest('[data-action]');
    if (button) { Game.action(button.dataset.action); return; }
    if (event.target.closest('[data-card-uid]')) U.toast('按住牌向上拖动，看到绿色提示后松手。也可按 Enter 出牌。');
  });
  document.addEventListener('keydown', event => {
    if (event.target.closest('button, select, input')) return;
    const card = event.target.closest('[data-card-uid]');
    if (card && ['Enter', ' '].includes(event.key)) { event.preventDefault(); Game.selectCard(card.dataset.cardUid); }
    if (event.key === 'Escape' && !Game.state?.rewardPending) U.closeModal();
  });
  const DRAG_THRESHOLD = 72;
  function restore(current) {
    if (current.placeholder?.parentNode) current.placeholder.replaceWith(current.card);
    current.card.classList.remove('dragging-card', 'ready-to-play');
    if (current.originalStyle !== null && current.card.setAttribute) current.card.setAttribute('style', current.originalStyle);
    else current.card.removeAttribute('style');
    document.body.classList.remove('card-drag-active');
    document.querySelector('#play-drop-zone')?.classList.remove('active');
  }
  document.addEventListener('pointerdown', event => {
    if (event.target.closest('button') || drag || Game.busy || U.isModalOpen()) return;
    const card = event.target.closest('[data-card-uid]');
    if (!card || event.button !== 0) return;
    const rect = card.getBoundingClientRect();
    drag = { card, uid: card.dataset.cardUid, pointerId: event.pointerId, rect, startX: event.clientX, startY: event.clientY,
      offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top, active: false, placeholder: null,
      originalStyle: card.getAttribute?.('style') ?? null };
    card.setPointerCapture?.(event.pointerId);
  });
  document.addEventListener('pointermove', event => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const up = drag.startY - event.clientY;
    if (!drag.active && up > 7 && up > Math.abs(event.clientX - drag.startX) * .65) {
      drag.active = true; drag.placeholder = document.createElement('div');
      drag.placeholder.className = 'card-placeholder';
      Object.assign(drag.placeholder.style, { width: drag.rect.width + 'px', height: drag.rect.height + 'px' });
      drag.card.parentNode.insertBefore(drag.placeholder, drag.card);
      document.body.appendChild(drag.card); drag.card.classList.remove('card-dealt'); drag.card.classList.add('dragging-card');
      Object.assign(drag.card.style, { position: 'fixed', width: drag.rect.width + 'px', height: drag.rect.height + 'px', zIndex: 4000, margin: '0', transform: 'none' });
      drag.card.setPointerCapture?.(event.pointerId);
      document.body.classList.add('card-drag-active');
    }
    if (drag.active) {
      event.preventDefault();
      drag.card.style.left = (event.clientX - drag.offsetX) + 'px';
      drag.card.style.top = (event.clientY - drag.offsetY) + 'px';
      drag.card.classList.toggle('ready-to-play', up >= DRAG_THRESHOLD);
      document.querySelector('#play-drop-zone')?.classList.toggle('active', up >= DRAG_THRESHOLD);
    }
  }, { passive: false });
  function finish(event, cancelled = false) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const current = drag;
    const use = !cancelled && current.active && current.startY - event.clientY >= DRAG_THRESHOLD;
    restore(current); drag = null;
    if (current.active) suppressClick = Date.now() + 350;
    if (use) Game.selectCard(current.uid);
  }
  document.addEventListener('pointerup', e => finish(e));
  document.addEventListener('pointercancel', e => finish(e, true));
  window.addEventListener('blur', () => { if (drag) { restore(drag); drag = null; } });
  U.showScreen('start-screen');
  const saved = Game.readSave();
  const resume = document.querySelector('[data-action="continue"]');
  if (resume) { resume.hidden = !saved; if (saved) resume.textContent = saved.status === 'playing' ? '继续第 ' + saved.day + ' 天' : '查看上次远征'; }
})();
