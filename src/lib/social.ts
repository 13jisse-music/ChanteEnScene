const GRAPH_API = 'https://graph.facebook.com/v24.0'

// ─── Facebook ───────────────────────────────────────────────

/** Récupère l'ID de la Page Facebook liée au token */
export async function getFacebookPageId(): Promise<string> {
  const token = process.env.FACEBOOK_PAGE_TOKEN
  if (!token) throw new Error('FACEBOOK_PAGE_TOKEN manquant')

  const res = await fetch(`${GRAPH_API}/me?fields=id,name&access_token=${token}`)
  const data = await res.json()
  if (data.error) throw new Error(`FB API: ${data.error.message}`)
  return data.id
}

/** Publie un post texte sur la Page Facebook */
export async function postToFacebook(message: string, link?: string): Promise<{ id: string }> {
  const token = process.env.FACEBOOK_PAGE_TOKEN
  if (!token) throw new Error('FACEBOOK_PAGE_TOKEN manquant')

  const pageId = await getFacebookPageId()

  const body: Record<string, string> = { message, access_token: token }
  if (link) body.link = link

  const res = await fetch(`${GRAPH_API}/${pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  if (data.error) throw new Error(`FB Post: ${data.error.message}`)
  return data
}

/** Publie une photo avec légende sur la Page Facebook */
export async function postPhotoToFacebook(
  imageUrl: string,
  caption: string
): Promise<{ id: string }> {
  const token = process.env.FACEBOOK_PAGE_TOKEN
  if (!token) throw new Error('FACEBOOK_PAGE_TOKEN manquant')

  const pageId = await getFacebookPageId()

  const res = await fetch(`${GRAPH_API}/${pageId}/photos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: imageUrl,
      caption,
      access_token: token,
    }),
  })

  const data = await res.json()
  if (data.error) throw new Error(`FB Photo: ${data.error.message}`)
  return data
}

// ─── Instagram ──────────────────────────────────────────────

/** Récupère l'ID du compte Instagram Business lié à la Page Facebook */
export async function getInstagramAccountId(): Promise<string> {
  const token = process.env.FACEBOOK_PAGE_TOKEN
  if (!token) throw new Error('FACEBOOK_PAGE_TOKEN manquant')

  const pageId = await getFacebookPageId()

  const res = await fetch(
    `${GRAPH_API}/${pageId}?fields=instagram_business_account&access_token=${token}`
  )
  const data = await res.json()
  if (data.error) throw new Error(`IG Account: ${data.error.message}`)
  if (!data.instagram_business_account?.id) {
    throw new Error('Aucun compte Instagram Business lié à cette Page Facebook')
  }
  return data.instagram_business_account.id
}

/** Publie une image avec légende sur Instagram */
export async function postToInstagram(
  imageUrl: string,
  caption: string
): Promise<{ id: string }> {
  const token = process.env.FACEBOOK_PAGE_TOKEN
  if (!token) throw new Error('FACEBOOK_PAGE_TOKEN manquant')

  const igAccountId = await getInstagramAccountId()

  // Étape 1 : Créer le container media
  const createRes = await fetch(`${GRAPH_API}/${igAccountId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_url: imageUrl,
      caption,
      access_token: token,
    }),
  })

  const createData = await createRes.json()
  if (createData.error) throw new Error(`IG Media: ${createData.error.message}`)

  // Étape 2 : Publier le container
  const publishRes = await fetch(`${GRAPH_API}/${igAccountId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creation_id: createData.id,
      access_token: token,
    }),
  })

  const publishData = await publishRes.json()
  if (publishData.error) throw new Error(`IG Publish: ${publishData.error.message}`)
  return publishData
}

// ─── Token Management ───────────────────────────────────────

/** Convertit un token courte durée en token longue durée (~60 jours) */
export async function exchangeForLongLivedToken(shortLivedToken: string): Promise<string> {
  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET
  if (!appId || !appSecret) throw new Error('META_APP_ID ou META_APP_SECRET manquant')

  const res = await fetch(
    `${GRAPH_API}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`
  )

  const data = await res.json()
  if (data.error) throw new Error(`Token Exchange: ${data.error.message}`)
  return data.access_token
}

/** Récupère un Page Access Token longue durée à partir d'un User Token longue durée */
export async function getLongLivedPageToken(longLivedUserToken: string): Promise<string> {
  const res = await fetch(
    `${GRAPH_API}/me/accounts?access_token=${longLivedUserToken}`
  )

  const data = await res.json()
  if (data.error) throw new Error(`Page Token: ${data.error.message}`)
  if (!data.data?.length) throw new Error('Aucune Page trouvée')

  // Retourne le token de la première page
  return data.data[0].access_token
}

// ─── Publication combinée FB + IG ───────────────────────────

export interface SocialPostResult {
  facebook?: { id: string } | { error: string }
  instagram?: { id: string } | { error: string }
}

/** Publie sur Facebook ET Instagram en une seule fois */
export async function publishEverywhere(
  message: string,
  imageUrl?: string,
  link?: string
): Promise<SocialPostResult> {
  const result: SocialPostResult = {}

  // Facebook
  try {
    if (imageUrl) {
      result.facebook = await postPhotoToFacebook(imageUrl, message)
    } else {
      result.facebook = await postToFacebook(message, link)
    }
  } catch (err) {
    result.facebook = { error: err instanceof Error ? err.message : 'Erreur Facebook' }
  }

  // Instagram (nécessite obligatoirement une image)
  if (imageUrl) {
    try {
      result.instagram = await postToInstagram(imageUrl, message)
    } catch (err) {
      result.instagram = { error: err instanceof Error ? err.message : 'Erreur Instagram' }
    }
  }

  return result
}
