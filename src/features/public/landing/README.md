# Landing Page Feature

This feature contains all components for the main landing page of the BROWZ beauty and aesthetics marketplace.

## Structure

```
landing/
├── components/
│   ├── hero-section.tsx           # Hero carousel with slides
│   ├── categories-section.tsx     # Service categories display
│   ├── featured-services-section.tsx  # Featured service cards
│   ├── best-sellers-section.tsx   # Best-selling services with tabs
│   ├── about-section.tsx          # About section with stats
│   ├── testimonials-section.tsx   # Customer testimonials
│   ├── faq-section.tsx            # FAQ accordion
│   └── index.ts                   # Component exports
├── index.ts                       # Feature exports
└── README.md                      # This file
```

## Components

### HeroSection
- Carousel with 3 slides
- Auto-play functionality (5s interval)
- Manual navigation with prev/next buttons
- Slide indicators
- CTA buttons for booking and shopping

### CategoriesSection
- Displays 5 service categories
- Circular image cards with hover effects
- Links to category pages

### FeaturedServicesSection
- Two featured service cards
- "Luminous Alchemy" (products)
- "Bespoke Wellness" (services)
- Full-width image backgrounds with overlay content

### BestSellersSection
- Tabbed interface (All, Facial Aesthetics, Laser, Makeup)
- Grid of service cards
- Hover actions (wishlist, view, cart)
- Star ratings and pricing

### AboutSection
- Company introduction
- Stats card (categories, products, satisfaction)
- Image grid with decorative elements

### TestimonialsSection
- Customer avatars
- Featured testimonial card
- Navigation buttons for carousel

### FAQSection
- Accordion-style FAQ list
- Contact card for additional questions
- Styled with brand colors

## Styling

All components use:
- Shadcn UI components for consistency
- Tailwind CSS utility classes
- Brand colors:
  - Primary: `#6B4423` (brown)
  - Accent: `#c9a961` (gold)
  - Background: `white`, `gray-50`

## Usage

```tsx
import {
  HeroSection,
  CategoriesSection,
  FeaturedServicesSection,
  BestSellersSection,
  AboutSection,
  TestimonialsSection,
  FAQSection,
} from '@/features/landing';

export default function Home() {
  return (
    <main>
      <HeroSection />
      <CategoriesSection />
      <FeaturedServicesSection />
      <BestSellersSection />
      <AboutSection />
      <TestimonialsSection />
      <FAQSection />
    </main>
  );
}
```

## Future Enhancements

- Add animation variants for scroll-triggered animations
- Implement real data fetching for services
- Add loading states
- Implement testimonial carousel functionality
- Add image optimization and lazy loading
