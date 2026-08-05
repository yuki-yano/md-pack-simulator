import { parseAsInteger, parseAsStringLiteral, useQueryState } from 'nuqs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { NumberInput } from '@/components/ui/number-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  calculateSpecialPackValue,
  SPECIAL_PACK_PULL_OPTIONS,
  STANDARD_UR_EXPECTED_PER_TEN_PULLS,
  UR_GUARANTEE_EXPECTED_BONUS,
  type SpecialPackPullCount,
} from '@/lib/special-pack'

const specialPackPullValues = ['10', '20', '30'] as const

function formatGems(value: number): string {
  return Math.round(value).toLocaleString('ja-JP')
}

function formatExpectedValue(value: number): string {
  return value.toLocaleString('ja-JP', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
}

export function SpecialPackCalculator() {
  const [pullValue, setPullValue] = useQueryState(
    'special_pulls',
    parseAsStringLiteral(specialPackPullValues).withDefault('20')
  )
  const [gemCost, setGemCost] = useQueryState(
    'special_gems',
    parseAsInteger.withDefault(3000)
  )
  const [guaranteedUrCountState, setGuaranteedUrCount] = useQueryState(
    'special_ur_count',
    parseAsInteger.withDefault(2)
  )

  const pulls = Number(pullValue) as SpecialPackPullCount
  const tenPullCount = pulls / 10
  const guaranteedUrCount = Math.min(
    Math.max(0, guaranteedUrCountState),
    tenPullCount
  )
  const result = calculateSpecialPackValue({
    pulls,
    gemCost,
    guaranteedUrCount,
  })
  const isGemCostValid = Number.isInteger(gemCost) && gemCost > 0

  const handlePullsChange = (nextValue: string) => {
    const nextTenPullCount = Number(nextValue) / 10

    void setPullValue(nextValue as typeof pullValue)
    if (guaranteedUrCount > nextTenPullCount) {
      void setGuaranteedUrCount(nextTenPullCount)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>特設パック期待値</CardTitle>
          <p className="text-sm leading-relaxed text-muted-foreground">
            カード部分を通常パックに換算し、残りをアクセサリの実質価格として計算します。
          </p>
        </CardHeader>
        <CardContent className="space-y-5 pt-2">
          <div className="space-y-2">
            <Label htmlFor="specialPackPulls">提供される連数</Label>
            <Select value={pullValue} onValueChange={handlePullsChange}>
              <SelectTrigger id="specialPackPulls" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SPECIAL_PACK_PULL_OPTIONS.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}連
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialPackGemCost">販売価格</Label>
            <div className="relative">
              <NumberInput
                id="specialPackGemCost"
                min={1}
                step={1}
                inputMode="numeric"
                value={gemCost}
                aria-invalid={!isGemCostValid}
                onValueChange={(value) => void setGemCost(value)}
                className="h-11 pr-16 text-base"
              />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                ジェム
              </span>
            </div>
            {!isGemCostValid ? (
              <p className="text-sm text-destructive">1以上の整数を入力してください。</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialPackGuaranteedUr">UR確定枚数</Label>
            <Select
              value={String(guaranteedUrCount)}
              onValueChange={(value) => void setGuaranteedUrCount(Number(value))}
            >
              <SelectTrigger id="specialPackGuaranteedUr" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: tenPullCount + 1 }, (_, count) => (
                  <SelectItem key={count} value={String(count)}>
                    {count}枚
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs leading-relaxed text-muted-foreground">
              UR確定1枚につき、10連最後の「SR以上確定」1枠が「UR確定」に変わる前提です。
            </p>
          </div>
        </CardContent>
      </Card>

      {isGemCostValid ? (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>計算結果</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="space-y-3">
              <div className="flex items-center justify-between gap-4 border-b py-2">
                <dt className="text-muted-foreground">通常パック換算</dt>
                <dd className="text-xl font-bold tabular-nums">
                  {formatExpectedValue(result.equivalentPulls)}連
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-b py-2">
                <dt className="text-muted-foreground">カード部分の価値</dt>
                <dd className="text-xl font-bold tabular-nums">
                  約 {formatGems(result.cardGemValue)} ジェム
                </dd>
              </div>
              <div className="-mx-3 flex items-center justify-between gap-4 rounded bg-muted/30 px-3 py-3">
                <dt className="text-muted-foreground">アクセサリの実質価格</dt>
                <dd
                  className={`text-xl font-bold tabular-nums ${
                    result.isWorseValueThanStandardPacks ? 'text-primary' : 'text-destructive'
                  }`}
                >
                  約 {formatGems(result.accessoryGemCost)} ジェム
                </dd>
              </div>
            </dl>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span>支払額 {gemCost.toLocaleString('ja-JP')}</span>
              <span aria-hidden="true">−</span>
              <span>カード価値 {formatGems(result.cardGemValue)}</span>
              <span aria-hidden="true">＝</span>
              <span>アクセサリ価格 {formatGems(result.accessoryGemCost)} ジェム</span>
            </div>

            {!result.isWorseValueThanStandardPacks ? (
              <div className="rounded-lg bg-destructive/5 p-3 text-sm leading-relaxed text-destructive">
                <p>
                  カード価値が販売価格以上のため、「通常10連よりコスパが悪い」という前提に当てはまりません。販売価格を
                  {Math.floor(result.cardGemValue) + 1}ジェム以上にしてください。
                </p>
              </div>
            ) : null}

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-muted/50 p-3">
                <dt className="text-xs text-muted-foreground">特設パックのUR期待値</dt>
                <dd className="mt-1 font-bold tabular-nums">
                  {result.expectedUrCount.toFixed(3)}枚
                </dd>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <dt className="text-xs text-muted-foreground">UR確定の上乗せ</dt>
                <dd className="mt-1 font-bold tabular-nums">
                  +{(result.guaranteedUrCount * UR_GUARANTEE_EXPECTED_BONUS).toFixed(1)}枚
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      ) : null}

      <Card className="gap-2 py-4">
        <CardHeader>
          <CardTitle className="text-base">計算条件</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>• 通常10連: 1,000ジェム</p>
          <p>• 通常10連のUR期待値: {STANDARD_UR_EXPECTED_PER_TEN_PULLS.toFixed(3)}枚</p>
          <p>• UR確定枠1つの上乗せ: +{UR_GUARANTEE_EXPECTED_BONUS.toFixed(1)}枚</p>
          <p>• 次回10連のUR確定（天井）は含めない</p>
        </CardContent>
      </Card>
    </div>
  )
}
