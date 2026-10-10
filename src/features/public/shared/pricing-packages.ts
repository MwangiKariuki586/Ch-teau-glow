import { Sparkles, Crown, Star, type LucideIcon } from 'lucide-react';

export interface PricingPackage {
  name: string;
  tagline: string;
  priceFrom: number;
  icon: LucideIcon;
  features: string[];
  addOns: { name: string; price: number }[];
  promo?: string;
}

export const PRICING_PACKAGES: PricingPackage[] = [
  {
    name: 'Starter Glow',
    tagline: 'Perfect for first-timers',
    priceFrom: 299,
    icon: Sparkles,
    features: [
      'Basic Facial Treatment',
      'Skin Consultation',
      'Aftercare Products Kit',
      '1 Follow-up Session',
      'Email Support',
    ],
    addOns: [
      { name: 'LED Light Therapy', price: 50 },
      { name: 'Hydrating Mask', price: 35 },
    ],
  },
  {
    name: 'Radiance Bundle',
    tagline: 'Most popular choice',
    priceFrom: 599,
    icon: Crown,
    features: [
      'Advanced Facial Aesthetics',
      'Laser Treatment Session',
      'Semi-Permanent Makeup Touch-up',
      'Premium Skincare Products',
      '3 Follow-up Sessions',
      'Priority Booking',
      'Dedicated Specialist',
    ],
    addOns: [
      { name: 'Microneedling', price: 150 },
      { name: 'Chemical Peel', price: 120 },
      { name: 'Dermaplaning', price: 80 },
    ],
    promo: 'Save 20% - Limited Time',
  },
  {
    name: 'Luxury Experience',
    tagline: 'Ultimate transformation',
    priceFrom: 1299,
    icon: Star,
    features: [
      'Complete Aesthetic Package',
      'Multiple Laser Sessions',
      'Full Semi-Permanent Makeup',
      'Medical Grade Treatments',
      'Unlimited Follow-ups (6 months)',
      'VIP Concierge Service',
      'Home Care Kit Worth AED 500',
      'Complimentary Grooming Services',
    ],
    addOns: [
      { name: 'Body Contouring', price: 400 },
      { name: 'Advanced Injectables', price: 350 },
      { name: 'Skin Tightening', price: 300 },
    ],
    promo: 'Exclusive Package - Best Value',
  },
];
