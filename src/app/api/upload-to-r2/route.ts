export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { uploadToR2 } from '@/lib/r2'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_PREFIXES = ['photos/', 'social/', 'backups/', 'candidates/', 'sponsors/']

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const key = formData.get('key') as string | null

    if (!file || !key) {
      return NextResponse.json({ error: 'File and key required' }, { status: 400 })
    }

    // Validate key prefix
    if (!ALLOWED_PREFIXES.some(p => key.startsWith(p))) {
      return NextResponse.json({ error: 'Invalid key prefix' }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const publicUrl = await uploadToR2(key, buffer, file.type || 'application/octet-stream')

    return NextResponse.json({ publicUrl })
  } catch (err) {
    console.error('R2 upload error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
