'use client';

import { useParams } from 'next/navigation';
import { GroundClosuresView } from '@/components/grounds/ground-closures-view';

export default function ManagerGroundClosuresPage() {
  const { id } = useParams<{ id: string }>();
  return <GroundClosuresView groundId={id} backHref="/manager/grounds" />;
}
