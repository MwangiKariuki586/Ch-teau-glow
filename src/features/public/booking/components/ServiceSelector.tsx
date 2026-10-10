"use client";

import { Service } from "../hooks/useBookingFlow";

interface ServiceSelectorProps {
  selectedService?: Service;
  onServiceSelect: (service: Service) => void;
  isLoading: boolean;
  initialServiceSlug?: string;
}

export function ServiceSelector({ 
  selectedService, 
  onServiceSelect, 
  isLoading,
  initialServiceSlug 
}: ServiceSelectorProps) {
  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading selected service...</p>;
  }

  if (selectedService) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-primary bg-primary/5 px-4 py-3">
          <p className="font-semibold">{selectedService.name}</p>
          <p className="text-sm text-muted-foreground">
            Duration: {selectedService.duration_minutes} minutes
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          Service selected. Continue to choose a branch.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Please select a service from the services page first.
      </p>
    </div>
  );
}