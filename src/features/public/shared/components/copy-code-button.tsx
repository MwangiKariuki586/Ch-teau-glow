"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyCodeButton({
  code,
  label = "Copy code",
  className,
  variant = "outline",
}: {
  code: string;
  label?: string;
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Copied");
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Unable to copy code");
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      className={className}
      onClick={handleCopy}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? "Copied" : label}
    </Button>
  );
}
