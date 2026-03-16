import { NextResponse } from 'next/server'
import { getR2UploadUrl } from '@/lib/r2'

/**
 * Generates a signed upload URL for a file on Cloudflare R2.
 * The client can then PUT the file directly to this URL.
 * This bypasses RLS and works in ALL browsers (even Facebook WebView)
 * because it's a simple PUT to a unique URL, not a REST API call.
 */
export async function POST(request: Request) {
  try {
    const { path, bucket } = await request.json()

    if (!path || !bucket) {
      return NextResponse.json({ error: 'path and bucket required' }, { status: 400 })
    }

    // Only allow the 'candidates' bucket
    if (bucket !== 'candidates') {
      return NextResponse.json({ error: 'Invalid bucket' }, { status: 400 })
    }

    // R2 key: candidates/{slug}/video, candidates/{slug}/photo, etc.
    const r2Key = `${bucket}/${path}`

    const { signedUrl, publicUrl } = await getR2UploadUrl(r2Key)

    return NextResponse.json({
      signedUrl,
      token: 'r2',
      publicUrl,
    })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
