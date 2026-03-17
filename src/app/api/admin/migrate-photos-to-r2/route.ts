export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { uploadToR2, getR2PublicUrl } from '@/lib/r2'

const SUPABASE_STORAGE_PREFIX = 'https://xarrchsokuhobwqvcnkg.supabase.co/storage/v1/object/public/'

export async function GET(request: Request) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('role')
    .eq('email', user.email!)
    .maybeSingle()
  if (!adminUser) {
    return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
  }

  const url = new URL(request.url)
  const dryRun = url.searchParams.get('execute') !== 'true'
  const admin = createAdminClient()

  const results = {
    dryRun,
    photos: { found: 0, migrated: 0, errors: [] as string[] },
    candidates: { found: 0, migrated: 0, errors: [] as string[] },
    sponsors: { found: 0, migrated: 0, errors: [] as string[] },
  }

  // 1. Migrate photos table (photo_url)
  const { data: photos } = await admin
    .from('photos')
    .select('id, photo_url')
    .like('photo_url', `${SUPABASE_STORAGE_PREFIX}%`)

  if (photos) {
    results.photos.found = photos.length
    for (const photo of photos) {
      try {
        const r2Url = await migrateUrl(photo.photo_url, dryRun)
        if (!dryRun && r2Url) {
          await admin.from('photos').update({ photo_url: r2Url }).eq('id', photo.id)
          results.photos.migrated++
        } else if (dryRun) {
          results.photos.migrated++
        }
      } catch (err) {
        results.photos.errors.push(`Photo ${photo.id}: ${err instanceof Error ? err.message : 'Error'}`)
      }
    }
  }

  // 2. Migrate candidates table (photo_url, video_url - might already be on R2)
  const { data: candidates } = await admin
    .from('candidates')
    .select('id, slug, photo_url, video_url')

  if (candidates) {
    for (const c of candidates) {
      if (c.photo_url?.includes('supabase.co/storage')) {
        results.candidates.found++
        try {
          const r2Url = await migrateUrl(c.photo_url, dryRun)
          if (!dryRun && r2Url) {
            await admin.from('candidates').update({ photo_url: r2Url }).eq('id', c.id)
            results.candidates.migrated++
          } else if (dryRun) {
            results.candidates.migrated++
          }
        } catch (err) {
          results.candidates.errors.push(`Candidate ${c.slug}: photo - ${err instanceof Error ? err.message : 'Error'}`)
        }
      }
      if (c.video_url?.includes('supabase.co/storage')) {
        results.candidates.found++
        try {
          const r2Url = await migrateUrl(c.video_url, dryRun)
          if (!dryRun && r2Url) {
            await admin.from('candidates').update({ video_url: r2Url }).eq('id', c.id)
            results.candidates.migrated++
          } else if (dryRun) {
            results.candidates.migrated++
          }
        } catch (err) {
          results.candidates.errors.push(`Candidate ${c.slug}: video - ${err instanceof Error ? err.message : 'Error'}`)
        }
      }
    }
  }

  // 3. Migrate sponsors table (logo_url)
  const { data: sponsors } = await admin
    .from('sponsors')
    .select('id, name, logo_url')

  if (sponsors) {
    for (const s of sponsors) {
      if (s.logo_url?.includes('supabase.co/storage')) {
        results.sponsors.found++
        try {
          const r2Url = await migrateUrl(s.logo_url, dryRun)
          if (!dryRun && r2Url) {
            await admin.from('sponsors').update({ logo_url: r2Url }).eq('id', s.id)
            results.sponsors.migrated++
          } else if (dryRun) {
            results.sponsors.migrated++
          }
        } catch (err) {
          results.sponsors.errors.push(`Sponsor ${s.name}: ${err instanceof Error ? err.message : 'Error'}`)
        }
      }
    }
  }

  const totalFound = results.photos.found + results.candidates.found + results.sponsors.found
  const totalMigrated = results.photos.migrated + results.candidates.migrated + results.sponsors.migrated

  return NextResponse.json({
    message: dryRun
      ? `DRY RUN: ${totalFound} URLs Supabase trouvées, ${totalMigrated} migrables. Ajoutez ?execute=true pour migrer.`
      : `MIGRATION: ${totalMigrated}/${totalFound} URLs migrées vers R2.`,
    results,
  })
}

async function migrateUrl(supabaseUrl: string, dryRun: boolean): Promise<string | null> {
  // Extract the storage path from the Supabase URL
  // URL format: https://xxx.supabase.co/storage/v1/object/public/{bucket}/{path}
  const match = supabaseUrl.match(/\/storage\/v1\/object\/public\/([^?]+)/)
  if (!match) throw new Error(`Invalid Supabase storage URL: ${supabaseUrl}`)

  const storagePath = match[1] // e.g., "photos/photos/sessionId/file.jpg" or "photos/social/file.png"

  // Remove bucket name prefix if present (e.g., "photos/" prefix from bucket name)
  // The R2 key should be just the path without bucket name
  const key = storagePath.startsWith('photos/') ? storagePath : `photos/${storagePath}`

  if (dryRun) {
    return getR2PublicUrl(key)
  }

  // Download from Supabase
  const res = await fetch(supabaseUrl)
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`)

  const buffer = Buffer.from(await res.arrayBuffer())
  const contentType = res.headers.get('content-type') || 'application/octet-stream'

  // Upload to R2
  const r2Url = await uploadToR2(key, buffer, contentType)
  return r2Url
}
