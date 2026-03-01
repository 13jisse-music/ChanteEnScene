import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

function htmlPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — ChanteEnScène</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0618;color:#fff;font-family:Inter,sans-serif;text-align:center;padding:2rem}
  .card{background:#161228;border:1px solid #2a2545;border-radius:1rem;padding:2.5rem;max-width:400px}
  h1{font-size:1.25rem;margin:0 0 .75rem}
  p{color:rgba(255,255,255,.5);font-size:.875rem;margin:0}
  a{color:#e91e8c;text-decoration:none;display:inline-block;margin-top:1.5rem;font-size:.875rem}
</style></head>
<body><div class="card">
  <h1>${title}</h1>
  <p>${message}</p>
  <a href="/">Retour au site</a>
</div></body></html>`
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return new NextResponse(htmlPage('Lien invalide', 'Le lien de désinscription est invalide.'), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  const supabase = createAdminClient()

  // Find subscriber email before deactivating
  const { data: sub } = await supabase
    .from('email_subscribers')
    .select('email')
    .eq('unsubscribe_token', token)
    .single()

  const { error } = await supabase
    .from('email_subscribers')
    .update({ is_active: false })
    .eq('unsubscribe_token', token)

  if (error) {
    return new NextResponse(htmlPage('Erreur', 'Une erreur est survenue.'), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  // Log unsubscribe event (fire-and-forget)
  if (sub?.email) {
    supabase.from('email_events').insert({
      campaign_id: null as unknown as string, // no specific campaign
      subscriber_email: sub.email,
      event_type: 'unsubscribe',
    }).then(() => {})
  }

  return new NextResponse(
    htmlPage('Désinscription confirmée', 'Vous ne recevrez plus de notifications par email.'),
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )
}
