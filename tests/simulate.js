/* Headless rule checks. Run with: node tests/simulate.js */
global.window = global;
require('../js/data.js');
require('../js/ecosystem.js');

const assert = require('node:assert/strict');
const data = global.IslandData;
const eco = global.Ecosystem;

function card(id, state) { return eco.getCard(id, state); }
function emptyDeck() { return { drawPile: [], discardPile: [], hand: [], exhaustPile: [] }; }

function structureScenario() {
  const state = eco.createInitialState();
  state.deck = emptyDeck();
  state.upgrades = {};

  assert.deepEqual(eco.validTargets(state, card('restore_wetland', state)).sort(), [0, 2]);
  eco.playCard(state, card('restore_wetland', state), 0);
  eco.processRound(state, []);
  eco.processRound(state, []);
  assert.equal(state.tiles[0].terrain, 'wetland');
  eco.playCard(state, card('aquatic_plants', state), 0);
  assert(state.activeNetworks.includes('wetland_revival'));

  eco.playCard(state, card('native_flowers', state), 2);
  assert(state.activeNetworks.includes('pollinator_web'));
  eco.playCard(state, card('rabbit_return', state), 2);
  eco.playCard(state, card('fox_sanctuary', state), 3);
  eco.playCard(state, card('eco_corridor', state), 3);
  assert(state.activeNetworks.includes('predator_balance'));
  assert(eco.getDiscovered(state).length >= 7);
  return state;
}

function crisisScenario() {
  const state = structureScenario();
  const wetlandCrisis = data.crises.find((item) => item.id === 'flood');
  const rabbitCrisis = data.crises.find((item) => item.id === 'rabbit_boom');
  assert.equal(eco.resolveCrisis(state, wetlandCrisis).success, true);
  assert.equal(eco.resolveCrisis(state, rabbitCrisis).success, true);

  const fragile = eco.createInitialState();
  fragile.deck = emptyDeck();
  const spill = eco.resolveCrisis(fragile, data.crises.find((item) => item.id === 'spill'));
  assert.equal(spill.success, false);
  assert(spill.statusIds.includes('toxic_sediment'));
  Object.values(fragile.stats).forEach((value) => assert(Number.isFinite(value) && value >= 0 && value <= 100));
}

function longRunScenario() {
  const state = eco.createInitialState();
  state.deck = emptyDeck();
  state.upgrades = {};
  const actions = [
    ['sow_meadow', 5], ['restore_wetland', 0], ['native_flowers', 2], ['aquatic_plants', 0],
    ['plant_forest', 5], ['insect_hotel', 2], ['groundwater', 4], ['nest_boxes', 4]
  ];
  for (let turn = 1; turn <= 100; turn += 1) {
    state.turn = turn;
    state.day = turn;
    const action = actions[turn - 1];
    if (action) {
      const selected = card(action[0], state);
      if (eco.validTargets(state, selected).includes(action[1])) eco.playCard(state, selected, action[1]);
    }
    eco.processRound(state, turn % 25 === 0 ? ['dry_soil'] : []);
    if (turn % 10 === 0) eco.resolveCrisis(state, data.crises[(turn / 10 - 1) % data.crises.length]);
    Object.values(state.stats).forEach((value) => assert(Number.isFinite(value) && value >= 0 && value <= 100));
  }
  const score = eco.finalScore(state);
  assert(score >= 0 && score <= 100);
  return { score, networks: state.discoveredNetworks.length, projects: state.completedProjects };
}

crisisScenario();
const summary = longRunScenario();
console.log(`Simulation OK: score=${summary.score}, networks=${summary.networks}, projects=${summary.projects}`);
