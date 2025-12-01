import type { PackConfig, SimulationResult, WantedCard } from './types'
import {
  SELECTION_UR_RATE_PER_PULL,
  SECRET_BASE_UR_RATE,
  SECRET_10TH_PACK_8TH_CARD_RATE,
  SECRET_PITY_RATE,
  CP_PER_DUPE_UR,
  CP_TO_CRAFT_UR,
} from './types'

type SingleSimulationResult = {
  pulls: number
  urPulled: number
}

type SimulationState = {
  obtainedCounts: Map<string, number>
  cp: number
  urPulled: number
  hasPity: boolean // 天井フラグ
}

function createInitialState(wantedCards: WantedCard[]): SimulationState {
  const obtainedCounts = new Map<string, number>()
  for (const card of wantedCards) {
    obtainedCounts.set(card.id, 0)
  }
  return {
    obtainedCounts,
    cp: 0,
    urPulled: 0,
    hasPity: false,
  }
}

function isComplete(state: SimulationState, wantedCards: WantedCard[]): boolean {
  for (const card of wantedCards) {
    const obtained = state.obtainedCounts.get(card.id) ?? 0
    if (obtained < card.count) {
      return false
    }
  }
  return true
}

function getCraftableNeeded(
  state: SimulationState,
  wantedCards: WantedCard[]
): number {
  let total = 0
  for (const card of wantedCards) {
    if (card.disableCraft) continue
    const obtained = state.obtainedCounts.get(card.id) ?? 0
    total += Math.max(0, card.count - obtained)
  }
  return total
}

function tryToCraft(state: SimulationState, wantedCards: WantedCard[]): void {
  while (state.cp >= CP_TO_CRAFT_UR && getCraftableNeeded(state, wantedCards) > 0) {
    for (const card of wantedCards) {
      if (card.disableCraft) continue
      const obtained = state.obtainedCounts.get(card.id) ?? 0
      if (obtained < card.count) {
        state.obtainedCounts.set(card.id, obtained + 1)
        state.cp -= CP_TO_CRAFT_UR
        break
      }
    }
  }
}

function processPackUr(
  state: SimulationState,
  wantedCards: WantedCard[],
  totalUrInPack: number,
  wantedCardIndices: Map<number, string>
): void {
  state.urPulled++

  const urIndex = Math.floor(Math.random() * totalUrInPack)
  const cardId = wantedCardIndices.get(urIndex)

  if (cardId !== undefined) {
    const card = wantedCards.find((c) => c.id === cardId)
    const obtained = state.obtainedCounts.get(cardId) ?? 0

    if (card && obtained < card.count) {
      state.obtainedCounts.set(cardId, obtained + 1)
    } else {
      state.cp += CP_PER_DUPE_UR
    }
  } else {
    state.cp += CP_PER_DUPE_UR
  }
}

function processOutOfPackUr(state: SimulationState): void {
  state.urPulled++
  state.cp += CP_PER_DUPE_UR
}

// セレクションパック: 1連ごとにUR判定、100%パック内
function simulateSelectionPack(config: PackConfig): SingleSimulationResult {
  const { totalUrInPack, wantedCards } = config
  const state = createInitialState(wantedCards)

  const wantedCardIndices = new Map<number, string>()
  wantedCards.forEach((card, i) => {
    wantedCardIndices.set(i, card.id)
  })

  let pulls = 0

  while (!isComplete(state, wantedCards)) {
    pulls++

    if (Math.random() < SELECTION_UR_RATE_PER_PULL) {
      processPackUr(state, wantedCards, totalUrInPack, wantedCardIndices)
    }

    tryToCraft(state, wantedCards)
  }

  return { pulls, urPulled: state.urPulled }
}

// シークレットパック: 10連単位でシミュレーション
function simulateSecretPack(config: PackConfig): SingleSimulationResult {
  const { totalUrInPack, wantedCards } = config
  const state = createInitialState(wantedCards)

  const wantedCardIndices = new Map<number, string>()
  wantedCards.forEach((card, i) => {
    wantedCardIndices.set(i, card.id)
  })

  let pulls = 0

  while (!isComplete(state, wantedCards)) {
    // 10連をシミュレート
    const urCountBefore = state.urPulled

    for (let packIndex = 0; packIndex < 10; packIndex++) {
      if (isComplete(state, wantedCards)) break

      pulls++
      const isTenthPack = packIndex === 9

      // 1-4枚目: パック外UR (各2.5%)
      for (let cardSlot = 0; cardSlot < 4; cardSlot++) {
        if (Math.random() < SECRET_BASE_UR_RATE) {
          processOutOfPackUr(state)
        }
      }

      // 5-8枚目: パック内UR
      for (let cardSlot = 4; cardSlot < 8; cardSlot++) {
        const isEighthCard = cardSlot === 7

        let urRate: number
        if (isTenthPack && isEighthCard) {
          // 10パック目の8枚目: 20% or 天井100%
          urRate = state.hasPity ? SECRET_PITY_RATE : SECRET_10TH_PACK_8TH_CARD_RATE
        } else {
          // 通常: 2.5%
          urRate = SECRET_BASE_UR_RATE
        }

        if (Math.random() < urRate) {
          processPackUr(state, wantedCards, totalUrInPack, wantedCardIndices)
        }
      }

      tryToCraft(state, wantedCards)
    }

    // 10連でURが出なかったら次の10連で天井
    const urCountAfter = state.urPulled
    state.hasPity = urCountAfter === urCountBefore
  }

  return { pulls, urPulled: state.urPulled }
}

function simulateOnce(config: PackConfig): SingleSimulationResult {
  if (config.packType === 'selection') {
    return simulateSelectionPack(config)
  } else {
    return simulateSecretPack(config)
  }
}

export function runSimulation(
  config: PackConfig,
  iterations: number = 100000
): SimulationResult {
  const results: SingleSimulationResult[] = []

  for (let i = 0; i < iterations; i++) {
    results.push(simulateOnce(config))
  }

  const pullCounts = results.map((r) => r.pulls).sort((a, b) => a - b)
  const urCounts = results.map((r) => r.urPulled)

  const averagePulls = pullCounts.reduce((a, b) => a + b, 0) / iterations
  const medianPulls = pullCounts[Math.floor(iterations / 2)]
  const percentile90 = pullCounts[Math.floor(iterations * 0.9)]
  const averageUrPulled = urCounts.reduce((a, b) => a + b, 0) / iterations

  return {
    averagePulls: Math.round(averagePulls * 10) / 10,
    medianPulls,
    percentile90,
    averageUrPulled: Math.round(averageUrPulled * 10) / 10,
  }
}
