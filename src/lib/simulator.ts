import type {
  PackConfig,
  SimulationResult,
  WantedCard,
  RoyalChallengeConfig,
  RoyalChallengeResult,
  BakushiConfig,
  BakushiResult,
} from './types'
import {
  SELECTION_UR_RATE_PER_PULL,
  SECRET_BASE_UR_RATE,
  SECRET_10TH_PACK_8TH_CARD_RATE,
  SECRET_PITY_RATE,
  CP_PER_DUPE_UR,
  CP_TO_CRAFT_UR,
  ROYAL_RATE,
  SHINE_RATE,
  CP_PER_BASIC_UR,
  CP_PER_SHINE_UR,
  CP_PER_ROYAL_UR,
  CP_TO_CRAFT,
  COST_PER_10_PULLS,
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

// =====================
// ロイチャレ期待値計算
// =====================

type RoyalSimulationState = {
  cp: number
  hasPity: boolean
  urCountIn10Pulls: number
}

// 加工判定: ロイヤル1%, シャイン10%, ベーシック89%
type Finish = 'royal' | 'shine' | 'basic'
function rollFinish(): Finish {
  const rand = Math.random()
  if (rand < ROYAL_RATE) return 'royal'
  if (rand < ROYAL_RATE + SHINE_RATE) return 'shine'
  return 'basic'
}

// 分解pt取得
function getDisenchantCp(finish: Finish): number {
  switch (finish) {
    case 'royal':
      return CP_PER_ROYAL_UR
    case 'shine':
      return CP_PER_SHINE_UR
    case 'basic':
      return CP_PER_BASIC_UR
  }
}

// URを引いた時の処理（目的カードかどうか、ロイヤルかどうか）
// 戻り値: trueならロイヤルゲットで終了
function processUrForRoyal(
  state: RoyalSimulationState,
  isTargetCard: boolean,
  disableCraft: boolean
): boolean {
  const finish = rollFinish()

  // 目的カードでロイヤルなら終了
  if (isTargetCard && finish === 'royal') {
    return true
  }

  // それ以外は分解してCP獲得
  state.cp += getDisenchantCp(finish)

  // 生成可能で30pt以上あれば生成試行
  if (!disableCraft) {
    while (state.cp >= CP_TO_CRAFT) {
      state.cp -= CP_TO_CRAFT
      // 生成時も1%でロイヤル
      if (Math.random() < ROYAL_RATE) {
        return true
      }
      // ロイヤルじゃなかったら分解（生成したカードも加工判定）
      const craftedFinish = rollFinish()
      if (craftedFinish === 'royal') {
        // 生成で出たロイヤルは目的カードのロイヤル
        return true
      }
      state.cp += getDisenchantCp(craftedFinish)
    }
  }

  return false
}

// セレクションパック: 特定カードのロイヤルが出るまで
function simulateRoyalSelection(config: RoyalChallengeConfig): number {
  const { totalUrInPack, disableCraft } = config
  const state: RoyalSimulationState = {
    cp: 0,
    hasPity: false,
    urCountIn10Pulls: 0,
  }
  let pulls = 0

  while (true) {
    pulls++

    // URが出た場合
    if (Math.random() < SELECTION_UR_RATE_PER_PULL) {
      const isTargetCard = Math.random() < 1 / totalUrInPack
      if (processUrForRoyal(state, isTargetCard, disableCraft)) {
        return pulls
      }
    }
  }
}

// シークレットパック: 特定カードのロイヤルが出るまで
function simulateRoyalSecret(config: RoyalChallengeConfig): number {
  const { totalUrInPack, disableCraft } = config
  const state: RoyalSimulationState = {
    cp: 0,
    hasPity: false,
    urCountIn10Pulls: 0,
  }

  let pulls = 0

  while (true) {
    // 10連をシミュレート
    state.urCountIn10Pulls = 0

    for (let packIndex = 0; packIndex < 10; packIndex++) {
      pulls++
      const isTenthPack = packIndex === 9

      // 1-4枚目: パック外UR (各2.5%) - 目的カードは出ない
      for (let cardSlot = 0; cardSlot < 4; cardSlot++) {
        if (Math.random() < SECRET_BASE_UR_RATE) {
          state.urCountIn10Pulls++
          // パック外URは目的カードではない
          if (processUrForRoyal(state, false, disableCraft)) {
            return pulls
          }
        }
      }

      // 5-8枚目: パック内UR - 目的カードの可能性あり
      for (let cardSlot = 4; cardSlot < 8; cardSlot++) {
        const isEighthCard = cardSlot === 7

        let urRate: number
        if (isTenthPack && isEighthCard) {
          urRate = state.hasPity ? SECRET_PITY_RATE : SECRET_10TH_PACK_8TH_CARD_RATE
        } else {
          urRate = SECRET_BASE_UR_RATE
        }

        if (Math.random() < urRate) {
          state.urCountIn10Pulls++
          const isTargetCard = Math.random() < 1 / totalUrInPack
          if (processUrForRoyal(state, isTargetCard, disableCraft)) {
            return pulls
          }
        }
      }
    }

    // 10連でURが出なかったら次の10連で天井
    state.hasPity = state.urCountIn10Pulls === 0
  }
}

function simulateRoyalOnce(config: RoyalChallengeConfig): number {
  if (config.packType === 'selection') {
    return simulateRoyalSelection(config)
  } else {
    return simulateRoyalSecret(config)
  }
}

export function runRoyalSimulation(
  config: RoyalChallengeConfig,
  iterations: number = 10000
): RoyalChallengeResult {
  const pullCounts: number[] = []

  for (let i = 0; i < iterations; i++) {
    pullCounts.push(simulateRoyalOnce(config))
  }

  pullCounts.sort((a, b) => a - b)

  const averagePulls = pullCounts.reduce((a, b) => a + b, 0) / iterations
  const medianPulls = pullCounts[Math.floor(iterations / 2)]
  const percentile90 = pullCounts[Math.floor(iterations * 0.9)]

  // コスト計算（10連 = 2000円）
  const costPerPull = COST_PER_10_PULLS / 10
  const averageCost = averagePulls * costPerPull
  const medianCost = medianPulls * costPerPull
  const percentile90Cost = percentile90 * costPerPull

  return {
    averagePulls: Math.round(averagePulls * 10) / 10,
    medianPulls,
    percentile90,
    averageCost: Math.round(averageCost),
    medianCost: Math.round(medianCost),
    percentile90Cost: Math.round(percentile90Cost),
  }
}

// =====================
// 未達確率計算
// =====================

// 二項係数を対数で計算（オーバーフロー防止）
function logBinomial(n: number, k: number): number {
  if (k > n || k < 0) return -Infinity
  if (k === 0 || k === n) return 0

  let result = 0
  for (let i = 0; i < k; i++) {
    result += Math.log(n - i) - Math.log(i + 1)
  }
  return result
}

// 二項分布の累積確率 P(X < k) = P(X <= k-1)
function binomialCdf(n: number, k: number, p: number): number {
  if (k <= 0) return 0
  if (k > n) return 1
  if (p === 0) return k > 0 ? 1 : 0
  if (p === 1) return k > n ? 1 : 0

  let cdf = 0
  const logQ = Math.log(1 - p)
  const logP = Math.log(p)

  for (let i = 0; i < k; i++) {
    const logProb = logBinomial(n, i) + i * logP + (n - i) * logQ
    cdf += Math.exp(logProb)
  }

  return Math.min(1, Math.max(0, cdf))
}

// 1連あたりの特定UR確率を取得
function getTargetUrProbability(
  packType: 'selection' | 'secret',
  totalUrInPack: number
): number {
  if (packType === 'selection') {
    // セレクション: 1連あたり0.225のUR確率、100%パック内
    return SELECTION_UR_RATE_PER_PULL / totalUrInPack
  } else {
    // シークレット: パック内URのみを対象
    // 10連あたりのパック内UR期待値を近似計算
    // 1-9パック: 各4スロット × 2.5% = 0.1 × 9 = 0.9
    // 10パック目: 3スロット × 2.5% + 1スロット × 20% = 0.075 + 0.2 = 0.275
    // 合計: 0.9 + 0.275 = 1.175 / 10連
    const inPackUrPer10Pulls = 1.175
    const inPackUrPerPull = inPackUrPer10Pulls / 10
    return inPackUrPerPull / totalUrInPack
  }
}

export function calculateBakushi(config: BakushiConfig): BakushiResult {
  const { packType, totalUrInPack, pulls, targetCount } = config

  const p = getTargetUrProbability(packType, totalUrInPack)

  // N連でk枚未満の確率（未達確率）
  const probability = binomialCdf(pulls, targetCount, p)

  // 期待連数: k枚引くための期待値 = k / p
  const expectedPulls = targetCount / p

  // 確率を%表示にフォーマット
  let probabilityPercent: string
  const percent = probability * 100

  if (probability >= 0.9999999) {
    probabilityPercent = '99.99999%以上'
  } else if (probability <= 1e-10) {
    probabilityPercent = `${percent.toExponential(2)}%`
  } else if (probability >= 0.01) {
    probabilityPercent = `${percent.toFixed(2)}%`
  } else if (probability >= 0.0001) {
    probabilityPercent = `${percent.toFixed(4)}%`
  } else if (probability >= 0.000001) {
    probabilityPercent = `${percent.toFixed(6)}%`
  } else {
    probabilityPercent = `${percent.toFixed(8)}%`
  }

  return {
    probability,
    probabilityPercent,
    expectedPulls: Math.round(expectedPulls),
  }
}
