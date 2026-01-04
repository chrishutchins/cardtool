import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  const ActionButton = action?.href ? "a" : "button";
  
  return (
    <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-12 text-center">
      <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10">
        <Icon className="h-8 w-8 text-blue-400" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-zinc-400 mb-6 max-w-md mx-auto">{description}</p>
      {action && (
        <ActionButton
          onClick={action.onClick}
          href={action.href}
          className="inline-block rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          {action.label}
        </ActionButton>
      )}
    </div>
  );
}

