import type { UseFormRegisterReturn } from 'react-hook-form'

/** ₹-prefixed number input — shared by CreateOrderModal and the client wizard's Order Preferences step (both create real Order money fields). */
export function CurrencyField({ label, required, error, registration }: { label: string; required?: boolean; error?: string; registration: UseFormRegisterReturn }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">{label}{required && ' *'}</label>
      <div className="relative mt-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
        <input
          type="number" min={0} step="0.01"
          className="w-full pl-7 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          {...registration}
        />
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}
