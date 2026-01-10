"use client";

import { ReactNode } from "react";
import { OnboardingTour } from "@/components/onboarding-tour";

interface DashboardClientProps {
  children: ReactNode;
  showOnboarding: boolean;
  onCompleteOnboarding: () => Promise<void>;
}

export function DashboardClient({
  children,
  showOnboarding,
  onCompleteOnboarding,
}: DashboardClientProps) {
  return (
    <>
      {children}
      {showOnboarding && <OnboardingTour onComplete={onCompleteOnboarding} />}
    </>
  );
}
