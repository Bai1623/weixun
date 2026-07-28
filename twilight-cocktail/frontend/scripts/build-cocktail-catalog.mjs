import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const publicCatalogPath = path.join(rootDir, 'public/cocktails/catalog.json')
const generatedCatalogPath = path.join(rootDir, 'src/data/cocktails.generated.json')
const targetCount = Number(process.env.COCKTAIL_TARGET_COUNT ?? 300)

const letters = 'abcdefghijklmnopqrstuvwxyz'.split('')

const popularNames = [
  'Margarita',
  'Mojito',
  'Old Fashioned',
  'Negroni',
  'Daiquiri',
  'Whiskey Sour',
  'Espresso Martini',
  'Martini',
  'Manhattan',
  'Aperol Spritz',
  'Moscow Mule',
  'Cosmopolitan',
  'Bloody Mary',
  'Pina Colada',
  'Mai Tai',
  'Tom Collins',
  'Long Island Iced Tea',
  'French 75',
  'Sidecar',
  'Paloma',
  'Mint Julep',
  'Sazerac',
  'Aviation',
  'White Russian',
  'Black Russian',
  'Cuba Libre',
  'Bellini',
  'Americano',
  'Gimlet',
  'Singapore Sling',
  'Dark and Stormy',
  'Blue Lagoon',
  'Tequila Sunrise',
  'Zombie',
  'Bramble',
  'Clover Club',
  'Last Word',
  'Boulevardier',
  'Penicillin',
  'Vesper',
  'Caipirinha',
]

const zhCocktailNames = new Map([
  ['Aperol Spritz', '阿佩罗橙光'],
  ['Black Russian', '黑俄罗斯'],
  ['Bloody Mary', '血腥玛丽'],
  ['Blue Lagoon', '蓝色珊瑚礁'],
  ['Cosmopolitan', '大都会'],
  ['Daiquiri', '代基里'],
  ['Espresso Martini', '浓缩马天尼'],
  ['French 75', '法兰西 75'],
  ['Gin Tonic', '金汤力'],
  ['Long Island Iced Tea', '长岛冰茶'],
  ['Margarita', '玛格丽特'],
  ['Martini', '马天尼'],
  ['Mojito', '莫吉托'],
  ['Moscow Mule', '莫斯科骡子'],
  ['Negroni', '尼格罗尼'],
  ['Old Fashioned', '古典鸡尾酒'],
  ['Pina Colada', '椰林飘香'],
  ['Sidecar', '边车'],
  ['Tequila Sunrise', '龙舌兰日出'],
  ['Tom Collins', '汤姆柯林斯'],
  ['Whiskey Sour', '威士忌酸'],
  ['White Russian', '白俄罗斯'],
])

const ingredientNameZh = new Map([
  ['151 proof rum', '高浓度朗姆酒'],
  ['7-up', '七喜'],
  ['absinthe', '苦艾酒'],
  ['absolut citron', '柑橘伏特加'],
  ['absolut kurant', '黑醋栗伏特加'],
  ['absolut vodka', '伏特加'],
  ['advocaat', '蛋黄利口酒'],
  ['ale', '艾尔啤酒'],
  ['amaretto', '杏仁利口酒'],
  ['anejo rum', '陈年朗姆酒'],
  ['aperol', '阿佩罗'],
  ['apple brandy', '苹果白兰地'],
  ['apple cider', '苹果西打'],
  ['apple juice', '苹果汁'],
  ['applejack', '苹果杰克'],
  ['apricot brandy', '杏子白兰地'],
  ['baileys irish cream', '百利甜酒'],
  ['banana liqueur', '香蕉利口酒'],
  ['beer', '啤酒'],
  ['benedictine', '本笃会利口酒'],
  ['bitters', '苦精'],
  ['blackberry brandy', '黑莓白兰地'],
  ['blended whiskey', '调和威士忌'],
  ['bourbon', '波本威士忌'],
  ['brandy', '白兰地'],
  ['cachaca', '卡莎萨'],
  ['campari', '金巴利'],
  ['champagne', '香槟'],
  ['cherry brandy', '樱桃白兰地'],
  ['cherry liqueur', '樱桃利口酒'],
  ['chocolate liqueur', '巧克力利口酒'],
  ['coconut cream', '椰浆'],
  ['coconut liqueur', '椰子利口酒'],
  ['coconut rum', '椰子朗姆酒'],
  ['coffee', '咖啡'],
  ['coffee liqueur', '咖啡利口酒'],
  ['cointreau', '君度'],
  ['cola', '可乐'],
  ['cranberry juice', '蔓越莓汁'],
  ['cream', '奶油'],
  ['creme de cacao', '可可利口酒'],
  ['creme de cassis', '黑醋栗利口酒'],
  ['creme de menthe', '薄荷利口酒'],
  ['dark rum', '黑朗姆酒'],
  ['dry vermouth', '干味美思'],
  ['egg', '鸡蛋'],
  ['egg white', '蛋清'],
  ['gin', '金酒'],
  ['ginger ale', '姜汁汽水'],
  ['ginger beer', '姜汁啤酒'],
  ['grand marnier', '金万利'],
  ['grapefruit juice', '西柚汁'],
  ['grenadine', '红石榴糖浆'],
  ['honey', '蜂蜜'],
  ['irish cream', '爱尔兰奶油利口酒'],
  ['kahlua', '咖啡利口酒'],
  ['lemon', '柠檬'],
  ['lemon juice', '柠檬汁'],
  ['lemon peel', '柠檬皮'],
  ['lemon-lime soda', '柠檬青柠汽水'],
  ['light rum', '白朗姆酒'],
  ['lime', '青柠'],
  ['lime juice', '青柠汁'],
  ['mint', '薄荷叶'],
  ['orange', '橙子'],
  ['orange bitters', '橙味苦精'],
  ['orange juice', '橙汁'],
  ['orange liqueur', '橙味利口酒'],
  ['orange peel', '橙皮'],
  ['peach schnapps', '蜜桃利口酒'],
  ['pineapple juice', '菠萝汁'],
  ['prosecco', '普罗塞克'],
  ['rum', '朗姆酒'],
  ['rye whiskey', '黑麦威士忌'],
  ['salt', '盐'],
  ['scotch', '苏格兰威士忌'],
  ['simple syrup', '糖浆'],
  ['soda water', '苏打水'],
  ['southern comfort', '南方安逸'],
  ['sprite', '雪碧'],
  ['sugar', '糖'],
  ['sweet vermouth', '甜味美思'],
  ['tequila', '龙舌兰'],
  ['tomato juice', '番茄汁'],
  ['tonic water', '汤力水'],
  ['triple sec', '橙味利口酒'],
  ['vermouth', '味美思'],
  ['vodka', '伏特加'],
  ['water', '水'],
  ['whiskey', '威士忌'],
  ['white rum', '白朗姆酒'],
  ['wine', '葡萄酒'],
])

const ingredientAliases = new Map([
  ['absolut vodka', 'vodka'],
  ['light rum', 'white-rum'],
  ['white rum', 'white-rum'],
  ['rum', 'rum'],
  ['anejo rum', 'aged-rum'],
  ['añejo rum', 'aged-rum'],
  ['bourbon', 'bourbon'],
  ['bourbon whiskey', 'bourbon'],
  ['whisky', 'whiskey'],
  ['whiskey', 'whiskey'],
  ['blended whiskey', 'whiskey'],
  ['rye whiskey', 'rye-whiskey'],
  ['scotch', 'scotch'],
  ['scotch whisky', 'scotch'],
  ['cachaca', 'cachaca'],
  ['cachaça', 'cachaca'],
  ['cointreau', 'triple-sec'],
  ['triple sec', 'triple-sec'],
  ['orange liqueur', 'triple-sec'],
  ['kahlua', 'coffee-liqueur'],
  ['coffee liqueur', 'coffee-liqueur'],
  ['angostura bitters', 'angostura-bitters'],
  ['bitters', 'angostura-bitters'],
  ['sugar syrup', 'simple-syrup'],
  ['simple syrup', 'simple-syrup'],
  ['syrup', 'simple-syrup'],
  ['club soda', 'soda-water'],
  ['soda water', 'soda-water'],
  ['carbonated water', 'soda-water'],
  ['lemon-lime soda', 'lemon-lime-soda'],
  ['7-up', 'lemon-lime-soda'],
  ['sprite', 'lemon-lime-soda'],
  ['mint leaves', 'mint'],
  ['mint leaf', 'mint'],
])

const slugify = (value) =>
  value
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-')

const cleanIngredientName = (value) =>
  value
    .replace(/\(.+?\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const normalizeIngredient = (rawName, amount, order) => {
  const cleanName = cleanIngredientName(rawName)
  const key = cleanName.toLowerCase()
  const slug = ingredientAliases.get(key) ?? slugify(cleanName)
  const nameZh =
    ingredientNameZh.get(key) ?? ingredientNameZh.get(slug.replace(/-/g, ' ')) ?? cleanName
  const garnishHints = ['peel', 'twist', 'wedge', 'slice', 'cherry', 'olive', 'sprig', 'garnish']
  const garnishByName = garnishHints.some((hint) => key.includes(hint))
  const garnishByAmount = /garnish|rim|optional/i.test(amount)
  return {
    slug,
    nameZh,
    nameEn: cleanName,
    amount: amount || '适量',
    requirement: garnishByName || garnishByAmount ? 'garnish' : 'required',
    displayOrder: order,
  }
}

const methodFromDrink = (drink) => {
  const text = `${drink.strInstructions ?? ''} ${drink.strCategory ?? ''}`.toLowerCase()
  if (text.includes('blend')) return '搅拌机'
  if (text.includes('muddle')) return '捣压'
  if (text.includes('shake') || text.includes('shaker')) return '摇和'
  if (text.includes('stir')) return '搅拌'
  return '兑和'
}

const baseSpiritFromIngredients = (ingredients, alcoholic) => {
  const spirits = [
    'gin',
    'vodka',
    'tequila',
    'white-rum',
    'rum',
    'dark-rum',
    'aged-rum',
    'bourbon',
    'whiskey',
    'rye-whiskey',
    'scotch',
    'brandy',
    'cachaca',
    'campari',
    'aperol',
    'prosecco',
    'champagne',
  ]
  const firstSpirit = ingredients.find((item) => spirits.includes(item.slug))
  if (firstSpirit) return firstSpirit.nameZh
  return alcoholic ? '混合基酒' : '无酒精'
}

const flavorsFromIngredients = (ingredients, alcoholic) => {
  const slugs = new Set(ingredients.map((item) => item.slug))
  const has = (...items) => items.some((item) => slugs.has(item))
  return {
    sweet: has('simple-syrup', 'grenadine', 'cola', 'pineapple-juice', 'orange-juice') ? 4 : 2,
    sour: has('lime-juice', 'lemon-juice', 'grapefruit-juice', 'cranberry-juice') ? 4 : 1,
    bitter: has('campari', 'aperol', 'angostura-bitters', 'tonic-water') ? 4 : 1,
    strong: alcoholic ? (ingredients.length <= 3 ? 4 : 3) : 0,
    fresh: has('mint', 'soda-water', 'tonic-water', 'ginger-beer', 'lemon-lime-soda') ? 5 : 2,
  }
}

const difficultyFromIngredients = (ingredients) => {
  const requiredCount = ingredients.filter((item) => item.requirement === 'required').length
  if (requiredCount <= 3) return 'easy'
  if (requiredCount <= 5) return 'medium'
  return 'advanced'
}

const toneFromIngredients = (ingredients, alcoholic) => {
  const slugs = new Set(ingredients.map((item) => item.slug))
  if (!alcoholic) return 'clear'
  if (slugs.has('campari') || slugs.has('cranberry-juice') || slugs.has('grenadine')) return 'ruby'
  if (slugs.has('mint') || slugs.has('lime-juice')) return 'mint'
  if (slugs.has('orange-juice') || slugs.has('aperol')) return 'orange'
  if (slugs.has('pineapple-juice') || slugs.has('coconut-cream')) return 'tropical'
  if (slugs.has('cream') || slugs.has('coffee-liqueur')) return 'amber'
  return 'gold'
}

const stepsFor = (nameZh, method) => [
  {
    stepNumber: 1,
    instruction: '准备杯具、冰块和所有材料，按配方量好。',
    technique: '准备',
    tip: '先量材料再开始，能减少手忙脚乱。',
  },
  {
    stepNumber: 2,
    instruction: `按配方完成${method}，让材料充分混合并降温。`,
    technique: method,
  },
  {
    stepNumber: 3,
    instruction: `倒入杯中，完成${nameZh}的装饰并立即品饮。`,
    technique: '出品',
    tip: '冰饮类鸡尾酒最好在温度上升前饮用。',
  },
]

const drinkToCocktail = (drink) => {
  const rawIngredients = []
  for (let index = 1; index <= 15; index += 1) {
    const name = drink[`strIngredient${index}`]?.trim()
    if (!name) continue
    rawIngredients.push(
      normalizeIngredient(
        name,
        drink[`strMeasure${index}`]?.trim() ?? '',
        rawIngredients.length + 1,
      ),
    )
  }
  if (rawIngredients.length < 2) return undefined

  const slug = slugify(drink.strDrink)
  const nameZh = zhCocktailNames.get(drink.strDrink) ?? drink.strDrink
  const method = methodFromDrink(drink)
  const alcoholic = drink.strAlcoholic !== 'Non alcoholic'
  const difficulty = difficultyFromIngredients(rawIngredients)
  const isIba = Boolean(drink.strIBA)
  const categoryTags = [drink.strCategory, drink.strIBA, alcoholic ? '含酒精' : '无酒精'].filter(
    Boolean,
  )

  return {
    id: `tdb-${drink.idDrink}`,
    slug,
    nameZh,
    nameEn: drink.strDrink,
    shortDescription: `${nameZh}来自扩展酒单，适合用酒柜材料快速判断可制作性。`,
    story:
      drink.strInstructions?.trim() ||
      `${nameZh}用于扩展酒柜匹配范围，帮助从已有材料中发现更多可做酒款。`,
    imageUrl: drink.strDrinkThumb || '',
    imageTone: toneFromIngredients(rawIngredients, alcoholic),
    baseSpirit: baseSpiritFromIngredients(rawIngredients, alcoholic),
    glassType: drink.strGlass || '酒杯',
    method,
    difficulty,
    prepMinutes: difficulty === 'easy' ? 5 : difficulty === 'medium' ? 7 : 10,
    alcoholLevel: alcoholic ? (rawIngredients.length <= 3 ? 'high' : 'medium') : 'none',
    flavors: flavorsFromIngredients(rawIngredients, alcoholic),
    tags: categoryTags,
    popularityWeight: 3,
    beginnerFriendly: difficulty === 'easy',
    isIba,
    isAlcoholic: alcoholic,
    sourceName: 'TheCocktailDB API / generated pantry catalog',
    ingredients: rawIngredients,
    steps: stepsFor(nameZh, method),
  }
}

const scoreGeneratedCocktail = (cocktail) => {
  let score = 0
  const popularIndex = popularNames.findIndex(
    (name) => name.toLowerCase() === cocktail.nameEn.toLowerCase(),
  )
  if (popularIndex >= 0) score += 600 - popularIndex * 5
  if (cocktail.isIba) score += 400
  if (cocktail.beginnerFriendly) score += 30
  if (cocktail.ingredients.length <= 4) score += 20
  return score
}

const fetchAllCocktailDbDrinks = async () => {
  const drinks = []
  for (const letter of letters) {
    const response = await fetch(
      `https://www.thecocktaildb.com/api/json/v1/1/search.php?f=${letter}`,
    )
    if (!response.ok) throw new Error(`TheCocktailDB request failed for ${letter}`)
    const payload = await response.json()
    if (payload.drinks) drinks.push(...payload.drinks)
  }
  return Array.from(new Map(drinks.map((drink) => [drink.idDrink, drink])).values())
}

const main = async () => {
  const existingCatalog = JSON.parse(await fs.readFile(publicCatalogPath, 'utf8'))
  const curatedItems = existingCatalog.items
    .filter((item) => !item.sourceName?.includes('generated pantry catalog'))
    .map((item) => ({
      ...item,
      popularityWeight: Math.max(item.popularityWeight ?? 0, 8),
    }))
  const curatedSlugs = new Set(curatedItems.map((item) => item.slug))
  const remoteDrinks = await fetchAllCocktailDbDrinks()
  const generated = remoteDrinks
    .map(drinkToCocktail)
    .filter(Boolean)
    .filter((item) => !curatedSlugs.has(item.slug))
    .sort((a, b) => scoreGeneratedCocktail(b) - scoreGeneratedCocktail(a))
    .map((item, index) => ({
      ...item,
      popularityWeight: Math.max(1, Math.min(10, 7 - Math.floor(index / 55))),
    }))

  const items = [...curatedItems, ...generated].slice(0, targetCount)
  const catalog = { items, total: items.length }
  const formatted = `${JSON.stringify(catalog, null, 2)}\n`
  await fs.writeFile(generatedCatalogPath, formatted)
  await fs.writeFile(publicCatalogPath, formatted)
  console.log(
    JSON.stringify(
      {
        curated: curatedItems.length,
        remote: remoteDrinks.length,
        generated: generated.length,
        written: items.length,
      },
      null,
      2,
    ),
  )
}

await main()
