"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface BalanceEditPopoverProps {
  initialBalance: number;
  initialExpiration: string | null;
  initialNotes: string | null;
  currencyName: string;
  expirationPolicy: string | null;
  onSave: (balance: number, expiration: string | null, notes: string | null) => void;
  onDelete?: () => void;
  onClose: () => void;
  isPending: boolean;
  anchorRef?: React.RefObject<HTMLElement | null>;
}

export function BalanceEditPopover({
  initialBalance,
  initialExpiration,
  initialNotes,
  currencyName,
  expirationPolicy,
  onSave,
  onDelete,
  onClose,
  isPending,
  anchorRef,
}: BalanceEditPopoverProps) {
  // Format initial balance with commas
  const formatWithCommas = (num: number) => num.toLocaleString();
  const [balance, setBalance] = useState(formatWithCommas(initialBalance));
  const [expiration, setExpiration] = useState(initialExpiration || "");
  const [notes, setNotes] = useState(initialNotes || "");
  const [showDelete, setShowDelete] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Calculate position based on anchor element
  const updatePosition = useCallback(() => {
    if (anchorRef?.current && popoverRef.current) {
      const anchorRect = anchorRef.current.getBoundingClientRect();
      const popoverRect = popoverRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      // Position below the anchor by default
      let top = anchorRect.bottom + 4;
      let left = anchorRect.left;
      
      // If popover would go off the bottom, position above
      if (top + popoverRect.height > viewportHeight - 20) {
        top = anchorRect.top - popoverRect.height - 4;
      }
      
      // If popover would go off the right, align to right edge
      if (left + popoverRect.width > viewportWidth - 20) {
        left = viewportWidth - popoverRect.width - 20;
      }
      
      // Ensure it doesn't go off the left
      if (left < 20) {
        left = 20;
      }
      
      setPosition({ top, left });
    }
  }, [anchorRef]);

  // Focus input on mount and calculate position
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
    updatePosition();
  }, [updatePosition]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Close on escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const balanceNum = parseFloat(balance.replace(/,/g, "")) || 0;
    const expirationVal = expiration || null;
    const notesVal = notes.trim() || null;
    onSave(balanceNum, expirationVal, notesVal);
  };

  const handleBalanceChange = (value: string) => {
    // Remove non-numeric characters except commas
    const cleaned = value.replace(/[^0-9]/g, "");
    // Format with commas
    const num = parseInt(cleaned) || 0;
    setBalance(num === 0 && cleaned === "" ? "" : num.toLocaleString());
  };

  return (
    <div
      ref={popoverRef}
      className="fixed z-[9999] w-72 rounded-lg border border-zinc-700 bg-zinc-800 shadow-xl text-left"
      style={{ top: position.top, left: position.left }}
    >
      <form onSubmit={handleSubmit} className="p-3 space-y-3">
        <div className="text-sm font-medium text-white mb-2 text-left">
          Edit {currencyName}
        </div>

        {/* Balance input */}
        <div>
          <label className="block text-xs text-zinc-400 mb-1 text-left">Balance</label>
          <input
            ref={inputRef}
            type="text"
            value={balance}
            onChange={(e) => handleBalanceChange(e.target.value)}
            className="w-full rounded border border-zinc-600 bg-zinc-700 px-3 py-2 text-white text-right font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="0"
          />
        </div>

        {/* Expiration date */}
        <div>
          <label className="block text-xs text-zinc-400 mb-1 text-left">
            Expiration Date
            {expirationPolicy && (
              <span className="text-zinc-500 ml-1 font-normal" title={expirationPolicy}>
                ℹ️
              </span>
            )}
          </label>
          <input
            type="date"
            value={expiration}
            onChange={(e) => setExpiration(e.target.value)}
            className="w-full rounded border border-zinc-600 bg-zinc-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {expirationPolicy && (
            <p className="text-xs text-zinc-500 mt-1 text-left">{expirationPolicy}</p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs text-zinc-400 mb-1 text-left">Notes</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded border border-zinc-600 bg-zinc-700 px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Optional notes..."
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <div>
            {onDelete && !showDelete && (
              <button
                type="button"
                onClick={() => setShowDelete(true)}
                className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
              >
                Delete
              </button>
            )}
            {showDelete && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">Delete?</span>
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={isPending}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setShowDelete(false)}
                  className="text-xs text-zinc-400 hover:text-white"
                >
                  No
                </button>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded px-3 py-1.5 text-sm text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
