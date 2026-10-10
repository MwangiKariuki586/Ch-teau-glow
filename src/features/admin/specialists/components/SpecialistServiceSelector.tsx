'use client';

import { Sparkles, X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useBranchServices } from '../hooks/useBranchServices';

interface SpecialistServiceSelectorProps {
  branchId?: string;
  selectedServiceIds: string[];
  onServiceChange: (serviceIds: string[]) => void;
  disabled?: boolean;
}

export function SpecialistServiceSelector({
  branchId,
  selectedServiceIds,
  onServiceChange,
  disabled = false
}: SpecialistServiceSelectorProps) {
  const { services, loading, error } = useBranchServices(branchId);

  const handleServiceToggle = (serviceId: string, checked: boolean) => {
    if (checked) {
      onServiceChange([...selectedServiceIds, serviceId]);
    } else {
      onServiceChange(selectedServiceIds.filter(id => id !== serviceId));
    }
  };

  const handleSelectAll = () => {
    onServiceChange(services.map(service => service.id));
  };

  const handleClearAll = () => {
    onServiceChange([]);
  };

  if (!branchId) {
    // In many-to-many architecture, services are global — show all published services
    // The branchId prop is kept for API compatibility but is no longer a hard requirement
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Service Assignments
        </Label>
        <Card className="p-6">
          <div className="text-center text-muted-foreground">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
            <p>Loading services...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Service Assignments
        </Label>
        <Card className="p-6">
          <div className="text-center text-destructive">
            <X className="mx-auto h-8 w-8 mb-2" />
            <p>Error loading services: {error}</p>
          </div>
        </Card>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Service Assignments
        </Label>
        <Card className="p-6">
          <div className="text-center text-muted-foreground">
            <Sparkles className="mx-auto h-8 w-8 mb-2 opacity-50" />
            <p>No services available at this branch</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Service Assignments
        </Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            disabled={disabled || selectedServiceIds.length === services.length}
          >
            Select All
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClearAll}
            disabled={disabled || selectedServiceIds.length === 0}
          >
            Clear All
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="space-y-3">
          {services.map((service) => {
            const isSelected = selectedServiceIds.includes(service.id);
            return (
              <div
                key={service.id}
                className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  id={`service-${service.id}`}
                  checked={isSelected}
                  onCheckedChange={(checked) => 
                    handleServiceToggle(service.id, checked as boolean)
                  }
                  disabled={disabled}
                />
                <div className="flex-1 min-w-0">
                  <Label
                    htmlFor={`service-${service.id}`}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {service.name}
                  </Label>
                  {service.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {service.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                      {service.duration_minutes}min
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {service.currency} {(service.min_price_cents / 100).toFixed(0)}
                      {service.max_price_cents !== service.min_price_cents && 
                        ` - ${(service.max_price_cents / 100).toFixed(0)}`
                      }
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {selectedServiceIds.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground">Selected:</span>
          {services
            .filter(service => selectedServiceIds.includes(service.id))
            .map(service => (
              <Badge key={service.id} variant="default" className="gap-1">
                {service.name}
                <button
                  type="button"
                  onClick={() => handleServiceToggle(service.id, false)}
                  className="ml-1 hover:text-destructive"
                  disabled={disabled}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))
          }
        </div>
      )}
    </div>
  );
}