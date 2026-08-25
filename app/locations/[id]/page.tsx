import { redirect } from 'next/navigation';
export default async function LocDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/locations/${id}/edit`);
}
