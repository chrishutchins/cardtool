"use client";

import { useState, useTransition } from "react";
import { Database } from "@/lib/database.types";

type CardWithCurrency = Database["public"]["Views"]["card_with_currency"]["Row"];

interface AddCardModalProps {
  availableCards: CardWithCurrency[];
  onAddCard: (cardId: string) => Promise<void>;
  debitPayEnabled?: boolean;
  onEnableDebitPay?: () => Promise<void>;
}

const SECRET_CODE = "secretdebitpay";

export function AddCardModal({ 
  availableCards, 
  onAddCard, 
  debitPayEnabled = false,
  onEnableDebitPay 
}: AddCardModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);
  const [showSecretUnlock, setShowSecretUnlock] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Check if user typed the secret code
  const isSecretCode = search.toLowerCase() === SECRET_CODE;

  const filteredCards = availableCards.filter(
    (card) =>
      card.name?.toLowerCase().includes(search.toLowerCase()) ||
      card.issuer_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleEnableDebitPay = () => {
    if (onEnableDebitPay) {
      startTransition(async () => {
        await onEnableDebitPay();
        setSearch("");
        setShowSecretUnlock(true);
      });
    }
  };

  // Group by issuer
  const cardsByIssuer = filteredCards.reduce((acc, card) => {
    const issuer = card.issuer_name ?? "Unknown";
    if (!acc[issuer]) acc[issuer] = [];
    acc[issuer].push(card);
    return acc;
  }, {} as Record<string, CardWithCurrency[]>);

  const handleAdd = async (cardId: string) => {
    setAddingId(cardId);
    await onAddCard(cardId);
    setAddingId(null);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
      >
        + Add Card
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-[10%] max-w-lg mx-auto z-50 max-h-[80vh] flex flex-col rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        <div className="p-4 border-b border-zinc-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Add Card to Wallet</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cards..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Secret Debit Pay Unlock */}
          {isSecretCode && !debitPayEnabled && onEnableDebitPay && (
            <div className="p-6 text-center">
              <div className="mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-pink-600 mb-4">
                  <span className="text-3xl">🔓</span>
                </div>
                <h3 className="text-lg font-semibold text-pink-400 mb-2">Secret Feature Unlocked!</h3>
                <p className="text-sm text-zinc-400 mb-4">
                  You've discovered the Debit Pay feature. This allows you to add an extra earning 
                  percentage to any card in your wallet.
                </p>
              </div>
              <button
                onClick={handleEnableDebitPay}
                disabled={isPending}
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-pink-600 text-white font-medium hover:from-pink-600 hover:to-pink-700 disabled:opacity-50 transition-all"
              >
                {isPending ? "Enabling..." : "Enable Debit Pay"}
              </button>
            </div>
          )}

          {/* Already Unlocked Message */}
          {showSecretUnlock && debitPayEnabled && (
            <div className="p-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-pink-600 mb-4">
                <span className="text-3xl">✓</span>
              </div>
              <h3 className="text-lg font-semibold text-pink-400 mb-2">Debit Pay Enabled!</h3>
              <p className="text-sm text-zinc-400">
                You can now add Debit Pay percentages to your cards in the wallet table.
              </p>
            </div>
          )}

          {/* Normal Card List */}
          {!isSecretCode && !showSecretUnlock && (
            Object.entries(cardsByIssuer).length > 0 ? (
              Object.entries(cardsByIssuer).map(([issuer, cards]) => (
                <div key={issuer}>
                  <div className="px-4 py-2 bg-zinc-800/50 text-xs font-medium text-zinc-400 uppercase sticky top-0">
                    {issuer}
                  </div>
                  {cards.map((card, index) => (
                    <div
                      key={card.id ?? `modal-card-${index}`}
                      className="flex items-center justify-between px-4 py-3 hover:bg-zinc-800/30 transition-colors"
                    >
                      <div>
                        <p className="text-white font-medium">{card.name}</p>
                        <p className="text-sm text-zinc-500">
                          {card.primary_currency_name}
                          {card.annual_fee
                            ? ` • $${card.annual_fee}/yr`
                            : " • No annual fee"}
                        </p>
                      </div>
                      {card.id && (
                        <button
                          onClick={() => handleAdd(card.id!)}
                          disabled={addingId === card.id}
                          className="px-3 py-1 rounded-lg bg-blue-600 text-sm text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          {addingId === card.id ? "Adding..." : "Add"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-zinc-500">
                {search ? "No cards found matching your search." : "No more cards available to add."}
              </div>
            )
          )}
        </div>
      </div>
    </>
  );
}

