export type PackType = 'selection' | 'secret'

export type WantedCard = {
  id: string
  name: string
  count: number // 1-3
  disableCraft: boolean
}

export type PackConfig = {
  packType: PackType
  totalUrInPack: number
  wantedCards: WantedCard[]
}

export type SimulationResult = {
  averagePulls: number
  medianPulls: number
  percentile90: number
  averageUrPulled: number
}

// ロイチャレ期待値計算用
export type RoyalChallengeConfig = {
  packType: PackType
  totalUrInPack: number
  targetCardName: string
  disableCraft: boolean
}

export type RoyalChallengeResult = {
  averagePulls: number
  medianPulls: number
  percentile90: number
  averageCost: number // 円
  medianCost: number // 円
  percentile90Cost: number // 円
}

// 加工確率
export const ROYAL_RATE = 0.01 // 1%
export const SHINE_RATE = 0.10 // 10%
// ベーシック = 89% (残り)

// 分解pt
export const CP_PER_BASIC_UR = 10
export const CP_PER_SHINE_UR = 15
export const CP_PER_ROYAL_UR = 30

// 生成コスト
export const CP_TO_CRAFT = 30

// 10連あたりのコスト
export const COST_PER_10_PULLS = 2000 // 円

// 未達確率計算用
export type BakushiConfig = {
  packType: PackType
  totalUrInPack: number
  pulls: number // N連
  targetCount: number // 目標枚数（これ未満だと未達）
}

export type BakushiResult = {
  probability: number // 未達確率（0-1）
  probabilityPercent: string // 未達確率（%表示）
  expectedPulls: number // 目標枚数を引くための期待連数
}

// セレクションパック用（従来の計算）
export const SELECTION_UR_RATE_PER_10_PULLS = 2.25
export const SELECTION_UR_RATE_PER_PULL = SELECTION_UR_RATE_PER_10_PULLS / 10

// シークレットパック用
export const SECRET_BASE_UR_RATE = 0.025 // 2.5%
export const SECRET_10TH_PACK_8TH_CARD_RATE = 0.2 // 20%
export const SECRET_PITY_RATE = 1.0 // 天井時100%

// 共通
export const CP_PER_DUPE_UR = 10
export const CP_TO_CRAFT_UR = 30
