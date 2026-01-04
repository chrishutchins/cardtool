"use client";

import { useState } from "react";
import { Download, Trash2, AlertTriangle, Loader2 } from "lucide-react";

interface AccountManagementProps {
  userId: string;
  userEmail: string | undefined;
  onDeleteAccount: () => Promise<{ success: boolean } | void>;
}

export function AccountManagement({
  userEmail,
  onDeleteAccount,
}: AccountManagementProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/export-data");
      if (!response.ok) throw new Error("Export failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cardtool-data.json";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmText !== "DELETE") return;
    
    setIsDeleting(true);
    try {
      await onDeleteAccount();
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete account. Please try again.");
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Account Management</h2>

      {/* Export Data */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-medium text-white mb-1">
              Export Your Data
            </h3>
            <p className="text-sm text-zinc-400">
              Download a copy of all your data including cards, spending, and settings.
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Export Data
              </>
            )}
          </button>
        </div>
      </div>

      {/* Delete Account */}
      <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-medium text-red-400 mb-1">
              Delete Account
            </h3>
            <p className="text-sm text-zinc-400">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
          </div>
          {!showDeleteConfirm && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 rounded-lg border border-red-600 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-950 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Delete Account
            </button>
          )}
        </div>

        {showDeleteConfirm && (
          <div className="mt-6 pt-6 border-t border-red-500/20">
            <div className="flex items-start gap-3 mb-4 p-4 rounded-lg bg-red-950/50 border border-red-500/30">
              <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-300 font-medium">
                  This will permanently delete:
                </p>
                <ul className="text-sm text-red-300/80 mt-2 space-y-1 list-disc list-inside">
                  <li>Your account and profile</li>
                  <li>All cards in your wallet</li>
                  <li>Your spending data and point values</li>
                  <li>Linked bank accounts</li>
                  <li>All settings and preferences</li>
                </ul>
              </div>
            </div>

            <p className="text-sm text-zinc-300 mb-3">
              To confirm, type <span className="font-mono font-bold text-red-400">DELETE</span> below:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="w-full max-w-xs rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            <p className="text-xs text-zinc-500 mt-2">
              Deleting account for: {userEmail}
            </p>

            <div className="flex gap-3 mt-4">
              <button
                onClick={handleDelete}
                disabled={deleteConfirmText !== "DELETE" || isDeleting}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete My Account
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText("");
                }}
                disabled={isDeleting}
                className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

