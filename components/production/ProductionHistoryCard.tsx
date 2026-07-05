'use client'

import { CreativeRevisionLogCard } from '@/components/creative/CreativeRevisionLogCard'
import type { RevisionEntry } from '@/types'

interface ProductionHistoryCardProps {
  revisionHistory: RevisionEntry[]
}

/** Reuses the same revision-log rendering already built for Creative Queue — same underlying `revisionHistory` data. */
export function ProductionHistoryCard({ revisionHistory }: ProductionHistoryCardProps) {
  return <CreativeRevisionLogCard revisionHistory={revisionHistory} />
}
