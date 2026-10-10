"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ServiceEditorPage } from "./service-editor-page";

export function ServiceEditPanel({
  serviceId,
  onClose,
  onSuccess,
}: {
  serviceId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Edit Service</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Update details, pricing, and branch assignments.
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          className="rounded-lg text-muted-foreground hover:text-foreground"
          aria-label="Close edit panel"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Scrollable form */}
      <ScrollArea className="h-full flex-1 min-h-0">
        <div className="p-5">
          <ServiceEditorPage
            serviceId={serviceId}
            onSuccess={onSuccess}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
