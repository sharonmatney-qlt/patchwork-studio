import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { getMake, getMakePhotos } from '@/app/actions/makes'
import MakeDetailClient from './make-detail-client'

export default async function MakeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { id } = await params
  const [make, photos] = await Promise.all([getMake(id), getMakePhotos(id)])
  if (!make) notFound()

  return <MakeDetailClient make={make} initialPhotos={photos} />
}
