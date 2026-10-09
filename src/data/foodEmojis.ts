export interface EmojiEntry { char: string; keywords: string[] }
export interface EmojiCategory { key: string; emojis: EmojiEntry[] }

export const FOOD_EMOJI_CATEGORIES: EmojiCategory[] = [
  { key: 'fruits', emojis: [
    { char: '🍎', keywords: ['apple', '苹果'] }, { char: '🍊', keywords: ['orange', '橙'] },
    { char: '🍌', keywords: ['banana', '香蕉'] }, { char: '🍇', keywords: ['grape', '葡萄'] },
    { char: '🍓', keywords: ['strawberry', '草莓', 'berry'] }, { char: '🫐', keywords: ['blueberry', '蓝莓', 'berry'] },
    { char: '🍉', keywords: ['watermelon', '西瓜'] }, { char: '🍑', keywords: ['peach', '桃'] },
    { char: '🍍', keywords: ['pineapple', '菠萝'] }, { char: '🥝', keywords: ['kiwi', '猕猴桃'] },
    { char: '🍈', keywords: ['melon', 'cantaloupe', '哈密瓜', '甜瓜'] }, { char: '🥭', keywords: ['mango', '芒果'] },
  ]},
  { key: 'vegetables', emojis: [
    { char: '🥕', keywords: ['carrot', '胡萝卜'] }, { char: '🥦', keywords: ['broccoli', '西兰花'] },
    { char: '🍅', keywords: ['tomato', '番茄'] }, { char: '🍆', keywords: ['eggplant', '茄子'] },
    { char: '🌽', keywords: ['corn', '玉米'] }, { char: '🥔', keywords: ['potato', '土豆'] },
    { char: '🧅', keywords: ['onion', '洋葱'] }, { char: '🥬', keywords: ['lettuce', 'greens', '生菜'] },
    { char: '🥒', keywords: ['cucumber', '黄瓜'] }, { char: '🍄', keywords: ['mushroom', '蘑菇'] },
    { char: '🥑', keywords: ['avocado', '牛油果'] },
    { char: '🍠', keywords: ['sweet potato', 'yam', '红薯', '地瓜', '烤红薯'] },
    { char: '🎃', keywords: ['pumpkin', 'jack-o-lantern', '南瓜'] },
  ]},
  { key: 'grains', emojis: [
    { char: '🍚', keywords: ['rice', '米饭'] }, { char: '🍞', keywords: ['bread', '面包'] },
    { char: '🥐', keywords: ['croissant', '可颂'] }, { char: '🍜', keywords: ['noodles', 'ramen', '面'] },
    { char: '🍝', keywords: ['pasta', 'spaghetti', '意面'] }, { char: '🥣', keywords: ['oatmeal', 'cereal', 'yogurt', '麦片'] },
    { char: '🥖', keywords: ['baguette', '法棍'] }, { char: '🥟', keywords: ['dumpling', '饺子'] },
    { char: '🌾', keywords: ['grain', 'wheat', '谷物'] },
  ]},
  { key: 'protein', emojis: [
    { char: '🥩', keywords: ['steak', 'beef', 'meat', '牛肉', '肉'] }, { char: '🍗', keywords: ['chicken', 'poultry', '鸡'] },
    { char: '🍖', keywords: ['meat', 'pork', '肉'] }, { char: '🍤', keywords: ['shrimp', 'prawn', '虾'] },
    { char: '🐟', keywords: ['fish', 'salmon', '鱼'] }, { char: '🥚', keywords: ['egg', '蛋'] },
    { char: '🧀', keywords: ['cheese', '奶酪'] }, { char: '🥜', keywords: ['nuts', 'almond', 'peanut', '坚果'] },
    { char: '🫘', keywords: ['beans', 'legume', '豆'] }, { char: '🍳', keywords: ['fried egg', 'cooking', '煎蛋'] },
    { char: '🦀', keywords: ['crab', 'seafood', '螃蟹', '海鲜', '蟹'] },
  ]},
  { key: 'dairy', emojis: [
    { char: '🥛', keywords: ['milk', '牛奶'] }, { char: '🧈', keywords: ['butter', '黄油'] },
    { char: '🍦', keywords: ['ice cream', '冰淇淋'] }, { char: '🍶', keywords: ['sake', 'bottle', '瓶'] },
  ]},
  { key: 'drinks', emojis: [
    { char: '☕', keywords: ['coffee', '咖啡'] }, { char: '🍵', keywords: ['tea', '茶'] },
    { char: '🧃', keywords: ['juice', '果汁'] }, { char: '🥤', keywords: ['soda', 'soft drink', '饮料'] },
    { char: '🍷', keywords: ['wine', '葡萄酒', '红酒'] }, { char: '🍺', keywords: ['beer', '啤酒'] },
    { char: '💧', keywords: ['water', '水'] },
  ]},
  { key: 'sweets', emojis: [
    { char: '🍫', keywords: ['chocolate', '巧克力'] }, { char: '🍪', keywords: ['cookie', '饼干'] },
    { char: '🍰', keywords: ['cake', '蛋糕'] }, { char: '🍩', keywords: ['donut', '甜甜圈'] },
    { char: '🍬', keywords: ['candy', '糖'] }, { char: '🍯', keywords: ['honey', '蜂蜜'] },
  ]},
  { key: 'prepared', emojis: [
    { char: '🍔', keywords: ['burger', '汉堡'] }, { char: '🍕', keywords: ['pizza', '披萨'] },
    { char: '🌮', keywords: ['taco', '玉米卷'] }, { char: '🍱', keywords: ['bento', '便当'] },
    { char: '🍲', keywords: ['stew', 'hotpot', '炖菜'] }, { char: '🥗', keywords: ['salad', '沙拉'] },
    { char: '🍟', keywords: ['fries', '薯条'] }, { char: '🥪', keywords: ['sandwich', '三明治'] },
  ]},
  { key: 'activities', emojis: [
    { char: '🏁', keywords: ['flag', 'chequered flag', 'finish', 'race', 'goal', '旗帜', '终点', '目标', '赛车'] },
  ]},
  { key: 'mood', emojis: [
    { char: '😆', keywords: ['laugh', 'happy', 'smile', 'grin', '大笑', '开心', '笑'] },
    { char: '😁', keywords: ['grin', 'smile', 'happy', 'beam', '微笑', '露齿笑', '开心'] },
  ]},
  { key: 'other', emojis: [
    { char: '🍽️', keywords: ['default', 'meal', 'food', '默认'] }, { char: '🧂', keywords: ['salt', '盐'] },
    { char: '🫙', keywords: ['jar', 'supplement', '罐'] }, { char: '💊', keywords: ['supplement', 'pill', '补剂'] },
  ]},
]

export const ALL_FOOD_EMOJIS: string[] = FOOD_EMOJI_CATEGORIES.flatMap(c => c.emojis.map(e => e.char))
