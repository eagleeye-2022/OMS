'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LEAD_STATUS_VALUES, LEAD_STATUS_LABEL, LEAD_STATUS_COLOR, type LeadStatus } from '@/lib/constants'

interface LeadStatusDropdownProps {
  status: LeadStatus
  onChange: (status: LeadStatus) => void
  disabled?: boolean
}

export function LeadStatusDropdown({ status, onChange, disabled }: LeadStatusDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-opacity',
          LEAD_STATUS_COLOR[status],
          disabled ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-80'
        )}
      >
        {LEAD_STATUS_LABEL[status]}
        {!disabled && <ChevronDown size={14} />}
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 w-52 bg-white rounded-lg border border-gray-200 shadow-lg py-1">
          {LEAD_STATUS_VALUES.map((s) => (
            <button
              key={s}
              onClick={() => { onChange(s); setOpen(false) }}
              className={cn(
                'w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2',
                s === status && 'font-semibold'
              )}
            >
              <span className={cn('w-2 h-2 rounded-full', LEAD_STATUS_COLOR[s].split(' ')[0].replace('100', '500'))} />
              {LEAD_STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
