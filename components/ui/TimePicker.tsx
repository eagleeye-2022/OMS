'use client'

import { cn } from '@/lib/utils'

interface TimePickerProps {
  label?: string
  value: string // 24-hour "HH:mm"
  onChange: (value: string) => void
  className?: string
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1) // 1-12
const MINUTES = Array.from({ length: 60 }, (_, i) => i) // 0-59

function parseValue(value: string): { hour12: number; minute: number; period: 'AM' | 'PM' } {
  const [hStr, mStr] = value.split(':')
  const h24 = Number(hStr) || 0
  const minute = Number(mStr) || 0
  const period: 'AM' | 'PM' = h24 >= 12 ? 'PM' : 'AM'
  let hour12 = h24 % 12
  if (hour12 === 0) hour12 = 12
  return { hour12, minute, period }
}

function toValue(hour12: number, minute: number, period: 'AM' | 'PM'): string {
  let h24 = hour12 % 12
  if (period === 'PM') h24 += 12
  return `${String(h24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export function TimePicker({ label, value, onChange, className }: TimePickerProps) {
  const { hour12, minute, period } = parseValue(value)

  const selectClass =
    'px-2 py-2 text-sm border rounded-md bg-white text-gray-900 border-gray-300 ' +
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <div className="flex gap-2">
        <select
          className={selectClass}
          value={hour12}
          onChange={(e) => onChange(toValue(Number(e.target.value), minute, period))}
        >
          {HOURS.map((h) => (
            <option key={h} value={h}>{String(h).padStart(2, '0')}</option>
          ))}
        </select>
        <select
          className={selectClass}
          value={minute}
          onChange={(e) => onChange(toValue(hour12, Number(e.target.value), period))}
        >
          {MINUTES.map((m) => (
            <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
          ))}
        </select>
        <select
          className={selectClass}
          value={period}
          onChange={(e) => onChange(toValue(hour12, minute, e.target.value as 'AM' | 'PM'))}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  )
}
