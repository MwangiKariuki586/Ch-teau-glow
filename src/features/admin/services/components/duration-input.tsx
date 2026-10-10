"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DURATION_UNIT_LABELS,
  type DurationFieldState,
  type DurationUnit,
} from "@/features/admin/services/lib/duration-fields";

type DurationInputProps = {
  id: string;
  label: string;
  value: DurationFieldState;
  onChange: (value: DurationFieldState) => void;
  disabled?: boolean;
  allowedUnits: readonly DurationUnit[];
  amountPlaceholder?: string;
  structuredHint?: string;
  customHint?: string;
  allowCustom?: boolean;
};

export function DurationInput({
  id,
  label,
  value,
  onChange,
  disabled = false,
  allowedUnits,
  amountPlaceholder = "Enter duration",
  structuredHint,
  customHint,
  allowCustom = true,
}: DurationInputProps) {
  const canSwitchToStructured = value.mode === "custom";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        {allowCustom && canSwitchToStructured && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto px-0 text-xs text-muted-foreground hover:bg-transparent hover:text-foreground"
            onClick={() =>
              onChange({
                mode: "preset",
                amount: "",
                unit: value.unit,
                customValue: "",
              })
            }
            disabled={disabled}
          >
            Use selector instead
          </Button>
        )}
      </div>

      {value.mode === "custom" ? (
        <>
          <Input
            id={id}
            value={value.customValue}
            onChange={(event) =>
              onChange({
                ...value,
                customValue: event.target.value,
              })
            }
            placeholder="Enter a custom duration"
            disabled={disabled}
          />
          {customHint ? <p className="text-xs text-muted-foreground">{customHint}</p> : null}
        </>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
            <Input
              id={id}
              type="number"
              min="1"
              step="1"
              value={value.amount}
              onChange={(event) =>
                onChange({
                  ...value,
                  amount: event.target.value,
                })
              }
              placeholder={amountPlaceholder}
              disabled={disabled}
            />
            <Select
              value={value.unit}
              onValueChange={(nextUnit) =>
                onChange({
                  ...value,
                  unit: nextUnit as DurationUnit,
                })
              }
              disabled={disabled}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                {allowedUnits.map((unit) => (
                  <SelectItem key={unit} value={unit}>
                    {DURATION_UNIT_LABELS[unit]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {structuredHint ? <p className="text-xs text-muted-foreground">{structuredHint}</p> : null}
        </>
      )}
    </div>
  );
}
