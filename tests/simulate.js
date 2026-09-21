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

  assert.deepEqual(eco.validTargets(state, card('restore_wetland', state)).sort(), [0]);
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

function habitatRecoveryScenario() {
  const state = eco.createInitialState();
  state.deck = emptyDeck();
  state.upgrades = {};
  state.tiles[0].terrain = 'wetland';
  state.tiles[2].terrain = 'forest';
  state.tiles[3].terrain = 'forest';
  state.tiles[4].terrain = 'forest';
  state.tiles[5].terrain = 'wetland';

  assert.equal(eco.terrainCount(state, 'meadow'), 0);
  assert.equal(eco.terrainCount(state, 'shrub'), 0);
  const meadowTargets = eco.validTargets(state, card('sow_meadow', state));
  assert(meadowTargets.includes(2), '草地缺失时应允许从其他非固定生境重建');
  eco.playCard(state, card('sow_meadow', state), 2);
  eco.processRound(state, []);
  assert.equal(eco.terrainCount(state, 'meadow'), 1);

  const shrubTargets = eco.validTargets(state, card('plant_shrubs', state));
  assert(!shrubTargets.includes(2), '不应覆盖最后一块草地');
  assert(shrubTargets.includes(3), '灌丛缺失时应允许从其他非固定生境重建');
  eco.playCard(state, card('plant_shrubs', state), 3);
  eco.processRound(state, []);
  assert.equal(eco.terrainCount(state, 'shrub'), 1);

  const forestTargets = eco.validTargets(state, card('plant_forest', state));
  assert(!forestTargets.includes(2), '不应把最后一块草地改造成森林');
  assert(!forestTargets.includes(3), '不应把最后一块灌丛改造成森林');

  const forestless = eco.createInitialState();
  forestless.deck = emptyDeck();
  forestless.upgrades = {};
  forestless.tiles[0].terrain = 'wetland';
  forestless.tiles[2].terrain = 'meadow';
  forestless.tiles[3].terrain = 'shrub';
  forestless.tiles[4].terrain = 'wetland';
  forestless.tiles[5].terrain = 'wetland';
  const forestRecoveryTargets = eco.validTargets(forestless, card('plant_forest', forestless));
  assert(!forestRecoveryTargets.includes(2), '森林重建不应牺牲最后一块草地');
  assert(!forestRecoveryTargets.includes(3), '森林重建不应牺牲最后一块灌丛');
  assert(forestRecoveryTargets.includes(4), '森林缺失时应允许从重复湿地中应急重建');

  const wetlandless = eco.createInitialState();
  wetlandless.deck = emptyDeck();
  wetlandless.upgrades = {};
  wetlandless.tiles[0].terrain = 'forest';
  wetlandless.tiles[5].terrain = 'forest';
  const wetlandRecoveryTargets = eco.validTargets(wetlandless, card('restore_wetland', wetlandless));
  assert(wetlandRecoveryTargets.includes(0), '湿地缺失时应允许从重复森林中应急重建');
  assert(!wetlandRecoveryTargets.includes(2), '湿地重建不应牺牲最后一块草地');
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
habitatRecoveryScenario();
const summary = longRunScenario();
console.log(`Simulation OK: score=${summary.score}, networks=${summary.networks}, projects=${summary.projects}`);
