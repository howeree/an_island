/* Pure, deterministic expedition rules. */
(function () {
  const D = window.IslandData;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const nextRoute = { water: 'meadow', meadow: 'forest', forest: 'water' };
  function random(s) { s.rng = (Math.imul(s.rng, 1664525) + 1013904223) >>> 0; return s.rng / 4294967296; }
  function shuffle(s, items) {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(random(s) * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    return out;
  }
  function instance(s, id) { return { uid: 'card-' + (++s.uid), cardId: id }; }
  function getCard(id, s) {
    const c = D.cards.find(c => c.id === id);
    if (!c) return null;
    const result = { ...c, ...(s?.upgrades[id] ? c.upgrade : {}), upgraded: !!s?.upgrades[id] };
    if (result.upgraded && result.waterSpend) result.text = `水分≥2时花2水分，行动力+${result.energy}、预警+${result.forecast}；水不足时护盾+${result.lowWaterBlock}。`;
    if (result.upgraded && result.replaceChoice) result.text = `选择1张其他手牌换掉，抽${result.draw}张新牌；也可不换而获得1预警。`;
    if (result.upgraded && !result.build && !result.speciesChoice && !result.facilityChoice && !result.usePressure && !result.waterSpend && !result.redrawHand && !result.replaceChoice) {
      const base = [];
      if (result.block) base.push('护盾+' + result.block);
      if (result.seeds) base.push('种子+' + result.seeds);
      if (result.research) base.push('研究+' + result.research);
      if (result.heal) base.push('生命+' + result.heal);
      if (result.hurt) base.push('生命−' + result.hurt);
      if (result.energy) base.push('行动力+' + result.energy);
      if (result.draw) base.push('抽' + result.draw + '张');
      if (result.moisture) base.push('水分+' + result.moisture);
      if (result.forecast) base.push('预警+' + result.forecast);
      if (result.pressure) base.push('压力' + (result.pressure > 0 ? '+' : '') + result.pressure);
      result.text = base.join('，') + '。';
      if (result.perLevel) result.text += '每级' + D.routes[result.perLevel].name + '额外+3护盾。';
      if (result.meadowStudy) result.text += '每级草灌额外+1研究。';
      if (result.comboBlock) result.text += '接在草系牌后额外+5护盾。';
      if (result.comboEnergy) result.text += '接在林系牌后返还1行动力。';
      if (result.lowMoistureBonus) result.text += '水分≤2时额外+' + result.lowMoistureBonus + '护盾。';
    }
    return result;
  }
  function weatherForDay(day) {
    if (day >= 6 && day <= 8) return 'drought';
    if (day >= 13 && day <= 15) return 'storm';
    if (day >= 18 && day <= 20) return 'migration';
    if (day >= 23 && day <= 25) return 'invasion';
    return null;
  }
  function moistureMax(s) { return s.facilities.includes('reservoir') ? 10 : 8; }
  function addMoisture(s, amount) {
    if (amount > 0 && s.moisture + amount > moistureMax(s)) s.pressure = clamp(s.pressure + Math.ceil((s.moisture + amount - moistureMax(s)) / 2), 0, 10);
    s.moisture = clamp(s.moisture + amount, 0, moistureMax(s));
  }
  function effectiveCost(s, c) { return Math.max(0, c.cost - (c.speciesChoice && weatherForDay(s.day) === 'migration' ? 1 : 0)); }
  function speciesOptions(s) {
    return D.species.filter(x => !s.species.includes(x.id) && (
      x.id === 'bee' ? s.habitats.meadow >= 1 :
      x.id === 'frog' ? s.habitats.water >= 1 :
      x.id === 'rabbit' ? s.habitats.meadow >= 2 :
      x.id === 'fox' ? s.species.includes('rabbit') && s.habitats.forest >= 1 :
      x.id === 'owl' ? s.habitats.forest >= 2 : s.habitats.water >= 2));
  }
  function facilityOptions(s) { return D.facilities.filter(x => !s.facilities.includes(x.id)); }
  function createInitialState(seed = Date.now()) {
    const s = { version: D.version, rng: seed >>> 0, seed: seed >>> 0, uid: 0, day: 1, totalDays: D.totalDays,
      hp: 40, maxHp: 40, seeds: 3, research: 0, moisture: 4, pressure: 0, forecastTokens: 0,
      habitats: { water: 0, meadow: 0, forest: 0 }, species: [], facilities: [], topics: [],
      safeNights: { water: 0, meadow: 0, forest: 0 }, firstMeadow: false, owlDrawn: false,
      energy: 3, block: 0, lastRoute: null, combos: 0, dailyCombos: 0, cardsPlayed: 0,
      upgrades: {}, deck: { draw: [], discard: [], hand: [], played: [] }, retained: null, swapped: false, swapsUsed: 0,
      history: [], lastLog: '先看看今晚的冲击，再选择建设或防御。', status: 'playing', rewardPending: false };
    s.forecasts = Array.from({ length: D.totalDays }, (_, i) => {
      const day = i + 1, act = Math.floor(i / 10), threat = D.threats[Math.floor(random(s) * D.threats.length)];
      const boss = day % 10 === 0;
      const attack = day <= 3 ? [2, 3, 4][i] : boss ? [20, 32, 46][act] : 8 + act * 8 + Math.floor(random(s) * 5);
      return { ...threat, day, attack, boss, icon: boss ? ['🌧', '🐛', '🔥'][act] : threat.icon, name: boss ? ['汛期考验', '虫潮考验', '旱季考验'][act] : threat.name, route: boss ? ['water', 'meadow', 'forest'][act] : threat.route };
    });
    const opening = ['rain', 'flowers', 'seed', 'meadow', 'survey'], remainder = D.starterDeck.slice();
    opening.forEach(id => remainder.splice(remainder.indexOf(id), 1));
    s.deck.hand = opening.map(id => instance(s, id));
    s.deck.draw = shuffle(s, remainder.map(id => instance(s, id)));
    return s;
  }
  function draw(s, count) {
    for (let i = 0; i < count && s.deck.hand.length < 7; i++) {
      if (!s.deck.draw.length) { s.deck.draw = shuffle(s, s.deck.discard); s.deck.discard = []; }
      if (!s.deck.draw.length) break;
      s.deck.hand.push(s.deck.draw.pop());
    }
  }
  function topicStatus(s, id) {
    const checks = id === 'water_cycle' ? [s.habitats.water >= 2, s.safeNights.water >= 1, s.moisture >= 3] :
      id === 'pollinator_web' ? [s.habitats.meadow >= 2, s.species.includes('bee'), s.combos >= 3] :
      [s.habitats.forest >= 2, s.species.includes('owl'), s.safeNights.forest >= 1, s.pressure <= 6];
    return { checks, ready: !s.topics.includes(id) && checks.every(Boolean) && s.research >= D.topics.find(t => t.id === id).cost };
  }
  function completeTopic(s, id) {
    if (s.status !== 'playing' || s.rewardPending || !D.topics.some(t => t.id === id) || !topicStatus(s, id).ready) return false;
    const topic = D.topics.find(t => t.id === id);
    s.research -= topic.cost; s.topics.push(id);
    s.lastLog = `完成生态课题「${topic.name}」，研究点−${topic.cost}。`;
    return true;
  }
  function previewCard(s, c, choice = {}) {
    const combo = c.route !== 'neutral' && nextRoute[s.lastRoute] === c.route;
    const p = { block: c.block || 0, seeds: c.seeds || 0, research: c.research || 0, heal: c.heal || 0,
      hurt: c.hurt || 0, draw: c.draw || 0, energy: c.energy || 0, moisture: c.moisture || 0,
      pressure: c.pressure || 0, forecast: c.forecast || 0, build: null, species: null, facility: null,
      redrawHand: 0, replaceCard: null, combo };
    if (c.perLevel) p.block += s.habitats[c.perLevel] * 3;
    if (c.meadowStudy) p.research += s.habitats.meadow;
    if (c.lowMoistureBonus && s.moisture <= 2) p.block += c.lowMoistureBonus;
    if (c.usePressure) {
      if (s.pressure >= c.usePressure) p.pressure -= c.usePressure;
      else { p.draw = 0; p.energy = 0; p.block += 5; }
    }
    if (c.waterSpend) {
      if (s.moisture >= c.waterSpend) p.moisture -= c.waterSpend;
      else { p.energy = 0; p.forecast = 0; p.block += c.lowWaterBlock; }
    }
    const availableDraws = s.deck.draw.length + s.deck.discard.length;
    if (c.redrawHand) {
      p.redrawHand = Math.max(0, s.deck.hand.length - 1);
      p.draw = Math.min(p.redrawHand, availableDraws);
    }
    if (c.replaceChoice) {
      const old = s.deck.hand.find(x => x.uid === choice.replaceCard);
      if (old && old.uid !== choice.playingUid) {
        p.replaceCard = old.uid;
        p.draw = Math.min(c.draw, availableDraws, 9 - s.deck.hand.length);
      } else { p.draw = 0; p.forecast++; }
    }
    if (c.build) {
      if (s.habitats[c.build] >= 3) { p.block += 8; p.research += 2; }
      else {
        const seedCost = weatherForDay(s.day) === 'storm' ? 3 : 2;
        const waterCost = c.build === 'meadow' ? 0 : 2;
        if (s.seeds < seedCost) p.seeds += 3;
        else if (s.moisture < waterCost) p.moisture += 3;
        else { p.seeds -= seedCost; p.moisture -= waterCost; p.build = c.build; p.research += 1; }
      }
    }
    if (c.speciesChoice) {
      if (choice.species && speciesOptions(s).some(x => x.id === choice.species)) p.species = choice.species;
      else if (!choice.species || choice.species === 'observe') p.research += 2;
    }
    if (c.facilityChoice) {
      if (choice.facility && facilityOptions(s).some(x => x.id === choice.facility)) p.facility = choice.facility;
      else if (!choice.facility) p.forecast += 1;
    }
    if (weatherForDay(s.day) === 'storm' && c.route === 'water') p.block += 2;
    if (weatherForDay(s.day) === 'invasion' && c.route === 'meadow') p.pressure++;
    if (c.route === 'meadow' && s.species.includes('bee') && !s.firstMeadow) p.research++;
    if (combo) {
      p.block += 3 + (c.comboBlock || 0); p.research++; p.energy += c.comboEnergy || 0;
      if (!s.dailyCombos && s.habitats.meadow >= 2) p.research++;
      if (!s.dailyCombos && s.facilities.includes('field_lab')) p.research++;
      if (c.route === 'forest' && s.species.includes('owl') && !s.owlDrawn && s.lastRoute === 'meadow' && s.dailyCombos >= 1) p.draw++;
    }
    p.actualSeeds = clamp(s.seeds + p.seeds, 0, 12) - s.seeds;
    p.actualMoisture = clamp(s.moisture + p.moisture, 0, moistureMax(s)) - s.moisture;
    p.overflowPressure = p.moisture > 0 ? Math.ceil(Math.max(0, s.moisture + p.moisture - moistureMax(s)) / 2) : 0;
    p.actualPressure = clamp(s.pressure + p.overflowPressure + p.pressure, 0, 10) - s.pressure;
    p.actualForecast = clamp(s.forecastTokens + p.forecast, 0, 4) - s.forecastTokens;
    return p;
  }
  function effectText(p) {
    const bits = [];
    if (p.build) bits.push(D.routes[p.build].name + '升1级');
    if (p.block) bits.push('护盾+' + p.block);
    const seeds = p.actualSeeds ?? p.seeds, moisture = p.actualMoisture ?? p.moisture;
    const pressure = p.actualPressure ?? p.pressure, forecast = p.actualForecast ?? p.forecast;
    if (seeds) bits.push('种子' + (seeds > 0 ? '+' : '') + seeds);
    if (p.research) bits.push('研究+' + p.research);
    if (p.heal) bits.push('生命+' + p.heal);
    if (p.hurt) bits.push('生命−' + p.hurt);
    if (p.redrawHand) bits.push('换掉' + p.redrawHand + '张手牌');
    if (p.replaceCard) bits.push('换掉指定手牌');
    if (p.draw) bits.push('抽' + p.draw + '张');
    if (p.energy) bits.push('行动力+' + p.energy);
    if (moisture) bits.push('水分' + (moisture > 0 ? '+' : '') + moisture);
    if (pressure) bits.push('压力' + (pressure > 0 ? '+' : '') + pressure);
    if (forecast) bits.push('预警+' + forecast);
    if (p.species) bits.push('引入' + D.species.find(x => x.id === p.species).name);
    if (p.facility) bits.push('建造' + D.facilities.find(x => x.id === p.facility).name);
    if (!p.species && !p.facility && !bits.length) bits.push('筹备下一步');
    return bits.join(' · ');
  }
  function play(s, uid, choice = {}) {
    if (s.status !== 'playing' || s.rewardPending) return false;
    const index = s.deck.hand.findIndex(c => c.uid === uid);
    if (index < 0) return false;
    const c = getCard(s.deck.hand[index].cardId, s);
    if (s.energy < effectiveCost(s, c) || (c.hurt && s.hp <= c.hurt)) return false;
    if (c.speciesChoice && choice.species && choice.species !== 'observe' && !speciesOptions(s).some(x => x.id === choice.species)) return false;
    if (c.facilityChoice && choice.facility) {
      if (!facilityOptions(s).some(x => x.id === choice.facility)) return false;
      if (s.facilities.length >= 3 && !s.facilities.includes(choice.replace)) return false;
    }
    if (c.replaceChoice && choice.replaceCard && choice.replaceCard !== 'skip' && (choice.replaceCard === uid || !s.deck.hand.some(x => x.uid === choice.replaceCard))) return false;
    const p = previewCard(s, c, { ...choice, playingUid: uid });
    s.energy += p.energy - effectiveCost(s, c); s.block += p.block;
    s.seeds = clamp(s.seeds + p.seeds, 0, 12); s.research += p.research;
    s.hp = clamp(s.hp + p.heal - p.hurt, 0, s.maxHp);
    addMoisture(s, p.moisture); s.pressure = clamp(s.pressure + p.pressure, 0, 10);
    s.forecastTokens = clamp(s.forecastTokens + p.forecast, 0, 4);
    if (p.build) s.habitats[p.build]++;
    if (p.species) s.species.push(p.species);
    if (p.facility) {
      if (s.facilities.length >= 3) s.facilities.splice(s.facilities.indexOf(choice.replace), 1);
      s.facilities.push(p.facility);
      s.moisture = Math.min(s.moisture, moistureMax(s));
    }
    if (p.combo) { s.combos++; s.dailyCombos++; }
    if (c.route === 'meadow') s.firstMeadow = true;
    if (p.draw && s.species.includes('owl') && c.route === 'forest' && s.dailyCombos >= 2) s.owlDrawn = true;
    if (c.route !== 'neutral') s.lastRoute = c.route;
    if (s.retained === uid) s.retained = null;
    s.deck.played.push(...s.deck.hand.splice(index, 1));
    if (p.redrawHand) {
      if (s.deck.hand.some(x => x.uid === s.retained)) s.retained = null;
      s.deck.played.push(...s.deck.hand.splice(0));
    } else if (p.replaceCard) {
      if (s.retained === p.replaceCard) s.retained = null;
      s.deck.played.push(...s.deck.hand.splice(s.deck.hand.findIndex(x => x.uid === p.replaceCard), 1));
    }
    draw(s, p.draw); s.cardsPlayed++;
    s.lastLog = c.title + (p.combo ? ' · 连携！' : '') + '：' + effectText(p);
    return p;
  }
  function defense(s, threat = s.forecasts[s.day - 1]) {
    const habitat = s.habitats[threat.route] * 2;
    let attack = threat.attack;
    if (s.facilities.includes('reservoir') && (threat.name.includes('暴雨') || threat.name.includes('汛期'))) attack += 3;
    if (threat.route === 'forest' && s.moisture === 0) attack += 3;
    if (threat.route === 'water' && s.species.includes('frog')) attack -= 2;
    if (threat.route === 'meadow' && s.species.includes('fox')) attack -= 2;
    attack = Math.max(0, attack - (s.forecastReduction || 0));
    const overload = s.pressure >= 10 ? 4 : 0;
    return { attack, habitat, block: s.block, overload, damage: Math.max(0, attack - habitat - s.block) + overload, absorbed: Math.max(0, attack - habitat) };
  }
  function objectives(s) { return { topics: s.topics.length, alive: s.hp > 0 }; }
  function mitigate(s) {
    if (s.status !== 'playing' || s.rewardPending || s.forecastTokens < 1 || (s.forecastReduction || 0) >= 12) return false;
    s.forecastTokens--; s.forecastReduction = (s.forecastReduction || 0) + 3;
    s.lastLog = '消耗1预警标记，今晚冲击−3。'; return true;
  }
  function startDay(s) {
    const weather = weatherForDay(s.day);
    addMoisture(s, s.habitats.water > 0 ? 1 : -1);
    if (s.facilities.includes('reservoir')) addMoisture(s, 1);
    if (weather === 'drought') addMoisture(s, -2);
    if (weather === 'storm') addMoisture(s, 2);
    if (!s.moisture && weather === 'drought') s.pressure = clamp(s.pressure + 1, 0, 10);
    if (s.species.includes('rabbit') && !s.species.includes('fox')) s.pressure = clamp(s.pressure + 1, 0, 10);
    s.seeds = clamp(s.seeds + s.habitats.meadow + (s.species.includes('rabbit') ? 1 : 0) + (s.facilities.includes('seed_bank') ? 1 : 0) - (s.pressure >= 4 ? 1 : 0), 0, 12);
    s.forecastTokens = clamp(s.forecastTokens + (s.facilities.includes('weather_station') ? 1 : 0) + (s.species.includes('waterbird') && s.moisture >= 4 ? 1 : 0), 0, 4);
    s.block += s.habitats.forest;
    s.firstMeadow = false; s.owlDrawn = false; s.forecastReduction = 0;
    const target = s.pressure >= 7 ? 4 : 5;
    draw(s, target - s.deck.hand.length);
  }
  function endDay(s) {
    if (s.status !== 'playing' || s.rewardPending) return false;
    const d = defense(s), threat = s.forecasts[s.day - 1];
    s.hp = Math.max(0, s.hp - d.damage);
    if (!d.damage && s.habitats.water >= 2) s.hp = Math.min(s.maxHp, s.hp + 1);
    if (!d.damage) s.safeNights[threat.route]++;
    if (d.overload) s.pressure = 7;
    s.history.push({ day: s.day, damage: d.damage, name: threat.name, hp: s.hp });
    s.lastLog = '第' + s.day + '天 · ' + threat.name + '：' + (d.damage ? '损失' + d.damage + '生命' : '平安度过') + '。';
    if (!s.hp) { s.status = 'lost'; return d; }
    if (s.day === s.totalDays) {
      const o = objectives(s);
      s.status = o.topics === D.topics.length ? 'won' : 'unfinished';
      return d;
    }
    const remaining = Math.max(0, s.block - d.absorbed);
    s.block = s.habitats.forest >= 2 ? Math.min(4, remaining) : 0;
    const held = s.deck.hand.find(c => c.uid === s.retained);
    s.deck.discard.push(...s.deck.hand.filter(c => c !== held), ...s.deck.played);
    s.deck.hand = held ? [held] : []; s.deck.played = [];
    s.energy = 3 + Math.min(1, s.energy); s.day++;
    s.lastRoute = null; s.dailyCombos = 0; s.retained = null; s.swapped = false; s.swapsUsed = 0;
    startDay(s);
    s.rewardPending = (s.day - 1) % 5 === 0;
    return d;
  }
  function swap(s) {
    const used = s.swapsUsed ?? (s.swapped ? 1 : 0);
    if (s.status !== 'playing' || s.rewardPending || used >= 2 || (used === 1 && s.energy < 1)) return false;
    const old = s.deck.hand.filter(c => c.uid !== s.retained);
    if (!old.length) return false;
    if (used === 1) s.energy--;
    s.swapsUsed = used + 1; s.swapped = true;
    s.deck.hand = s.deck.hand.filter(c => c.uid === s.retained);
    draw(s, old.length);
    s.deck.discard.push(...old); draw(s, Math.max(0, 5 - s.deck.hand.length));
    s.lastLog = (used === 0 ? '免费' : '花费1行动力') + '重抽手牌（今天第' + s.swapsUsed + '/2次）。保留的牌不会被换掉。'; return true;
  }
  function guard(s) {
    if (s.status !== 'playing' || s.rewardPending || s.energy < 1) return false;
    s.energy--; s.block += s.facilities.includes('ranger_camp') ? 5 : 3;
    s.lastLog = '常备巡护：花费1行动力，获得' + (s.facilities.includes('ranger_camp') ? 5 : 3) + '护盾。'; return true;
  }
  function rewardOptions(s) {
    const owned = Object.values(s.deck).flat();
    const options = shuffle(s, D.cards.filter(c => !D.starterDeck.includes(c.id) && owned.filter(o => o.cardId === c.id).length < 2));
    if (s.day === 6) {
      const featured = options.find(c => c.id === 'relay') || options.find(c => ['water_drive', 'hand_refresh', 'targeted_exchange'].includes(c.id));
      if (featured) return [featured, ...options.filter(c => c !== featured).slice(0, 2)].map(c => c.id);
    }
    return options.slice(0, 3).map(c => c.id);
  }
  function reward(s, type, id, offered = []) {
    if (!s.rewardPending) return false;
    const piles = ['hand', 'draw', 'discard', 'played'], owned = piles.flatMap(k => s.deck[k]);
    if (type === 'add') {
      if (!offered.includes(id)) return false;
      s.deck.discard.push(instance(s, id));
    } else if (type === 'upgrade') {
      if (!owned.some(c => c.cardId === id) || s.upgrades[id]) return false;
      s.upgrades[id] = true;
    } else if (type === 'remove') {
      if (!canRemove(s, id)) return false;
      piles.forEach(k => { s.deck[k] = s.deck[k].filter(c => c.uid !== id); });
    } else if (type === 'rest') s.hp = Math.min(s.maxHp, s.hp + 10);
    else return false;
    s.rewardPending = false; s.lastLog = '营地整备完成，继续规划。';
    return true;
  }
  function canRemove(s, uid) {
    const owned = Object.values(s.deck).flat(), item = owned.find(c => c.uid === uid);
    if (!item || owned.length <= 6) return false;
    const c = getCard(item.cardId, s);
    if (c.speciesChoice && (!s.species.includes('bee') || !s.species.includes('owl')) && owned.filter(i => i.cardId === c.id).length <= 1) return false;
    return !c.build || s.habitats[c.build] >= 2 || owned.filter(i => i.cardId === c.id).length > 1;
  }
  window.Ecosystem = { random, shuffle, instance, getCard, createInitialState, draw, previewCard, effectText, play, defense, objectives, endDay, swap, guard, rewardOptions, reward, canRemove, completeTopic, topicStatus, speciesOptions, facilityOptions, weatherForDay, effectiveCost, moistureMax, mitigate, nextRoute };
})();
