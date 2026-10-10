"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { z } from "zod";
import { ArrowLeftIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ServiceOption = {
  id: string;
  name: string;
  slug: string;
  duration_minutes: number;
  min_price_cents: number;
  max_price_cents: number;
  currency: string;
};

type BranchOption = {
  id: string;
  name: string;
  city: string;
  country: string;
  address: string;
};

type SpecialistOption = {
  id: string;
  name: string;
  title: string;
};

type AvailabilitySlot = {
  starts_at: string;
  ends_at: string;
};

const bookingPayloadSchema = z.object({
  service_id: z.string().uuid(),
  branch_id: z.string().uuid(),
  specialist_id: z.string().uuid(),
  starts_at: z.string().datetime({ offset: true }),
  notes: z.string().max(500).optional(),
});

const steps = ["Branch", "Specialist", "Date & Time", "Confirm"];

function formatPriceRange(service: ServiceOption) {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: service.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  if (service.min_price_cents === service.max_price_cents) {
    return formatter.format(service.min_price_cents / 100);
  }
  return `${formatter.format(service.min_price_cents / 100)} - ${formatter.format(service.max_price_cents / 100)}`;
}

function getTimezoneOffsetMinutesForDate(dateKey: string) {
  const localMidday = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(localMidday.getTime())) {
    return new Date().getTimezoneOffset();
  }
  return localMidday.getTimezoneOffset();
}

export function BookingWizardPage({
  initialServiceSlug,
}: {
  initialServiceSlug?: string;
}) {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<ServiceOption | null>(null);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [specialists, setSpecialists] = useState<SpecialistOption[]>([]);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);

  const [loadingService, setLoadingService] = useState(true);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [loadingSpecialists, setLoadingSpecialists] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [creatingBooking, setCreatingBooking] = useState(false);

  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [selectedSpecialistId, setSelectedSpecialistId] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [notes, setNotes] = useState("");
  const [stepError, setStepError] = useState<string | null>(null);

  const selectedBranch = useMemo(
    () => branches.find((branch) => branch.id === selectedBranchId) ?? null,
    [branches, selectedBranchId],
  );
  const selectedSpecialist = useMemo(
    () => specialists.find((specialist) => specialist.id === selectedSpecialistId) ?? null,
    [specialists, selectedSpecialistId],
  );

  useEffect(() => {
    let isMounted = true;
    const fetchServiceContext = async () => {
      if (!initialServiceSlug) {
        toast.error("Select a service first before booking.");
        router.replace("/services");
        return;
      }

      setLoadingService(true);
      try {
        const response = await fetch(`/api/services/${encodeURIComponent(initialServiceSlug)}`, {
          cache: "no-store",
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Service is unavailable.");

        const data = result.data as {
          id: string;
          name: string;
          slug: string;
          duration_minutes: number;
          min_price_cents: number;
          max_price_cents: number;
          currency: string;
        };

        if (!isMounted) return;
        setSelectedService(data);
        setSelectedServiceId(data.id);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load service.");
        router.replace("/services");
      } finally {
        if (isMounted) setLoadingService(false);
      }
    };

    void fetchServiceContext();
    return () => {
      isMounted = false;
    };
  }, [initialServiceSlug, router]);

  useEffect(() => {
    if (!selectedServiceId) {
      setBranches([]);
      setSelectedBranchId("");
      return;
    }

    let isMounted = true;
    const fetchBranches = async () => {
      setLoadingBranches(true);
      try {
        const response = await fetch(`/api/branches?service_id=${selectedServiceId}`, {
          cache: "no-store",
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Failed to load branches.");
        if (!isMounted) return;

        setBranches((result.data ?? []) as BranchOption[]);
        setSelectedBranchId("");
        setSelectedSpecialistId("");
        setSelectedDate("");
        setSelectedSlot(null);
        setSpecialists([]);
        setSlots([]);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load branches.");
      } finally {
        if (isMounted) setLoadingBranches(false);
      }
    };

    void fetchBranches();
    return () => {
      isMounted = false;
    };
  }, [selectedServiceId]);

  useEffect(() => {
    if (!selectedServiceId || !selectedBranchId) {
      setSpecialists([]);
      setSelectedSpecialistId("");
      return;
    }

    let isMounted = true;
    const fetchSpecialists = async () => {
      setLoadingSpecialists(true);
      try {
        const response = await fetch(
          `/api/specialists?service_id=${selectedServiceId}&branch_id=${selectedBranchId}`,
          {
            cache: "no-store",
          },
        );
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Failed to load specialists.");
        if (!isMounted) return;
        setSpecialists((result.data ?? []) as SpecialistOption[]);
        setSelectedSpecialistId("");
        setSelectedDate("");
        setSelectedSlot(null);
        setSlots([]);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to load specialists.",
        );
      } finally {
        if (isMounted) setLoadingSpecialists(false);
      }
    };

    void fetchSpecialists();
    return () => {
      isMounted = false;
    };
  }, [selectedBranchId, selectedServiceId]);

  useEffect(() => {
    if (!selectedServiceId || !selectedSpecialistId || !selectedDate) {
      setSlots([]);
      setSelectedSlot(null);
      return;
    }

    let isMounted = true;
    const fetchAvailability = async () => {
      setLoadingSlots(true);
      try {
        const response = await fetch(
          `/api/availability?service_id=${selectedServiceId}&specialist_id=${selectedSpecialistId}&date=${selectedDate}&tz_offset_minutes=${getTimezoneOffsetMinutesForDate(selectedDate)}`,
          {
            cache: "no-store",
          },
        );
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Failed to load availability.");
        if (!isMounted) return;

        setSlots((result.data ?? []) as AvailabilitySlot[]);
        setSelectedSlot(null);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to load availability.",
        );
      } finally {
        if (isMounted) setLoadingSlots(false);
      }
    };

    void fetchAvailability();
    return () => {
      isMounted = false;
    };
  }, [selectedDate, selectedServiceId, selectedSpecialistId]);

  useEffect(() => {
    setStepError(null);
  }, [step, selectedBranchId, selectedSpecialistId, selectedDate, selectedSlot]);

  const getStepValidationError = (currentStep: number): string | null => {
    if (currentStep === 1) {
      if (loadingBranches) return "Branches are still loading.";
      if (branches.length === 0) return "No branches currently offer this service.";
      if (!selectedBranchId) return "Select a branch before continuing.";
      return null;
    }

    if (currentStep === 2) {
      if (loadingSpecialists) return "Specialists are still loading.";
      if (specialists.length === 0) {
        return "No specialists are available for the selected branch.";
      }
      if (!selectedSpecialistId) return "Select a specialist before continuing.";
      return null;
    }

    if (currentStep === 3) {
      if (!selectedDate) return "Select a date before continuing.";
      if (loadingSlots) return "Time slots are still loading.";
      if (slots.length === 0) return "No time slots are available for the selected date.";
      if (!selectedSlot) return "Select a time slot before continuing.";
      return null;
    }

    return null;
  };

  const handleNextStep = () => {
    const validationError = getStepValidationError(step);
    if (validationError) {
      setStepError(validationError);
      toast.error(validationError);
      return;
    }
    setStepError(null);
    setStep((current) => Math.min(4, current + 1));
  };

  const handleCreateBooking = async () => {
    if (!selectedSlot || !selectedServiceId || !selectedBranchId || !selectedSpecialistId) {
      toast.error("Please complete all booking steps before confirming.");
      return;
    }

    const payload = bookingPayloadSchema.safeParse({
      service_id: selectedServiceId,
      branch_id: selectedBranchId,
      specialist_id: selectedSpecialistId,
      starts_at: selectedSlot.starts_at,
      notes: notes.trim() || undefined,
    });

    if (!payload.success) {
      toast.error("Complete all required booking fields.");
      return;
    }

    setCreatingBooking(true);
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload.data),
      });
      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Sign in first to complete booking.");
          router.push("/auth/signin");
          return;
        }
        throw new Error(result.error ?? "Failed to create booking.");
      }

      toast.success("Booking request submitted successfully.");
      router.push("/customer/bookings");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create booking.");
    } finally {
      setCreatingBooking(false);
    }
  };

  return (
    <main className="min-h-screen bg-muted/20 pt-28">
      <section className="px-[55px] pb-16">
        <div className="mx-auto max-w-5xl">
          <Link
            href={
              initialServiceSlug
                ? `/services/${encodeURIComponent(initialServiceSlug)}`
                : "/services"
            }
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-primary"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Service Details
          </Link>

          <div className="mb-6">
            <h1 className="text-4xl font-bold text-gray-900">
              Book <span className="text-[#c9a961]">Your Service</span>
            </h1>
            <p className="mt-3 text-muted-foreground">
              Complete each step to confirm your appointment request.
            </p>
          </div>

          <Card className="mb-6 rounded-2xl border bg-muted/20">
            <CardContent className="py-4">
              {loadingService && (
                <p className="text-sm text-muted-foreground">Loading selected service...</p>
              )}
              {!loadingService && selectedService && (
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">{selectedService.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatPriceRange(selectedService)} - {selectedService.duration_minutes} mins
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mb-6 flex flex-wrap gap-2">
            {steps.map((label, index) => {
              const stepIndex = index + 1;
              const isActive = stepIndex === step;
              const isDone = stepIndex < step;
              return (
                <Badge
                  key={label}
                  variant={isActive ? "default" : "secondary"}
                  className={
                    isDone
                      ? "rounded-full bg-primary/10 px-4 py-1 text-primary"
                      : "rounded-full px-4 py-1"
                  }
                >
                  {stepIndex}. {label}
                </Badge>
              );
            })}
          </div>

          <Card className="rounded-3xl border shadow-sm">
            <CardHeader>
              <CardTitle>{steps[step - 1]}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {step === 1 && (
                <div className="space-y-3">
                  {loadingBranches && <p className="text-sm text-muted-foreground">Loading branches...</p>}
                  {!loadingBranches && branches.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No branches currently offer this service.
                    </p>
                  )}
                  {!loadingBranches &&
                    branches.map((branch) => (
                      <button
                        key={branch.id}
                        type="button"
                        onClick={() => setSelectedBranchId(branch.id)}
                        className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                          selectedBranchId === branch.id
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
              )}

              {step === 2 && (
                <div className="space-y-3">
                  {loadingSpecialists && (
                    <p className="text-sm text-muted-foreground">Loading specialists...</p>
                  )}
                  {!loadingSpecialists && specialists.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No specialists are available for the selected branch.
                    </p>
                  )}
                  {!loadingSpecialists &&
                    specialists.map((specialist) => (
                      <button
                        key={specialist.id}
                        type="button"
                        onClick={() => setSelectedSpecialistId(specialist.id)}
                        className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                          selectedSpecialistId === specialist.id
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <p className="font-semibold">{specialist.name}</p>
                        <p className="text-sm text-muted-foreground">{specialist.title}</p>
                      </button>
                    ))}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="booking-date">Select Date</Label>
                    <Input
                      id="booking-date"
                      type="date"
                      value={selectedDate}
                      onChange={(event) => setSelectedDate(event.target.value)}
                      min={format(new Date(), "yyyy-MM-dd")}
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Available Slots</p>
                    {!selectedDate && (
                      <p className="text-sm text-muted-foreground">
                        Select a date to see available slots.
                      </p>
                    )}
                    {loadingSlots && (
                      <p className="text-sm text-muted-foreground">Loading slots...</p>
                    )}
                    {!loadingSlots && selectedDate && slots.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No slots available for the selected date.
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {slots.map((slot) => (
                        <Button
                          key={slot.starts_at}
                          type="button"
                          variant={
                            selectedSlot?.starts_at === slot.starts_at
                              ? "default"
                              : "outline"
                          }
                          onClick={() => setSelectedSlot(slot)}
                        >
                          {format(new Date(slot.starts_at), "hh:mm a")} -{" "}
                          {format(new Date(slot.ends_at), "hh:mm a")}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <div className="rounded-xl border bg-muted/20 p-4">
                    <p className="font-semibold">{selectedService?.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedBranch?.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedSpecialist?.name}</p>
                    {selectedSlot && (
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(selectedSlot.starts_at), "EEEE, MMM d, yyyy hh:mm a")}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="booking-notes">Notes (optional)</Label>
                    <Input
                      id="booking-notes"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Any special request..."
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleCreateBooking}
                    disabled={creatingBooking}
                    className="rounded-full px-6"
                  >
                    {creatingBooking ? "Booking..." : "Confirm Booking"}
                  </Button>
                </div>
              )}

              {stepError && (
                <p className="text-sm font-medium text-destructive">{stepError}</p>
              )}

              <div className="flex justify-between pt-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={step === 1}
                  onClick={() => {
                    setStepError(null);
                    setStep((current) => Math.max(1, current - 1));
                  }}
                >
                  Back
                </Button>
                {step < 4 && (
                  <Button
                    type="button"
                    onClick={handleNextStep}
                  >
                    Continue
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
