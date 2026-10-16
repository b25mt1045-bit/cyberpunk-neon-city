import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { content } from './src/content'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/**
 * SEO from content.ts, the single source of truth: fills the {{TOKENS}} in index.html
 * (title, description, Open Graph / Twitter tags, JSON-LD, a <noscript> copy of the content)
 * and emits robots.txt and sitemap.xml at build time.
 */
function seo(siteUrl: string): Plugin {
  const url = siteUrl.replace(/\/$/, '')
  const title = `${content.name} — ${content.title}`
  const description = `${content.name} — ${content.title}. ${content.tagline} An interactive 3D portfolio: fly through a neon megacity to explore projects, skills and contact.`

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        name: content.name,
        jobTitle: content.title,
        description: content.tagline,
        url,
        email: content.contact.email,
        sameAs: content.contact.links.map((l) => l.href).filter((h) => h.startsWith('http')),
      },
      { '@type': 'WebSite', name: title, url },
    ],
  }).replace(/</g, '\\u003c')

  const noscript = `<noscript>
      <main style="max-width:40rem;margin:0 auto;padding:2rem 1rem;font-family:system-ui,sans-serif;line-height:1.6;color:#e8f6ff">
        <h1>${esc(content.name)}</h1>
        <p>${esc(content.title)}. ${esc(content.tagline)}</p>
        <p>This portfolio is an interactive 3D city and needs JavaScript. The same content:</p>
        ${content.bio.map((p) => `<p>${esc(p)}</p>`).join('\n        ')}
        <h2>Projects</h2>
        <ul>${content.projects
          .map((p) => `<li><strong>${esc(p.title)}</strong>: ${esc(p.description)} (${esc(p.tech.join(', '))})</li>`)
          .join('')}</ul>
        <h2>Contact</h2>
        <ul>${content.contact.links.map((l) => `<li><a style="color:#00ffc8" href="${esc(l.href)}">${esc(l.label)}</a></li>`).join('')}</ul>
      </main>
    </noscript>`

  const tokens: Record<string, string> = {
    TITLE: esc(title),
    DESCRIPTION: esc(description),
    SITE_URL: esc(url),
    SITE_NAME: esc(content.name),
    JSON_LD: jsonLd,
    NOSCRIPT: noscript,
  }

  return {
    name: 'portfolio-seo',
    transformIndexHtml: (html) => html.replace(/\{\{([A-Z_]+)\}\}/g, (m, k: string) => tokens[k] ?? m),
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\n\nSitemap: ${url}/sitemap.xml\n` })
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${url}/</loc></url>\n</urlset>\n`,
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'VITE_')
  return {
    plugins: [react(), tailwindcss(), seo(env.VITE_SITE_URL || 'https://example.com')],
    build: {
      // the three.js chunk is large by nature; it is loaded after the boot loader paints
      chunkSizeWarningLimit: 1200,
      rolldownOptions: {
        output: {
          codeSplitting: {
            // the 3D stack gets its own chunk so the entry (loader, HUD, semantic document)
            // never waits for it; React sits in a higher-priority group so it stays out of it
            groups: [
              { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler|zustand)[\\/]/, priority: 40 },
              { name: 'three', test: /node_modules[\\/](three|@react-three|postprocessing|three-stdlib|maath|meshline|camera-controls|troika)[\\/]/, priority: 30 },
            ],
          },
        },
      },
    },
  }
})
