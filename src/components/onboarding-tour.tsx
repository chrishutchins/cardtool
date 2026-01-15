"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { createPortal } from "react-dom";

interface OnboardingStep {
  target: string; // data-onboarding attribute value
  title: string;
  message: string;
  position: "bottom" | "top" | "left" | "right";
  parentDropdown?: string; // The dropdown that contains this target (for desktop)
}

// Map of targets to their parent dropdowns (for desktop navigation)
const DROPDOWN_PARENTS: Record<string, string> = {
  // Cards group
  "wallet": "cards-menu",
  "compare": "cards-menu",
  "credits": "cards-menu",
  "offers": "cards-menu",
  // Rewards group
  "balances": "rewards-menu",
  "inventory": "rewards-menu",
  "transfer-partners": "rewards-menu",
  // Planning group
  "spend-optimizer": "planning-menu",
  "application-rules": "planning-menu",
  "credit-report": "planning-menu",
  // Settings group
  "point-values": "settings-menu",
  "spending": "settings-menu",
  "settings": "settings-menu",
};

const ONBOARDING_STEPS: OnboardingStep[] = [
  // Cards group
  {
    target: "wallet",
    title: "Your Wallet",
    message: "Start by adding the credit cards you have to your wallet. This is where you'll manage all your cards and track their rewards.",
    position: "bottom",
    parentDropdown: "cards-menu",
  },
  {
    target: "compare",
    title: "Compare Cards",
    message: "Browse different spending categories to see which cards offer the best return on your spending.",
    position: "bottom",
    parentDropdown: "cards-menu",
  },
  {
    target: "credits",
    title: "Track Your Credits",
    message: "Never let a card credit go to waste. Track monthly Uber credits, airline fee credits, and more to maximize the value you get from your cards.",
    position: "bottom",
    parentDropdown: "cards-menu",
  },
  // Rewards group
  {
    target: "balances",
    title: "Points Balances",
    message: "Track your points and miles balances across all your loyalty programs in one place.",
    position: "bottom",
    parentDropdown: "rewards-menu",
  },
  {
    target: "inventory",
    title: "Inventory Tracking",
    message: "Keep track of perks you've earned but haven't used yet—like free nights, companion passes, or lounge passes. Never let them expire!",
    position: "bottom",
    parentDropdown: "rewards-menu",
  },
  {
    target: "transfer-partners",
    title: "Transfer Partners",
    message: "Explore transfer partners for your points programs and find the best redemption values for your miles.",
    position: "bottom",
    parentDropdown: "rewards-menu",
  },
  // Planning group
  {
    target: "spend-optimizer",
    title: "Spend Optimizer",
    message: "See an analysis of the total points and/or cash back you can expect from your cards, including recommendations for what categories to spend on.",
    position: "bottom",
    parentDropdown: "planning-menu",
  },
  {
    target: "application-rules",
    title: "Application Rules",
    message: "Track which cards you're eligible to apply for based on issuer-specific rules like Chase 5/24 and Amex 2/90.",
    position: "bottom",
    parentDropdown: "planning-menu",
  },
  {
    target: "credit-report",
    title: "Credit Report",
    message: "Import and view your credit report to track accounts, inquiries, and credit score history.",
    position: "bottom",
    parentDropdown: "planning-menu",
  },
  // Settings group
  {
    target: "point-values",
    title: "Point Valuations",
    message: "Change the assumptions for how much points are worth to customize your earnings calculations.",
    position: "bottom",
    parentDropdown: "settings-menu",
  },
  {
    target: "spending",
    title: "Edit Spending",
    message: "Edit the default spending assumptions that drive the Spend Optimizer calculations.",
    position: "bottom",
    parentDropdown: "settings-menu",
  },
  {
    target: "settings",
    title: "Other Settings",
    message: "Configure card-specific settings and preferences to customize your CardTool experience.",
    position: "bottom",
    parentDropdown: "settings-menu",
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
  // Initialize with a safe default to avoid hydration mismatch
  const [viewportWidth, setViewportWidth] = useState(1024);
  
  // Update viewport width on mount, resize, and when step/target changes
  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    // Always update immediately - catches viewport changes without resize events
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [currentStep, targetRect]); // Re-run when step or target changes
  
  if (!targetRect) return null;

  // Calculate position based on target element and desired position
  const getPosition = () => {
    const padding = 12;
    const calloutWidth = Math.min(320, viewportWidth - 32); // Responsive width
    const calloutHeight = 180; // Approximate height

    switch (step.position) {
      case "bottom":
        return {
          top: targetRect.bottom + padding,
          left: Math.max(
            16,
            Math.min(
              targetRect.left + targetRect.width / 2 - calloutWidth / 2,
              viewportWidth - calloutWidth - 16
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
              viewportWidth - calloutWidth - 16
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
  const calloutWidth = Math.min(320, viewportWidth - 32);

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
      className="fixed z-[80] rounded-xl border border-blue-500/50 bg-zinc-900 shadow-2xl shadow-blue-500/20"
      style={{
        top: position.top,
        left: position.left,
        width: calloutWidth,
        maxWidth: 'calc(100vw - 32px)',
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

// Nav items that live in the mobile menu (includes dropdown button IDs)
const NAV_TARGETS = [
  "dashboard",
  "cards-menu", "wallet", "compare", "credits", "offers",
  "rewards-menu", "balances", "inventory", "transfer-partners",
  "planning-menu", "spend-optimizer", "application-rules", "credit-report",
  "settings-menu", "point-values", "spending", "settings"
];

export function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [completed, setCompleted] = useState(false);

  const step = ONBOARDING_STEPS[currentStep];

  // Check if we're on mobile (mobile menu button is visible)
  const isMobile = useCallback(() => {
    const menuButton = document.querySelector("[data-mobile-menu-button]");
    if (!menuButton) return false;
    const rect = menuButton.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }, []);

  // Find a visible target element and return its rect
  // Uses querySelectorAll because there may be both desktop and mobile versions of the same element
  const findTargetRect = useCallback((targetId: string): DOMRect | null => {
    const targets = document.querySelectorAll(`[data-onboarding="${targetId}"]`);
    for (const target of targets) {
      const rect = target.getBoundingClientRect();
      // Check if element is visible (has dimensions and is within viewport)
      if (rect.width > 0 && rect.height > 0) {
        return rect;
      }
    }
    return null;
  }, []);

  // Check if the mobile menu is already open by looking for visible nav items in the mobile dropdown
  const isMenuOpen = useCallback(() => {
    // Look for nav targets that are visible - check ALL matching elements
    for (const targetId of NAV_TARGETS) {
      const targets = document.querySelectorAll(`[data-onboarding="${targetId}"]`);
      for (const el of targets) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          return true;
        }
      }
    }
    return false;
  }, []);

  // Open the mobile menu (only if not already open)
  const openMenuIfNeeded = useCallback(() => {
    if (isMenuOpen()) {
      return true; // Already open, no action needed
    }
    const menuButton = document.querySelector("[data-mobile-menu-button]") as HTMLButtonElement;
    if (menuButton) {
      menuButton.click();
      return true;
    }
    return false;
  }, [isMenuOpen]);

  // Open a specific dropdown on desktop by clicking its button
  const openDropdown = useCallback((dropdownId: string) => {
    const dropdownButton = document.querySelector(`[data-onboarding="${dropdownId}"]`) as HTMLButtonElement;
    if (dropdownButton) {
      // Check if dropdown is already open by looking for the dropdown content nearby
      const parent = dropdownButton.closest('.relative');
      const dropdownContent = parent?.querySelector('.absolute');
      if (!dropdownContent) {
        // Dropdown is closed, click to open
        dropdownButton.click();
        return true;
      }
    }
    return false;
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Reset targetRect when step changes
    setTargetRect(null);
    
    if (!step) return;

    let cancelled = false;
    const timeouts: NodeJS.Timeout[] = [];

    const tryFindTarget = () => {
      if (cancelled) return false;
      
      const rect = findTargetRect(step.target);
      if (rect) {
        setTargetRect(rect);
        return true;
      }
      return false;
    };

    // Initial attempt
    if (tryFindTarget()) return;

    // If it's a nav item on mobile, ensure menu is open
    if (NAV_TARGETS.includes(step.target) && isMobile()) {
      openMenuIfNeeded();
      
      // After opening menu, wait a bit then retry multiple times
      timeouts.push(setTimeout(() => tryFindTarget(), 100));
      timeouts.push(setTimeout(() => tryFindTarget(), 200));
      timeouts.push(setTimeout(() => tryFindTarget(), 350));
      timeouts.push(setTimeout(() => tryFindTarget(), 500));
      timeouts.push(setTimeout(() => tryFindTarget(), 750));
    } else if (step.parentDropdown && !isMobile()) {
      // On desktop, if the target is inside a dropdown, open it first
      openDropdown(step.parentDropdown);
      
      // After opening dropdown, wait a bit then retry
      timeouts.push(setTimeout(() => tryFindTarget(), 50));
      timeouts.push(setTimeout(() => tryFindTarget(), 100));
      timeouts.push(setTimeout(() => tryFindTarget(), 200));
      timeouts.push(setTimeout(() => tryFindTarget(), 350));
    } else {
      // Just retry in case of timing issues
      timeouts.push(setTimeout(() => tryFindTarget(), 50));
      timeouts.push(setTimeout(() => tryFindTarget(), 150));
      timeouts.push(setTimeout(() => tryFindTarget(), 300));
    }

    // Update on scroll/resize
    const handleUpdate = () => {
      const rect = findTargetRect(step.target);
      if (rect) setTargetRect(rect);
    };
    window.addEventListener("scroll", handleUpdate, true);
    window.addEventListener("resize", handleUpdate);

    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
      window.removeEventListener("scroll", handleUpdate, true);
      window.removeEventListener("resize", handleUpdate);
    };
  }, [step, currentStep, isMobile, openMenuIfNeeded, openDropdown, findTargetRect]);

  const handleNext = () => {
    const nextStep = currentStep + 1;
    if (nextStep < ONBOARDING_STEPS.length) {
      setCurrentStep(nextStep);
    } else {
      // Complete the tour - set completed immediately to prevent re-showing
      setCompleted(true);
      startTransition(async () => {
        await onComplete();
      });
    }
  };

  // Don't render anything if not ready, completed, or if target element not found
  // This prevents a dark backdrop from blocking the UI when elements are missing
  if (!mounted || !step || isPending || completed || !targetRect) return null;

  return createPortal(
    <>
      {/* Backdrop overlay */}
      <div className="fixed inset-0 z-50 bg-black/40 transition-opacity" />

      {/* Spotlight on target element */}
      <div
        className="fixed z-[75] rounded-lg ring-4 ring-blue-500 ring-offset-2 ring-offset-zinc-950 pointer-events-none transition-all duration-300"
        style={{
          top: targetRect.top - 4,
          left: targetRect.left - 4,
          width: targetRect.width + 8,
          height: targetRect.height + 8,
          boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.4)",
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

