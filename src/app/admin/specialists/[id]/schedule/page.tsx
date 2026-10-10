import { SpecialistSchedule } from '@/features/admin/specialists/components/specialist-schedule';

export default async function SpecialistSchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SpecialistSchedule specialistId={id} />;
}
