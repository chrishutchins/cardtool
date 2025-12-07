"use client";

import { useTransition } from "react";

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

  const handleChange = (templateId: string) => {
    startTransition(async () => {
      await onSelect(templateId);
    });
  };

  return (
    <div className="flex flex-wrap gap-2">
      {templates.map((template) => {
        const isSelected = template.id === selectedTemplateId;
        return (
          <button
            key={template.id}
            onClick={() => handleChange(template.id)}
            disabled={isPending}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${isSelected
                ? "bg-amber-600 text-white"
                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
              }
              ${isPending ? "opacity-50 cursor-wait" : ""}
            `}
          >
            {template.name}
            {template.is_default && (
              <span className="ml-1.5 text-xs opacity-70">(default)</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

