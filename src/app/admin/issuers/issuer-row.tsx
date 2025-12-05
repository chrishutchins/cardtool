"use client";

import { useState } from "react";
import { Tables } from "@/lib/database.types";
import { IssuerForm } from "./issuer-form";

interface IssuerRowProps {
  issuer: Tables<"issuers">;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, formData: FormData) => Promise<void>;
}

export function IssuerRow({ issuer, onDelete, onUpdate }: IssuerRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (isEditing) {
    return (
      <tr>
        <td colSpan={3} className="px-6 py-4">
          <IssuerForm
            action={async (formData) => {
              await onUpdate(issuer.id, formData);
              setIsEditing(false);
            }}
            defaultValues={{ name: issuer.name, slug: issuer.slug }}
            onCancel={() => setIsEditing(false)}
          />
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-zinc-800/50 transition-colors">
      <td className="px-6 py-4 text-white font-medium">{issuer.name}</td>
      <td className="px-6 py-4 text-zinc-400 font-mono text-sm">{issuer.slug}</td>
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setIsEditing(true)}
            className="rounded px-3 py-1 text-sm text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
          >
            Edit
          </button>
          {isDeleting ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-400">Delete?</span>
              <button
                onClick={async () => {
                  await onDelete(issuer.id);
                }}
                className="rounded px-3 py-1 text-sm text-red-400 hover:text-white hover:bg-red-600 transition-colors"
              >
                Yes
              </button>
              <button
                onClick={() => setIsDeleting(false)}
                className="rounded px-3 py-1 text-sm text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsDeleting(true)}
              className="rounded px-3 py-1 text-sm text-zinc-400 hover:text-red-400 hover:bg-zinc-700 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

