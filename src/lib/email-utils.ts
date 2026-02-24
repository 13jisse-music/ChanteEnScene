/**
 * Wraps an internal path with the /go trampoline for email links.
 * On mobile, /go shows an "open the app" prompt before redirecting.
 * On desktop, /go redirects immediately (transparent).
 */
export function goUrl(siteUrl: string, path: string, ctx?: string): string {
  // Don't wrap absolute external URLs
  if (path.startsWith('http')) return path

  const params = new URLSearchParams()
  params.set('to', path)
  if (ctx) params.set('ctx', ctx)

  return `${siteUrl}/go?${params.toString()}`
}
