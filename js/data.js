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
  const events = [
    { day: 5, id: 'pollination_gap', icon: '🌼', title: '传粉缺口', text: '花期已至，但传粉者数量不足。你准备如何让花与虫重新建立联系？', choices: [
      { id: 'flower_strip', title: '补植连续花带', tag: '稳健', gain: '未来5天，每天首张草系牌研究+1。', cost: '立即种子−2。', text: '支付2种子；未来5天，每天首张草系牌额外+1研究。', requires: { seeds: 2 }, immediate: { seeds: -2 }, boon: { kind: 'firstMeadowResearch', value: 1, label: '连续花带：首张草系牌研究+1' } },
      { id: 'pollinator_survey', title: '扩大传粉调查', tag: '激进', gain: '立即研究+4。', cost: '频繁干预使压力+1。', text: '立即研究+4，但频繁干预使压力+1。', immediate: { research: 4, pressure: 1 } },
      { id: 'bee_network', title: '让蜂群扩散', tag: '物种解法', gain: '压力−2；未来5天每天种子+1。', cost: '维持蜂群饮水点，水分−1。', text: '需要蜜蜂和1水分；压力−2，未来5天每天种子+1。', requires: { species: ['bee'], moisture: 1 }, immediate: { pressure: -2, moisture: -1 }, boon: { kind: 'dailySeed', value: 1, label: '蜂群扩散：每天种子+1' } }
    ] },
    { day: 10, id: 'algae_bloom', icon: '🪷', title: '河湾水华', text: '水面出现异常藻色，湿地食物网正在缺氧。', choices: [
      { id: 'clean_bay', title: '疏通河湾', tag: '湿地管理', gain: '压力−2；未来5天水系冲击−2。', cost: '疏通会消耗水分−2。', text: '支付2水分，压力−2；未来5天水系冲击额外−2。', requires: { moisture: 2 }, immediate: { moisture: -2, pressure: -2 }, boon: { kind: 'routeDefense', route: 'water', value: 2, label: '河湾疏通：水系冲击−2' } },
      { id: 'track_bloom', title: '跟踪水华', tag: '研究', gain: '立即研究+4。', cost: '保留样本使压力+1。', text: '立即研究+4，但保留样本使压力+1。', immediate: { research: 4, pressure: 1 } },
      { id: 'amphibian_watch', title: '让水生物预警', tag: '物种解法', gain: '压力−2；未来5天每天预警+1。', cost: '建设监测点需要种子−2。', text: '需要青蛙或水鸟和2种子；压力−2，未来5天每天预警+1。', requires: { anySpecies: ['frog', 'waterbird'], seeds: 2 }, immediate: { pressure: -2, seeds: -2 }, boon: { kind: 'dailyForecast', value: 1, label: '水生预警：每天预警+1' } }
    ] },
    { day: 15, id: 'grazing_imbalance', icon: '🌾', title: '草地啃食失衡', text: '新生草叶被大量啃食，草灌群落的恢复速度开始放缓。', choices: [
      { id: 'grazing_fence', title: '设置轮休围栏', tag: '稳健', gain: '未来5天草系冲击−3。', cost: '建造围栏使种子−2。', text: '支付2种子；未来5天草系冲击额外−3。', requires: { seeds: 2 }, immediate: { seeds: -2 }, boon: { kind: 'routeDefense', route: 'meadow', value: 3, label: '轮休围栏：草系冲击−3' } },
      { id: 'tolerate_grazing', title: '容忍短期啃食', tag: '风险换资源', gain: '立即种子+5。', cost: '啃食失衡使压力+2。', text: '立即种子+5，但压力+2。', immediate: { seeds: 5, pressure: 2 } },
      { id: 'restore_predation', title: '恢复捕食关系', tag: '食物网解法', gain: '压力−3；未来5天每天种子+1。', cost: '跟踪捕食关系需要研究−2。', text: '需要兔群、狐狸和2研究；压力−3，未来5天每天种子+1。', requires: { species: ['rabbit', 'fox'], research: 2 }, immediate: { pressure: -3, research: -2 }, boon: { kind: 'dailySeed', value: 1, label: '捕食平衡：每天种子+1' } }
    ] },
    { day: 20, id: 'forest_rodents', icon: '🌰', title: '林下鼠害', text: '鼠类大量取食果实与幼苗，森林更新受到威胁。', choices: [
      { id: 'manual_patrol', title: '组织人工巡护', tag: '应急', gain: '生命+4；未来5天林系冲击−3。', cost: '调用方案使研究−2。', text: '支付2研究，立即生命+4；未来5天林系冲击额外−3。', requires: { research: 2 }, immediate: { research: -2, hp: 4 }, boon: { kind: 'routeDefense', route: 'forest', value: 3, label: '林下巡护：林系冲击−3' } },
      { id: 'understory_patch', title: '修复林下斑块', tag: '转化', gain: '立即研究+5。', cost: '修复试验使种子−3。', text: '支付3种子，立即研究+5。', requires: { seeds: 3 }, immediate: { seeds: -3, research: 5 } },
      { id: 'owl_control', title: '让猫头鹰控鼠', tag: '物种解法', gain: '压力−2；未来5天首次连携研究+1。', cost: '搭建栖架使种子−2。', text: '需要猫头鹰和2种子；压力−2，未来5天每天首次连携研究+1。', requires: { species: ['owl'], seeds: 2 }, immediate: { pressure: -2, seeds: -2 }, boon: { kind: 'firstComboResearch', value: 1, label: '夜行控鼠：首次连携研究+1' } }
    ] },
    { day: 25, id: 'migration_corridor', icon: '🐦', title: '迁徙走廊', text: '季节性迁徙进入高峰，岛上各片生境是否能串联，将决定最后的稳定性。', choices: [
      { id: 'open_corridor', title: '打开湿地走廊', tag: '稳健', gain: '压力−2；未来5天所有冲击−1。', cost: '调水打开通道，水分−2。', text: '支付2水分，压力−2；未来5天所有冲击额外−1。', requires: { moisture: 2 }, immediate: { moisture: -2, pressure: -2 }, boon: { kind: 'routeDefense', route: 'all', value: 1, label: '迁徙走廊：所有冲击−1' } },
      { id: 'banding_program', title: '集中环志调查', tag: '研究', gain: '立即研究+5。', cost: '密集捕捉使压力+2。', text: '立即研究+5，但压力+2。', immediate: { research: 5, pressure: 2 } },
      { id: 'self_regulation', title: '交给多样性调节', tag: '多样性解法', gain: '压力−2；未来5天所有冲击−2。', cost: '划出非干预核心区，种子−3。', text: '需要至少4种物种和3种子；压力−2，未来5天所有冲击额外−2。', requires: { minSpecies: 4, seeds: 3 }, immediate: { pressure: -2, seeds: -3 }, boon: { kind: 'routeDefense', route: 'all', value: 2, label: '多样性调节：所有冲击−2' } }
    ] }
  ];
  const starterDeck = ['rain', 'rain', 'seed', 'flowers', 'wetland', 'meadow', 'forest', 'patrol', 'survey', 'compost', 'species_scout', 'species_scout', 'facility_plan', 'weather_watch'];
  window.IslandData = { routes, cards, species, facilities, topics, weathers, threats, events, starterDeck, version: 4, totalDays: 30 };
})();
