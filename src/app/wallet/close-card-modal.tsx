"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ============================================================================
// Types
// ============================================================================

interface CloseCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardName: string;
  customName: string | null;
  walletId: string;
  hasLinkedAccount: boolean;
  hasCreditHistory: boolean;
  onCloseCard: (walletId: string, closedDate: string) => Promise<void>;
  onDeleteCard: (walletId: string) => Promise<void>;
}

// ============================================================================
// Component
// ============================================================================

export function CloseCardModal({
  isOpen,
  onClose,
  cardName,
  customName,
  walletId,
  hasLinkedAccount,
  hasCreditHistory,
  onCloseCard,
  onDeleteCard,
}: CloseCardModalProps) {
  const [isPending, startTransition] = useTransition();
  const [action, setAction] = useState<"close" | "delete">("close");
  const [closedDate, setClosedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  const displayName = customName ?? cardName;

  const handleSubmit = () => {
    if (action === "delete" && !confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    startTransition(async () => {
      if (action === "close") {
        await onCloseCard(walletId, closedDate);
      } else {
        await onDeleteCard(walletId);
      }
      onClose();
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-white">
            Remove Card
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Card Info */}
          <div className="p-3 rounded-lg bg-zinc-800/50">
            <div className="font-medium text-white">{displayName}</div>
            {customName && (
              <div className="text-sm text-zinc-400">{cardName}</div>
            )}
          </div>

          {/* Options */}
          <div className="space-y-3">
            {/* Close Card Option */}
            <label
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                action === "close"
                  ? "bg-blue-600/10 border-blue-500/50"
                  : "bg-zinc-800/50 border-zinc-700 hover:border-zinc-600"
              }`}
            >
              <input
                type="radio"
                name="action"
                value="close"
                checked={action === "close"}
                onChange={() => {
                  setAction("close");
                  setConfirmDelete(false);
                }}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-medium text-white">Close this card</div>
                <p className="text-sm text-zinc-400 mt-1">
                  Archives the card and preserves all credit history. You can view closed cards
                  in the archived section and reactivate them during product changes.
                </p>
                
                {action === "close" && (
                  <div className="mt-3">
                    <label className="block text-xs text-zinc-400 mb-1">
                      When did you close this card?
                    </label>
                    <input
                      type="date"
                      value={closedDate}
                      onChange={(e) => setClosedDate(e.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </label>

            {/* Delete Card Option */}
            <label
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                action === "delete"
                  ? "bg-red-600/10 border-red-500/50"
                  : "bg-zinc-800/50 border-zinc-700 hover:border-zinc-600"
              }`}
            >
              <input
                type="radio"
                name="action"
                value="delete"
                checked={action === "delete"}
                onChange={() => setAction("delete")}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-medium text-white">Delete from wallet</div>
                <p className="text-sm text-zinc-400 mt-1">
                  Permanently removes the card and all associated data. This cannot be undone.
                </p>
                
                {action === "delete" && (
                  <div className="mt-3 space-y-2">
                    {hasCreditHistory && (
                      <div className="flex items-start gap-2 text-amber-400 text-xs">
                        <span>⚠️</span>
                        <span>All credit usage history will be permanently deleted</span>
                      </div>
                    )}
                    {hasLinkedAccount && (
                      <div className="flex items-start gap-2 text-amber-400 text-xs">
                        <span>⚠️</span>
                        <span>The linked Plaid account will be unlinked</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* Delete Confirmation */}
          {action === "delete" && confirmDelete && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <p className="text-sm text-red-400 font-medium">
                Are you sure you want to permanently delete this card?
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                This action cannot be undone. All data associated with this card will be lost.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
            <button
              onClick={() => {
                if (confirmDelete) {
                  setConfirmDelete(false);
                } else {
                  onClose();
                }
              }}
              disabled={isPending}
              className="px-4 py-2 rounded-lg text-zinc-400 hover:text-white transition-colors"
            >
              {confirmDelete ? "Go Back" : "Cancel"}
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending}
              className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                action === "delete"
                  ? "bg-red-600 text-white hover:bg-red-500"
                  : "bg-blue-600 text-white hover:bg-blue-500"
              }`}
            >
              {isPending
                ? "Processing..."
                : action === "delete"
                ? confirmDelete
                  ? "Yes, Delete Permanently"
                  : "Delete Card"
                : "Close Card"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


