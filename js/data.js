/* All cards have useful base effects; nothing targets or overwrites hidden terrain. */
(function () {
  const routes = {
    water: { name: '湿地', icon: '🪷', color: '#388fad', benefit: '每级抵消水系冲击2点；每天补充1水分；2级起无伤过夜恢复1生命。' },
    meadow: { name: '草地与灌丛', icon: '🌼', color: '#b28a28', benefit: '每天获得等同等级的种子；每级抵消虫害2点；2级起首次连携额外+1研究点。' },
    forest: { name: '森林', icon: '🌲', color: '#358267', benefit: '每天获得等同等级的护盾；每级抵消林火2点；2级起，最多保留4护盾到明天。' },
    neutral: { name: '通用', icon: '◇', color: '#687e8d', benefit: '不打断连携顺序。' }
  };
  const cards = [
    { id: 'rain', title: '收集雨水', icon: '💧', route: 'water', cost: 1, block: 5, moisture: 3, text: '护盾+5，水分+3；水分溢出会增加压力。', upgrade: { block: 7, moisture: 4 } },
    { id: 'seed', title: '本地苗圃', icon: '🌱', route: 'forest', cost: 1, seeds: 3, block: 2, text: '种子 +3，护盾 +2。', upgrade: { seeds: 4, block: 4 } },
    { id: 'flowers', title: '传粉调查', icon: '🐝', route: 'meadow', cost: 1, research: 2, block: 2, text: '研究点+2，护盾+2。研究点用于完成生态课题。', upgrade: { research: 3, block: 3 } },
    { id: 'wetland', title: '恢复湿地', icon: '🪷', route: 'water', cost: 2, build: 'water', text: '花2种子和2水分升1级；资源不足时先补资源。满级变为护盾。', upgrade: { cost: 1 } },
    { id: 'meadow', title: '草灌共生', icon: '🌾', route: 'meadow', cost: 2, build: 'meadow', text: '花2种子，草灌升1级；不足则获得3种子。满级：护盾+8、研究+2。', upgrade: { cost: 1 } },
    { id: 'forest', title: '培育林地', icon: '🌳', route: 'forest', cost: 2, build: 'forest', text: '花2种子和2水分升1级；资源不足时先补资源。满级变为护盾。', upgrade: { cost: 1 } },
    { id: 'patrol', title: '应急巡护', icon: '🛡', route: 'neutral', cost: 1, block: 5, text: '护盾 +5。不打断连携。', upgrade: { block: 8 } },
    { id: 'survey', title: '野外考察', icon: '🔎', route: 'neutral', cost: 0, draw: 2, text: '抽2张牌。今天打过的牌，明天才回到循环。', upgrade: { draw: 3 } },
    { id: 'compost', title: '生态堆肥', icon: '♻', route: 'meadow', cost: 1, heal: 3, seeds: 1, pressure: -2, text: '生命+3，种子+1，生态压力−2。', upgrade: { heal: 5, seeds: 2, pressure: -3 } },
    { id: 'reed', title: '芦苇缓冲带', icon: '🌿', route: 'water', cost: 1, block: 4, perLevel: 'water', text: '护盾 +4，每级湿地额外+3。', upgrade: { block: 7 } },
    { id: 'canopy', title: '林冠庇护', icon: '🦉', route: 'forest', cost: 1, block: 4, perLevel: 'forest', text: '护盾 +4，每级森林额外+3。', upgrade: { block: 7 } },
    { id: 'bloom', title: '连续花期', icon: '🦋', route: 'meadow', cost: 1, research: 2, block: 3, meadowStudy: true, text: '护盾 +3，研究 +2；每级草灌再+1研究。', upgrade: { block: 5, research: 3 } },
    { id: 'channel', title: '引水修复', icon: '〰', route: 'water', cost: 1, heal: 3, block: 3, moisture: 2, text: '生命+3，护盾+3，水分+2。', upgrade: { heal: 5, block: 5, moisture: 3 } },
    { id: 'fox', title: '狐狸巡游', icon: '🦊', route: 'forest', cost: 1, block: 4, comboBlock: 5, text: '护盾 +4；接在草系牌后额外+5护盾。', upgrade: { block: 7 } },
    { id: 'cycle', title: '水汽循环', icon: '🌧', route: 'water', cost: 1, block: 4, comboEnergy: 1, text: '护盾 +4；接在林系牌后返还1行动力。', upgrade: { block: 7 } },
    { id: 'rescue', title: '生态急救', icon: '🩹', route: 'neutral', cost: 2, heal: 9, text: '生命 +9。不打断连携。', upgrade: { heal: 13 } },
    { id: 'effort', title: '紧急动员', icon: '⚡', route: 'neutral', cost: 0, hurt: 3, energy: 2, pressure: 2, text: '失去3生命，压力+2，行动力+2。', upgrade: { hurt: 1, pressure: 1 } },
    { id: 'reserve', title: '种子储备', icon: '🏺', route: 'forest', cost: 0, seeds: 2, text: '种子 +2。不消耗行动力。', upgrade: { seeds: 3 } },
    { id: 'species_scout', title: '物种迁入', icon: '🦋', route: 'neutral', cost: 1, speciesChoice: true, text: '选择一只符合条件的物种永久加入食物网；暂无候选时获得研究点。', upgrade: { cost: 0 } },
    { id: 'facility_plan', title: '设施规划', icon: '🏗', route: 'neutral', cost: 1, facilityChoice: true, text: '选择并建设一座永久设施；满3槽时可替换旧设施。', upgrade: { cost: 0 } },
    { id: 'weather_watch', title: '气象监测', icon: '📡', route: 'water', cost: 1, forecast: 2, moisture: 1, text: '预警标记+2，水分+1；可用标记削弱今晚危机。', upgrade: { forecast: 3, moisture: 2 } },
    { id: 'adaptation', title: '适应性管理', icon: '🍀', route: 'meadow', cost: 1, usePressure: 2, draw: 2, energy: 1, text: '消耗2生态压力，抽2张并获得1行动力；压力不足时改为护盾+5。', upgrade: { draw: 3 } },
    { id: 'drought_flora', title: '耐旱植物', icon: '🌵', route: 'meadow', cost: 1, block: 4, lowMoistureBonus: 7, text: '护盾+4；水分≤2时额外+7。', upgrade: { block: 6 } },
    { id: 'water_drive', title: '水力调度', icon: '⚙️', route: 'water', cost: 0, waterSpend: 2, energy: 1, forecast: 1, lowWaterBlock: 4, text: '水分≥2时花2水分，行动力+1、预警+1；水不足时改为护盾+4。', upgrade: { forecast: 2, lowWaterBlock: 6 } },
    { id: 'hand_refresh', title: '重新勘察', icon: '🗺️', route: 'neutral', cost: 1, redrawHand: true, forecast: 1, text: '换掉其余手牌，尽量抽回等量新牌；预警+1。旧牌今天不会立刻抽回。', upgrade: { cost: 0 } },
    { id: 'targeted_exchange', title: '定向检索', icon: '🗂️', route: 'neutral', cost: 1, replaceChoice: true, draw: 2, text: '选择1张其他手牌换掉，抽2张新牌；也可不换而获得1预警。', upgrade: { draw: 3 } },
    { id: 'relay', title: '接力行动', icon: '🏃', route: 'neutral', cost: 0, energy: 1, text: '行动力+1。不打断连携；打出后今天不会再次抽到。', upgrade: { block: 3 } }
  ];
  const species = [
    { id: 'bee', name: '蜜蜂', icon: '🐝', needs: '草灌1级', effect: '每天首次草系出牌：研究点+1。' },
    { id: 'frog', name: '青蛙', icon: '🐸', needs: '湿地1级', effect: '每晚水系冲击−2。' },
    { id: 'rabbit', name: '兔群', icon: '🐇', needs: '草灌2级', effect: '每天种子+1；没有狐狸时压力+1。' },
    { id: 'fox', name: '狐狸', icon: '🦊', needs: '兔群和森林1级', effect: '兔群不再增加压力，草系冲击−2。' },
    { id: 'owl', name: '猫头鹰', icon: '🦉', needs: '森林2级', effect: '每天首次完整水→草→林连携后抽1张。' },
    { id: 'waterbird', name: '水鸟', icon: '🦆', needs: '湿地2级', effect: '每晚水分至少4时：预警标记+1。' }
  ];
  const facilities = [
    { id: 'seed_bank', name: '种子银行', icon: '🏺', effect: '每天种子+1。' },
    { id: 'weather_station', name: '气象站', icon: '📡', effect: '每天预警标记+1，展示未来5天危机。' },
    { id: 'ranger_camp', name: '巡护营地', icon: '🛡', effect: '常备巡护每次护盾由3提高为5。' },
    { id: 'field_lab', name: '生态实验室', icon: '🔬', effect: '每天首次连携额外研究点+1。' },
    { id: 'reservoir', name: '蓄水池', icon: '💦', effect: '水分上限+2且每天水分+1；暴雨冲击+3。' }
  ];
  const topics = [
    { id: 'water_cycle', name: '湿地循环', icon: '🪷', cost: 5, requirement: '湿地≥2级；至少一次水系危机无伤；水分≥3。' },
    { id: 'pollinator_web', name: '传粉网络', icon: '🐝', cost: 5, requirement: '草灌≥2级；蜜蜂定居；累计连携≥3次。' },
    { id: 'forest_balance', name: '森林守护', icon: '🦉', cost: 5, requirement: '森林≥2级；猫头鹰定居；至少一次林系危机无伤；压力≤6。' }
  ];
  const weathers = {
    drought: { name: '持续干旱', icon: '☀', text: '每天水分−2；水分归零时压力+1。' },
    storm: { name: '连续暴雨', icon: '🌧', text: '每天水分+2；水系牌额外护盾+2；建设多消耗1种子。' },
    migration: { name: '迁徙季', icon: '🕊', text: '物种迁入卡少消耗1行动力。' },
    invasion: { name: '入侵季', icon: '🌀', text: '打出草系牌时压力+1。' }
  };
  const threats = [
    { name: '上游浑水', route: 'water', icon: '🌊' }, { name: '暴雨径流', route: 'water', icon: '🌧' },
    { name: '食叶虫潮', route: 'meadow', icon: '🐛' }, { name: '入侵藤蔓', route: 'meadow', icon: '🌿' },
    { name: '林缘热浪', route: 'forest', icon: '☀' }, { name: '干燥季风', route: 'forest', icon: '🔥' }
  ];
  const starterDeck = ['rain', 'rain', 'seed', 'flowers', 'wetland', 'meadow', 'forest', 'patrol', 'survey', 'compost', 'species_scout', 'species_scout', 'facility_plan', 'weather_watch'];
  window.IslandData = { routes, cards, species, facilities, topics, weathers, threats, starterDeck, version: 4, totalDays: 30 };
})();
