/* Game content: 15 species, 20 actions and 12 understandable ecological events. */
(function () {
  const species = [
    { id: 'wildflowers', name: '野花', category: '植物', population: 2, preferredHabitat: '阳光草地', dependencies: '水分、传粉昆虫', description: '为岛屿提供花粉和花蜜，是许多食物链的起点。', icon: '🌼', food: '阳光与水分', predators: '—', role: '支持蜜蜂与蝴蝶，促进植物繁殖' },
    { id: 'grass', name: '草', category: '植物', population: 16, preferredHabitat: '开阔草地', dependencies: '水分、低污染', description: '最早扎根的绿色基础，为食草动物提供能量。', icon: '🌱', food: '阳光与水分', predators: '兔子、鹿', role: '为草地食物链储存能量' },
    { id: 'shrubs', name: '灌木', category: '植物', population: 5, preferredHabitat: '林缘与草地', dependencies: '土壤、水分', description: '低矮而坚韧，既是食物也是小动物的庇护所。', icon: '🌿', food: '阳光与水分', predators: '兔子、鸣禽', role: '连接森林与草地的庇护带' },
    { id: 'trees', name: '本地乔木', category: '植物', population: 9, preferredHabitat: '森林', dependencies: '洁净土壤、长期保护', description: '缓慢成长的岛屿骨架，带来阴影、巢位和稳定水循环。', icon: '🌳', food: '阳光与水分', predators: '昆虫、鹿', role: '形成森林栖息地与固碳能力' },
    { id: 'aquatic', name: '水生植物', category: '植物', population: 1, preferredHabitat: '湿地与溪流', dependencies: '水质、湿地', description: '净化浅水并为水边生物提供产卵和躲藏空间。', icon: '🪷', food: '阳光与洁净水', predators: '昆虫、水鸟', role: '湿地食物链的绿色底座' },
    { id: 'bee', name: '蜜蜂', category: '昆虫', population: 2, preferredHabitat: '花丛', dependencies: '野花、低农药压力', description: '忙碌的授粉者，让花朵与果实持续出现。', icon: '🐝', food: '花蜜与花粉', predators: '鸣禽', role: '连接花卉与更高营养级' },
    { id: 'butterfly', name: '蝴蝶', category: '昆虫', population: 0, preferredHabitat: '花丛与灌木带', dependencies: '野花、灌木', description: '翅膀上的颜色，是植被恢复的轻盈信号。', icon: '🦋', food: '花蜜', predators: '鸣禽', role: '传粉并显示草地健康度' },
    { id: 'dragonfly', name: '蜻蜓', category: '昆虫', population: 0, preferredHabitat: '湿地边缘', dependencies: '洁净水、湿地植物', description: '会在水面巡逻的捕食性昆虫，幼体离不开清水。', icon: '🪰', food: '小型昆虫', predators: '青蛙、水鸟', role: '指示湿地水质与昆虫平衡' },
    { id: 'frog', name: '青蛙', category: '两栖类', population: 0, preferredHabitat: '浅水湿地', dependencies: '湿地、蜻蜓与昆虫', description: '敏感的两栖居民，皮肤直接感受环境的变化。', icon: '🐸', food: '昆虫', predators: '水鸟、狐狸', role: '衔接水域昆虫与鸟类' },
    { id: 'waterbird', name: '水鸟', category: '鸟类', population: 0, preferredHabitat: '湿地', dependencies: '湿地、青蛙、水生植物', description: '在浅水边觅食与停歇，带来远方湿地的消息。', icon: '🦆', food: '青蛙、昆虫、水生植物', predators: '狐狸', role: '完善湿地食物链' },
    { id: 'songbird', name: '小型鸣禽', category: '鸟类', population: 1, preferredHabitat: '森林与灌木带', dependencies: '树木、灌木、昆虫', description: '清晨的歌声意味着巢位和食物都正在回来。', icon: '🐦', food: '昆虫、果实', predators: '狐狸、猫头鹰', role: '控制昆虫并传播种子' },
    { id: 'rabbit', name: '兔子', category: '食草动物', population: 1, preferredHabitat: '草地与灌木带', dependencies: '草、灌木', description: '灵巧的食草者，数量恰当时能维系能量流动。', icon: '🐇', food: '草、灌木', predators: '狐狸、猫头鹰', role: '把植物能量带向捕食者' },
    { id: 'deer', name: '鹿', category: '食草动物', population: 0, preferredHabitat: '林缘草地', dependencies: '森林、草地', description: '需要较完整的林地与开阔觅食区。', icon: '🦌', food: '草、嫩枝', predators: '狐狸', role: '连接林地与草地的食草层' },
    { id: 'fox', name: '狐狸', category: '捕食者', population: 0, preferredHabitat: '林缘与灌木带', dependencies: '兔子、鸟类、隐蔽处', description: '谨慎的中型捕食者，能防止食草动物过度繁殖。', icon: '🦊', food: '兔子、小鸟、青蛙', predators: '—', role: '调节食草动物，稳定食物链' },
    { id: 'owl', name: '猫头鹰', category: '特殊物种', population: 0, preferredHabitat: '成熟森林', dependencies: '老树、鸣禽、夜间黑暗', description: '夜行的森林守护者，需要安静的老树与完整猎物网。', icon: '🦉', food: '兔子、鸣禽', predators: '—', role: '夜间调节小型动物数量' }
  ];

  const cards = [
    { id: 'flowers', icon: '🌸', title: '种植本地花卉', description: '在向阳坡地播下本地野花种子。', reason: '本地花卉是传粉昆虫和植物繁殖共同的起点。', effects: { stats: { vegetation: 5, biodiversity: 2 }, species: { wildflowers: 13, bee: 4 } } },
    { id: 'forest', icon: '🌳', title: '恢复森林', description: '为受损林地补种本地乔木。', reason: '树木带来巢位、阴影和更稳定的水循环。', effects: { stats: { forest: 9, habitat: 5, vegetation: 3 }, species: { trees: 10, songbird: 2 } } },
    { id: 'wetland', icon: '💧', title: '恢复湿地', description: '清理沟渠，让浅水重新铺开。', reason: '湿地是两栖类、蜻蜓和水鸟的重要繁殖地。', effects: { stats: { wetland: 10, water: 7, habitat: 3 }, species: { aquatic: 7, frog: 4, dragonfly: 5 } } },
    { id: 'shrubs', icon: '🌿', title: '建立灌木带', description: '在草地和林地间留出层次丰富的边缘。', reason: '灌木提供浆果、隐蔽处，也让草地和森林相连。', effects: { stats: { vegetation: 5, habitat: 6 }, species: { shrubs: 12, rabbit: 3, songbird: 3 } } },
    { id: 'garden', icon: '🐝', title: '建立蜜源花园', description: '让不同季节都有花蜜可采。', reason: '连续的花期能让蜜蜂和蝴蝶不必离开岛屿。', effects: { stats: { biodiversity: 3, vegetation: 3 }, species: { wildflowers: 8, bee: 11, butterfly: 8 } } },
    { id: 'clean-water', icon: '🫧', title: '清理污染', description: '移走旧工业遗留物与污染沉积。', reason: '更洁净的水和土壤让恢复不再被慢性伤害拖住。', effects: { stats: { pollution: -13, water: 6, biodiversity: 2 } } },
    { id: 'invasives', icon: '🍃', title: '清理入侵植物', description: '为被挤占的本地植物留出空间。', reason: '本地植物回来后，依赖它们的动物才能回来。', effects: { stats: { vegetation: 5, stability: 3, pollution: -2 }, species: { wildflowers: 5, grass: 5 } } },
    { id: 'corridor', icon: '🛤️', title: '建立生态廊道', description: '把分散的绿地连成安全通道。', reason: '连通的栖息地帮助物种觅食、迁徙和繁殖。', effects: { stats: { habitat: 10, foodChain: 5, stability: 2 }, species: { shrubs: 4, songbird: 3 } } },
    { id: 'stream', icon: '🏞️', title: '修复溪流', description: '拆除阻塞，让水缓慢流过岛屿。', reason: '流动的洁净水补给湿地，也滋养草地和森林。', effects: { stats: { water: 12, wetland: 5, pollution: -3 }, species: { aquatic: 4, dragonfly: 3 } } },
    { id: 'bug-hotel', icon: '🪵', title: '设置昆虫旅馆', description: '用枯枝与木块提供小小的过冬处。', reason: '微小的庇护所能让传粉者在恶劣季节留下来。', effects: { stats: { biodiversity: 3 }, species: { bee: 8, butterfly: 5, dragonfly: 3 } } },
    { id: 'rabbit-release', minDay: 21, icon: '🐇', title: '引入本地兔群', description: '让草地食物链迎来新的食草者。', reason: '兔子能传递植物能量，但植被不足时会造成压力。', effects: { stats: { herbivores: 6 }, species: { rabbit: 15 } }, conditional: { stat: 'vegetation', below: 40, effects: { stats: { stability: -4, vegetation: -3 } }, note: '草地尚未准备好，兔群增加了植被压力。' } },
    { id: 'nest-box', minDay: 21, icon: '🪺', title: '设置鸟巢', description: '在树与灌木带安装安全巢箱。', reason: '巢位不足常常比食物更早阻碍鸟类返回。', effects: { stats: { biodiversity: 2 }, species: { songbird: 12 } } },
    { id: 'frog-pond', minDay: 21, icon: '🐸', title: '建立青蛙池', description: '挖出有缓坡和水草的小池塘。', reason: '平缓、无污染的浅水让两栖类能顺利繁殖。', effects: { stats: { wetland: 6, water: 4 }, species: { frog: 14, aquatic: 5 } } },
    { id: 'fruit-trees', minDay: 21, icon: '🍎', title: '种植果树', description: '为林缘增加全年可利用的食物。', reason: '果实和花朵同时支持昆虫、鸟类与林地连通性。', effects: { stats: { vegetation: 4, forest: 4 }, species: { trees: 5, songbird: 5, bee: 3 } } },
    { id: 'visitor-limit', minDay: 21, icon: '🚶', title: '限制游客', description: '划定安静区域，减轻踩踏与垃圾。', reason: '给动物留出不被打扰的时间，生态会更有韧性。', effects: { stats: { pollution: -7, stability: 7, habitat: 2 } } },
    { id: 'anti-poaching', minDay: 41, icon: '🛡️', title: '禁止捕猎', description: '设置巡护线与野生动物保护规则。', reason: '安全感让食草动物与捕食者能共同回到岛上。', effects: { stats: { stability: 5 }, species: { rabbit: 5, deer: 6, fox: 5 } } },
    { id: 'fox-reserve', minDay: 41, icon: '🦊', title: '建立狐狸保护区', description: '保留灌木边缘与安静的洞穴区域。', reason: '狐狸能抑制兔子过度繁殖，守住植物的恢复成果。', effects: { stats: { foodChain: 7, predators: 6 }, species: { fox: 16, shrubs: 3 } } },
    { id: 'ancient-tree', minDay: 41, icon: '🌲', title: '保护老树', description: '把空心老树与林下落叶留在原地。', reason: '成熟森林有更多巢穴、昆虫和夜行动物的空间。', effects: { stats: { forest: 7, habitat: 5 }, species: { trees: 7, songbird: 5, owl: 4 } } },
    { id: 'dark-sky', minDay: 41, icon: '🌙', title: '夜间禁光', description: '关闭不必要的照明，保留星空。', reason: '黑暗帮助猫头鹰捕猎，也减少昆虫迷航。', effects: { stats: { stability: 4, pollution: -3 }, species: { owl: 12, bee: 2, butterfly: 2 } } },
    { id: 'shore-cleanup', minDay: 41, icon: '♻️', title: '清理海岸垃圾', description: '收走被潮水冲来的塑料与废弃渔具。', reason: '干净海岸保护水源，也避免动物误食或缠绕。', effects: { stats: { pollution: -12, water: 5, biodiversity: 2 }, species: { waterbird: 4 } } }
  ];

  const events = [
    { id: 'drought', icon: '☀️', title: '短期干旱', why: '连续少雨让浅水区蒸发得更快。', description: '水源和植被承受了压力。', effects: { stats: { water: -11, vegetation: -5, stability: -2 } }, condition: (s) => s.stats.water < 72 },
    { id: 'storm', icon: '🌧️', title: '一场暴雨', why: '海上的暖湿气流为岛屿带来强降雨。', description: '水源得到补给；湿地不足时，径流冲刷了土壤。', effects: { stats: { water: 8 } }, conditional: { stat: 'wetland', below: 28, effects: { stats: { stability: -5, vegetation: -2 } } }, condition: () => true },
    { id: 'fire', icon: '🔥', title: '林缘火情', why: '干燥的林缘遇上了高温天气。', description: '部分森林受到损失，保护下的湿地减缓了火势。', effects: { stats: { forest: -11, biodiversity: -4, pollution: 2 }, species: { trees: -8 } }, condition: (s, d) => d > 26 && s.stats.forest > 24 && s.stats.water < 55 },
    { id: 'invasive-event', icon: '🍂', title: '入侵植物蔓延', why: '岛外种子随风和游客鞋底进入了岛屿。', description: '本地植物的生长空间被短暂挤占。', effects: { stats: { vegetation: -5, biodiversity: -4, stability: -2 }, species: { wildflowers: -5, grass: -4 } }, condition: (s) => s.stats.vegetation > 18 },
    { id: 'visitors', icon: '📷', title: '周末游客潮', why: '岛屿景色开始吸引更多访客。', description: '人流带来了垃圾与惊扰，也提醒人们保护的价值。', effects: { stats: { pollution: 8, stability: -2 } }, condition: (s, d) => d > 20 && s.stats.habitat > 22 },
    { id: 'poaching', icon: '⚠️', title: '偷猎痕迹', why: '巡护空档给了不法者可乘之机。', description: '食草动物和捕食者都受到了影响。', effects: { stats: { stability: -4 }, species: { rabbit: -6, deer: -5, fox: -4 } }, condition: (s, d) => d > 40 && (s.species.rabbit > 10 || s.species.deer > 8) },
    { id: 'bee-decline', icon: '🐝', title: '蜜蜂数量下降', why: '一段异常天气让花期和觅食时间错开。', description: '传粉压力上升，花卉恢复需要更多耐心。', effects: { stats: { stability: -2 }, species: { bee: -10, butterfly: -3 } }, condition: (s) => s.species.bee > 16 },
    { id: 'migration', icon: '🕊️', title: '候鸟短暂停歇', why: '迁徙路线上的鸟群发现了这片逐渐安全的湿地。', description: '水鸟带来了种子和新的生态活力。', effects: { stats: { biodiversity: 4 }, species: { waterbird: 9, songbird: 3 } }, condition: (s, d) => d > 25 && s.stats.wetland > 22 },
    { id: 'abundant-season', icon: '🍀', title: '丰收季', why: '水分、阳光和授粉节奏刚好达成平衡。', description: '植物与昆虫迎来一段丰盛时期。', effects: { stats: { vegetation: 6, stability: 3 }, species: { grass: 5, wildflowers: 5, bee: 4 } }, condition: (s) => s.stats.vegetation > 42 && s.stats.water > 38 },
    { id: 'pest', icon: '🐛', title: '虫害波动', why: '单一植物短期过度集中，引来大量植食昆虫。', description: '植被有所受损，但鸟类和青蛙得到了食物。', effects: { stats: { vegetation: -6 }, species: { bee: 2, songbird: 3, frog: 3 } }, condition: (s) => s.stats.vegetation > 35 },
    { id: 'river-pollution', icon: '🏭', title: '上游污染流入', why: '岛外的一次泄漏顺着溪流抵达了湿地。', description: '水质和湿地暂时变差，需要尽快净化。', effects: { stats: { water: -11, wetland: -6, pollution: 10 }, species: { aquatic: -5, frog: -4 } }, condition: (s, d) => d > 30 && s.stats.water > 20 },
    { id: 'recovery', icon: '✨', title: '自然恢复的回响', why: '连续的栖息地修复让多种生物开始互相支持。', description: '岛屿自己也在帮忙：多样性和韧性一起成长。', effects: { stats: { biodiversity: 6, stability: 6, foodChain: 3 } }, condition: (s, d) => d > 34 && s.stats.foodChain > 30 && s.stats.habitat > 35 }
  ];

  const statLabels = { biodiversity: '多样性', stability: '稳定性', vegetation: '植被', water: '水资源', forest: '森林', wetland: '湿地', insects: '昆虫', herbivores: '食草动物', predators: '捕食者', pollution: '污染', habitat: '栖息地', foodChain: '食物链' };
  const stages = [
    { until: 20, name: '恢复初期', text: '先让水、植物和昆虫有地方留下。' },
    { until: 40, name: '初级生态系统', text: '草地、湿地与鸟类开始彼此呼应。' },
    { until: 60, name: '生态系统形成', text: '更完整的食物链正在形成。' },
    { until: 80, name: '生态系统稳定', text: '现在的任务是守住来之不易的平衡。' },
    { until: 100, name: '生态挑战', text: '最后阶段，韧性比短期增长更重要。' }
  ];

  // A successful island needs the right work at the right time. Each completed milestone
  // raises the ceiling of the four headline metrics; this prevents an unfocused run from
  // reaching a perfect score simply by making 100 arbitrary clicks.
  const milestones = [
    {
      day: 20, name: '生态地基', description: '先让水、土壤与最初的绿色站稳脚跟。',
      reward: '解锁第 1 层生态成长上限',
      checks: [
        { label: '水资源 ≥ 58', test: (state) => state.stats.water >= 58, value: (state) => state.stats.water, target: 58 },
        { label: '植被 ≥ 45', test: (state) => state.stats.vegetation >= 45, value: (state) => state.stats.vegetation, target: 45 },
        { label: '污染 ≤ 24', test: (state) => state.stats.pollution <= 24, value: (state) => state.stats.pollution, target: 24, lowerIsBetter: true }
      ]
    },
    {
      day: 40, name: '授粉与栖息地', description: '让草地、湿地与昆虫形成可持续的生活空间。',
      reward: '解锁第 2 层生态成长上限',
      checks: [
        { label: '湿地 ≥ 42', test: (state) => state.stats.wetland >= 42, value: (state) => state.stats.wetland, target: 42 },
        { label: '昆虫 ≥ 30', test: (state) => state.stats.insects >= 30, value: (state) => state.stats.insects, target: 30 },
        { label: '栖息地 ≥ 45', test: (state) => state.stats.habitat >= 45, value: (state) => state.stats.habitat, target: 45 }
      ]
    },
    {
      day: 60, name: '织成生态网络', description: '让森林、食草动物与捕食者真正互相制衡。',
      reward: '解锁第 3 层生态成长上限',
      checks: [
        { label: '森林 ≥ 45', test: (state) => state.stats.forest >= 45, value: (state) => state.stats.forest, target: 45 },
        { label: '食物链 ≥ 52', test: (state) => state.stats.foodChain >= 52, value: (state) => state.stats.foodChain, target: 52 },
        { label: '捕食者 ≥ 12', test: (state) => state.stats.predators >= 12, value: (state) => state.stats.predators, target: 12 }
      ]
    },
    {
      day: 80, name: '抵御生态挑战', description: '在波动中维持洁净水源与捕食者调节。',
      reward: '解锁完整生态成长上限',
      checks: [
        { label: '生态稳定 ≥ 70', test: (state) => state.stats.stability >= 70, value: (state) => state.stats.stability, target: 70 },
        { label: '水资源 ≥ 65', test: (state) => state.stats.water >= 65, value: (state) => state.stats.water, target: 65 },
        { label: '污染 ≤ 18', test: (state) => state.stats.pollution <= 18, value: (state) => state.stats.pollution, target: 18, lowerIsBetter: true }
      ]
    }
  ];

  // Some projects are much less effective when the habitat they depend on does not exist.
  // Categories also create a visible small penalty for repeatedly prioritising one system.
  const strategyRules = {
    flowers: { category: 'vegetation' }, forest: { category: 'forest', requirements: [{ key: 'water', min: 34, label: '水资源 ≥ 34' }] },
    wetland: { category: 'water' }, shrubs: { category: 'vegetation' }, garden: { category: 'pollinator', requirements: [{ key: 'wildflowers', min: 8, label: '野花 ≥ 8', species: true }] },
    'clean-water': { category: 'protection' }, invasives: { category: 'vegetation' }, corridor: { category: 'habitat', requirements: [{ key: 'vegetation', min: 30, label: '植被 ≥ 30' }] },
    stream: { category: 'water' }, 'bug-hotel': { category: 'pollinator', requirements: [{ key: 'vegetation', min: 28, label: '植被 ≥ 28' }] },
    'rabbit-release': { category: 'wildlife', requirements: [{ key: 'vegetation', min: 45, label: '植被 ≥ 45' }, { key: 'shrubs', min: 15, label: '灌木 ≥ 15', species: true }] },
    'nest-box': { category: 'wildlife', requirements: [{ key: 'forest', min: 25, label: '森林 ≥ 25' }] },
    'frog-pond': { category: 'water', requirements: [{ key: 'water', min: 38, label: '水资源 ≥ 38' }, { key: 'wetland', min: 20, label: '湿地 ≥ 20' }] },
    'fruit-trees': { category: 'forest', requirements: [{ key: 'water', min: 40, label: '水资源 ≥ 40' }] },
    'visitor-limit': { category: 'protection' }, 'anti-poaching': { category: 'protection', requirements: [{ key: 'habitat', min: 35, label: '栖息地 ≥ 35' }] },
    'fox-reserve': { category: 'wildlife', requirements: [{ key: 'rabbit', min: 12, label: '兔子 ≥ 12', species: true }, { key: 'habitat', min: 45, label: '栖息地 ≥ 45' }] },
    'ancient-tree': { category: 'forest', requirements: [{ key: 'forest', min: 42, label: '森林 ≥ 42' }] },
    'dark-sky': { category: 'protection', requirements: [{ key: 'forest', min: 32, label: '森林 ≥ 32' }] },
    'shore-cleanup': { category: 'protection' }
  };

  window.IslandData = { species, cards, events, statLabels, stages, milestones, strategyRules };
})();
