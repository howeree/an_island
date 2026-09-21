/* Static content for the tile-based ecological deckbuilder. */
(function () {
  const terrainMeta = {
    barren: { name: '退化地', icon: '◌', color: '#b99b68', hint: '可规划为草地、灌丛、森林或水域。' },
    meadow: { name: '草地', icon: '🌾', color: '#86b94a', hint: '食草动物的粮仓，也需要传粉者与捕食者。' },
    shrub: { name: '灌丛', icon: '🌿', color: '#4f984a', hint: '连接开阔地与森林的安全边缘。' },
    forest: { name: '森林', icon: '🌳', color: '#28715a', hint: '成长缓慢，但能稳水、藏身并提供巢位。' },
    wetland: { name: '湿地', icon: '🪷', color: '#38a9a5', hint: '吸收洪水并支持两栖与水生生命。' },
    stream: { name: '溪流', icon: '〰', color: '#3e9fd5', hint: '为相邻栖息地供水，也会把污染带往下游。' },
    coast: { name: '海岸', icon: '≈', color: '#71bddd', hint: '候鸟落脚点，容易受到垃圾与游客惊扰。' }
  };

  const species = [
    { id: 'wildflowers', name: '本地野花', category: '植物', icon: '🌼', habitat: '带本地花卉的草地', role: '为传粉昆虫提供花蜜与花粉。' },
    { id: 'grass', name: '草本植物', category: '植物', icon: '🌱', habitat: '成熟草地', role: '储存太阳能，是陆地食物链底座。' },
    { id: 'shrubs', name: '本地灌木', category: '植物', icon: '🌿', habitat: '灌丛与林缘', role: '提供浆果、遮蔽与迁徙通道。' },
    { id: 'trees', name: '本地乔木', category: '植物', icon: '🌳', habitat: '成长中的森林', role: '稳住水土并形成垂直栖息空间。' },
    { id: 'aquatic', name: '水生植物', category: '植物', icon: '🪷', habitat: '带水草的湿地', role: '净化浅水并提供产卵场。' },
    { id: 'bee', name: '蜜蜂', category: '昆虫', icon: '🐝', habitat: '花草地与昆虫旅馆', role: '让分散的植物形成繁殖网络。' },
    { id: 'butterfly', name: '蝴蝶', category: '昆虫', icon: '🦋', habitat: '花草地与灌丛', role: '反映连续花期与植物多样性。' },
    { id: 'dragonfly', name: '蜻蜓', category: '昆虫', icon: '🪰', habitat: '洁净湿地', role: '控制小型飞虫并指示水质。' },
    { id: 'frog', name: '青蛙', category: '两栖类', icon: '🐸', habitat: '与溪流相连的湿地', role: '连接水域昆虫与更高营养级。' },
    { id: 'waterbird', name: '水鸟', category: '鸟类', icon: '🦆', habitat: '安静的湿地与海岸', role: '传播水生植物种子并完善湿地网络。' },
    { id: 'songbird', name: '鸣禽', category: '鸟类', icon: '🐦', habitat: '灌丛、森林和巢箱', role: '控制昆虫并传播浆果种子。' },
    { id: 'rabbit', name: '本地兔', category: '食草动物', icon: '🐇', habitat: '草地旁的灌丛', role: '把植物能量传给捕食者；失控时会过度啃食。' },
    { id: 'deer', name: '小型鹿', category: '食草动物', icon: '🦌', habitat: '相连的草地与森林', role: '跨栖息地搬运种子，也会带来啃食压力。' },
    { id: 'fox', name: '赤狐', category: '捕食者', icon: '🦊', habitat: '由廊道连接的灌丛与森林', role: '压制兔群，维持植被恢复成果。' },
    { id: 'owl', name: '猫头鹰', category: '顶级捕食者', icon: '🦉', habitat: '有老树且夜间安静的成熟森林', role: '维持夜间食物网的稳定。' }
  ];

  const cards = [
    { id: 'sow_meadow', title: '播种草甸', icon: '🌾', cost: 1, type: '工程', rarity: '基础', action: 'project', terrain: 'meadow', duration: 1, target: { terrains: ['barren'] }, text: '让一处退化区域恢复为草地。明天完工。', upgrade: { duration: 0, text: '立即形成幼年草地。' } },
    { id: 'plant_shrubs', title: '营造灌丛', icon: '🌿', cost: 1, type: '工程', rarity: '基础', action: 'project', terrain: 'shrub', duration: 1, target: { terrains: ['barren', 'meadow'] }, text: '营造遮蔽边缘。草地改造会牺牲开阔空间。', upgrade: { cost: 0 } },
    { id: 'restore_stream', title: '疏通溪流', icon: '〰', cost: 2, type: '工程', rarity: '基础', action: 'project', terrain: 'stream', duration: 2, target: { terrains: ['barren'] }, text: '开辟供水通道；污染也可能沿溪传播。', upgrade: { duration: 1 } },
    { id: 'plant_forest', title: '补植本地林', icon: '🌳', cost: 2, type: '工程', rarity: '基础', action: 'project', terrain: 'forest', duration: 2, target: { terrains: ['barren', 'meadow', 'shrub'] }, text: '建立幼林。缺水时工程会停滞。', upgrade: { duration: 1 } },
    { id: 'cleanup', title: '清理污染', icon: '🧤', cost: 1, type: '治理', rarity: '基础', action: 'clean', power: 2, target: { terrains: ['barren', 'meadow', 'shrub', 'forest', 'wetland', 'stream', 'coast'], pollutedOnly: true }, text: '从全岛污染最重的位置移除2层污染。', upgrade: { power: 3 } },
    { id: 'native_flowers', title: '本地花带', icon: '🌼', cost: 1, type: '营造', rarity: '基础', action: 'trait', trait: 'flowers', target: { terrains: ['meadow'] }, text: '草地获得「花带」；靠近灌丛时形成传粉网络。', upgrade: { cost: 0 } },
    { id: 'field_survey', title: '野外调查', icon: '🔎', cost: 1, type: '技能', rarity: '基础', action: 'draw', draw: 2, text: '抽2张牌，查看今天更多可能。', upgrade: { draw: 3 } },
    { id: 'water_watch', title: '水文监测', icon: '📡', cost: 1, type: '政策', rarity: '基础', action: 'policy', policy: 'water_watch', text: '本局持续生效：干旱会提前5天预警，水域工程不易停滞。', upgrade: { cost: 0 } },
    { id: 'habitat_plan', title: '协同规划', icon: '🗺️', cost: 0, type: '技能', rarity: '基础', action: 'focus', draw: 1, energy: 1, exhaust: true, text: '获得1能量并抽1张牌；本局移除。', upgrade: { draw: 2 } },
    { id: 'compost', title: '生态堆肥', icon: '♻', cost: 1, type: '治理', rarity: '基础', action: 'purge', text: '从弃牌堆中永久移除1张负面牌；没有时获得1能量。', upgrade: { cost: 0 } },

    { id: 'restore_wetland', title: '恢复湿地', icon: '🪷', cost: 2, type: '工程', rarity: '进阶', unlockTurn: 10, action: 'project', terrain: 'wetland', duration: 2, target: { terrains: ['barren', 'meadow'], adjacent: ['stream'] }, text: '只能建在溪流旁。可吸收洪峰并孕育两栖类。', upgrade: { duration: 1 } },
    { id: 'aquatic_plants', title: '种植水草', icon: '🌱', cost: 1, type: '营造', rarity: '进阶', unlockTurn: 10, action: 'trait', trait: 'aquatic', target: { terrains: ['wetland'] }, text: '湿地获得「水草」，与相邻溪流组成湿地复苏结构。', upgrade: { cost: 0 } },
    { id: 'insect_hotel', title: '昆虫旅馆', icon: '🪵', cost: 1, type: '营造', rarity: '进阶', unlockTurn: 10, action: 'trait', trait: 'insect_hotel', target: { terrains: ['meadow', 'shrub'] }, text: '提供越冬空间，缓冲恶劣天气对传粉者的影响。', upgrade: { cost: 0 } },
    { id: 'nest_boxes', title: '设置巢箱', icon: '🪺', cost: 1, type: '营造', rarity: '进阶', unlockTurn: 15, action: 'trait', trait: 'nest_boxes', target: { terrains: ['forest', 'shrub'] }, text: '补足鸟类巢位；成熟森林中的收益更高。', upgrade: { cost: 0 } },
    { id: 'eco_corridor', title: '生态廊道', icon: '↔', cost: 2, type: '营造', rarity: '稀有', unlockTurn: 20, action: 'trait', trait: 'corridor', target: { terrains: ['meadow', 'shrub', 'forest'] }, text: '把草地、灌丛与森林连通，帮助动物迁徙。', upgrade: { cost: 1 } },
    { id: 'frog_pond', title: '青蛙浅塘', icon: '🐸', cost: 1, type: '营造', rarity: '进阶', unlockTurn: 20, action: 'trait', trait: 'frog_pond', target: { terrains: ['wetland'] }, text: '提供无鱼浅水。水草存在时更容易迎来青蛙。', upgrade: { cost: 0 } },
    { id: 'rabbit_return', title: '兔群回归', icon: '🐇', cost: 1, type: '物种', rarity: '进阶', unlockTurn: 25, action: 'introduce', species: 'rabbit', target: { terrains: ['meadow'], adjacent: ['shrub'] }, text: '在灌丛旁的草地释放兔群。没有捕食者时会造成压力。', upgrade: { cost: 0 } },
    { id: 'fox_sanctuary', title: '狐狸庇护区', icon: '🦊', cost: 2, type: '物种', rarity: '稀有', unlockTurn: 35, action: 'introduce', species: 'fox', target: { terrains: ['shrub', 'forest'], adjacent: ['meadow'] }, text: '需临近草地；有廊道且兔群存在时可建立捕食平衡。', upgrade: { cost: 1 } },
    { id: 'protect_old_tree', title: '保留老树', icon: '🌲', cost: 1, type: '营造', rarity: '稀有', unlockTurn: 40, action: 'trait', trait: 'old_tree', target: { terrains: ['forest'], minMaturity: 2 }, text: '在成长森林中保留洞穴与枯木，为猫头鹰准备家园。', upgrade: { cost: 0 } },
    { id: 'dark_sky', title: '暗夜公约', icon: '🌙', cost: 1, type: '政策', rarity: '进阶', unlockTurn: 35, action: 'policy', policy: 'dark_sky', text: '降低游客惊扰；老树森林可迎来猫头鹰。', upgrade: { cost: 0 } },
    { id: 'visitor_limits', title: '游客限流', icon: '🚧', cost: 1, type: '政策', rarity: '进阶', unlockTurn: 25, action: 'policy', policy: 'visitor_limits', text: '游客潮影响降低，并保护海岸与鸟类。', upgrade: { cost: 0 } },
    { id: 'ranger_patrol', title: '巡护队', icon: '🛡', cost: 1, type: '政策', rarity: '进阶', unlockTurn: 30, action: 'policy', policy: 'ranger_patrol', text: '压制偷猎与入侵扩散；每次成功防御会清除1张惊扰。', upgrade: { cost: 0 } },
    { id: 'controlled_burn', title: '防火隔离带', icon: '🔥', cost: 1, type: '政策', rarity: '进阶', unlockTurn: 35, action: 'policy', policy: 'firebreak', text: '显著降低野火对森林的破坏。', upgrade: { cost: 0 } },
    { id: 'shore_cleanup', title: '海岸净滩', icon: '🌊', cost: 1, type: '治理', rarity: '进阶', unlockTurn: 15, action: 'clean', power: 4, target: { terrains: ['coast'] }, text: '清除海岸4层污染；洁净海岸会吸引水鸟。', upgrade: { power: 6 } },
    { id: 'groundwater', title: '雨水花园', icon: '💧', cost: 1, type: '营造', rarity: '进阶', unlockTurn: 20, action: 'trait', trait: 'water_storage', target: { terrains: ['meadow', 'shrub', 'forest'] }, text: '储存雨水，抵御干旱并帮助林地工程。', upgrade: { cost: 0 } },
    { id: 'invasive_control', title: '入侵清除', icon: '✂', cost: 1, type: '治理', rarity: '进阶', unlockTurn: 20, action: 'cleanse_tile', target: { terrains: ['meadow', 'shrub', 'forest', 'wetland'] }, text: '缓解生态压力并移除「入侵藤蔓」牌。', upgrade: { cost: 0 } },
    { id: 'pollinator_garden', title: '连续花期', icon: '🐝', cost: 2, type: '营造', rarity: '稀有', unlockTurn: 30, action: 'trait', trait: 'long_bloom', target: { terrains: ['meadow'], requiresTrait: 'flowers' }, text: '升级花带为全年蜜源，传粉网络抵抗干旱。', upgrade: { cost: 1 } },
    { id: 'rewilding', title: '让自然接管', icon: '🍀', cost: 2, type: '技能', rarity: '稀有', unlockTurn: 45, action: 'rewild', text: '所有健康生境成长1级；全岛压力越高，生效范围越小。', upgrade: { cost: 1 } },
    { id: 'migration_refuge', title: '迁徙驿站', icon: '🕊', cost: 1, type: '政策', rarity: '稀有', unlockTurn: 40, action: 'policy', policy: 'migration_refuge', text: '湿地或洁净海岸存在时，周期性吸引水鸟。', upgrade: { cost: 0 } },
    { id: 'seed_bank', title: '本地种子库', icon: '🏺', cost: 1, type: '政策', rarity: '稀有', unlockTurn: 25, action: 'policy', policy: 'seed_bank', text: '工程受灾时不降成熟度；每20天自动净化一处退化区域。', upgrade: { cost: 0 } },

    { id: 'dry_soil', title: '干裂土壤', icon: '☀', cost: 1, type: '负面', rarity: '状态', action: 'status', status: 'dry_soil', exhaust: true, text: '占据抽牌。打出以修复；留在手中会让林地工程停滞。' },
    { id: 'toxic_sediment', title: '有毒沉积', icon: '☣', cost: 1, type: '负面', rarity: '状态', action: 'status', status: 'toxic_sediment', exhaust: true, text: '占据抽牌。打出以清除；留在手中会污染一个水域。' },
    { id: 'overgrazing', title: '过度啃食', icon: '🐇', cost: 1, type: '负面', rarity: '状态', action: 'status', status: 'overgrazing', exhaust: true, text: '占据抽牌。打出以治理；留在手中会伤害草地。' },
    { id: 'invasive_vine', title: '入侵藤蔓', icon: '🌀', cost: 1, type: '负面', rarity: '状态', action: 'status', status: 'invasive_vine', exhaust: true, text: '占据抽牌。打出以清除；留在手中可能复制一张。' },
    { id: 'disturbance', title: '游客惊扰', icon: '📷', cost: 1, type: '负面', rarity: '状态', action: 'status', status: 'disturbance', exhaust: true, text: '占据抽牌。打出以安抚；留在手中降低鸟类定居机会。' }
  ];

  const starterDeck = ['sow_meadow', 'sow_meadow', 'plant_shrubs', 'restore_stream', 'plant_forest', 'cleanup', 'native_flowers', 'field_survey', 'water_watch', 'habitat_plan', 'compost'];

  const crises = [
    { id: 'drought', icon: '☀', name: '季节性干旱', intent: '水域退化，林地工程停滞', counter: '湿地、雨水花园或水文监测', status: 'dry_soil' },
    { id: 'flood', icon: '🌧', name: '强降雨', intent: '没有湿地的溪流会冲坏邻地', counter: '溪流旁建湿地，或保留森林', status: 'toxic_sediment' },
    { id: 'rabbit_boom', icon: '🐇', name: '兔群激增', intent: '啃食草地与灌丛', counter: '让狐狸通过廊道建立捕食平衡', status: 'overgrazing' },
    { id: 'spill', icon: '☣', name: '上游泄漏', intent: '污染溪流并向湿地扩散', counter: '提前清理水域，建立水草湿地', status: 'toxic_sediment' },
    { id: 'visitors', icon: '📷', name: '游客高峰', intent: '惊扰鸟类并污染海岸', counter: '游客限流、巡护队或洁净海岸', status: 'disturbance' },
    { id: 'wildfire', icon: '🔥', name: '林缘野火', intent: '森林成熟度下降', counter: '防火隔离带、湿地或充足蓄水', status: 'dry_soil' },
    { id: 'invasion', icon: '🌀', name: '入侵藤蔓', intent: '局部生境承压并污染牌库', counter: '巡护队、入侵清除或健康灌丛', status: 'invasive_vine' },
    { id: 'cold_snap', icon: '❄', name: '异常寒潮', intent: '传粉昆虫与幼年生境承压', counter: '昆虫旅馆、成熟森林或连续花期', status: 'disturbance' }
  ];

  const traitMeta = {
    flowers: { name: '本地花带', icon: '🌼' }, aquatic: { name: '水生植物', icon: '🪷' }, insect_hotel: { name: '昆虫旅馆', icon: '🪵' },
    nest_boxes: { name: '巢箱', icon: '🪺' }, corridor: { name: '生态廊道', icon: '↔' }, frog_pond: { name: '浅塘', icon: '🐸' },
    old_tree: { name: '老树', icon: '🌲' }, water_storage: { name: '蓄水', icon: '💧' }, long_bloom: { name: '连续花期', icon: '🐝' }
  };

  const stages = [
    { until: 20, name: '勘察与打底', text: '先观察预警，再决定有限土地的用途。' },
    { until: 40, name: '栖息地成形', text: '让孤立生境通过水系与生态边缘相连。' },
    { until: 60, name: '物种回归', text: '食草动物回来后，必须准备好捕食与庇护。' },
    { until: 80, name: '压力测试', text: '危机会检验结构，而不是某个单独的数字。' },
    { until: 100, name: '共生之岛', text: '用最后阶段补上网络中最脆弱的一环。' }
  ];

  const milestones = [
    { turn: 20, day: 20, name: '生态地基', description: '至少完成2项工程，并让溪流连接一个生境。', reward: '第一个升级机会' },
    { turn: 40, day: 40, name: '相互依存', description: '形成至少1个生态结构，且负面牌不超过3张。', reward: '第二个升级机会' },
    { turn: 60, day: 60, name: '食物网成形', description: '至少6种物种定居，并拥有捕食或湿地网络。', reward: '第三个升级机会' },
    { turn: 80, day: 80, name: '韧性考验', description: '成功化解至少一半已发生危机。', reward: '最后一次升级机会' }
  ];

  const comboMeta = {
    wetland_revival: { name: '湿地复苏', icon: '🐸', text: '溪流 + 水草湿地：净化水质并吸收洪峰。' },
    pollinator_web: { name: '传粉网络', icon: '🐝', text: '花草地 + 相邻灌丛/昆虫旅馆：植物与昆虫互相支撑。' },
    predator_balance: { name: '捕食平衡', icon: '🦊', text: '兔群 + 狐狸 + 连通生境：兔群不再只是一项收益。' },
    forest_refuge: { name: '森林庇护所', icon: '🦉', text: '成熟森林 + 老树 + 暗夜：顶级捕食者获得家园。' },
    coastal_route: { name: '迁徙路线', icon: '🕊', text: '洁净海岸 + 湿地：为水鸟形成安全落脚链。' }
  };

  window.IslandData = { terrainMeta, traitMeta, species, cards, starterDeck, crises, stages, milestones, comboMeta };
})();
