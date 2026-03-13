import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { getMake } from '@/app/actions/makes'
import MakeDetailClient from './make-detail-client'

export default async function MakeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { id } = await params
  const make = await getMake(id)
  if (!make) notFound()

  return <MakeDetailClient make={make} />
}
