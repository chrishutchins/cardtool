"use client";

import { useState, useTransition } from "react";

interface Template {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  source_url: string | null;
  is_default: boolean | null;
}

interface Props {
  templates: Template[];
  selectedTemplateId: string | null;
  onSelect: (templateId: string | null) => Promise<void>;
}

export function TemplateSelector({ templates, selectedTemplateId, onSelect }: Props) {
  const [isPending, startTransition] = useTransition();
  const [localSelectedId, setLocalSelectedId] = useState(selectedTemplateId);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    setLocalSelectedId(templateId); // Optimistic update
    
    startTransition(async () => {
      await onSelect(templateId);
    });
  };

  const selectedTemplate = templates.find((t) => t.id === localSelectedId);

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <select
          value={localSelectedId ?? ""}
          onChange={handleChange}
          disabled={isPending}
          className={`
            appearance-none rounded-lg border border-zinc-700 bg-zinc-800 
            pl-4 pr-10 py-2.5 text-sm font-medium text-white
            focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500
            ${isPending ? "opacity-50 cursor-wait" : "cursor-pointer hover:border-zinc-600"}
          `}
        >
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
              {template.is_default ? " (default)" : ""}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          {isPending ? (
            <svg className="animate-spin h-4 w-4 text-zinc-400" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="h-4 w-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </div>
      
      {selectedTemplate?.source_url && (
        <a
          href={selectedTemplate.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-amber-400 hover:text-amber-300 flex items-center gap-1"
        >
          View source ↗
        </a>
      )}
    </div>
  );
}

