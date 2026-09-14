// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Static output only: no server functions, no API routes, nothing to hit at the origin.
export default defineConfig({
  site: process.env.SITE_URL ?? 'https://elovoide.vercel.app',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [sitemap()],
  // Shiki injects inline styles that the CSP would block; the blog has no code blocks anyway.
  markdown: { syntaxHighlight: false },
  image: {
    domains: [],
  },
  security: {
    // Emits a CSP <meta> with hashes for every script/style Astro renders.
    // frame-ancestors & friends can't live in <meta>; they are set as headers in vercel.json.
    csp: {
      algorithm: 'SHA-256',
      directives: [
        "default-src 'self'",
        "img-src 'self' data: https://a.espncdn.com",
        "connect-src 'self' https://site.api.espn.com",
        "font-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'none'",
      ],
    },
  },
});
