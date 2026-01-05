"use client";

import { ReactNode } from "react";
import { OnboardingTour } from "@/components/onboarding-tour";

interface WalletClientProps {
  children: ReactNode;
  showOnboarding: boolean;
  onCompleteOnboarding: () => Promise<void>;
}

export function WalletClient({
  children,
  showOnboarding,
  onCompleteOnboarding,
}: WalletClientProps) {
  return (
    <>
      {children}
      {showOnboarding && <OnboardingTour onComplete={onCompleteOnboarding} />}
    </>
  );
}


