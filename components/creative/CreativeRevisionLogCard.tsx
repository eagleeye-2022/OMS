'use client'

import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { RevisionEntry } from '@/types'

interface CreativeRevisionLogCardProps {
  revisionHistory: RevisionEntry[]
}

export function CreativeRevisionLogCard({ revisionHistory }: CreativeRevisionLogCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Revision Log</h3>
      {revisionHistory.length === 0 ? (
        <p className="text-sm text-gray-400">No revisions recorded yet.</p>
      ) : (
        <div className="relative pl-5">
          <div className="absolute left-[5px] top-1.5 bottom-1.5 w-px bg-gray-200" />
          {revisionHistory.map((entry, i) => {
            const isActive = i === revisionHistory.length - 1
            return (
              <div key={i} className="relative pb-4 last:pb-0">
                <span className={cn('absolute -left-5 top-1 w-2.5 h-2.5 rounded-full', isActive ? 'bg-green-500' : 'bg-gray-300')} />
                <div className="flex items-center justify-between gap-2">
                  <p className={cn('text-sm font-semibold', isActive ? 'text-gray-900' : 'text-gray-500')}>
                    Revision v{i + 1}{isActive && ' (Active)'}
                  </p>
                  <span className="text-xs text-gray-400 shrink-0">{formatDate(entry.at)}</span>
                </div>
                <p className={cn('text-sm mt-0.5', isActive ? 'text-gray-700' : 'text-gray-400 italic')}>{entry.note}</p>
                <p className="text-xs text-gray-400 mt-0.5">by {entry.by}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
