'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

export interface DateRange {
  start: string | null
  end: string | null
}

interface DateRangeModalProps {
  open: boolean
  onClose: () => void
  onApply: (range: DateRange) => void
  initialRange: DateRange
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function toKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function buildMonthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1)
  const startOffset = first.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (Date | null)[] = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  return cells
}

function MonthGrid({
  year, month, start, end, onPick, onPrev, onNext, showPrev, showNext,
}: {
  year: number; month: number; start: string | null; end: string | null
  onPick: (key: string) => void; onPrev?: () => void; onNext?: () => void
  showPrev: boolean; showNext: boolean
}) {
  const cells = buildMonthGrid(year, month)
  const label = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="flex-1">
      <div className="flex items-center justify-between mb-3">
        {showPrev ? (
          <button onClick={onPrev} className="text-gray-400 hover:text-gray-700"><ChevronLeft size={16} /></button>
        ) : <span className="w-4" />}
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        {showNext ? (
          <button onClick={onNext} className="text-gray-400 hover:text-gray-700"><ChevronRight size={16} /></button>
        ) : <span className="w-4" />}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w) => (
          <span key={w} className="text-xs text-gray-400 font-medium py-1">{w}</span>
        ))}
        {cells.map((d, i) => {
          if (!d) return <span key={i} />
          const key = toKey(d)
          const inRange = start && end && key >= start && key <= end
          const isEdge = key === start || key === end
          return (
            <button
              key={i}
              onClick={() => onPick(key)}
              className={cn(
                'text-xs py-1.5 rounded-full transition-colors',
                isEdge ? 'bg-blue-600 text-white font-semibold' : inRange ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              {d.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function DateRangeModal({ open, onClose, onApply, initialRange }: DateRangeModalProps) {
  const [mode, setMode] = useState<'all' | 'custom'>(initialRange.start ? 'custom' : 'all')
  const [start, setStart] = useState<string | null>(initialRange.start)
  const [end, setEnd] = useState<string | null>(initialRange.end)
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())

  const handlePick = (key: string) => {
    if (!start || (start && end)) {
      setStart(key)
      setEnd(null)
    } else if (key < start) {
      setStart(key)
    } else {
      setEnd(key)
    }
  }

  const goPrev = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1) } else setViewMonth((m) => m - 1)
  }
  const goNext = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1) } else setViewMonth((m) => m + 1)
  }

  const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1
  const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear

  return (
    <Modal open={open} onClose={onClose} size="xl">
      <div className="flex flex-col gap-4">
        <label className={cn('flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer', mode === 'all' ? 'bg-indigo-50' : 'hover:bg-gray-50')}>
          <input type="radio" checked={mode === 'all'} onChange={() => setMode('all')} className="accent-blue-600" />
          <span className="text-sm font-medium text-gray-900">All</span>
        </label>
        <label className={cn('flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer', mode === 'custom' ? 'bg-indigo-50' : 'hover:bg-gray-50')}>
          <input type="radio" checked={mode === 'custom'} onChange={() => setMode('custom')} className="accent-blue-600" />
          <span className="text-sm font-medium text-gray-900">Custom Range</span>
        </label>

        {mode === 'custom' && (
          <>
            <div className="flex items-center gap-3">
              <div className="flex-1 border border-gray-200 rounded-lg px-3 py-2">
                <p className="text-[10px] font-semibold text-gray-400 uppercase">Start Date</p>
                <div className="flex items-center gap-2 text-sm text-gray-800">
                  <CalendarIcon size={14} className="text-blue-500" />
                  {start || 'Select date'}
                </div>
              </div>
              <span className="text-gray-400">→</span>
              <div className="flex-1 border border-gray-200 rounded-lg px-3 py-2">
                <p className="text-[10px] font-semibold text-gray-400 uppercase">End Date</p>
                <div className="flex items-center gap-2 text-sm text-gray-800">
                  <CalendarIcon size={14} className="text-blue-500" />
                  {end || 'Select date'}
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-6">
              <MonthGrid year={viewYear} month={viewMonth} start={start} end={end} onPick={handlePick} onPrev={goPrev} showPrev showNext={false} />
              <MonthGrid year={nextYear} month={nextMonth} start={start} end={end} onPick={handlePick} onNext={goNext} showPrev={false} showNext />
            </div>
          </>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <button
            className="text-sm text-gray-400 hover:text-gray-600 disabled:opacity-40"
            disabled={!start && !end}
            onClick={() => { setStart(null); setEnd(null) }}
          >
            Clear Dates
          </button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => { onApply(mode === 'all' ? { start: null, end: null } : { start, end }); onClose() }}>
              Apply Range
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
