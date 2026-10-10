import {
  HeroSection,
  FounderSection,
  VideoShowcaseSection,
  MissionExpertiseSection,
  PressSection,
  DepartmentsSection,
  CTASection,
} from '@/features/public/about';

export default function AboutPage() {
  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-[#F9F5F0] pt-20">
      <HeroSection />
      <MissionExpertiseSection />
      <VideoShowcaseSection />
      <PressSection />
      <DepartmentsSection />
      <FounderSection />
      {/* <CTASection /> */}
    </main>
  );
}
