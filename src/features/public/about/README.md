# About Page Feature

This feature contains all components for the About Us page of the BROWZ beauty and aesthetics marketplace.

## Structure

```
about/
├── components/
│   ├── hero-section.tsx           # Hero with background image
│   ├── stats-section.tsx          # Company statistics
│   ├── services-section.tsx       # Core services showcase
│   ├── departments-section.tsx    # Department overview
│   ├── values-section.tsx         # Core values grid
│   ├── philosophy-section.tsx     # Company philosophy
│   ├── cta-section.tsx            # Call-to-action
│   └── index.ts                   # Component exports
├── index.ts                       # Feature exports
└── README.md                      # This file
```

## Components

### HeroSection
- Full-width background image
- Company tagline and description
- CTA buttons (Explore Services, Book Appointment)
- Responsive text sizing

### StatsSection
- "What is BROWZ?" heading
- Company description
- 4 stat cards:
  - 10+ Years of Excellence
  - 5 Branch Locations
  - 50+ Expert Specialists
  - 5000+ Happy Clients

### ServicesSection
- 5 core services with images:
  - Medical Aesthetics & Injectables
  - Advanced Facials & Skincare Laser
  - Semi-Permanent Makeup
  - Grooming & Beauty Services
  - Retail Skincare & Beauty Products
- Image hover effects
- Icon badges
- Responsive grid layout

### DepartmentsSection
- 8 department cards with gradient icons:
  - Clinic Operations
  - Call Center & Bookings
  - Front Desk Services
  - Medical Team
  - HR & People Operations
  - Marketing & CRM
  - Finance & Reporting
  - Leadership & Management
- Hover effects
- Color-coded icons

### ValuesSection
- 6 core values:
  - Precision
  - Consistency
  - Human Care
  - Control & Safety
  - Innovation
  - People-Led Delivery
- Icon animations on hover
- Detailed descriptions

### PhilosophySection
- Company philosophy quote
- 3 pillars:
  - Best Treatments
  - Friendly Environment
  - Elite Team
- Dark gradient background
- Glass morphism cards

### CTASection
- Final call-to-action
- Two buttons:
  - Book Your Appointment
  - Contact Us
- Gradient background card

## Styling

All components use:
- Shadcn UI components (Card, Button)
- Tailwind CSS utility classes
- Brand colors:
  - Primary: `#6B4423` (brown)
  - Accent: `#c9a961` (gold)
  - Gradients for visual interest

## Icons

Using Lucide React icons:
- Building2, Phone, UserCheck, Stethoscope
- Briefcase, TrendingUp, DollarSign, BarChart3
- Target, CheckCircle, Heart, Shield, Zap, Users
- Syringe, Sparkles, Award, ShoppingBag

## Usage

```tsx
import { Navbar } from '@/features/navigation';
import {
  HeroSection,
  StatsSection,
  ServicesSection,
  DepartmentsSection,
  ValuesSection,
  PhilosophySection,
  CTASection,
} from '@/features/about';

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <StatsSection />
        <ServicesSection />
        <DepartmentsSection />
        <ValuesSection />
        <PhilosophySection />
        <CTASection />
      </main>
    </>
  );
}
```

## Responsive Design

- Desktop: Full layout with multi-column grids
- Tablet: Adjusted columns (2-3 columns)
- Mobile: Single column stacking

## Images

All images use:
- Unsplash URLs (configured in next.config.ts)
- Next.js Image component for optimization
- Proper alt text for accessibility
- Hover scale effects

## Animations

- Smooth transitions on hover
- Scale effects on images
- Icon color changes
- Shadow elevations

## Accessibility

- Semantic HTML structure
- Proper heading hierarchy
- Alt text on images
- Keyboard navigation support
- ARIA labels where needed

## Future Enhancements

- Add team member profiles
- Include branch location map
- Add timeline/history section
- Implement video testimonials
- Add awards and certifications
- Include press mentions
- Add career opportunities section
