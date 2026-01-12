"use client";

import { ReactNode } from "react";

interface WalletClientProps {
  children: ReactNode;
}

export function WalletClient({ children }: WalletClientProps) {
  return <>{children}</>;
}


