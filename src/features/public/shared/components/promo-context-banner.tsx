import { Ticket, Sparkles } from "lucide-react";
import { CopyCodeButton } from "./copy-code-button";
import { humanizeSlug } from "../promo-context";

export function PromoContextBanner({
  code,
  packageSlug,
  className = "",
}: {
  code?: string | null;
  packageSlug?: string | null;
  className?: string;
}) {
  if (!code && !packageSlug) {
    return null;
  }

  const packageName = humanizeSlug(packageSlug);

  return (
    <div
      className={`rounded-2xl border border-[#C9A96E]/30 bg-[#FFF8EE] px-4 py-4 text-[#6B4423] shadow-sm ${className}`.trim()}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          {code && (
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Ticket className="h-4 w-4" />
              Promo code: {code}
            </p>
          )}
          {packageName && (
            <p className="flex items-center gap-2 text-sm text-[#6B4423]/80">
              <Sparkles className="h-4 w-4" />
              Package context: {packageName}
            </p>
          )}
        </div>
        {code ? (
          <CopyCodeButton
            code={code}
            label="Copy code"
            variant="secondary"
            className="justify-center rounded-full border border-[#6B4423]/15 bg-white px-4 text-[#6B4423] hover:bg-white/90"
          />
        ) : null}
      </div>
    </div>
  );
}
