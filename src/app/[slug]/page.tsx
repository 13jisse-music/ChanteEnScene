import { redirect } from 'next/navigation'

type Params = Promise<{ slug: string }>

export default async function SessionRootPage({ params }: { params: Params }) {
  const { slug } = await params
  // The homepage at / handles session display — redirect there
  // Keep slug in case we need it for multi-city later
  void slug
  redirect('/')
}
