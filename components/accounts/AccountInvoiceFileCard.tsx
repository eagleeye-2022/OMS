'use client'

import { FileText, Download, Eye, Upload } from 'lucide-react'
import { formatDate, formatFileSize } from '@/lib/utils'
import type { IOrder } from '@/types'

interface AccountInvoiceFileCardProps {
  order: IOrder
  onUpload: () => void
  onPreview: () => void
}

export function AccountInvoiceFileCard({ order, onUpload, onPreview }: AccountInvoiceFileCardProps) {
  const invoice = order.invoice

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Invoice File</h3>
        <button onClick={onUpload} className="text-xs font-medium text-blue-600 hover:underline flex items-center gap-1">
          <Upload size={12} /> {invoice?.fileUrl ? 'Replace' : 'Upload Invoice'}
        </button>
      </div>

      {invoice?.fileUrl ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center text-red-500">
              <FileText size={16} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{invoice.fileName || `${invoice.invoiceNumber}.pdf`}</p>
              <p className="text-xs text-gray-400">
                Uploaded {formatDate(invoice.uploadedAt)}{invoice.fileSize ? ` · ${formatFileSize(invoice.fileSize)}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href={invoice.fileUrl} download className="text-gray-400 hover:text-gray-600" title="Download">
              <Download size={15} />
            </a>
            <button onClick={onPreview} className="text-gray-400 hover:text-gray-600" title="View Preview">
              <Eye size={15} />
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-400">No invoice uploaded yet.</p>
      )}

      {invoice?.fileUrl && (
        <button onClick={onPreview} className="text-xs text-blue-600 hover:underline mt-3">View Preview</button>
      )}
    </div>
  )
}
