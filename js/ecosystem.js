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
    if (result.upgraded && !result.build) {
      const base = [];
      if (result.block) base.push('护盾+' + result.block);
      if (result.seeds) base.push('种子+' + result.seeds);
      if (result.research) base.push('研究+' + result.research);
      if (result.heal) base.push('生命+' + result.heal);
      if (result.hurt) base.push('生命−' + result.hurt);
      if (result.energy) base.push('行动力+' + result.energy);
      if (result.draw) base.push('抽' + result.draw + '张');
      result.text = base.join('，') + '。';
      if (result.perLevel) result.text += '每级' + D.routes[result.perLevel].name + '额外+3护盾。';
      if (result.meadowStudy) result.text += '每级草灌额外+1研究。';
      if (result.comboBlock) result.text += '接在草系牌后额外+5护盾。';
      if (result.comboEnergy) result.text += '接在林系牌后返还1行动力。';
    }
    return result;
  }
  function createInitialState(seed = Date.now()) {
    const s = { version: D.version, rng: seed >>> 0, seed: seed >>> 0, uid: 0, day: 1, totalDays: D.totalDays,
      hp: 40, maxHp: 40, seeds: 3, research: 0, habitats: { water: 0, meadow: 0, forest: 0 },
      energy: 3, block: 0, lastRoute: null, combos: 0, dailyCombos: 0, cardsPlayed: 0,
      upgrades: {}, deck: { draw: [], discard: [], hand: [], played: [] }, retained: null, swapped: false,
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
  function previewCard(s, c) {
    const combo = c.route !== 'neutral' && nextRoute[s.lastRoute] === c.route;
    const p = { block: c.block || 0, seeds: c.seeds || 0, research: c.research || 0, heal: c.heal || 0,
      hurt: c.hurt || 0, draw: c.draw || 0, energy: c.energy || 0, build: null, combo };
    if (c.perLevel) p.block += s.habitats[c.perLevel] * 3;
    if (c.meadowStudy) p.research += s.habitats.meadow;
    if (c.build) {
      if (s.habitats[c.build] >= 3) { p.block += 8; p.research += 2; }
      else if (s.seeds >= 2) { p.seeds -= 2; p.build = c.build; p.research += 2; }
      else p.seeds += 3;
    }
    if (combo) {
      p.block += 3 + (c.comboBlock || 0); p.research++; p.energy += c.comboEnergy || 0;
      if (!s.dailyCombos && s.habitats.meadow >= 2) p.research += 2;
    }
    return p;
  }
  function effectText(p) {
    const bits = [];
    if (p.build) bits.push(D.routes[p.build].name + '升1级');
    if (p.block) bits.push('护盾+' + p.block);
    if (p.seeds) bits.push('种子' + (p.seeds > 0 ? '+' : '') + p.seeds);
    if (p.research) bits.push('研究+' + p.research);
    if (p.heal) bits.push('生命+' + p.heal);
    if (p.hurt) bits.push('生命−' + p.hurt);
    if (p.draw) bits.push('抽' + p.draw + '张');
    if (p.energy) bits.push('行动力+' + p.energy);
    return bits.join(' · ');
  }
  function play(s, uid) {
    if (s.status !== 'playing' || s.rewardPending) return false;
    const index = s.deck.hand.findIndex(c => c.uid === uid);
    if (index < 0) return false;
    const c = getCard(s.deck.hand[index].cardId, s);
    if (s.energy < c.cost || (c.hurt && s.hp <= c.hurt)) return false;
    const p = previewCard(s, c);
    s.energy += p.energy - c.cost; s.block += p.block;
    s.seeds = clamp(s.seeds + p.seeds, 0, 12); s.research += p.research;
    s.hp = clamp(s.hp + p.heal - p.hurt, 0, s.maxHp);
    if (p.build) s.habitats[p.build]++;
    if (p.combo) { s.combos++; s.dailyCombos++; }
    if (c.route !== 'neutral') s.lastRoute = c.route;
    if (s.retained === uid) s.retained = null;
    s.deck.played.push(...s.deck.hand.splice(index, 1));
    draw(s, p.draw); s.cardsPlayed++;
    s.lastLog = c.title + (p.combo ? ' · 连携！' : '') + '：' + effectText(p);
    return p;
  }
  function defense(s, threat = s.forecasts[s.day - 1]) {
    const habitat = s.habitats[threat.route] * 2;
    return { attack: threat.attack, habitat, block: s.block, damage: Math.max(0, threat.attack - habitat - s.block), absorbed: Math.max(0, threat.attack - habitat) };
  }
  function objectives(s) { return { networks: Object.values(s.habitats).filter(n => n >= 2).length, research: s.research, alive: s.hp > 0 }; }
  function endDay(s) {
    if (s.status !== 'playing' || s.rewardPending) return false;
    const d = defense(s), threat = s.forecasts[s.day - 1];
    s.hp = Math.max(0, s.hp - d.damage);
    if (!d.damage && s.habitats.water >= 2) s.hp = Math.min(s.maxHp, s.hp + 1);
    s.history.push({ day: s.day, damage: d.damage, name: threat.name, hp: s.hp });
    s.lastLog = '第' + s.day + '天 · ' + threat.name + '：' + (d.damage ? '损失' + d.damage + '生命' : '平安度过') + '。';
    if (!s.hp) { s.status = 'lost'; return d; }
    if (s.day === s.totalDays) {
      const o = objectives(s);
      s.status = o.networks >= 2 && o.research >= D.researchGoal ? 'won' : 'unfinished';
      return d;
    }
    const remaining = Math.max(0, s.block - d.absorbed);
    s.block = (s.habitats.forest >= 2 ? Math.min(4, remaining) : 0) + s.habitats.forest;
    const held = s.deck.hand.find(c => c.uid === s.retained);
    s.deck.discard.push(...s.deck.hand.filter(c => c !== held), ...s.deck.played);
    s.deck.hand = held ? [held] : []; s.deck.played = [];
    s.energy = 3 + Math.min(1, s.energy); s.day++;
    s.seeds = clamp(s.seeds + s.habitats.meadow, 0, 12);
    s.lastRoute = null; s.dailyCombos = 0; s.retained = null; s.swapped = false;
    draw(s, 5 - s.deck.hand.length);
    s.rewardPending = (s.day - 1) % 5 === 0;
    return d;
  }
  function swap(s) {
    if (s.status !== 'playing' || s.rewardPending || s.swapped || s.energy < 1) return false;
    const old = s.deck.hand.filter(c => c.uid !== s.retained);
    if (!old.length) return false;
    s.energy--; s.swapped = true;
    s.deck.hand = s.deck.hand.filter(c => c.uid === s.retained);
    draw(s, old.length);
    s.deck.discard.push(...old); draw(s, Math.max(0, 5 - s.deck.hand.length));
    s.lastLog = '花费1行动力，重抽手牌。每个白天限一次。'; return true;
  }
  function guard(s) {
    if (s.status !== 'playing' || s.rewardPending || s.energy < 1) return false;
    s.energy--; s.block += 3; s.lastLog = '常备巡护：花费1行动力，获得3护盾。'; return true;
  }
  function rewardOptions(s) {
    const owned = Object.values(s.deck).flat();
    return shuffle(s, D.cards.filter(c => !D.starterDeck.includes(c.id) && owned.filter(o => o.cardId === c.id).length < 2)).slice(0, 3).map(c => c.id);
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
    return !c.build || s.habitats[c.build] >= 2 || owned.filter(i => i.cardId === c.id).length > 1;
  }
  window.Ecosystem = { random, shuffle, instance, getCard, createInitialState, draw, previewCard, effectText, play, defense, objectives, endDay, swap, guard, rewardOptions, reward, canRemove, nextRoute };
})();
