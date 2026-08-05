import { useState, type ComponentProps } from 'react'
import { Input } from '@/components/ui/input'

type NumberInputProps = Omit<
  ComponentProps<typeof Input>,
  'type' | 'value' | 'onChange'
> & {
  value: number
  onValueChange: (value: number) => void
}

function NumberInput({
  value,
  onValueChange,
  onBlur,
  ...props
}: NumberInputProps) {
  const [draftValue, setDraftValue] = useState<string | null>(null)
  const displayedValue = draftValue ?? String(value)

  return (
    <Input
      {...props}
      type="number"
      value={displayedValue}
      onChange={(event) => {
        const nextValue = event.target.value
        setDraftValue(nextValue)

        if (nextValue === '') return

        const parsedValue = event.target.valueAsNumber
        if (Number.isFinite(parsedValue)) {
          onValueChange(parsedValue)
        }
      }}
      onBlur={(event) => {
        setDraftValue(null)
        onBlur?.(event)
      }}
    />
  )
}

export { NumberInput }
