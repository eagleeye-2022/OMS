import { cn } from '@/lib/utils'

interface Step {
  label: string
  done: boolean
  active: boolean
}

interface StepperProps {
  steps: Step[]
}

export function Stepper({ steps }: StepperProps) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors',
                step.done
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : step.active
                  ? 'border-blue-600 text-blue-600 bg-white'
                  : 'border-gray-300 text-gray-400 bg-white'
              )}
            >
              {step.done ? (
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span className={cn('text-xs mt-1 text-center w-16 leading-tight', step.active ? 'text-blue-600 font-medium' : step.done ? 'text-gray-600' : 'text-gray-400')}>
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={cn('h-0.5 w-8 mb-4 mx-1', step.done ? 'bg-blue-600' : 'bg-gray-200')} />
          )}
        </div>
      ))}
    </div>
  )
}
