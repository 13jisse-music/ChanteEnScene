import { NextResponse } from 'next/server'
import { exchangeForLongLivedToken, getLongLivedPageToken } from '@/lib/social'

export async function POST(request: Request) {
  // Protection basique — en prod, ajouter une vraie auth admin
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { short_lived_token } = await request.json()

    if (!short_lived_token) {
      return NextResponse.json(
        { error: 'short_lived_token requis dans le body' },
        { status: 400 }
      )
    }

    // Étape 1 : Convertir en token utilisateur longue durée (~60 jours)
    const longLivedUserToken = await exchangeForLongLivedToken(short_lived_token)

    // Étape 2 : Récupérer le Page Token longue durée (n'expire jamais)
    const longLivedPageToken = await getLongLivedPageToken(longLivedUserToken)

    return NextResponse.json({
      success: true,
      long_lived_user_token: longLivedUserToken,
      long_lived_page_token: longLivedPageToken,
      message:
        'Copiez le long_lived_page_token dans FACEBOOK_PAGE_TOKEN sur Vercel. Ce token n\'expire pas tant que vous êtes admin de la Page.',
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur inconnue' },
      { status: 500 }
    )
  }
}
