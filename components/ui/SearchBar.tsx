'use client'

import { Search } from 'lucide-react'
import { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface SearchBarProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string
}

export function SearchBar({ className, ...props }: SearchBarProps) {
  return (
    <div className={cn('relative', className)}>
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        {...props}
        className={cn(
          'w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
        )}
      />
    </div>
  )
}
