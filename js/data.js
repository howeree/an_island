/* All cards have useful base effects; nothing targets or overwrites hidden terrain. */
(function () {
  const routes = {
    water: { name: '湿地', icon: '🪷', color: '#388fad', benefit: '每级抵消水系冲击2点；2级起，平安过夜恢复1生命。' },
    meadow: { name: '草地与灌丛', icon: '🌼', color: '#b28a28', benefit: '每天获得等同等级的种子；每级抵消虫害2点；2级起，每天首次连携额外+2研究。' },
    forest: { name: '森林', icon: '🌲', color: '#358267', benefit: '每天获得等同等级的护盾；每级抵消林火2点；2级起，最多保留4护盾到明天。' },
    neutral: { name: '通用', icon: '◇', color: '#687e8d', benefit: '不打断连携顺序。' }
  };
  const cards = [
    { id: 'rain', title: '收集雨水', icon: '💧', route: 'water', cost: 1, block: 6, text: '护盾 +6。', upgrade: { block: 9 } },
    { id: 'seed', title: '本地苗圃', icon: '🌱', route: 'forest', cost: 1, seeds: 3, block: 2, text: '种子 +3，护盾 +2。', upgrade: { seeds: 4, block: 4 } },
    { id: 'flowers', title: '传粉调查', icon: '🐝', route: 'meadow', cost: 1, research: 3, block: 2, text: '研究 +3，护盾 +2。', upgrade: { research: 5, block: 3 } },
    { id: 'wetland', title: '恢复湿地', icon: '🪷', route: 'water', cost: 2, build: 'water', text: '花2种子，湿地升1级；不足则获得3种子。满级：护盾+8、研究+2。', upgrade: { cost: 1 } },
    { id: 'meadow', title: '草灌共生', icon: '🌾', route: 'meadow', cost: 2, build: 'meadow', text: '花2种子，草灌升1级；不足则获得3种子。满级：护盾+8、研究+2。', upgrade: { cost: 1 } },
    { id: 'forest', title: '培育林地', icon: '🌳', route: 'forest', cost: 2, build: 'forest', text: '花2种子，森林升1级；不足则获得3种子。满级：护盾+8、研究+2。', upgrade: { cost: 1 } },
    { id: 'patrol', title: '应急巡护', icon: '🛡', route: 'neutral', cost: 1, block: 5, text: '护盾 +5。不打断连携。', upgrade: { block: 8 } },
    { id: 'survey', title: '野外考察', icon: '🔎', route: 'neutral', cost: 0, draw: 2, text: '抽2张牌。今天打过的牌，明天才回到循环。', upgrade: { draw: 3 } },
    { id: 'compost', title: '生态堆肥', icon: '♻', route: 'meadow', cost: 1, heal: 3, seeds: 1, text: '生命 +3，种子 +1。', upgrade: { heal: 5, seeds: 2 } },
    { id: 'reed', title: '芦苇缓冲带', icon: '🌿', route: 'water', cost: 1, block: 4, perLevel: 'water', text: '护盾 +4，每级湿地额外+3。', upgrade: { block: 7 } },
    { id: 'canopy', title: '林冠庇护', icon: '🦉', route: 'forest', cost: 1, block: 4, perLevel: 'forest', text: '护盾 +4，每级森林额外+3。', upgrade: { block: 7 } },
    { id: 'bloom', title: '连续花期', icon: '🦋', route: 'meadow', cost: 1, research: 2, block: 3, meadowStudy: true, text: '护盾 +3，研究 +2；每级草灌再+1研究。', upgrade: { block: 5, research: 3 } },
    { id: 'channel', title: '引水修复', icon: '〰', route: 'water', cost: 1, heal: 3, block: 3, text: '生命 +3，护盾 +3。', upgrade: { heal: 5, block: 5 } },
    { id: 'fox', title: '狐狸巡游', icon: '🦊', route: 'forest', cost: 1, block: 4, comboBlock: 5, text: '护盾 +4；接在草系牌后额外+5护盾。', upgrade: { block: 7 } },
    { id: 'cycle', title: '水汽循环', icon: '🌧', route: 'water', cost: 1, block: 4, comboEnergy: 1, text: '护盾 +4；接在林系牌后返还1行动力。', upgrade: { block: 7 } },
    { id: 'rescue', title: '生态急救', icon: '🩹', route: 'neutral', cost: 2, heal: 9, text: '生命 +9。不打断连携。', upgrade: { heal: 13 } },
    { id: 'effort', title: '紧急动员', icon: '⚡', route: 'neutral', cost: 0, hurt: 3, energy: 2, text: '失去3生命，行动力+2。明天才回到循环。', upgrade: { hurt: 1 } },
    { id: 'reserve', title: '种子储备', icon: '🏺', route: 'forest', cost: 0, seeds: 2, text: '种子 +2。不消耗行动力。', upgrade: { seeds: 3 } }
  ];
  const threats = [
    { name: '上游浑水', route: 'water', icon: '🌊' }, { name: '暴雨径流', route: 'water', icon: '🌧' },
    { name: '食叶虫潮', route: 'meadow', icon: '🐛' }, { name: '入侵藤蔓', route: 'meadow', icon: '🌿' },
    { name: '林缘热浪', route: 'forest', icon: '☀' }, { name: '干燥季风', route: 'forest', icon: '🔥' }
  ];
  const starterDeck = ['rain', 'rain', 'seed', 'flowers', 'wetland', 'meadow', 'forest', 'patrol', 'survey', 'compost'];
  window.IslandData = { routes, cards, threats, starterDeck, version: 3, totalDays: 30, researchGoal: 24 };
})();
