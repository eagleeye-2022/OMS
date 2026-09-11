import { Badge } from '@/components/ui/Badge'
import { LEAD_STATUS_LABEL, LEAD_STATUS_COLOR, type LeadStatus } from '@/lib/constants'

export function LeadStatusBadge({ status, dot }: { status: LeadStatus; dot?: boolean }) {
  return <Badge label={LEAD_STATUS_LABEL[status]} className={LEAD_STATUS_COLOR[status]} dot={dot} />
}
