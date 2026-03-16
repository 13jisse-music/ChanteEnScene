import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY!
const R2_SECRET_KEY = process.env.R2_SECRET_KEY!
const R2_BUCKET = process.env.R2_BUCKET || 'chantenscene-assets'
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://pub-37ec13efdccb46f2bfdd62ab95fbd4d0.r2.dev'

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY,
    secretAccessKey: R2_SECRET_KEY,
  },
})

export async function getR2UploadUrl(key: string, contentType?: string) {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ...(contentType ? { ContentType: contentType } : {}),
  })
  const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 })
  const publicUrl = `${R2_PUBLIC_URL}/${key}`
  return { signedUrl, publicUrl }
}

export async function uploadToR2(key: string, body: Buffer | Uint8Array, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  })
  await r2Client.send(command)
  return `${R2_PUBLIC_URL}/${key}`
}
