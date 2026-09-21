/* Coordinator smoke test with a tiny DOM/UI stub. */
global.window = global;
global.document = {
  addEventListener() {},
  querySelector() { return null; },
  body: { classList: { add() {}, remove() {} } }
};
global.window.confirm = () => true;

require('../js/data.js');
require('../js/ecosystem.js');

let resultsShown = false;
global.IslandUI = {
  showScreen() {}, render() {}, toast() {}, openGuide() {}, openCodex() {}, openNetwork() {},
  showTileDetails() {}, flashNetwork() {}, closeModal() {},
  playCardAnimation: async () => {},
  showReward: async () => null,
  showUpgrade: async (cards) => cards[0]?.id || null,
  showCrisis: async () => {},
  showMilestone: async () => {},
  renderResults: () => { resultsShown = true; }
};
global.IslandAudio = { click() {}, choice() {}, event() {}, success() {} };
require('../js/main.js');

const assert = require('node:assert/strict');

(async () => {
  Game.startNew(false);
  assert.equal(Game.state.deck.hand.length, 5);
  assert.equal(Game.state.forecasts.length, 3);
  assert(Game.getRecommendation());

  const targetInstance = ['hand', 'drawPile', 'discardPile'].flatMap((key) => Game.state.deck[key]).find((instance) => instance.cardId === 'sow_meadow');
  ['hand', 'drawPile', 'discardPile'].forEach((key) => { Game.state.deck[key] = Game.state.deck[key].filter((instance) => instance.uid !== targetInstance.uid); });
  Game.state.deck.hand.push(targetInstance);
  Game.state.energy.current = 9;
  await Game.selectCard(targetInstance.uid);
  assert.equal(Game.pendingCardUid, undefined);
  assert.equal(Game.state.cardsPlayedThisRound, 1);
  assert(Game.state.tiles.some((tile) => tile.project && tile.project.cardId === 'sow_meadow'));

  for (let completed = 0; completed < 100; completed += 1) await Game.endRound();
  assert.equal(resultsShown, true);
  assert.equal(Game.state.turn, 100);
  assert(Game.state.crisesHandled > 0);
  console.log(`Game flow OK: crises=${Game.state.crisesHandled}, statuses=${Ecosystem.statusCount(Game.state)}`);
})().catch((error) => { console.error(error); process.exitCode = 1; });
