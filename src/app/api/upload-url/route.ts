import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Generates a signed upload URL via Supabase Storage.
 * The client can then PUT the file directly to this URL.
 * Supabase handles CORS correctly (Access-Control-Allow-Origin: *).
 * Files are stored on Supabase first, then migrated to R2 when validated.
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

    const filePath = path

    // Create a signed upload URL using Supabase service role (bypasses RLS)
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUploadUrl(filePath)

    if (error || !data) {
      console.error('Signed URL error:', error?.message)
      return NextResponse.json({ error: 'Erreur préparation upload' }, { status: 500 })
    }

    // Public URL for reading after upload
    const { data: publicData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(filePath)

    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: 'supabase',
      publicUrl: publicData.publicUrl,
    })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
