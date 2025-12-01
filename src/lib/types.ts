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
