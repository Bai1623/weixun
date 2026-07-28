export type DifficultyLevel = 'easy' | 'medium' | 'advanced'
export type AlcoholLevel = 'none' | 'low' | 'medium' | 'high'
export type IngredientRequirement = 'required' | 'optional' | 'garnish'

export type FlavorProfile = {
  sweet: number
  sour: number
  bitter: number
  strong: number
  fresh: number
}

export type CocktailIngredient = {
  slug: string
  nameZh: string
  nameEn: string
  amount: string
  requirement: IngredientRequirement
  displayOrder: number
  note?: string
}

export type CocktailStep = {
  stepNumber: number
  instruction: string
  technique: string
  timerSeconds?: number
  tip?: string
}

export type Cocktail = {
  id: string
  slug: string
  nameZh: string
  nameEn: string
  shortDescription: string
  story: string
  imageUrl: string
  imageTone: string
  baseSpirit: string
  glassType: string
  method: string
  difficulty: DifficultyLevel
  prepMinutes: number
  alcoholLevel: AlcoholLevel
  flavors: FlavorProfile
  tags: string[]
  popularityWeight: number
  beginnerFriendly: boolean
  isIba: boolean
  isAlcoholic: boolean
  sourceName: string
  ingredients: CocktailIngredient[]
  steps: CocktailStep[]
}

export type AcademyLesson = {
  slug: string
  title: string
  summary: string
  estimatedMinutes: number
  chapter: number
  content: string[]
}

export type PantryMatchItem = {
  slug: string
  nameZh: string
  nameEn: string
  matchedRequired: number
  totalRequired: number
  missingIngredients: string[]
  optionalMissing: string[]
  matchScore: number
}

export type PantryMatches = {
  ready: PantryMatchItem[]
  missingOne: PantryMatchItem[]
  partial: PantryMatchItem[]
}
