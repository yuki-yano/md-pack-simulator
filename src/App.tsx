import { useState, useCallback } from 'react'
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
import { runSimulation } from '@/lib/simulator'
import type { PackType, SimulationResult, WantedCard } from '@/lib/types'

function PackExpectedValueCalculator() {
  const [packType, setPackType] = useState<PackType>('selection')
  const [totalUrInPack, setTotalUrInPack] = useState(8)
  const [wantedCards, setWantedCards] = useState<WantedCard[]>([])
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
  }, [wantedCards.length, totalUrInPack])

  const handleRemoveCard = useCallback((id: string) => {
    setWantedCards((prev) => prev.filter((card) => card.id !== id))
  }, [])

  const handleUpdateName = useCallback((id: string, name: string) => {
    setWantedCards((prev) =>
      prev.map((card) => (card.id === id ? { ...card, name } : card))
    )
  }, [])

  const handleUpdateCount = useCallback((id: string, count: number) => {
    setWantedCards((prev) =>
      prev.map((card) => (card.id === id ? { ...card, count } : card))
    )
  }, [])

  const handleUpdateDisableCraft = useCallback(
    (id: string, disableCraft: boolean) => {
      setWantedCards((prev) =>
        prev.map((card) => (card.id === id ? { ...card, disableCraft } : card))
      )
    },
    []
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
                if (wantedCards.length > value) {
                  setWantedCards((prev) => prev.slice(0, value))
                }
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

function App() {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-2xl">
        <h1 className="mb-6 text-2xl font-bold text-center">
          MD パックシミュレーター
        </h1>
        <Tabs defaultValue="expected-value">
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="expected-value" className="flex-1">
              パック期待値計算
            </TabsTrigger>
          </TabsList>
          <TabsContent value="expected-value">
            <PackExpectedValueCalculator />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default App
