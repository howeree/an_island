/* Rules for the 20-round, tile-based ecological simulation. */
(function () {
  const data = window.IslandData;
  const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));
  const adjacency = {
    0: [1, 2, 3, 4, 5, 6],
    1: [0, 2, 6], 2: [0, 1, 3], 3: [0, 2, 4],
    4: [0, 3, 5], 5: [0, 4, 6], 6: [0, 5, 1]
  };

  function createInitialState() {
    const species = {};
    data.species.forEach((item) => { species[item.id] = 0; });
    const state = {
      turn: 1,
      day: 1,
      totalTurns: 20,
      tiles: [
        { id: 0, terrain: 'barren', maturity: 0, pollution: 1, stress: 0, traits: [], project: null },
        { id: 1, terrain: 'stream', maturity: 1, pollution: 2, stress: 1, traits: [], project: null },
        { id: 2, terrain: 'meadow', maturity: 1, pollution: 0, stress: 0, traits: [], project: null },
        { id: 3, terrain: 'shrub', maturity: 1, pollution: 0, stress: 0, traits: [], project: null },
        { id: 4, terrain: 'forest', maturity: 1, pollution: 0, stress: 1, traits: [], project: null },
        { id: 5, terrain: 'barren', maturity: 0, pollution: 2, stress: 0, traits: [], project: null },
        { id: 6, terrain: 'coast', maturity: 1, pollution: 3, stress: 0, traits: [], project: null }
      ],
      species,
      introduced: {},
      policies: {},
      stats: {},
      activeNetworks: [],
      discoveredNetworks: [],
      completedProjects: 0,
      crisesHandled: 0,
      crisesSucceeded: 0,
      crisisHistory: [],
      forecasts: [],
      milestones: { records: [] },
      history: [],
      lastLog: { icon: '◒', title: '退化岛屿等待规划', text: '岛屿空间有限。观察危机预警，再决定优先恢复哪一种生态功能。' }
    };
    derive(state);
    return state;
  }

  function tileById(state, id) { return state.tiles.find((tile) => tile.id === Number(id)); }
  function neighbors(state, id) { return (adjacency[id] || []).map((nextId) => tileById(state, nextId)).filter(Boolean); }
  function terrainCount(state, terrain) { return state.tiles.filter((tile) => tile.terrain === terrain && !tile.project).length; }
  function hasTrait(state, trait) { return state.tiles.some((tile) => tile.traits.includes(trait)); }
  function hasAdjacentTerrain(state, tile, terrains) { return neighbors(state, tile.id).some((other) => terrains.includes(other.terrain)); }
  function totalPollution(state) { return state.tiles.reduce((sum, tile) => sum + tile.pollution, 0); }
  function statusCount(state) {
    if (!state.deck) return 0;
    return ['drawPile', 'discardPile', 'hand'].reduce((sum, key) => sum + state.deck[key].filter((item) => {
      const card = data.cards.find((candidate) => candidate.id === item.cardId);
      return card && card.type === '负面';
    }).length, 0);
  }

  function getCard(cardId, state) {
    const base = data.cards.find((card) => card.id === cardId);
    if (!base) return null;
    if (!state || !state.upgrades || !state.upgrades[cardId] || !base.upgrade) return { ...base };
    return { ...base, ...base.upgrade, upgraded: true, title: `${base.title}+` };
  }

  function validTargets(state, card) {
    if (!card || !card.target) return [];
    return state.tiles.filter((tile) => {
      if (tile.project) return false;
      if (card.target.terrains && !card.target.terrains.includes(tile.terrain)) return false;
      if (card.target.pollutedOnly && tile.pollution <= 0) return false;
      if (card.target.adjacent && !hasAdjacentTerrain(state, tile, card.target.adjacent)) return false;
      if (card.target.minMaturity && tile.maturity < card.target.minMaturity) return false;
      if (card.target.requiresTrait && !tile.traits.includes(card.target.requiresTrait)) return false;
      if (card.action === 'trait' && tile.traits.includes(card.trait)) return false;
      if (card.action === 'introduce' && state.introduced[card.species]) return false;
      return true;
    }).map((tile) => tile.id);
  }

  function completeProject(state, tile) {
    const project = tile.project;
    tile.terrain = project.terrain;
    tile.maturity = 1;
    tile.stress = Math.max(0, tile.stress - 1);
    tile.project = null;
    state.completedProjects += 1;
    return `${data.terrainMeta[tile.terrain].name}工程完工`;
  }

  function playCard(state, card, targetId) {
    const tile = targetId === undefined || targetId === null ? null : tileById(state, targetId);
    let title = card.title;
    let text = card.text;
    if (card.action === 'project' && tile) {
      tile.project = { cardId: card.id, name: card.title, terrain: card.terrain, remaining: card.duration, duration: card.duration };
      if (card.duration <= 0) text = completeProject(state, tile);
      else text = `在${data.terrainMeta[tile.terrain].name}启动工程，${card.duration}回合后完成。`;
    } else if (card.action === 'trait' && tile) {
      if (card.trait === 'long_bloom') tile.traits = tile.traits.filter((trait) => trait !== 'flowers');
      tile.traits.push(card.trait);
      text = `${data.terrainMeta[tile.terrain].name}获得「${data.traitMeta[card.trait].name}」。`;
    } else if (card.action === 'clean' && tile) {
      const before = tile.pollution;
      tile.pollution = Math.max(0, tile.pollution - card.power);
      tile.stress = Math.max(0, tile.stress - 1);
      text = `清除了${before - tile.pollution}层污染。`;
    } else if (card.action === 'cleanse_tile' && tile) {
      tile.stress = 0;
      tile.pollution = Math.max(0, tile.pollution - 1);
      text = '局部生态压力已清除，入侵藤蔓不再蔓延。';
    } else if (card.action === 'policy') {
      const existed = state.policies[card.policy];
      state.policies[card.policy] = true;
      text = existed ? '政策已经生效，这次行动用于巩固执行。' : `${card.title}成为本局持续政策。`;
    } else if (card.action === 'introduce' && tile) {
      state.introduced[card.species] = tile.id;
      text = `${data.species.find((item) => item.id === card.species).name}在这里获得了第一处家园。`;
    } else if (card.action === 'rewild') {
      let budget = Math.max(1, 4 - state.tiles.filter((item) => item.stress > 0).length);
      state.tiles.filter((item) => !item.project && !['barren', 'coast', 'stream'].includes(item.terrain) && item.stress === 0 && item.maturity < 3).forEach((item) => {
        if (budget > 0) { item.maturity += 1; budget -= 1; }
      });
      text = '未受压的生境向成熟阶段自然演替。';
    }
    derive(state);
    state.lastLog = { icon: card.icon, title, text };
    state.history.push({ turn: state.turn, type: 'card', title, text });
    return { title, text, target: tile };
  }

  function evaluateNetworks(state) {
    const found = [];
    const wetlandRevival = state.tiles.some((tile) => tile.terrain === 'wetland' && tile.traits.includes('aquatic') && hasAdjacentTerrain(state, tile, ['stream']));
    if (wetlandRevival) found.push('wetland_revival');
    const pollinatorWeb = state.tiles.some((tile) => tile.terrain === 'meadow' && (tile.traits.includes('flowers') || tile.traits.includes('long_bloom')) && (tile.traits.includes('insect_hotel') || neighbors(state, tile.id).some((other) => other.terrain === 'shrub' || other.traits.includes('insect_hotel'))));
    if (pollinatorWeb) found.push('pollinator_web');
    const predatorBalance = state.species.rabbit > 0 && state.species.fox > 0 && hasTrait(state, 'corridor');
    if (predatorBalance) found.push('predator_balance');
    const forestRefuge = state.tiles.some((tile) => tile.terrain === 'forest' && tile.maturity >= 2 && tile.traits.includes('old_tree')) && state.policies.dark_sky;
    if (forestRefuge) found.push('forest_refuge');
    const coastalRoute = state.tiles.some((tile) => tile.terrain === 'coast' && tile.pollution <= 1) && terrainCount(state, 'wetland') > 0 && state.policies.migration_refuge;
    if (coastalRoute) found.push('coastal_route');
    return found;
  }

  function derive(state) {
    const count = (terrain) => terrainCount(state, terrain);
    const maturity = (terrain) => state.tiles.filter((tile) => tile.terrain === terrain).reduce((sum, tile) => sum + tile.maturity, 0);
    const pollution = totalPollution(state);
    const stress = state.tiles.reduce((sum, tile) => sum + tile.stress, 0);
    const water = clamp(18 + maturity('stream') * 13 + maturity('wetland') * 9 + maturity('forest') * 3 + (hasTrait(state, 'water_storage') ? 10 : 0) - pollution * 3 - stress * 2);
    const vegetation = clamp(8 + maturity('meadow') * 10 + maturity('shrub') * 11 + maturity('forest') * 13 + (hasTrait(state, 'flowers') ? 5 : 0) + (hasTrait(state, 'long_bloom') ? 9 : 0) - stress * 4);

    state.species.grass = count('meadow') ? clamp(10 + maturity('meadow') * 18 - stress * 2) : 0;
    state.species.shrubs = count('shrub') ? clamp(8 + maturity('shrub') * 19) : 0;
    state.species.trees = count('forest') ? clamp(8 + maturity('forest') * 18) : 0;
    state.species.wildflowers = hasTrait(state, 'flowers') || hasTrait(state, 'long_bloom') ? clamp(18 + maturity('meadow') * 10) : 0;
    state.species.aquatic = hasTrait(state, 'aquatic') ? clamp(16 + maturity('wetland') * 15 - pollution * 2) : 0;
    state.species.bee = (state.species.wildflowers > 0 && pollution < 9) ? clamp(12 + (hasTrait(state, 'insect_hotel') ? 24 : 0) + (hasTrait(state, 'long_bloom') ? 18 : 0)) : 0;
    state.species.butterfly = (state.species.wildflowers > 0 && count('shrub')) ? clamp(10 + maturity('shrub') * 8) : 0;
    state.species.dragonfly = (hasTrait(state, 'aquatic') && water > 30) ? clamp(12 + maturity('wetland') * 12) : 0;
    state.species.frog = (hasTrait(state, 'frog_pond') && state.species.dragonfly > 0) || state.activeNetworks.includes('wetland_revival') ? clamp(15 + maturity('wetland') * 12) : 0;
    state.species.songbird = (count('shrub') && count('forest')) || hasTrait(state, 'nest_boxes') ? clamp(10 + maturity('forest') * 7 + (hasTrait(state, 'nest_boxes') ? 16 : 0)) : 0;
    state.species.rabbit = state.introduced.rabbit !== undefined ? clamp(24 + maturity('meadow') * 7 - (state.activeNetworks.includes('predator_balance') ? 8 : 0)) : ((state.turn >= 6 && count('meadow') && count('shrub')) ? 9 : 0);
    state.species.deer = (state.turn >= 11 && count('meadow') && count('forest') && hasTrait(state, 'corridor')) ? 12 : 0;
    state.species.fox = state.introduced.fox !== undefined ? 24 : 0;
    state.species.owl = state.activeNetworks.includes('forest_refuge') ? 18 : 0;
    state.species.waterbird = state.activeNetworks.includes('coastal_route') || (state.policies.migration_refuge && count('wetland')) ? 18 : 0;

    state.activeNetworks = evaluateNetworks(state);
    /* A second pass lets species that depend on a newly formed structure arrive immediately. */
    if (state.activeNetworks.includes('wetland_revival')) state.species.frog = Math.max(state.species.frog, 22);
    if (state.activeNetworks.includes('forest_refuge')) state.species.owl = 18;
    if (state.activeNetworks.includes('coastal_route')) state.species.waterbird = 22;
    if (state.activeNetworks.includes('predator_balance')) state.species.rabbit = Math.min(state.species.rabbit, 38);
    state.activeNetworks.forEach((id) => {
      if (!state.discoveredNetworks.includes(id)) state.discoveredNetworks.push(id);
    });

    const present = Object.values(state.species).filter((population) => population >= 8).length;
    const matureHabitats = state.tiles.filter((tile) => !['barren', 'coast'].includes(tile.terrain) && tile.maturity >= 2).length;
    const trophic = (Object.values(state.species).some((value, index) => index >= 5 && index <= 10 && value > 0) ? 1 : 0)
      + (state.species.rabbit > 0 || state.species.deer > 0 ? 1 : 0)
      + (state.species.fox > 0 || state.species.owl > 0 ? 1 : 0);
    state.stats = {
      water: Math.round(water), vegetation: Math.round(vegetation), pollution,
      biodiversity: clamp(Math.round(present * 5 + state.activeNetworks.length * 7 + matureHabitats * 2)),
      habitat: clamp(Math.round(12 + state.tiles.filter((tile) => tile.terrain !== 'barren').length * 8 + matureHabitats * 6 - stress * 4 - pollution * 2)),
      foodChain: clamp(Math.round(8 + trophic * 18 + state.activeNetworks.length * 9)),
      stability: clamp(Math.round(22 + state.activeNetworks.length * 13 + matureHabitats * 5 + state.crisesSucceeded * 2 - stress * 5 - statusCount(state) * 3))
    };
    return state.stats;
  }

  function applyHeldStatus(state, statusId, logs) {
    const candidates = (terrains) => state.tiles.filter((tile) => terrains.includes(tile.terrain));
    const choose = (items) => items.length ? items[Math.floor(Math.random() * items.length)] : null;
    if (statusId === 'dry_soil') {
      const tile = choose(candidates(['forest', 'meadow', 'shrub']));
      if (tile) { tile.stress = clamp(tile.stress + 1, 0, 3); logs.push('干裂土壤让一处陆地生境承压'); }
    } else if (statusId === 'toxic_sediment') {
      const tile = choose(candidates(['stream', 'wetland']));
      if (tile) { tile.pollution = clamp(tile.pollution + 1, 0, 6); logs.push('有毒沉积继续污染水域'); }
    } else if (statusId === 'overgrazing') {
      const tile = choose(candidates(['meadow', 'shrub']));
      if (tile) { tile.stress = clamp(tile.stress + 1, 0, 3); tile.maturity = Math.max(1, tile.maturity - 1); logs.push('过度啃食削弱了一处植被'); }
    } else if (statusId === 'invasive_vine') {
      const tile = choose(candidates(['meadow', 'shrub', 'forest', 'wetland']));
      if (tile) { tile.stress = clamp(tile.stress + 1, 0, 3); logs.push('入侵藤蔓继续挤压本地生境'); }
    }
  }

  function processRound(state, heldStatusIds) {
    const logs = [];
    (heldStatusIds || []).forEach((id) => applyHeldStatus(state, id, logs));
    const dryPenalty = (heldStatusIds || []).includes('dry_soil');
    state.tiles.forEach((tile) => {
      if (!tile.project) return;
      const waterSensitive = ['forest', 'wetland'].includes(tile.project.terrain);
      const protectedWater = state.policies.water_watch || hasTrait(state, 'water_storage') || hasAdjacentTerrain(state, tile, ['stream', 'wetland']);
      if (waterSensitive && dryPenalty && !protectedWater) {
        logs.push(`${tile.project.name}因缺水停滞`);
        return;
      }
      tile.project.remaining -= 1;
      if (tile.project.remaining <= 0) logs.push(completeProject(state, tile));
    });

    if (state.turn % 2 === 0) {
      state.tiles.filter((tile) => !tile.project && !['barren', 'coast'].includes(tile.terrain) && tile.stress === 0 && tile.pollution <= 1 && tile.maturity < 3).forEach((tile) => { tile.maturity += 1; });
    }
    if (state.turn % 4 === 0 && state.policies.seed_bank) {
      const barren = state.tiles.find((tile) => tile.terrain === 'barren' && tile.pollution > 0);
      if (barren) { barren.pollution -= 1; logs.push('种子库志愿者净化了一处退化区域'); }
    }
    state.tiles.forEach((tile) => {
      if (tile.stress > 0 && Math.random() < 0.25) tile.stress -= 1;
    });
    derive(state);

    if (state.species.rabbit >= 30 && !state.activeNetworks.includes('predator_balance')) {
      const meadow = state.tiles.find((tile) => tile.terrain === 'meadow' && tile.stress < 3);
      if (meadow) { meadow.stress += 1; logs.push('缺少捕食者，兔群开始挤压草地'); }
    }
    derive(state);
    return { logs };
  }

  function damageTile(tile, amount) {
    if (!tile) return;
    tile.stress = clamp(tile.stress + amount, 0, 3);
    if (amount >= 2 && tile.maturity > 1) tile.maturity -= 1;
  }

  function resolveCrisis(state, crisis) {
    const wetlands = state.tiles.filter((tile) => tile.terrain === 'wetland');
    const streams = state.tiles.filter((tile) => tile.terrain === 'stream');
    const forests = state.tiles.filter((tile) => tile.terrain === 'forest');
    const meadows = state.tiles.filter((tile) => tile.terrain === 'meadow');
    const shrubs = state.tiles.filter((tile) => tile.terrain === 'shrub');
    let success = false;
    let result = '';
    if (crisis.id === 'drought') {
      success = wetlands.length > 0 || hasTrait(state, 'water_storage') || state.policies.water_watch;
      if (!success) [...forests, ...meadows].slice(0, 2).forEach((tile) => damageTile(tile, 1));
      result = success ? '蓄水结构让关键生境熬过了缺水期。' : '两处生境干裂，恢复工程也更容易停滞。';
    } else if (crisis.id === 'flood') {
      success = wetlands.some((tile) => hasAdjacentTerrain(state, tile, ['stream'])) || forests.some((tile) => tile.maturity >= 2);
      if (!success) streams.forEach((stream) => neighbors(state, stream.id).slice(0, 2).forEach((tile) => damageTile(tile, 1)));
      result = success ? '湿地和林地消化了暴雨洪峰。' : '径流冲击溪流邻地，土壤结构受损。';
    } else if (crisis.id === 'rabbit_boom') {
      success = state.activeNetworks.includes('predator_balance');
      if (!success) [...meadows, ...shrubs].slice(0, 2).forEach((tile) => damageTile(tile, 1));
      result = success ? '狐狸把兔群维持在生境可承受的范围。' : '没有捕食平衡，兔群啃食了草地与灌丛。';
    } else if (crisis.id === 'spill') {
      success = state.activeNetworks.includes('wetland_revival') || (streams.length && streams.every((tile) => tile.pollution === 0));
      streams.forEach((tile) => { tile.pollution = clamp(tile.pollution + (success ? 1 : 3), 0, 6); });
      if (!success) wetlands.forEach((tile) => { tile.pollution = clamp(tile.pollution + 2, 0, 6); });
      result = success ? '水草湿地拦下大部分污染，但溪流仍需关注。' : '污染进入溪流并向湿地扩散。';
    } else if (crisis.id === 'visitors') {
      const coast = state.tiles.find((tile) => tile.terrain === 'coast');
      success = state.policies.visitor_limits || state.policies.ranger_patrol;
      if (coast) coast.pollution = clamp(coast.pollution + (success ? 0 : 2), 0, 6);
      result = success ? '限流与巡护把人流引导到低影响路线。' : '游客惊扰鸟类，并在海岸留下垃圾。';
    } else if (crisis.id === 'wildfire') {
      success = state.policies.firebreak || wetlands.length > 0 || hasTrait(state, 'water_storage');
      if (!success) forests.slice(0, 2).forEach((tile) => damageTile(tile, 2));
      result = success ? '防火与蓄水结构阻断了火势。' : '干燥林缘受损，森林成熟度下降。';
    } else if (crisis.id === 'invasion') {
      success = state.policies.ranger_patrol || shrubs.some((tile) => tile.maturity >= 3 && tile.stress === 0);
      if (!success) {
        const tile = [...meadows, ...shrubs, ...forests, ...wetlands].find((item) => item.stress < 3);
        damageTile(tile, 1);
      }
      result = success ? '巡护和健康边缘生境及时控制了入侵种。' : '藤蔓占据一个生态位，并混入行动牌库。';
    } else if (crisis.id === 'cold_snap') {
      success = hasTrait(state, 'insect_hotel') || hasTrait(state, 'long_bloom') || forests.some((tile) => tile.maturity >= 3);
      if (!success) meadows.filter((tile) => tile.traits.includes('flowers')).forEach((tile) => damageTile(tile, 1));
      result = success ? '越冬庇护让昆虫躲过异常寒潮。' : '传粉者缺少庇护，花草地暂时受压。';
    }
    state.crisesHandled += 1;
    if (success) state.crisesSucceeded += 1;
    const statusIds = success ? [] : [crisis.status];
    if (!success && state.turn >= 12 && ['spill', 'invasion'].includes(crisis.id)) statusIds.push(crisis.status);
    state.crisisHistory.push({ turn: state.turn, crisisId: crisis.id, success, text: result });
    state.lastLog = { icon: crisis.icon, title: `${crisis.name} · ${success ? '成功化解' : '造成后果'}`, text: result };
    state.history.push({ turn: state.turn, type: 'crisis', title: crisis.name, text: result, success });
    derive(state);
    return { success, statusIds, title: crisis.name, text: result };
  }

  function evaluateMilestone(state, milestone) {
    if (!milestone) return null;
    let checks;
    if (milestone.turn === 4) {
      checks = [
        { label: '完成至少2项生态工程', ok: state.completedProjects >= 2, value: state.completedProjects, target: 2 },
        { label: '溪流旁存在非退化生境', ok: state.tiles.some((tile) => tile.terrain === 'stream' && neighbors(state, tile.id).some((other) => !['barren', 'coast'].includes(other.terrain))), value: '查看岛屿', target: '' }
      ];
    } else if (milestone.turn === 8) {
      checks = [
        { label: '形成至少1个生态结构', ok: state.activeNetworks.length >= 1, value: state.activeNetworks.length, target: 1 },
        { label: '负面牌不超过3张', ok: statusCount(state) <= 3, value: statusCount(state), target: 3, lowerIsBetter: true }
      ];
    } else if (milestone.turn === 12) {
      const speciesPresent = Object.values(state.species).filter((value) => value >= 8).length;
      checks = [
        { label: '至少6种物种定居', ok: speciesPresent >= 6, value: speciesPresent, target: 6 },
        { label: '拥有捕食或湿地网络', ok: state.activeNetworks.some((id) => ['predator_balance', 'wetland_revival'].includes(id)), value: '查看结构', target: '' }
      ];
    } else {
      const ratio = state.crisesHandled ? state.crisesSucceeded / state.crisesHandled : 0;
      checks = [{ label: '成功化解至少一半危机', ok: ratio >= 0.5, value: `${state.crisesSucceeded}/${state.crisesHandled}`, target: '≥ 50%' }];
    }
    return { ...milestone, checks, success: checks.every((check) => check.ok) };
  }

  function getMilestonePreview(state) {
    const next = data.milestones.find((milestone) => milestone.turn >= state.turn && !state.milestones.records.some((record) => record.turn === milestone.turn));
    return next ? evaluateMilestone(state, next) : null;
  }

  function getStage(turn) { return data.stages.find((stage) => turn <= stage.until) || data.stages[data.stages.length - 1]; }
  function qualitative(value, inverse) {
    const score = inverse ? 100 - value : value;
    if (score < 22) return '危急';
    if (score < 42) return '脆弱';
    if (score < 62) return '恢复中';
    if (score < 82) return '稳定';
    return '繁荣';
  }
  function getDiscovered(state) { return data.species.filter((item) => state.species[item.id] >= 8); }
  function finalScore(state) {
    derive(state);
    return Math.round(state.stats.biodiversity * 0.25 + state.stats.stability * 0.3 + state.stats.habitat * 0.25 + state.stats.foodChain * 0.2);
  }

  window.Ecosystem = {
    clamp, adjacency, createInitialState, tileById, neighbors, getCard, validTargets, playCard,
    derive, processRound, resolveCrisis, evaluateNetworks, evaluateMilestone, getMilestonePreview,
    getStage, qualitative, getDiscovered, statusCount, finalScore, terrainCount, hasTrait, totalPollution
  };
})();
