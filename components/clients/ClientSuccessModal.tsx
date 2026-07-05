'use client'

import { CheckCircle2, X } from 'lucide-react'

interface ClientSuccessModalProps {
  open: boolean
  clientName: string
  onClose: () => void
  onReturnToList: () => void
}

export function ClientSuccessModal({ open, clientName, onClose, onReturnToList }: ClientSuccessModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X size={18} />
        </button>
        <div className="w-14 h-14 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 size={28} className="text-green-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Client Added Successfully!</h2>
        <p className="text-sm text-gray-500 mb-4">
          <span className="italic">{clientName}</span> has been added to your client list. You can now manage their orders and documents from the client dashboard.
        </p>
        <button onClick={onReturnToList} className="text-sm font-medium text-red-600 hover:underline">
          Return to client list
        </button>
      </div>
    </div>
  )
}
