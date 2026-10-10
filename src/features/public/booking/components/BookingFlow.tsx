"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, CheckIcon } from "lucide-react";
import { toast } from "sonner";
import { LoadingScreen } from "@/components/loading-screen";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentStep } from "@/features/public/payment";
import { PromoContextBanner } from "@/features/public/shared/components/promo-context-banner";
import {
  appendPromoContext,
  type PromoContext,
} from "@/features/public/shared/promo-context";
import type { PackageBookingSummary } from "@/features/public/payment/types";
import { useBranchesForService } from "../hooks/useBranchesForService";
import { useAvailableSpecialists } from "../hooks/useAvailableSpecialists";
import { useBookingFlow, Service } from "../hooks/useBookingFlow";
import { BookingForm } from "./BookingForm";
import { BranchSelector } from "./BranchSelector";
import { SpecialistSelector } from "./SpecialistSelector";

const steps = ["Branch", "Specialist", "Date & Time", "Payment"];

interface BookingFlowProps {
  initialServiceSlug?: string;
  initialWaitlistOfferId?: string;
  initialWaitlistOfferGroupId?: string;
  initialWaitlistSlotId?: string;
  initialWaitlistNotificationId?: string;
  initialBranchId?: string;
  promoContext?: PromoContext | null;
}

type WaitlistOfferPrefill = {
  group?: {
    id: string;
  };
  offer: {
    id: string;
    status: string;
    offer_expires_at: string;
    starts_at: string;
    ends_at: string;
  };
  service: Service;
  branch: {
    id: string;
    name: string;
    city: string;
    country: string;
    address: string;
  };
  specialist: {
    id: string;
    name: string;
    title: string;
    image_url: string | null;
    branch_id: string | null;
  };
};

export function BookingFlow({
  initialServiceSlug,
  initialWaitlistOfferId,
  initialWaitlistOfferGroupId,
  initialWaitlistSlotId,
  initialWaitlistNotificationId,
  initialBranchId,
  promoContext,
}: BookingFlowProps) {
  const router = useRouter();
  const [packageSummary, setPackageSummary] =
    useState<PackageBookingSummary | null>(null);
  const [waitlistPrefill, setWaitlistPrefill] =
    useState<WaitlistOfferPrefill | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{
    starts_at: string;
    ends_at: string;
  } | null>(null);
  const {
    selectedService,
    selectedBranch,
    selectedSpecialist,
    currentStep,
    isLoading,
    error,
    setSelectedService,
    setAvailableBranches,
    setSelectedBranch,
    setAvailableSpecialists,
    setSelectedSpecialist,
    nextStep,
    previousStep,
    setStep,
    setLoading,
    setError,
  } = useBookingFlow();

  const {
    branches,
    isLoading: branchesLoading,
    error: branchesError,
  } = useBranchesForService(selectedService?.id);

  const {
    specialists,
    isLoading: specialistsLoading,
    error: specialistsError,
  } = useAvailableSpecialists(selectedService?.id, selectedBranch?.id);
  const isPackageBooking = Boolean(promoContext?.packageSlug);

  useEffect(() => {
    if (initialWaitlistOfferGroupId && initialWaitlistSlotId) {
      let isMounted = true;

      const prefillFromGroup = async () => {
        setLoading(true);
        try {
          const response = await fetch(
            `/api/waitlist/offer-groups/${encodeURIComponent(initialWaitlistOfferGroupId)}/select`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ slot_id: initialWaitlistSlotId }),
            },
          );
          const result = await response.json();

          if (!response.ok) {
            if (response.status === 409 && typeof result.redirect_url === "string") {
              toast.error(result.error ?? "That slot was just taken.");
              router.replace(result.redirect_url);
              return;
            }

            throw new Error(result.error ?? "This slot offer is no longer available.");
          }

          if (!isMounted) return;

          const prefill = result.data as WaitlistOfferPrefill & {
            group: { id: string };
          };
          setWaitlistPrefill(prefill);
          setSelectedService(prefill.service);
          setSelectedBranch(prefill.branch);
          setSelectedSpecialist({
            ...prefill.specialist,
            branch_id: prefill.specialist.branch_id ?? prefill.branch.id,
          });
          setSelectedSlot({
            starts_at: prefill.offer.starts_at,
            ends_at: prefill.offer.ends_at,
          });
          setStep(4);
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "This slot offer is no longer available.";
          setError(message);
          toast.error(message);
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      };

      void prefillFromGroup();

      return () => {
        isMounted = false;
      };
    }

    if (!initialWaitlistOfferId) return;

    let isMounted = true;

    const acceptOffer = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/waitlist/offers/${encodeURIComponent(initialWaitlistOfferId)}/accept`,
          {
            method: "POST",
          },
        );
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error ?? "This slot offer is no longer available.");
        }

        if (!isMounted) return;

        const prefill = result.data as WaitlistOfferPrefill;
        setWaitlistPrefill(prefill);
        setSelectedService(prefill.service);
        setSelectedBranch(prefill.branch);
        setSelectedSpecialist({
          ...prefill.specialist,
          branch_id: prefill.specialist.branch_id ?? prefill.branch.id,
        });
        setSelectedSlot({
          starts_at: prefill.offer.starts_at,
          ends_at: prefill.offer.ends_at,
        });
        setStep(4);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "This slot offer is no longer available.";
        setError(message);
        toast.error(message);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void acceptOffer();

    return () => {
      isMounted = false;
    };
  }, [
    initialWaitlistOfferId,
    initialWaitlistOfferGroupId,
    initialWaitlistSlotId,
    router,
    setError,
    setLoading,
    setSelectedBranch,
    setSelectedService,
    setSelectedSpecialist,
    setStep,
  ]);

  useEffect(() => {
    if (
      !initialServiceSlug ||
      initialWaitlistOfferId ||
      (initialWaitlistOfferGroupId && initialWaitlistSlotId)
    ) {
      return;
    }

    let isMounted = true;
    const fetchService = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/services/${encodeURIComponent(initialServiceSlug)}`,
          { cache: "no-store" },
        );
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error ?? "Service is unavailable.");
        }

        if (!isMounted) return;

        const service: Service = {
          id: result.data.id,
          name: result.data.name,
          slug: result.data.slug,
          duration_minutes: result.data.duration_minutes,
          min_price_cents: result.data.min_price_cents,
          max_price_cents: result.data.max_price_cents,
          currency: result.data.currency,
        };

        setSelectedService(service);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : isPackageBooking
              ? "Failed to load package entry service."
              : "Failed to load service.";
        setError(errorMessage);
        toast.error(errorMessage);
        router.replace(appendPromoContext("/services", promoContext));
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchService();

    return () => {
      isMounted = false;
    };
  }, [
    initialServiceSlug,
    isPackageBooking,
    promoContext,
    router,
    setError,
    setLoading,
    setSelectedService,
    initialWaitlistOfferId,
    initialWaitlistOfferGroupId,
    initialWaitlistSlotId,
  ]);

  useEffect(() => {
    const packageSlug = promoContext?.packageSlug?.trim();
    if (!packageSlug) {
      setPackageSummary(null);
      return;
    }

    let isMounted = true;

    const fetchPackageSummary = async () => {
      try {
        const response = await fetch(
          `/api/packages/${encodeURIComponent(packageSlug)}`,
          { cache: "no-store" },
        );
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error ?? "Failed to load package.");
        }

        if (!isMounted) return;

        setPackageSummary({
          id: result.data.id,
          name: result.data.name,
          slug: result.data.slug,
          price_cents: result.data.price_cents,
          currency: result.data.currency,
          entryService: Array.isArray(result.data.services) && result.data.services[0]
            ? {
                id: result.data.services[0].id,
                name: result.data.services[0].name,
                duration_minutes: result.data.services[0].duration_minutes,
              }
            : null,
          includedServices: Array.isArray(result.data.services)
            ? result.data.services.map(
                (service: {
                  id: string;
                  name: string;
                  quantity: number;
                  duration_minutes: number;
                }) => ({
                  id: service.id,
                  name: service.name,
                  quantity: service.quantity,
                }),
              )
            : [],
        });
      } catch (error) {
        if (!isMounted) return;

        setPackageSummary(null);
        console.error("Package summary load failed:", error);
      }
    };

    void fetchPackageSummary();

    return () => {
      isMounted = false;
    };
  }, [promoContext?.packageSlug]);

  useEffect(() => {
    if (branches) {
      setAvailableBranches(branches);
    }
  }, [branches, setAvailableBranches]);

  useEffect(() => {
    if (specialists) {
      setAvailableSpecialists(specialists);
    }
  }, [specialists, setAvailableSpecialists]);

  useEffect(() => {
    if (!waitlistPrefill || !branches.length || selectedBranch) return;
    const matchingBranch = branches.find(
      (branch) => branch.id === waitlistPrefill.branch.id,
    );
    if (matchingBranch) {
      setSelectedBranch(matchingBranch);
    }
  }, [branches, selectedBranch, setSelectedBranch, waitlistPrefill]);

  useEffect(() => {
    if (waitlistPrefill || !initialBranchId || !branches.length || selectedBranch) return;
    const matchingBranch = branches.find((branch) => branch.id === initialBranchId);
    if (matchingBranch) {
      setSelectedBranch(matchingBranch);
    }
  }, [branches, initialBranchId, selectedBranch, setSelectedBranch, waitlistPrefill]);

  useEffect(() => {
    if (!waitlistPrefill || !specialists.length || selectedSpecialist) return;
    const matchingSpecialist = specialists.find(
      (specialist) => specialist.id === waitlistPrefill.specialist.id,
    );
    if (matchingSpecialist) {
      setSelectedSpecialist(matchingSpecialist);
    }
  }, [selectedSpecialist, setSelectedSpecialist, specialists, waitlistPrefill]);

  useEffect(() => {
    if (branchesError) {
      setError(branchesError);
      toast.error("We couldn't load available branches. Please try again.");
    }
  }, [branchesError, setError]);

  useEffect(() => {
    if (specialistsError) {
      setError(specialistsError);
      toast.error(
        "We couldn't load specialists for this branch. Please try again.",
      );
    }
  }, [specialistsError, setError]);

  useEffect(() => {
    if (currentStep !== 4) return;

    if (!selectedService || !selectedBranch || !selectedSpecialist || !selectedSlot) {
      if (!selectedBranch) {
        setError(
          `Please complete all ${isPackageBooking ? "package" : "booking"} steps before payment.`,
        );
        toast.error("Please select a branch first.");
      } else if (!selectedSpecialist) {
        setError(
          `Please complete all ${isPackageBooking ? "package" : "booking"} steps before payment.`,
        );
        toast.error("Please select a specialist first.");
      } else if (!selectedSlot) {
        setError(
          `Please complete all ${isPackageBooking ? "package" : "booking"} steps before payment.`,
        );
        toast.error("Please select a date and time first.");
      }
    }
  }, [
    currentStep,
    selectedBranch,
    selectedService,
    selectedSlot,
    selectedSpecialist,
    setError,
    isPackageBooking,
  ]);

  const validateStep = (step: number): string | null => {
    switch (step) {
      case 1:
        if (isLoading) {
          return isPackageBooking
            ? "Loading your selected package..."
            : "Loading your selected service...";
        }
        if (!selectedService) {
          return isPackageBooking
            ? "We couldn't load the selected package."
            : "We couldn't load the selected service.";
        }
        if (branchesLoading) return "Loading available branches...";
        if (branches.length === 0) {
          return isPackageBooking
            ? "No branches currently support intake for this package."
            : "No branches currently offer this service.";
        }
        return null;
      case 2:
        if (!selectedBranch) return "Please select a branch to continue.";
        if (specialistsLoading) return "Loading available specialists...";
        if (specialists.length === 0) {
          return isPackageBooking
            ? "No specialists are available at this branch for the selected package intake."
            : "No specialists are available at this branch for the selected service.";
        }
        return null;
      case 3:
        if (!selectedSpecialist) {
          return `Please select a specialist to continue with this ${isPackageBooking ? "package" : "booking"}.`;
        }
        return null;
      case 4:
        if (!selectedSlot) {
          return "Please select a date and time before proceeding to payment.";
        }
        return null;
      default:
        return null;
    }
  };

  const handleNextStep = () => {
    const validationError = validateStep(currentStep);
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }

    setError(undefined);
    nextStep();
  };

  const formatPriceRange = (service: Service) => {
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
  };

  const selectedPackageSummary =
    packageSummary && selectedService
      ? (() => {
          const packageContainsSelectedService = packageSummary.includedServices.some(
            (service) => service.id === selectedService.id,
          );

          if (!packageContainsSelectedService) {
            return null;
          }

          return {
            ...packageSummary,
            entryService: {
              id: selectedService.id,
              name: selectedService.name,
              duration_minutes: selectedService.duration_minutes,
            },
          };
        })()
      : null;

  const packagePriceLabel =
    packageSummary
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: packageSummary.currency,
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(packageSummary.price_cents / 100)
      : null;

  const isContinueDisabled =
    currentStep === 1
      ? isLoading || branchesLoading || !selectedBranch
      : currentStep === 2
        ? specialistsLoading || !selectedSpecialist
        : false;

  return (
    <main className="min-h-screen bg-[#F9F5F0] pt-28">
      <section className="px-[55px] pb-16">
        <div className="mx-auto max-w-5xl">
          <Link
            href={
              initialServiceSlug
                ? appendPromoContext(
                    `/services/${encodeURIComponent(initialServiceSlug)}`,
                    promoContext,
                  )
                : appendPromoContext("/services", promoContext)
            }
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-primary"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            {isPackageBooking ? "Back to Package Services" : "Back to Service Details"}
          </Link>

          <div className="mb-6">
            <h1 className="text-4xl font-bold text-gray-900">
              Book <span className="text-[#c9a961]">{isPackageBooking ? "Your Package" : "Your Service"}</span>
            </h1>
            <p className="mt-3 text-muted-foreground">
              {isPackageBooking
                ? "Complete each step to confirm your package intake appointment."
                : "Complete each step to confirm your appointment request."}
            </p>
          </div>

          <PromoContextBanner
            code={promoContext?.code}
            packageSlug={promoContext?.packageSlug}
            className="mb-6"
          />

          {selectedService ? (
            <Card className="mb-6 rounded-2xl border bg-muted/20">
              <CardContent className="py-4">
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">
                    {isPackageBooking
                      ? packageSummary?.name ?? selectedService.name
                      : selectedService.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isPackageBooking ? (
                      <>
                        {packagePriceLabel ?? formatPriceRange(selectedService)}
                        {" · "}
                        Intake service: {selectedService.name}
                      </>
                    ) : (
                      <>
                        {formatPriceRange(selectedService)} -{" "}
                        {selectedService.duration_minutes} mins
                      </>
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <div className="mb-8 flex items-center">
            {steps.map((label, index) => {
              const stepIndex = index + 1;
              const isActive = stepIndex === currentStep;
              const isDone = stepIndex < currentStep;
              const isLast = index === steps.length - 1;

              return (
                <div key={label} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={[
                        "flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
                        isDone
                          ? "border-[#6B4423] bg-[#6B4423] text-white"
                          : isActive
                            ? "border-[#C9A96E] bg-[#C9A96E] text-white"
                            : "border-gray-200 bg-white text-gray-400",
                      ].join(" ")}
                    >
                      {isDone ? (
                        <CheckIcon className="h-4 w-4 stroke-[3]" />
                      ) : (
                        stepIndex
                      )}
                    </div>
                    <span
                      className={[
                        "whitespace-nowrap text-xs font-medium",
                        isDone
                          ? "text-[#6B4423]"
                          : isActive
                            ? "text-[#C9A96E]"
                            : "text-gray-400",
                      ].join(" ")}
                    >
                      {label}
                    </span>
                  </div>
                  {!isLast ? (
                    <div
                      className={[
                        "mx-2 mb-5 h-[2px] flex-1 rounded-full transition-colors",
                        isDone ? "bg-[#6B4423]" : "bg-gray-200",
                      ].join(" ")}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>

          <Card className="rounded-3xl border shadow-sm">
            <CardHeader>
              <CardTitle>{steps[currentStep - 1]}</CardTitle>
            </CardHeader>
              <CardContent className="space-y-5">
              {waitlistPrefill ? (
                <div className="rounded-2xl border border-[#C9A96E]/30 bg-[#F8F3EA] px-4 py-3 text-sm text-[#6B4423]">
                  Your slot offer is prefilled below. Availability will be checked again when you complete booking.
                </div>
              ) : null}

              {currentStep === 1 ? (
                isLoading || !selectedService ? (
                  <LoadingScreen
                    compact
                    title={isPackageBooking ? "Loading your package" : "Loading your service"}
                    description={
                      isPackageBooking
                        ? "Preparing the booking options for the selected package."
                        : "Preparing the booking options for the selected service."
                    }
                  />
                ) : (
                  <BranchSelector
                    branches={branches}
                    selectedBranch={selectedBranch}
                    onBranchSelect={setSelectedBranch}
                    isLoading={branchesLoading}
                  />
                )
              ) : null}

              {currentStep === 2 ? (
                <SpecialistSelector
                  specialists={specialists}
                  selectedSpecialist={selectedSpecialist}
                  onSpecialistSelect={setSelectedSpecialist}
                  isLoading={specialistsLoading}
                />
              ) : null}

              {currentStep === 3 &&
              selectedService &&
              selectedBranch &&
              selectedSpecialist ? (
                <BookingForm
                  service={selectedService}
                  branch={selectedBranch}
                  specialist={selectedSpecialist}
                  mode={isPackageBooking ? "package" : "service"}
                  onSlotSelected={(slot) => {
                    setSelectedSlot(slot);
                    nextStep();
                  }}
                />
              ) : null}

              {currentStep === 4 &&
              selectedService &&
              selectedBranch &&
              selectedSpecialist &&
              selectedSlot ? (
                <PaymentStep
                  service={selectedService}
                  branch={selectedBranch}
                  specialist={selectedSpecialist}
                  selectedSlot={selectedSlot}
                  waitlistOfferId={waitlistPrefill?.offer.id ?? null}
                  waitlistOfferGroupId={waitlistPrefill?.group?.id ?? null}
                  waitlistNotificationId={initialWaitlistNotificationId ?? null}
                  offerId={promoContext?.offerId}
                  code={promoContext?.code}
                  packageSummary={selectedPackageSummary}
                  packageId={packageSummary?.id ?? null}
                  onPaymentSuccess={() => {
                    toast.success(
                      isPackageBooking ? "Package booking confirmed!" : "Booking confirmed!",
                    );
                    router.push("/customer/bookings");
                  }}
                  onBack={() => {
                    setSelectedSlot(null);
                    previousStep();
                  }}
                />
              ) : null}

              {error ? (
                <p className="text-sm font-medium text-destructive">{error}</p>
              ) : null}

              <div className="flex justify-between pt-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={currentStep === 1}
                  onClick={() => {
                    setError(undefined);
                    if (currentStep === 4) {
                      setSelectedSlot(null);
                    }
                    previousStep();
                  }}
                >
                  Back
                </Button>
                {currentStep < 3 ? (
                  <Button
                    type="button"
                    onClick={handleNextStep}
                    disabled={isContinueDisabled}
                  >
                    Continue
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
