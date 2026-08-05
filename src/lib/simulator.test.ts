import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  calculateBakushi,
  calculateRoyalStreak,
  runRoyalSimulation,
  runSimulation,
} from './simulator'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('runSimulation', () => {
  it('セレクションパックの集計結果を返す', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    const result = runSimulation(
      {
        packType: 'selection',
        totalUrInPack: 1,
        wantedCards: [
          {
            id: 'target',
            name: '対象カード',
            count: 1,
            disableCraft: true,
          },
        ],
      },
      10
    )

    expect(result).toEqual({
      averagePulls: 1,
      medianPulls: 1,
      percentile90: 1,
      averageUrPulled: 1,
    })
  })
})

describe('runRoyalSimulation', () => {
  it('必要連数から費用を換算する', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    const result = runRoyalSimulation(
      {
        packType: 'selection',
        totalUrInPack: 1,
        targetCardName: '対象カード',
        disableCraft: true,
      },
      10
    )

    expect(result).toEqual({
      averagePulls: 1,
      medianPulls: 1,
      percentile90: 1,
      averageCost: 200,
      medianCost: 200,
      percentile90Cost: 200,
    })
  })
})

describe('calculateRoyalStreak', () => {
  it('指定回数の連続失敗率と成功率を計算する', () => {
    const result = calculateRoyalStreak({ attempts: 100 })
    const expectedFailure = 0.99 ** 100

    expect(result.failureStreakProbability).toBeCloseTo(expectedFailure)
    expect(result.successWithinProbability).toBeCloseTo(1 - expectedFailure)
    expect(result.failureStreakPercent).toBe('36.60%')
    expect(result.successWithinPercent).toBe('63.40%')
    expect(result.failureStreakTable).toHaveLength(16)
    expect(result.failureStreakTable[0]?.attempts).toBe(50)
    expect(result.failureStreakTable.at(-1)?.attempts).toBe(200)
  })

  it('試行回数は0以上の整数に正規化する', () => {
    const negativeResult = calculateRoyalStreak({ attempts: -1 })
    const decimalResult = calculateRoyalStreak({ attempts: 10.9 })

    expect(negativeResult.failureStreakProbability).toBe(1)
    expect(negativeResult.successWithinProbability).toBe(0)
    expect(decimalResult.failureStreakProbability).toBeCloseTo(0.99 ** 10)
  })
})

describe('calculateBakushi', () => {
  it('セレクションパックで1枚も引けない確率を計算する', () => {
    const result = calculateBakushi({
      packType: 'selection',
      totalUrInPack: 13,
      pulls: 100,
      targetCount: 1,
    })
    const targetUrRate = 0.225 / 13

    expect(result.probability).toBeCloseTo((1 - targetUrRate) ** 100)
    expect(result.expectedPulls).toBe(58)
    expect(result.probabilityPercent).toBe('17.45%')
  })

  it('シークレットパックではパック内UR枠だけを対象にする', () => {
    const result = calculateBakushi({
      packType: 'secret',
      totalUrInPack: 13,
      pulls: 100,
      targetCount: 1,
    })
    const targetUrRate = 0.1175 / 13

    expect(result.probability).toBeCloseTo((1 - targetUrRate) ** 100)
    expect(result.expectedPulls).toBe(111)
    expect(result.probabilityPercent).toBe('40.33%')
  })

  it('目標が0枚なら常に達成済みとして扱う', () => {
    const result = calculateBakushi({
      packType: 'selection',
      totalUrInPack: 13,
      pulls: 100,
      targetCount: 0,
    })

    expect(result.probability).toBe(0)
    expect(result.expectedPulls).toBe(0)
  })
})
