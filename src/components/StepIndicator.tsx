import { Check } from "lucide-react";

export interface Step {
  id: number;
  label: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
}

export default function StepIndicator({
  steps,
  currentStep,
}: StepIndicatorProps) {
  const progress = ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <div className="w-full">
      {/* Progress bar */}
      <div className="relative mb-6">
        <div className="h-1 w-full rounded-full bg-[#E0DDD5]">
          <div
            className="step-bar h-1 rounded-full bg-[#2A6558]"
            style={{ width: `${progress}%` }}
          />
        </div>
        {/* Step dots */}
        <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-between">
          {steps.map((step) => {
            const done = step.id < currentStep;
            const active = step.id === currentStep;
            return (
              <div
                key={step.id}
                className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                  done
                    ? "border-[#2A6558] bg-[#2A6558]"
                    : active
                    ? "border-[#2A6558] bg-white scale-110 shadow-lg shadow-[#2A6558]/20"
                    : "border-[#E0DDD5] bg-white"
                }`}
              >
                {done ? (
                  <Check size={12} className="text-white" strokeWidth={3} />
                ) : (
                  <span
                    className={`text-[10px] font-bold ${
                      active ? "text-[#2A6558]" : "text-[#7C7671]"
                    }`}
                  >
                    {step.id}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step labels */}
      <div className="flex justify-between">
        {steps.map((step) => {
          const done = step.id < currentStep;
          const active = step.id === currentStep;
          return (
            <span
              key={step.id}
              className={`text-[11px] font-medium leading-tight text-center max-w-[60px] transition-colors ${
                active
                  ? "text-[#2A6558]"
                  : done
                  ? "text-[#1A1817]"
                  : "text-[#7C7671]"
              }`}
            >
              {step.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
