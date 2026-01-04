"use client";

import { useTransition } from "react";

interface DeleteCreditButtonProps {
  creditId: string;
  onDelete: (creditId: string) => Promise<void>;
}

export function DeleteCreditButton({ creditId, onDelete }: DeleteCreditButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this credit?")) {
      startTransition(async () => {
        await onDelete(creditId);
      });
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="text-sm text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
    >
      {isPending ? "Deleting..." : "Delete"}
    </button>
  );
}

