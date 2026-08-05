export const SPECIAL_PACK_PULL_OPTIONS = [10, 20, 30] as const

export type SpecialPackPullCount = (typeof SPECIAL_PACK_PULL_OPTIONS)[number]

export type SpecialPackConfig = {
  pulls: SpecialPackPullCount
  gemCost: number
  guaranteedUrCount: number
}

export type SpecialPackResult = {
  guaranteedUrCount: number
  expectedUrCount: number
  equivalentPulls: number
  cardGemValue: number
  accessoryGemCost: number
  isWorseValueThanStandardPacks: boolean
}

const CARDS_PER_PACK = 8
const PACKS_PER_TEN_PULLS = 10
const NORMAL_UR_RATE = 0.025
const LAST_SLOT_UR_RATE = 0.2
const GUARANTEED_UR_RATE = 1

export const GEMS_PER_TEN_PULLS = 1000
export const STANDARD_UR_EXPECTED_PER_TEN_PULLS =
  (CARDS_PER_PACK * PACKS_PER_TEN_PULLS - 1) * NORMAL_UR_RATE +
  LAST_SLOT_UR_RATE
export const UR_GUARANTEE_EXPECTED_BONUS =
  GUARANTEED_UR_RATE - LAST_SLOT_UR_RATE

export function calculateSpecialPackValue(
  config: SpecialPackConfig
): SpecialPackResult {
  const tenPullCount = config.pulls / 10
  const expectedUrCount =
    tenPullCount * STANDARD_UR_EXPECTED_PER_TEN_PULLS +
    config.guaranteedUrCount * UR_GUARANTEE_EXPECTED_BONUS
  const equivalentPulls =
    (expectedUrCount / STANDARD_UR_EXPECTED_PER_TEN_PULLS) * 10
  const cardGemValue = (equivalentPulls / 10) * GEMS_PER_TEN_PULLS
  const accessoryGemCost = config.gemCost - cardGemValue

  return {
    guaranteedUrCount: config.guaranteedUrCount,
    expectedUrCount,
    equivalentPulls,
    cardGemValue,
    accessoryGemCost,
    isWorseValueThanStandardPacks: accessoryGemCost > 0,
  }
}
