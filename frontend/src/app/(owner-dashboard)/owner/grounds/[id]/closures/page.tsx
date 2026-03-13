'use client';

import { useParams } from 'next/navigation';
import { GroundClosuresView } from '@/components/grounds/ground-closures-view';

export default function OwnerGroundClosuresPage() {
  const { id } = useParams<{ id: string }>();
  return <GroundClosuresView groundId={id} backHref={`/owner/grounds/${id}`} />;
}
