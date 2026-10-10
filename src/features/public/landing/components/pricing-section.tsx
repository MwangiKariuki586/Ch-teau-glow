"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PRICING_PACKAGES } from "@/features/public/shared/pricing-packages";

function getPlanHref(name: string) {
  const normalizedName = name.trim().toLowerCase();

  if (normalizedName.includes('starter')) {
    return '/plans#starter';
  }

  if (normalizedName.includes('radiance')) {
    return '/plans#radiance';
  }

  if (normalizedName.includes('luxury')) {
    return '/plans#luxury';
  }

  return '/plans';
}

export function PricingSection() {
  const packages = PRICING_PACKAGES;

  return (
    <section className="w-full bg-linear-to-b from-gray-50 to-white py-10 sm:py-12 lg:py-16">
      <div className="px-4 sm:px-6 lg:px-13.75">
        {/* Header */}
        <div className="mb-10 text-center sm:mb-12 lg:mb-16">
          <Badge className="mb-4 bg-[#c9a961] text-xs text-white hover:bg-[#b8985a] sm:text-sm">
            Pricing & Packages
          </Badge>
          <h2 className="mb-4 text-3xl font-bold text-gray-900 sm:text-4xl md:text-5xl">
            Choose Your Beauty Journey
          </h2>
          <p className="mx-auto max-w-2xl text-sm text-gray-600 sm:text-base lg:text-lg">
            Flexible packages designed for every need. All prices are starting
            from and can be customized with premium add-ons.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {packages.map((pkg, idx) => {
            const Icon = pkg.icon;
            const isFeatured = idx === 1;
            return (
              <Card
                key={pkg.name}
                className={`relative flex flex-col overflow-hidden transition-all duration-300 ${
                  isFeatured
                    ? "border-2 border-[#c9a961] bg-primary shadow-2xl shadow-[#c9a961]/30 hover:shadow-[#c9a961]/50 hover:shadow-2xl"
                    : "border border-gray-200 hover:border-[#c9a961] hover:shadow-xl lg:my-6"
                }`}
              >
                {/* Popular Badge */}
                {isFeatured && (
                  <div className="absolute right-0 top-0 bg-linear-to-r from-[#c9a961] to-[#b8985a] px-3 py-1 text-[10px] font-semibold text-white sm:px-4 sm:text-xs">
                    MOST POPULAR
                  </div>
                )}

                <div className={`flex flex-1 flex-col ${isFeatured ? "p-5 sm:p-8 lg:p-10" : "p-5 sm:p-6 lg:p-8"}`}>
                  {/* Icon & Name */}
                  <div className="mb-5 flex items-center gap-3 sm:mb-6">
                    <div className={`rounded-full p-2.5 sm:p-3 ${isFeatured ? "bg-[#c9a961]/20" : "bg-[#6B4423]/10"}`}>
                      <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${isFeatured ? "text-[#c9a961]" : "text-[#6B4423]"}`} />
                    </div>
                    <div>
                      <h3 className={`text-xl font-bold sm:text-2xl ${isFeatured ? "text-primary-foreground" : "text-gray-900"}`}>
                        {pkg.name}
                      </h3>
                      <p className={`text-sm ${isFeatured ? "text-[#c9a961]/80" : "text-gray-600"}`}>{pkg.tagline}</p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-5 sm:mb-6">
                    <div className="flex items-baseline gap-2">
                      <span className={`text-sm ${isFeatured ? "text-primary-foreground/70" : "text-gray-600"}`}>From</span>
                      <span className={`text-3xl font-bold sm:text-4xl ${isFeatured ? "text-[#c9a961]" : "text-[#6B4423]"}`}>
                        AED {pkg.priceFrom}
                      </span>
                    </div>
                    {pkg.promo && (
                      <Badge
                        variant="outline"
                        className="mt-2 border-[#c9a961] text-[#c9a961]"
                      >
                        {pkg.promo}
                      </Badge>
                    )}
                  </div>

                  {/* Features */}
                  <div className="mb-5 flex-1 space-y-3 sm:mb-6">
                    <p className={`text-sm font-semibold ${isFeatured ? "text-primary-foreground" : "text-gray-900"}`}>
                      What's Included:
                    </p>
                    {pkg.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <Check className={`mt-0.5 h-5 w-5 shrink-0 ${isFeatured ? "text-[#c9a961]" : "text-green-600"}`} />
                        <span className={`text-sm ${isFeatured ? "text-primary-foreground/80" : "text-gray-700"}`}>{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Add-ons */}
                  <div className={`mb-5 rounded-lg p-3.5 sm:mb-6 sm:p-4 ${isFeatured ? "bg-white/10" : "bg-gray-50"}`}>
                    <p className={`mb-3 text-sm font-semibold ${isFeatured ? "text-primary-foreground" : "text-gray-900"}`}>
                      Available Add-ons:
                    </p>
                    <div className="space-y-2">
                      {pkg.addOns.map((addon, index) => (
                        <div
                          key={index}
                          className="flex items-start justify-between gap-3 text-sm"
                        >
                          <span className={isFeatured ? "text-primary-foreground/70" : "text-gray-700"}>{addon.name}</span>
                          <span className={`font-semibold ${isFeatured ? "text-[#c9a961]" : "text-[#6B4423]"}`}>
                            +AED {addon.price}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CTA Button - Always at bottom */}
                  <div className="mt-auto">
                    <Button
                      asChild
                      className={`w-full ${isFeatured ? "bg-[#c9a961] text-[#3B2010] font-bold hover:bg-[#b8985a]" : "bg-[#6B4423] text-white hover:bg-[#5A3A1D]"}`}
                    >
                      <Link href={getPlanHref(pkg.name)}>
                        Explore Plan
                      </Link>
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Bottom Note */}
        <div className="mt-10 text-center sm:mt-12">
          <p className="text-xs text-gray-600 sm:text-sm">
            All packages can be customized to your specific needs.{" "}
            <button className="font-semibold text-[#6B4423] hover:underline">
              Contact us
            </button>{" "}
            for a personalized quote.
          </p>
        </div>
      </div>
    </section>
  );
}
