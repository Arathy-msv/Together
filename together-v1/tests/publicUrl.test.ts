import assert from 'node:assert/strict'
import { test } from 'node:test'
import { absoluteAppUrl, appBase, appPath } from '../src/lib/publicUrl.ts'
import { prefixPublicAssetUrls } from '../scripts/prefix-public-assets.ts'

test('local builds keep root paths', () => {
  assert.equal(appBase(), '')
  assert.equal(appPath('/o/maple-grove'), '/o/maple-grove')
  assert.equal(appPath('data:image/png;base64,abc'), 'data:image/png;base64,abc')
  assert.equal(absoluteAppUrl('/o/maple-grove', 'http://127.0.0.1:4321'), 'http://127.0.0.1:4321/o/maple-grove')
})

test('a project-site base is added once to public assets', () => {
  const source = [
    "heroImage: '/covers/hero-library.jpg'",
    'const ART = "/giving-tree"',
    'return `/games/warmth/jacket-${color}-${kind}.jpg`',
    "background-image: url('/games/garden-bg.jpg');",
    "background: url(/giving-tree/sign.webp);",
    "href: '/o/maple-grove'",
  ].join('\n')
  const prefixed = prefixPublicAssetUrls(source, '/Together/')
  assert.match(prefixed, /'\/Together\/covers\/hero-library\.jpg'/)
  assert.match(prefixed, /"\/Together\/giving-tree"/)
  assert.match(prefixed, /`\/Together\/games\/warmth\/jacket-\$\{color\}-\$\{kind\}\.jpg`/)
  assert.match(prefixed, /url\('\/Together\/games\/garden-bg\.jpg'\)/)
  assert.match(prefixed, /url\(\/Together\/giving-tree\/sign\.webp\)/)
  assert.match(prefixed, /href: '\/o\/maple-grove'/)
  assert.equal(prefixPublicAssetUrls(prefixed, '/Together/'), prefixed)
  assert.equal(prefixPublicAssetUrls(source, '/'), source)
})
