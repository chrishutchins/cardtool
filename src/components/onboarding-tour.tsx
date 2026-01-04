"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { createPortal } from "react-dom";

interface OnboardingStep {
  target: string; // data-onboarding attribute value
  title: string;
  message: string;
  position: "bottom" | "top" | "left" | "right";
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    target: "add-card",
    title: "Add Your Cards",
    message: "Start by adding the credit cards you have in your wallet to track your rewards.",
    position: "bottom",
  },
  {
    target: "earnings",
    title: "View Your Earnings",
    message: "See an analysis of the total points and/or cash back you can expect from your cards, including recommendations for what categories to spend on.",
    position: "bottom",
  },
  {
    target: "compare",
    title: "Compare Cards",
    message: "Browse different spending categories to see which cards offer the best return on your spending.",
    position: "bottom",
  },
  {
    target: "credits",
    title: "Track Your Credits",
    message: "Never let a card credit go to waste. Track monthly Uber credits, airline fee credits, and more to maximize the value you get from your cards.",
    position: "bottom",
  },
  {
    target: "spending",
    title: "Edit Spending",
    message: "Edit the default spending assumptions that drive the Earnings tab calculations.",
    position: "bottom",
  },
  {
    target: "point-values",
    title: "Point Valuations",
    message: "Change the assumptions for how much points are worth to customize your earnings calculations.",
    position: "bottom",
  },
  {
    target: "settings",
    title: "Card Settings",
    message: "After adding cards to your wallet, you can edit card and bank-specific settings here.",
    position: "bottom",
  },
];

interface OnboardingCalloutProps {
  step: OnboardingStep;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  targetRect: DOMRect | null;
}

function OnboardingCallout({
  step,
  currentStep,
  totalSteps,
  onNext,
  targetRect,
}: OnboardingCalloutProps) {
  if (!targetRect) return null;

  // Calculate position based on target element and desired position
  const getPosition = () => {
    const padding = 12;
    const calloutWidth = 320;
    const calloutHeight = 180; // Approximate height

    switch (step.position) {
      case "bottom":
        return {
          top: targetRect.bottom + padding,
          left: Math.max(
            16,
            Math.min(
              targetRect.left + targetRect.width / 2 - calloutWidth / 2,
              window.innerWidth - calloutWidth - 16
            )
          ),
        };
      case "top":
        return {
          top: targetRect.top - calloutHeight - padding,
          left: Math.max(
            16,
            Math.min(
              targetRect.left + targetRect.width / 2 - calloutWidth / 2,
              window.innerWidth - calloutWidth - 16
            )
          ),
        };
      case "left":
        return {
          top: targetRect.top + targetRect.height / 2 - calloutHeight / 2,
          left: targetRect.left - calloutWidth - padding,
        };
      case "right":
        return {
          top: targetRect.top + targetRect.height / 2 - calloutHeight / 2,
          left: targetRect.right + padding,
        };
      default:
        return { top: targetRect.bottom + padding, left: targetRect.left };
    }
  };

  const position = getPosition();

  // Calculate arrow position
  const getArrowStyles = (): React.CSSProperties => {
    const arrowSize = 8;
    switch (step.position) {
      case "bottom":
        return {
          position: "absolute" as const,
          top: -arrowSize,
          left: Math.min(
            Math.max(
              targetRect.left + targetRect.width / 2 - position.left - arrowSize,
              16
            ),
            320 - 32
          ),
          width: 0,
          height: 0,
          borderLeft: `${arrowSize}px solid transparent`,
          borderRight: `${arrowSize}px solid transparent`,
          borderBottom: `${arrowSize}px solid rgb(59 130 246)`,
        };
      case "top":
        return {
          position: "absolute" as const,
          bottom: -arrowSize,
          left: "50%",
          transform: "translateX(-50%)",
          width: 0,
          height: 0,
          borderLeft: `${arrowSize}px solid transparent`,
          borderRight: `${arrowSize}px solid transparent`,
          borderTop: `${arrowSize}px solid rgb(39 39 42)`,
        };
      default:
        return {};
    }
  };

  return (
    <div
      className="fixed z-[60] w-80 rounded-xl border border-blue-500/50 bg-zinc-900 shadow-2xl shadow-blue-500/20"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      {/* Arrow */}
      <div style={getArrowStyles()} />

      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 rounded-t-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">{step.title}</h3>
          <span className="text-xs text-blue-200">
            {currentStep} of {totalSteps}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        <p className="text-sm text-zinc-300 leading-relaxed">{step.message}</p>
      </div>

      {/* Footer */}
      <div className="px-4 pb-4 flex justify-between items-center">
        {/* Progress dots */}
        <div className="flex gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i < currentStep ? "bg-blue-500" : "bg-zinc-700"
              }`}
            />
          ))}
        </div>

        <button
          onClick={onNext}
          className="px-4 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          {currentStep === totalSteps ? "Get Started" : "Next"}
        </button>
      </div>
    </div>
  );
}

interface OnboardingTourProps {
  onComplete: () => Promise<void>;
}

export function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();

  const step = ONBOARDING_STEPS[currentStep];
  
  // Debug logging
  console.log("[Onboarding] Step:", currentStep, "Target:", step?.target, "Mounted:", mounted, "TargetRect:", targetRect);

  // Find and highlight target element
  const updateTargetRect = useCallback(() => {
    if (!step) return;
    const target = document.querySelector(`[data-onboarding="${step.target}"]`);
    if (target) {
      setTargetRect(target.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [step]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Reset targetRect when step changes to avoid stale positioning
    setTargetRect(null);
    
    // Initial attempt
    updateTargetRect();
    
    // Retry a few times in case element isn't mounted yet
    const retryTimeouts = [50, 150, 300].map((delay) =>
      setTimeout(updateTargetRect, delay)
    );

    // Update on scroll/resize
    window.addEventListener("scroll", updateTargetRect, true);
    window.addEventListener("resize", updateTargetRect);

    return () => {
      retryTimeouts.forEach(clearTimeout);
      window.removeEventListener("scroll", updateTargetRect, true);
      window.removeEventListener("resize", updateTargetRect);
    };
  }, [updateTargetRect]);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Complete the tour
      startTransition(async () => {
        await onComplete();
      });
    }
  };

  // Don't render anything if not ready or if target element not found
  // This prevents a dark backdrop from blocking the UI when elements are missing
  if (!mounted || !step || isPending || !targetRect) return null;

  return createPortal(
    <>
      {/* Backdrop overlay */}
      <div className="fixed inset-0 z-50 bg-black/60 transition-opacity" />

      {/* Spotlight on target element */}
      <div
        className="fixed z-50 rounded-lg ring-4 ring-blue-500 ring-offset-2 ring-offset-zinc-950 pointer-events-none transition-all duration-300"
        style={{
          top: targetRect.top - 4,
          left: targetRect.left - 4,
          width: targetRect.width + 8,
          height: targetRect.height + 8,
          boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.6)",
        }}
      />

      {/* Callout */}
      <OnboardingCallout
        step={step}
        currentStep={currentStep + 1}
        totalSteps={ONBOARDING_STEPS.length}
        onNext={handleNext}
        targetRect={targetRect}
      />
    </>,
    document.body
  );
}

