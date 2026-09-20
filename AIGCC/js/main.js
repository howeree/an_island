/* Game coordinator: daily choices, event pacing, and all interactive controls. */
(function () {
  const data = window.IslandData;
  const eco = window.Ecosystem;
  const ui = window.IslandUI;
  const audio = window.IslandAudio;

  const Game = {
    state: null,
    cards: [],
    busy: false,

    drawCards() {
      const available = data.cards.filter((card) => !card.minDay || card.minDay <= this.state.day);
      let fresh = available.filter((card) => !this.state.recentCardIds.includes(card.id));
      if (fresh.length < 3) fresh = available;
      const shuffled = fresh.slice().sort(() => Math.random() - 0.5);
      this.cards = shuffled.slice(0, 3);
    },

    startNew(showTutorial) {
      this.busy = false;
      this.state = eco.createInitialState();
      this.drawCards();
      ui.showScreen('game-screen');
      ui.render(this.state, this.cards);
      if (showTutorial) setTimeout(() => ui.showTutorial(0), 180);
    },

    start() {
      const tutorialSeen = localStorage.getItem('island-100-days-tutorial-seen') === 'yes';
      audio.click();
      this.startNew(!tutorialSeen);
    },

    maybeEvent() {
      const day = this.state.day;
      const chance = day >= 61 ? 0.36 : day >= 21 ? 0.29 : 0.20;
      if (day - this.state.lastEventDay < 3 || Math.random() > chance) return null;
      const candidates = data.events.filter((event) => event.condition(this.state, day));
      if (!candidates.length) return null;
      const event = candidates[Math.floor(Math.random() * candidates.length)];
      const conditional = eco.applyEvent(this.state, event);
      this.state.lastEventDay = day;
      return { event, conditional };
    },

    selectCard(id) {
      if (this.busy || !this.state) return;
      const card = this.cards.find((item) => item.id === id);
      if (!card) return;
      this.busy = true;
      audio.choice();
      const conditionalNote = eco.applyCard(this.state, card);
      const metrics = eco.simulate(this.state);
      this.state.recentCardIds = [card.id, ...this.state.recentCardIds].slice(0, 4);
      this.state.history.unshift({ day: this.state.day, title: card.title, icon: card.icon });
      this.state.history = this.state.history.slice(0, 8);
      this.state.turns += 1;

      if (this.state.turns >= 100) {
        this.state.day = 100;
        this.state.lastLog = { type: 'choice', icon: '✦', title: '第 100 天的回响', text: '你的长期选择已经沉淀为这座岛的生态性格。' };
        audio.success();
        setTimeout(() => { ui.showResults(this.state); this.busy = false; }, 300);
        return;
      }

      const milestoneResult = eco.evaluateMilestone(this.state);
      const eventResult = milestoneResult ? null : this.maybeEvent();
      if (milestoneResult) {
        this.state.lastLog = {
          type: 'milestone', icon: milestoneResult.success ? '✦' : '◌', title: milestoneResult.success ? `${milestoneResult.name}已达成` : `${milestoneResult.name}未完成`,
          text: milestoneResult.success ? `${milestoneResult.reward}。核心指标上限已提高。` : `仅完成 ${milestoneResult.passed} / ${milestoneResult.checks.length} 项目标；后续核心指标将受到限制。`
        };
      } else if (eventResult) {
        this.state.lastLog = { type: 'event', icon: eventResult.event.icon, title: eventResult.event.title, text: `${eventResult.event.description}${eventResult.conditional ? ' ' + eventResult.conditional : ''}` };
      } else {
        const discovered = eco.getDiscovered(this.state).length;
        const chainMessage = metrics.chainCount ? `现在已有 ${metrics.chainCount} 条主要食物链正在连结。` : '继续把植物、昆虫和栖息地连起来，食物链会慢慢出现。';
        this.state.lastLog = { type: 'choice', icon: card.icon, title: card.title, text: `${card.reason}${conditionalNote ? ' ' + conditionalNote : ' ' + chainMessage}` };
        if (discovered > 0 && discovered % 4 === 0) this.state.lastLog.text += ` 已发现 ${discovered} 种岛民。`;
      }
      this.state.day += 1;
      this.drawCards();
      ui.render(this.state, this.cards);
      this.busy = false;
      if (milestoneResult) {
        audio.success();
        setTimeout(() => ui.showMilestone(milestoneResult), 260);
      } else if (eventResult) {
        audio.event();
        setTimeout(() => ui.showEvent(eventResult.event, eventResult.conditional), 260);
      }
    },

    restart() {
      audio.click(); ui.closeModal(); this.startNew(false); ui.toast('一座新的岛屿正在等待你。');
    },

    finishTutorial() {
      localStorage.setItem('island-100-days-tutorial-seen', 'yes');
      ui.closeModal(); audio.success();
    },

    share() {
      if (!this.state) return;
      const report = ui.ending(this.state);
      const text = `我在《一座岛的100天》中让岛屿恢复到 ${report.recovery}/100，发现 ${report.metrics.discovered}/15 种生物，生态稳定性 ${Math.round(this.state.stats.stability)}。`;
      const note = document.querySelector('#share-note');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          if (note) note.textContent = '生态报告文字已复制，截图这张结果卡片分享吧！';
          ui.toast('生态报告已复制');
        }).catch(() => { if (note) note.textContent = '截图分享你的生态岛吧！'; });
      } else if (note) note.textContent = '截图分享你的生态岛吧！';
    },

    handleAction(action) {
      if (action === 'start') this.start();
      if (action === 'restart') this.restart();
      if (action === 'close-modal') { audio.click(); ui.closeModal(); }
      if (action === 'skip-tutorial') this.finishTutorial();
      if (action === 'open-guide' || action === 'show-guide') { audio.click(); ui.openGuide(); }
      if (action === 'open-codex') { audio.click(); ui.openCodex(this.state || eco.createInitialState()); }
      if (action === 'open-network') { audio.click(); ui.openNetwork(this.state || eco.createInitialState()); }
      if (action === 'share') this.share();
    }
  };

  document.addEventListener('click', (event) => {
    const card = event.target.closest('[data-card-id]');
    if (card) { Game.selectCard(card.dataset.cardId); return; }
    const species = event.target.closest('[data-species-id]');
    if (species) { audio.click(); ui.refreshCodex(Game.state || eco.createInitialState(), species.dataset.speciesId); return; }
    const tutorial = event.target.closest('[data-tutorial-index]');
    if (tutorial) {
      const next = Number(tutorial.dataset.tutorialIndex);
      audio.click();
      if (next >= 4) Game.finishTutorial(); else ui.showTutorial(next);
      return;
    }
    const control = event.target.closest('[data-action]');
    if (control) Game.handleAction(control.dataset.action);
  });

  window.IslandGame = Game;
})();
