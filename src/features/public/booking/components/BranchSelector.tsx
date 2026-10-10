"use client";

import { LoadingScreen } from "@/components/loading-screen";
import { Branch } from "../hooks/useBookingFlow";

interface BranchSelectorProps {
  branches: Branch[];
  selectedBranch?: Branch;
  onBranchSelect: (branch: Branch) => void;
  isLoading: boolean;
}

export function BranchSelector({ 
  branches, 
  selectedBranch, 
  onBranchSelect, 
  isLoading 
}: BranchSelectorProps) {
  if (isLoading) {
    return (
      <LoadingScreen
        compact
        title="Loading branches"
        description="Finding branches that can take this service."
      />
    );
  }

  if (branches.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          No branches currently offer this service.
        </p>
        <p className="text-xs text-muted-foreground">
          Please try selecting a different service or contact us for assistance.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Select a branch that offers your chosen service:
      </p>
      {branches.map((branch) => (
        <button
          key={branch.id}
          type="button"
          onClick={() => onBranchSelect(branch)}
          className={`w-full rounded-xl border px-4 py-3 text-left transition ${
            selectedBranch?.id === branch.id
              ? "border-primary bg-primary/5"
              : "hover:bg-muted/50"
          }`}
        >
          <p className="font-semibold">{branch.name}</p>
          <p className="text-sm text-muted-foreground">
            {branch.city}, {branch.country}
          </p>
          <p className="text-xs text-muted-foreground">{branch.address}</p>
        </button>
      ))}
    </div>
  );
}
