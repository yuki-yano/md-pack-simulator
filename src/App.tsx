import { useState, useCallback } from 'react'
import {
  useQueryState,
  parseAsStringLiteral,
  parseAsInteger,
  createParser,
} from 'nuqs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { runSimulation, runRoyalSimulation, calculateBakushi } from '@/lib/simulator'
import type {
  PackType,
  SimulationResult,
  WantedCard,
  RoyalChallengeResult,
  BakushiResult,
} from '@/lib/types'

const packTypes = ['selection', 'secret'] as const

// UTF-8対応のBase64エンコード/デコード
const encodeBase64 = (str: string): string => {
  const bytes = new TextEncoder().encode(str)
  const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join('')
  return btoa(binString)
}

const decodeBase64 = (base64: string): string => {
  const binString = atob(base64)
  const bytes = Uint8Array.from(binString, (char) => char.codePointAt(0)!)
  return new TextDecoder().decode(bytes)
}

const validateWantedCards = (json: unknown): json is WantedCard[] => {
  if (!Array.isArray(json)) return false
  for (const item of json) {
    if (
      typeof item !== 'object' ||
      item === null ||
      typeof item.id !== 'string' ||
      typeof item.name !== 'string' ||
      typeof item.count !== 'number' ||
      typeof item.disableCraft !== 'boolean'
    ) {
      return false
    }
  }
  return true
}

const parseAsWantedCards = createParser({
  parse: (value: string): WantedCard[] | null => {
    try {
      const json = JSON.parse(decodeBase64(value))
      return validateWantedCards(json) ? json : null
    } catch {
      return null
    }
  },
  serialize: (value: WantedCard[]): string => encodeBase64(JSON.stringify(value)),
})

function PackExpectedValueCalculator() {
  const [packType, setPackType] = useQueryState(
    'type',
    parseAsStringLiteral(packTypes).withDefault('selection')
  )
  const [totalUrInPack, setTotalUrInPack] = useQueryState(
    'ur',
    parseAsInteger.withDefault(8)
  )
  const [wantedCards, setWantedCards] = useQueryState(
    'cards',
    parseAsWantedCards.withDefault([])
  )
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)

  const handleAddCard = useCallback(() => {
    if (wantedCards.length >= totalUrInPack) return

    const newCard: WantedCard = {
      id: crypto.randomUUID(),
      name: '',
      count: 1,
      disableCraft: false,
    }
    setWantedCards((prev) => [...prev, newCard])
  }, [wantedCards.length, totalUrInPack, setWantedCards])

  const handleRemoveCard = useCallback((id: string) => {
    setWantedCards((prev) => prev.filter((card) => card.id !== id))
  }, [setWantedCards])

  const handleUpdateName = useCallback((id: string, name: string) => {
    setWantedCards((prev) =>
      prev.map((card) => (card.id === id ? { ...card, name } : card))
    )
  }, [setWantedCards])

  const handleUpdateCount = useCallback((id: string, count: number) => {
    setWantedCards((prev) =>
      prev.map((card) => (card.id === id ? { ...card, count } : card))
    )
  }, [setWantedCards])

  const handleUpdateDisableCraft = useCallback(
    (id: string, disableCraft: boolean) => {
      setWantedCards((prev) =>
        prev.map((card) => (card.id === id ? { ...card, disableCraft } : card))
      )
    },
    [setWantedCards]
  )

  const handleCalculate = useCallback(() => {
    const validCards = wantedCards.filter((card) => card.name.trim() !== '')
    if (validCards.length === 0) return

    setIsCalculating(true)

    setTimeout(() => {
      const simulationResult = runSimulation({
        packType,
        totalUrInPack,
        wantedCards: validCards,
      })
      setResult(simulationResult)
      setIsCalculating(false)
    }, 0)
  }, [packType, totalUrInPack, wantedCards])

  const validCards = wantedCards.filter((card) => card.name.trim() !== '')
  const totalWantedCount = validCards.reduce((sum, card) => sum + card.count, 0)
  const hasCraftableCards = validCards.some((card) => !card.disableCraft)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>パック期待値計算</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* パックの種類 */}
          <div className="space-y-2">
            <Label htmlFor="packType">パックの種類</Label>
            <Select
              value={packType}
              onValueChange={(value: PackType) => setPackType(value)}
            >
              <SelectTrigger id="packType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="selection">
                  セレクションパック（100%パック内UR）
                </SelectItem>
                <SelectItem value="secret">
                  シークレットパック（50%パック内UR）
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* パック内URの種類数 */}
          <div className="space-y-2">
            <Label htmlFor="totalUr">パック内URの種類数</Label>
            <Input
              id="totalUr"
              type="number"
              min={1}
              max={20}
              value={totalUrInPack}
              onChange={(e) => {
                const value = Number(e.target.value)
                setTotalUrInPack(value)
              }}
            />
          </div>

          {/* 欲しいカード */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>欲しいカード</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddCard}
                disabled={wantedCards.length >= totalUrInPack}
              >
                + 追加
              </Button>
            </div>

            {wantedCards.length > 0 ? (
              <div className="space-y-2">
                {wantedCards.map((card, index) => (
                  <div
                    key={card.id}
                    className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-4">
                        {index + 1}.
                      </span>
                      <Input
                        placeholder="カード名を入力"
                        value={card.name}
                        onChange={(e) =>
                          handleUpdateName(card.id, e.target.value)
                        }
                        className="flex-1 bg-background"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveCard(card.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        削除
                      </Button>
                    </div>
                    <div className="flex items-center gap-4 pl-6">
                      <div className="flex items-center gap-2">
                        <Label
                          htmlFor={`count-${card.id}`}
                          className="text-xs text-muted-foreground"
                        >
                          枚数
                        </Label>
                        <Select
                          value={String(card.count)}
                          onValueChange={(value) =>
                            handleUpdateCount(card.id, Number(value))
                          }
                        >
                          <SelectTrigger id={`count-${card.id}`} className="w-20 h-8 bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1枚</SelectItem>
                            <SelectItem value="2">2枚</SelectItem>
                            <SelectItem value="3">3枚</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`craft-${card.id}`}
                          checked={card.disableCraft}
                          onCheckedChange={(checked) =>
                            handleUpdateDisableCraft(card.id, checked === true)
                          }
                        />
                        <Label
                          htmlFor={`craft-${card.id}`}
                          className="text-xs text-muted-foreground cursor-pointer"
                        >
                          生成不可
                        </Label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                「+ 追加」ボタンでカードを追加してください
              </div>
            )}

            {wantedCards.length >= totalUrInPack && (
              <p className="text-sm text-destructive">
                パック内UR数以上のカードは追加できません
              </p>
            )}

            {validCards.length > 0 && (
              <p className="text-sm text-muted-foreground">
                合計: {validCards.length}種類 / {totalWantedCount}枚
              </p>
            )}
          </div>

          {/* 計算ボタン */}
          <Button
            onClick={handleCalculate}
            disabled={isCalculating || validCards.length === 0}
            className="w-full"
            size="lg"
          >
            {isCalculating ? '計算中...' : '計算する'}
          </Button>
        </CardContent>
      </Card>

      {/* 計算結果 */}
      {result && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>計算結果</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <dt className="text-muted-foreground">平均必要連数</dt>
                <dd className="text-xl font-bold">{result.averagePulls}連</dd>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <dt className="text-muted-foreground">中央値</dt>
                <dd className="text-xl font-bold">{result.medianPulls}連</dd>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <dt className="text-muted-foreground">90%タイル</dt>
                <dd className="text-xl font-bold">{result.percentile90}連</dd>
              </div>
              <div className="flex justify-between items-center py-2">
                <dt className="text-muted-foreground">平均UR獲得数</dt>
                <dd className="text-xl font-bold">{result.averageUrPulled}枚</dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-muted-foreground">
              {hasCraftableCards
                ? '※ 生成可能なカードは不要UR(10CP)から生成(30CP)する前提で計算'
                : '※ 全カード生成不可で計算'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* 計算条件 */}
      <Card className="gap-2 py-4">
        <CardHeader>
          <CardTitle className="text-base">計算条件</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>• 不要UR分解: 10CP / UR生成: 30CP</p>

          <div className="space-y-1">
            <p className="font-medium text-foreground">セレクションパック</p>
            <p className="pl-3">• 10連あたりUR期待値: 2.25枚（パック内URのみ）</p>
          </div>

          <div className="space-y-1">
            <p className="font-medium text-foreground">シークレットパック</p>
            <p className="pl-3">• 1-4枚目: 各2.5%でパック外UR</p>
            <p className="pl-3">• 5-8枚目: 各2.5%でパック内UR</p>
            <p className="pl-3">• 10パック目8枚目: 20%でパック内UR</p>
            <p className="pl-3">• 天井: 10連でUR0枚なら次の10連10パック目8枚目が100%</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

const parseAsBoolean = createParser({
  parse: (v: string): boolean => v === 'true',
  serialize: (v: boolean): string => (v ? 'true' : 'false'),
})

function RoyalChallengeCalculator() {
  const [packType, setPackType] = useQueryState(
    'royal_type',
    parseAsStringLiteral(packTypes).withDefault('selection')
  )
  const [totalUrInPack, setTotalUrInPack] = useQueryState(
    'royal_ur',
    parseAsInteger.withDefault(8)
  )
  const [targetCardName, setTargetCardName] = useQueryState(
    'royal_card',
    createParser({
      parse: (v: string): string => v,
      serialize: (v: string): string => v,
    }).withDefault('')
  )
  const [disableCraft, setDisableCraft] = useQueryState(
    'royal_craft',
    parseAsBoolean.withDefault(false)
  )
  const [result, setResult] = useState<{
    data: RoyalChallengeResult
    cardName: string
    disableCraft: boolean
  } | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)

  const handleCalculate = useCallback(() => {
    if (targetCardName.trim() === '') return

    setIsCalculating(true)
    const cardName = targetCardName.trim()
    const craftDisabled = disableCraft

    setTimeout(() => {
      const simulationResult = runRoyalSimulation({
        packType,
        totalUrInPack,
        targetCardName: cardName,
        disableCraft: craftDisabled,
      })
      setResult({
        data: simulationResult,
        cardName,
        disableCraft: craftDisabled,
      })
      setIsCalculating(false)
    }, 0)
  }, [packType, totalUrInPack, targetCardName, disableCraft])

  const formatCost = (cost: number): string => {
    return cost.toLocaleString('ja-JP')
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>ロイチャレ期待値計算</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* パックの種類 */}
          <div className="space-y-2">
            <Label htmlFor="royalPackType">パックの種類</Label>
            <Select
              value={packType}
              onValueChange={(value: PackType) => setPackType(value)}
            >
              <SelectTrigger id="royalPackType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="selection">
                  セレクションパック（100%パック内UR）
                </SelectItem>
                <SelectItem value="secret">
                  シークレットパック（50%パック内UR）
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* パック内URの種類数 */}
          <div className="space-y-2">
            <Label htmlFor="royalTotalUr">パック内URの種類数</Label>
            <Input
              id="royalTotalUr"
              type="number"
              min={1}
              max={20}
              value={totalUrInPack}
              onChange={(e) => {
                const value = Number(e.target.value)
                setTotalUrInPack(value)
              }}
            />
          </div>

          {/* 狙いのカード名 */}
          <div className="space-y-2">
            <Label htmlFor="targetCard">狙いのカード名</Label>
            <Input
              id="targetCard"
              placeholder="カード名を入力"
              value={targetCardName}
              onChange={(e) => setTargetCardName(e.target.value)}
            />
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="royalDisableCraft"
                checked={disableCraft}
                onCheckedChange={(checked) => setDisableCraft(checked === true)}
              />
              <Label
                htmlFor="royalDisableCraft"
                className="text-sm text-muted-foreground cursor-pointer"
              >
                生成不可
              </Label>
            </div>
          </div>

          {/* 計算ボタン */}
          <Button
            onClick={handleCalculate}
            disabled={isCalculating || targetCardName.trim() === ''}
            className="w-full"
            size="lg"
          >
            {isCalculating ? '計算中...' : '計算する'}
          </Button>
        </CardContent>
      </Card>

      {/* 計算結果 */}
      {result && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>計算結果</CardTitle>
            <p className="text-lg font-bold text-primary">
              「{result.cardName}」のロイヤル
              {result.disableCraft && (
                <span className="ml-2 text-sm font-normal text-destructive">
                  （生成不可）
                </span>
              )}
            </p>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <dt className="text-muted-foreground">平均必要連数</dt>
                <dd className="text-xl font-bold">{result.data.averagePulls}連</dd>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <dt className="text-muted-foreground">中央値</dt>
                <dd className="text-xl font-bold">{result.data.medianPulls}連</dd>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <dt className="text-muted-foreground">90%タイル</dt>
                <dd className="text-xl font-bold">{result.data.percentile90}連</dd>
              </div>
              <div className="flex justify-between items-center py-2 border-b bg-muted/30 -mx-3 px-3 rounded">
                <dt className="text-muted-foreground">平均費用</dt>
                <dd className="text-xl font-bold text-primary">
                  ¥{formatCost(result.data.averageCost)}
                </dd>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <dt className="text-muted-foreground">中央値費用</dt>
                <dd className="text-xl font-bold">¥{formatCost(result.data.medianCost)}</dd>
              </div>
              <div className="flex justify-between items-center py-2">
                <dt className="text-muted-foreground">90%タイル費用</dt>
                <dd className="text-xl font-bold">
                  ¥{formatCost(result.data.percentile90Cost)}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}

      {/* 計算条件 */}
      <Card className="gap-2 py-4">
        <CardHeader>
          <CardTitle className="text-base">計算条件</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>• ロイヤル加工確率: 1%</p>
          <p>• 10連あたりのコスト: 2,000円</p>

          <div className="space-y-1">
            <p className="font-medium text-foreground">セレクションパック</p>
            <p className="pl-3">• 10連あたりUR期待値: 2.25枚（パック内URのみ）</p>
          </div>

          <div className="space-y-1">
            <p className="font-medium text-foreground">シークレットパック</p>
            <p className="pl-3">• 5-8枚目のみパック内UR（ロイヤル対象）</p>
            <p className="pl-3">• 1-4枚目はパック外UR（ロイヤル対象外）</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function BakushiCalculator() {
  const [packType, setPackType] = useQueryState(
    'bakushi_type',
    parseAsStringLiteral(packTypes).withDefault('selection')
  )
  const [totalUrInPack, setTotalUrInPack] = useQueryState(
    'bakushi_ur',
    parseAsInteger.withDefault(8)
  )
  const [pulls, setPulls] = useQueryState(
    'bakushi_pulls',
    parseAsInteger.withDefault(100)
  )
  const [targetCount, setTargetCount] = useQueryState(
    'bakushi_target',
    parseAsInteger.withDefault(1)
  )
  const [result, setResult] = useState<BakushiResult | null>(null)

  const handleCalculate = useCallback(() => {
    const bakushiResult = calculateBakushi({
      packType,
      totalUrInPack,
      pulls,
      targetCount,
    })
    setResult(bakushiResult)
  }, [packType, totalUrInPack, pulls, targetCount])

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>爆死確率計算</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* パックの種類 */}
          <div className="space-y-2">
            <Label htmlFor="bakushiPackType">パックの種類</Label>
            <Select
              value={packType}
              onValueChange={(value: PackType) => setPackType(value)}
            >
              <SelectTrigger id="bakushiPackType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="selection">
                  セレクションパック（100%パック内UR）
                </SelectItem>
                <SelectItem value="secret">
                  シークレットパック（50%パック内UR）
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* パック内URの種類数 */}
          <div className="space-y-2">
            <Label htmlFor="bakushiTotalUr">パック内URの種類数</Label>
            <Input
              id="bakushiTotalUr"
              type="number"
              min={1}
              max={20}
              value={totalUrInPack}
              onChange={(e) => setTotalUrInPack(Number(e.target.value))}
            />
          </div>

          {/* 引いた連数 */}
          <div className="space-y-2">
            <Label htmlFor="bakushiPulls">引いた連数</Label>
            <Input
              id="bakushiPulls"
              type="number"
              min={1}
              max={10000}
              value={pulls}
              onChange={(e) => setPulls(Number(e.target.value))}
            />
          </div>

          {/* 目標枚数 */}
          <div className="space-y-2">
            <Label htmlFor="bakushiTarget">目標枚数（素引き）</Label>
            <Select
              value={String(targetCount)}
              onValueChange={(value) => setTargetCount(Number(value))}
            >
              <SelectTrigger id="bakushiTarget">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1枚</SelectItem>
                <SelectItem value="2">2枚</SelectItem>
                <SelectItem value="3">3枚</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              この枚数を素引きできていない確率を計算します
            </p>
          </div>

          {/* 計算ボタン */}
          <Button
            onClick={handleCalculate}
            className="w-full"
            size="lg"
          >
            計算する
          </Button>
        </CardContent>
      </Card>

      {/* 計算結果 */}
      {result && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>計算結果</CardTitle>
            <p className="text-sm text-muted-foreground">
              {pulls}連で{targetCount}枚素引きできていない確率
            </p>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <div className="flex justify-between items-center py-3 border-b bg-muted/30 -mx-3 px-3 rounded">
                <dt className="text-muted-foreground">爆死確率</dt>
                <dd className="text-2xl font-bold text-destructive">
                  {result.probabilityPercent}
                </dd>
              </div>
              <div className="flex justify-between items-center py-2">
                <dt className="text-muted-foreground">
                  {targetCount}枚素引きの期待連数
                </dt>
                <dd className="text-xl font-bold">{result.expectedPulls}連</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}

      {/* 計算条件 */}
      <Card className="gap-2 py-4">
        <CardHeader>
          <CardTitle className="text-base">計算条件</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>• 二項分布による確率計算（生成は考慮しない）</p>

          <div className="space-y-1">
            <p className="font-medium text-foreground">セレクションパック</p>
            <p className="pl-3">• 1連あたり特定UR確率: 22.5% ÷ UR種類数</p>
          </div>

          <div className="space-y-1">
            <p className="font-medium text-foreground">シークレットパック</p>
            <p className="pl-3">• 10連あたりパック内UR期待値: 約1.175枚</p>
            <p className="pl-3">• 1連あたり特定UR確率: 11.75% ÷ UR種類数</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

const tabValues = ['expected-value', 'royal-challenge', 'bakushi'] as const

function App() {
  const [activeTab, setActiveTab] = useQueryState(
    'tab',
    parseAsStringLiteral(tabValues).withDefault('expected-value')
  )

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-2xl">
        <h1 className="mb-6 text-2xl font-bold text-center">
          MD パックシミュレーター
        </h1>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof tabValues[number])}>
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="expected-value" className="flex-1">
              パック期待値
            </TabsTrigger>
            <TabsTrigger value="royal-challenge" className="flex-1">
              ロイチャレ
            </TabsTrigger>
            <TabsTrigger value="bakushi" className="flex-1">
              爆死確率
            </TabsTrigger>
          </TabsList>
          <TabsContent value="expected-value">
            <PackExpectedValueCalculator />
          </TabsContent>
          <TabsContent value="royal-challenge">
            <RoyalChallengeCalculator />
          </TabsContent>
          <TabsContent value="bakushi">
            <BakushiCalculator />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default App
