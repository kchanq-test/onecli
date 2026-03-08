"use client";

import { Copy, Check } from "lucide-react";
import { useState } from "react";

interface CopyCommandProps {
  command: string;
}

export function CopyCommand({ command }: CopyCommandProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      className="bg-muted hover:bg-muted/80 dark:bg-white/10 dark:hover:bg-white/15 dark:border dark:border-white/10 inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-xs transition-colors cursor-pointer"
      onClick={handleCopy}
    >
      <span className="text-brand">{command}</span>
      {copied ? (
        <Check className="size-3 text-green-500" />
      ) : (
        <Copy className="size-3 text-muted-foreground" />
      )}
    </button>
  );
}
