import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/jury/', '/api/'],
      },
    ],
    sitemap: 'https://www.chantenscene.fr/sitemap.xml',
  }
}
