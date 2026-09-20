/* Small, explainable ecological simulation. It deliberately rewards connected habitats over one large population. */
(function () {
  const data = window.IslandData;
  const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));
  const round = (value) => Math.round(value * 10) / 10;

  function createInitialState() {
    const species = {};
    data.species.forEach((item) => { species[item.id] = item.population; });
    return {
      day: 1,
      turns: 0,
      stats: { biodiversity: 9, stability: 28, vegetation: 17, water: 25, forest: 12, wetland: 8, insects: 7, herbivores: 4, predators: 0, pollution: 38, habitat: 16, foodChain: 3 },
      species,
      lastLog: { type: 'welcome', icon: '◒', title: '岛屿等待苏醒', text: '从水、植物或栖息地开始。每个微小决定都会传到食物链的下一环。' },
      lastEventDay: -10,
      recentCardIds: [],
      history: [],
      flags: { corridor: 0, protected: 0 },
      milestones: { completed: 0, debt: 0, records: [] },
      lastCategory: null,
      categoryStreak: 0,
      lastActionFeedback: null
    };
  }

  function applyEffects(state, effects, multiplier) {
    if (!effects) return;
    const factor = multiplier === undefined ? 1 : multiplier;
    const stats = effects.stats || {};
    const species = effects.species || {};
    Object.keys(stats).forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(state.stats, key)) state.stats[key] = clamp(state.stats[key] + stats[key] * factor);
    });
    Object.keys(species).forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(state.species, key)) state.species[key] = clamp(state.species[key] + species[key] * factor);
    });
  }

  function applyCard(state, card) {
    const rule = data.strategyRules[card.id] || { category: 'general' };
    const unmet = (rule.requirements || []).filter((requirement) => {
      const source = requirement.species ? state.species : state.stats;
      return source[requirement.key] < requirement.min;
    });
    if (state.lastCategory === rule.category) state.categoryStreak += 1;
    else state.categoryStreak = 1;
    state.lastCategory = rule.category;
    let effectiveness = unmet.length ? 0.35 : 1;
    const fatigue = state.categoryStreak >= 3;
    if (fatigue) effectiveness *= 0.55;
    applyEffects(state, card.effects, effectiveness);
    let conditionalNote = '';
    if (card.conditional && state.stats[card.conditional.stat] < card.conditional.below) {
      applyEffects(state, card.conditional.effects, effectiveness);
      conditionalNote = card.conditional.note;
    }
    if (card.id === 'corridor') state.flags.corridor += 1;
    if (['anti-poaching', 'fox-reserve', 'visitor-limit', 'ancient-tree'].includes(card.id)) state.flags.protected += 1;
    state.lastActionFeedback = { unmet: unmet.map((requirement) => requirement.label), fatigue, effectiveness };
    const strategicNote = unmet.length ? `条件尚未满足（${unmet.map((requirement) => requirement.label).join('、')}），项目仅发挥 ${Math.round(effectiveness * 100)}% 效果。` : fatigue ? '连续把资源投入同一生态系统，边际收益明显下降。' : '';
    return [conditionalNote, strategicNote].filter(Boolean).join(' ');
  }

  function supportScores(state) {
    const s = state.stats;
    const p = state.species;
    return {
      wildflowers: s.vegetation * 0.76 + s.water * 0.10 - s.pollution * 0.20,
      grass: s.vegetation * 0.96 - s.pollution * 0.10,
      shrubs: s.vegetation * 0.66 + s.forest * 0.28,
      trees: s.forest,
      aquatic: s.wetland * 0.62 + s.water * 0.32 - s.pollution * 0.38,
      bee: p.wildflowers * 0.70 + s.vegetation * 0.18 - s.pollution * 0.18,
      butterfly: p.wildflowers * 0.64 + p.shrubs * 0.18,
      dragonfly: s.wetland * 0.62 + s.water * 0.30 - s.pollution * 0.20,
      frog: s.wetland * 0.45 + p.dragonfly * 0.28 + s.water * 0.22 - s.pollution * 0.15,
      waterbird: s.wetland * 0.36 + p.frog * 0.28 + p.aquatic * 0.20,
      songbird: s.forest * 0.42 + p.shrubs * 0.25 + (p.bee + p.butterfly) * 0.15,
      rabbit: p.grass * 0.42 + p.shrubs * 0.30 - p.fox * 0.22 - p.owl * 0.12,
      deer: s.forest * 0.42 + p.grass * 0.28 - p.fox * 0.15,
      fox: p.rabbit * 0.35 + p.deer * 0.28 + p.songbird * 0.10 + p.frog * 0.06,
      owl: s.forest * 0.54 + p.songbird * 0.28 + p.rabbit * 0.09
    };
  }

  function evolveSpecies(state) {
    const p = state.species;
    const supports = supportScores(state);
    const colonization = {
      wildflowers: { day: 1, support: 8 }, grass: { day: 1, support: 9 }, shrubs: { day: 1, support: 12 }, trees: { day: 1, support: 12 }, aquatic: { day: 1, support: 15 },
      bee: { day: 1, support: 12 }, butterfly: { day: 8, support: 18 }, dragonfly: { day: 10, support: 19 }, frog: { day: 18, support: 22 },
      waterbird: { day: 25, support: 24 }, songbird: { day: 12, support: 18 }, rabbit: { day: 20, support: 25 }, deer: { day: 35, support: 30 },
      fox: { day: 42, support: 27 }, owl: { day: 46, support: 30 }
    };
    Object.keys(p).forEach((id) => {
      const rule = colonization[id];
      const target = clamp(supports[id] || 0);
      if (p[id] < 1 && state.day >= rule.day && target >= rule.support) {
        p[id] = Math.min(5, target * 0.16);
      } else if (p[id] > 0) {
        const speed = ['fox', 'owl', 'deer', 'waterbird'].includes(id) ? 0.075 : 0.11;
        p[id] = clamp(p[id] + (target - p[id]) * speed);
      }
    });
  }

  function calculateMetrics(state, smooth) {
    const s = state.stats;
    const p = state.species;
    const discovered = Object.values(p).filter((value) => value >= 6).length;
    const habitatCount = [s.vegetation, s.forest, s.wetland].filter((value) => value >= 28).length;
    const flowerLink = p.wildflowers > 14 && (p.bee + p.butterfly) / 2 > 9 && p.songbird > 7 ? 22 : 0;
    const meadowLink = p.grass > 18 && p.rabbit > 8 && p.fox > 6 ? 25 : 0;
    const wetlandLink = p.aquatic > 9 && p.dragonfly > 8 && p.frog > 7 && p.waterbird > 5 ? 25 : 0;
    const forestLink = p.trees > 14 && p.songbird > 8 && (p.owl > 5 || p.fox > 6) ? 20 : 0;
    const chainTarget = clamp(flowerLink + meadowLink + wetlandLink + forestLink + habitatCount * 3);
    const habitatTarget = clamp(s.vegetation * 0.36 + s.forest * 0.33 + s.wetland * 0.25 + state.flags.corridor * 5);
    const highHerbivoreStress = p.rabbit > 62 && s.vegetation < 52 ? 13 : 0;
    const missingPredatorStress = (p.rabbit + p.deer) > 58 && (p.fox + p.owl) < 10 ? 9 : 0;
    const waterStress = s.water < 20 ? 12 : 0;
    const pollutionStress = s.pollution > 60 ? 14 : 0;
    const habitatSpread = Math.max(s.vegetation, s.forest, s.wetland) - Math.min(s.vegetation, s.forest, s.wetland);
    const balance = clamp(100 - habitatSpread * 1.05 - highHerbivoreStress * 1.2);
    const stabilityTarget = clamp((s.vegetation + s.water + s.forest + s.wetland) * 0.13 + chainTarget * 0.31 + habitatTarget * 0.18 + balance * 0.17 - s.pollution * 0.34 - highHerbivoreStress - missingPredatorStress - waterStress - pollutionStress + state.flags.protected * 1.5);
    const biodiversityTarget = clamp(discovered / data.species.length * 47 + habitatCount * 7 + chainTarget * 0.22 + stabilityTarget * 0.14 + balance * 0.08 - s.pollution * 0.10);
    const caps = getMetricCaps(state);
    if (smooth) {
      s.foodChain = clamp(s.foodChain + (chainTarget - s.foodChain) * 0.24, 0, caps.foodChain);
      s.habitat = clamp(s.habitat + (habitatTarget - s.habitat) * 0.11, 0, caps.habitat);
      s.stability = clamp(s.stability + (stabilityTarget - s.stability) * 0.13, 0, caps.stability);
      s.biodiversity = clamp(s.biodiversity + (biodiversityTarget - s.biodiversity) * 0.18, 0, caps.biodiversity);
    }
    return { discovered, habitatCount, chainCount: [flowerLink, meadowLink, wetlandLink, forestLink].filter(Boolean).length, balance, chainTarget, habitatTarget, stabilityTarget, biodiversityTarget, caps };
  }

  function getMetricCaps(state) {
    const completed = state.milestones ? state.milestones.completed : 0;
    return {
      biodiversity: 50 + completed * 12.5,
      stability: 54 + completed * 11.5,
      habitat: 56 + completed * 11,
      foodChain: 56 + completed * 11
    };
  }

  function applyMetricCaps(state) {
    const caps = getMetricCaps(state);
    ['biodiversity', 'stability', 'habitat', 'foodChain'].forEach((key) => { state.stats[key] = clamp(state.stats[key], 0, caps[key]); });
  }

  function simulate(state) {
    const s = state.stats;
    const p = state.species;
    const waterTarget = clamp(18 + s.wetland * 0.64 + s.forest * 0.13 - s.pollution * 0.28);
    const vegetationTarget = clamp(4 + s.water * 0.44 + s.forest * 0.23 + s.wetland * 0.20 - s.pollution * 0.35);
    s.water += (waterTarget - s.water) * 0.045;
    s.vegetation += (vegetationTarget - s.vegetation) * 0.030 - (p.rabbit + p.deer * 1.15) * 0.007;
    s.forest += (p.trees - s.forest) * 0.006 - Math.max(0, s.pollution - 45) * 0.004;
    s.wetland += (p.aquatic - s.wetland) * 0.004 - Math.max(0, s.pollution - 48) * 0.004;
    s.pollution += 0.12 - s.wetland * 0.002 - state.flags.protected * 0.010;
    Object.keys(s).forEach((key) => { s[key] = clamp(s[key]); });
    evolveSpecies(state);
    s.insects = clamp((p.bee + p.butterfly + p.dragonfly) / 3);
    s.herbivores = clamp((p.rabbit + p.deer) / 2);
    s.predators = clamp((p.fox + p.owl) / 2);
    const metrics = calculateMetrics(state, true);
    applyMetricCaps(state);
    Object.keys(s).forEach((key) => { s[key] = round(clamp(s[key])); });
    Object.keys(p).forEach((key) => { p[key] = round(clamp(p[key])); });
    return metrics;
  }

  function applyEvent(state, event) {
    applyEffects(state, event.effects);
    let conditional = '';
    if (event.conditional && state.stats[event.conditional.stat] < event.conditional.below) {
      applyEffects(state, event.conditional.effects);
      conditional = '湿地不足使这次事件的影响加重了。';
    }
    Object.keys(state.stats).forEach((key) => { state.stats[key] = round(clamp(state.stats[key])); });
    Object.keys(state.species).forEach((key) => { state.species[key] = round(clamp(state.species[key])); });
    applyMetricCaps(state);
    return conditional;
  }

  function evaluateMilestone(state) {
    const milestone = data.milestones.find((item) => item.day === state.day);
    if (!milestone || state.milestones.records.some((record) => record.day === milestone.day)) return null;
    const checks = milestone.checks.map((check) => ({ label: check.label, passed: check.test(state), value: Math.round(check.value(state)), target: check.target, lowerIsBetter: check.lowerIsBetter }));
    const passed = checks.filter((check) => check.passed).length;
    const success = passed === checks.length;
    const result = { day: milestone.day, name: milestone.name, description: milestone.description, reward: milestone.reward, checks, passed, success };
    state.milestones.records.push(result);
    if (success) {
      state.milestones.completed += 1;
      state.stats.stability += 5;
      state.stats.biodiversity += 4;
    } else {
      state.milestones.debt += 1;
      state.stats.stability -= 5;
      state.stats.pollution += 3;
    }
    applyMetricCaps(state);
    return result;
  }

  function getMilestonePreview(state) {
    const next = data.milestones.find((milestone) => !state.milestones.records.some((record) => record.day === milestone.day));
    if (!next) return { complete: true, caps: getMetricCaps(state), completed: state.milestones.completed };
    return {
      milestone: next,
      completed: state.milestones.completed,
      caps: getMetricCaps(state),
      checks: next.checks.map((check) => ({ label: check.label, passed: check.test(state), value: Math.round(check.value(state)), target: check.target, lowerIsBetter: check.lowerIsBetter }))
    };
  }

  function getStage(day) { return data.stages.find((stage) => day <= stage.until) || data.stages[data.stages.length - 1]; }
  function getDiscovered(state) { return data.species.filter((item) => state.species[item.id] >= 6); }
  function effectText(effects, maximum) {
    const result = [];
    const add = (key, value) => {
      const item = data.species.find((species) => species.id === key);
      const label = item ? item.name : data.statLabels[key] || key;
      result.push({ label, value });
    };
    Object.entries((effects && effects.stats) || {}).forEach(([key, value]) => add(key, value));
    Object.entries((effects && effects.species) || {}).forEach(([key, value]) => add(key, value));
    return result.slice(0, maximum || result.length);
  }

  window.Ecosystem = { clamp, createInitialState, applyEffects, applyCard, simulate, applyEvent, evaluateMilestone, getMilestonePreview, getMetricCaps, calculateMetrics, getStage, getDiscovered, effectText };
})();
