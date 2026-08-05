import { describe, expect, it } from 'vitest'
import {
  calculateSpecialPackValue,
  STANDARD_UR_EXPECTED_PER_TEN_PULLS,
  UR_GUARANTEE_EXPECTED_BONUS,
} from './special-pack'

describe('calculateSpecialPackValue', () => {
  it('通常10連のUR期待値を2.175枚として扱う', () => {
    expect(STANDARD_UR_EXPECTED_PER_TEN_PULLS).toBeCloseTo(2.175)
    expect(UR_GUARANTEE_EXPECTED_BONUS).toBeCloseTo(0.8)

    const result = calculateSpecialPackValue({
      pulls: 10,
      gemCost: 1200,
      guaranteedUrCount: 0,
    })

    expect(result.expectedUrCount).toBeCloseTo(2.175)
    expect(result.equivalentPulls).toBeCloseTo(10)
    expect(result.cardGemValue).toBeCloseTo(1000)
    expect(result.accessoryGemCost).toBeCloseTo(200)
    expect(result.isWorseValueThanStandardPacks).toBe(true)
  })

  it('UR確定枠1つにつきUR期待値を0.8枚加算する', () => {
    const result = calculateSpecialPackValue({
      pulls: 20,
      gemCost: 2500,
      guaranteedUrCount: 1,
    })

    expect(result.guaranteedUrCount).toBe(1)
    expect(result.expectedUrCount).toBeCloseTo(5.15)
    expect(result.equivalentPulls).toBeCloseTo(23.6781609)
    expect(result.cardGemValue).toBeCloseTo(2367.816092)
    expect(result.accessoryGemCost).toBeCloseTo(132.183908)
  })

  it('UR確定なしなら選択した連数と同じ通常パック価値になる', () => {
    const result = calculateSpecialPackValue({
      pulls: 10,
      gemCost: 1000,
      guaranteedUrCount: 0,
    })

    expect(result.guaranteedUrCount).toBe(0)
    expect(result.equivalentPulls).toBeCloseTo(10)
  })

  it('カード価値が支払額以上なら前提外として判定する', () => {
    const result = calculateSpecialPackValue({
      pulls: 30,
      gemCost: 4000,
      guaranteedUrCount: 3,
    })

    expect(result.expectedUrCount).toBeCloseTo(8.925)
    expect(result.cardGemValue).toBeGreaterThan(result.accessoryGemCost)
    expect(result.accessoryGemCost).toBeLessThan(0)
    expect(result.isWorseValueThanStandardPacks).toBe(false)
  })
})
