'use client';

import { useRouter } from 'next/navigation';
import { SpecialistsList } from './specialists-list';

interface Specialist {
  id: string;
  name: string;
  title: string;
  email: string | null;
  phone: string | null;
  bio: string | null;
  image_url: string | null;
  is_active: boolean;
  specialties: string[] | null;
  branch_id: string;
  branches?: { id: string; name: string; city: string; country: string };
  specialist_services?: { service_id: string; is_active: boolean; services: { id: string; name: string } | null }[];
}

interface SpecialistsPageWrapperProps {
  specialists: Specialist[];
  services: { id: string; name: string }[];
}

export function SpecialistsPageWrapper({ specialists, services }: SpecialistsPageWrapperProps) {
  const router = useRouter();

  return (
    <SpecialistsList
      specialists={specialists}
      services={services}
      onSpecialistDeleted={() => router.refresh()}
    />
  );
}