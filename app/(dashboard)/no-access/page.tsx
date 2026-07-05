import { ShieldOff } from 'lucide-react'

export default function NoAccessPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6">
      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <ShieldOff size={24} className="text-gray-400" />
      </div>
      <h1 className="text-lg font-semibold text-gray-900">No modules assigned</h1>
      <p className="text-sm text-gray-500 mt-1 max-w-sm">
        Your account doesn&apos;t currently have access to any part of this system. Contact your administrator if you believe this is a mistake.
      </p>
    </div>
  )
}
