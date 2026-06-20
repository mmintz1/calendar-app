import { config } from '@/lib/config';
import BookingPageClient from './components/BookingPageClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ connect?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const { connect } = await searchParams;

  return (
    <BookingPageClient
      businessHours={{
        startHour: config.booking.startHour,
        endHour: config.booking.endHour,
      }}
      timezone={config.timezone}
      connectStatus={connect ?? null}
    />
  );
}
