"use client";

import { LoadingScreen } from "@/components/loading-screen";
import { Specialist } from "../hooks/useBookingFlow";

interface SpecialistSelectorProps {
  specialists: Specialist[];
  selectedSpecialist?: Specialist;
  onSpecialistSelect: (specialist: Specialist) => void;
  isLoading: boolean;
}

export function SpecialistSelector({ 
  specialists, 
  selectedSpecialist, 
  onSpecialistSelect, 
  isLoading 
}: SpecialistSelectorProps) {
  if (isLoading) {
    return (
      <LoadingScreen
        compact
        title="Loading specialists"
        description="Checking who is available for this branch and service."
      />
    );
  }

  if (specialists.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          No specialists are available at this branch for the selected service.
        </p>
        <p className="text-xs text-muted-foreground">
          Please try selecting a different branch or contact us to check availability.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Select a specialist who provides your service at this branch:
      </p>
      {specialists.map((specialist) => (
        <button
          key={specialist.id}
          type="button"
          onClick={() => onSpecialistSelect(specialist)}
          className={`w-full rounded-xl border px-4 py-3 text-left transition ${
            selectedSpecialist?.id === specialist.id
              ? "border-primary bg-primary/5"
              : "hover:bg-muted/50"
          }`}
        >
          <p className="font-semibold">{specialist.name}</p>
          <p className="text-sm text-muted-foreground">{specialist.title}</p>
        </button>
      ))}
    </div>
  );
}
