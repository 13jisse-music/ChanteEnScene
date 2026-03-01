import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Generates a signed upload URL for a file.
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

    const supabase = createAdminClient()

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(path)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Also return the public URL for after upload
    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path)

    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: data.token,
      publicUrl: publicData.publicUrl,
    })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
