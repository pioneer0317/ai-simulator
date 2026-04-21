import { Check } from 'lucide-react';

interface Step {
  label: string;
  path: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
}

export function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <div className="bg-white border-b-2 border-gray-200 px-8 py-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            const isLast = index === steps.length - 1;

            return (
              <div key={step.path} className="flex items-center flex-1">
                {/* Step Circle */}
                <div className="flex flex-col items-center">
                  <div
                    className={`
                      w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg border-4 transition-all
                      ${
                        isCompleted
                          ? 'bg-green-500 border-green-500 text-white'
                          : isActive
                          ? 'bg-blue-600 border-blue-600 text-white scale-110'
                          : 'bg-white border-gray-300 text-gray-400'
                      }
                    `}
                  >
                    {isCompleted ? <Check className="h-6 w-6" /> : index + 1}
                  </div>
                  <div className="mt-2 text-center">
                    <p
                      className={`
                        text-sm font-semibold
                        ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'}
                      `}
                    >
                      {step.label}
                    </p>
                  </div>
                </div>

                {/* Connector Line */}
                {!isLast && (
                  <div
                    className={`
                      flex-1 h-1 mx-4 rounded transition-all
                      ${isCompleted ? 'bg-green-500' : 'bg-gray-300'}
                    `}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
