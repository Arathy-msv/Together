import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

const PUBLIC_ROOT = String.raw`covers|games|giving-tree|docs|receipts|orgs|favicon\.svg`

/**
 * Rewrites root-absolute public asset paths so a project-site build can find them.
 * A base of `/` leaves the source unchanged, which is what local dev and tests use.
 */
export function prefixPublicAssetUrls(code: string, base: string): string {
  const normalized = !base || base === '/' ? '/' : base.endsWith('/') ? base : `${base}/`
  if (normalized === '/') return code
  const quoted = new RegExp(`(['"\`])\\/(?!\\/)(?:${PUBLIC_ROOT})\\b`, 'g')
  const unquoted = new RegExp(`url\\(\\/(?!\\/)(?:${PUBLIC_ROOT})\\b`, 'g')
  return code
    .replace(quoted, (match, quote: string) => `${quote}${normalized}${match.slice(2)}`)
    .replace(unquoted, (match) => `url(${normalized}${match.slice(5)}`)
}

export function prefixPublicAssets(): Plugin {
  let base = '/'
  let outDir = ''
  return {
    name: 'prefix-public-assets',
    enforce: 'pre',
    configResolved(config) {
      base = config.base
      outDir = path.resolve(config.root, config.build.outDir)
    },
    transform(code, id) {
      if (id.includes('node_modules') || !/\.(tsx?|css)(\?|$)/.test(id)) return null
      const next = prefixPublicAssetUrls(code, base)
      return next === code ? null : { code: next, map: null }
    },
    closeBundle() {
      if (!base || base === '/' || !outDir) return
      const index = path.join(outDir, 'index.html')
      if (!fs.existsSync(index)) return
      fs.copyFileSync(index, path.join(outDir, '404.html'))
      fs.writeFileSync(path.join(outDir, '.nojekyll'), '')
    },
  }
}
