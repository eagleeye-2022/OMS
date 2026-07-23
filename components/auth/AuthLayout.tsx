import Image from 'next/image'
import Link from 'next/link'
import { Package } from 'lucide-react'
import imgLogin from '@/app/img-login.png'

interface AuthLayoutProps {
  title?: string
  subtitle?: string
  children: React.ReactNode
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="p-6 lg:p-8">
        <Link href="/login" className="inline-flex items-center gap-2">
          <div className="flex items-center justify-center w-9 h-9 bg-red-500 rounded-lg shrink-0">
            <Package size={18} className="text-white" />
          </div>
          <span className="font-bold text-gray-900">Bloopers x merchtalk</span>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 pb-12 lg:px-16">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-12 items-center">
          <div className="w-full max-w-md mx-auto lg:mx-0">
            {title && (
              <>
                <p className="text-sm text-gray-500 mb-1">
                  Welcome to <span className="text-blue-600 font-semibold">Bloopers x merchtalk</span>
                </p>
                <h1 className="text-3xl font-bold text-gray-900 mb-6">{title}</h1>
              </>
            )}
            {subtitle && <p className="text-sm text-gray-500 -mt-4 mb-6">{subtitle}</p>}
            {children}
          </div>

          <div className="hidden lg:flex items-center justify-center">
            <Image
              src={imgLogin}
              alt=""
              priority
              className="w-full max-w-lg h-auto object-contain"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
