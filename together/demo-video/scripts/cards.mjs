// Title cards (intro, chapter openers, end line) rendered as 1920×1080 PNGs in headless Chrome.
import fs from 'node:fs'
import path from 'node:path'
import { createRecorder } from './recorder.mjs'

const NOTE = 'Product prototype: payments and selected services are simulated.'

export const CARD_TEXT = {
  'card-intro': { kicker: 'Product demo', title: 'Together', lines: ['Greenwood School raises funds for school supplies'], logo: true },
  'card-platform': { kicker: 'Chapter 1', title: 'Platform Admin', lines: ['Plans, platform features, and what the platform cannot see'] },
  'card-orgadmin': { kicker: 'Chapter 2', title: 'Organization Admin', lines: ['Plan, features, website, team, partner offers'] },
  'card-organizer': { kicker: 'Chapter 3', title: 'Campaign Organizer', lines: ['Guided creation, review by another admin, sharing, updates'] },
  'card-supporter': { kicker: 'Chapter 4', title: 'Supporter', lines: ['Give directly, play a game, claim a partner reward'] },
  'card-merchant': { kicker: 'Chapter 5', title: 'Merchant', lines: ['Manual voucher code entry and simulated redemption'] },
  'card-final': { kicker: 'Chapter 6', title: 'Delivery and reporting', lines: ['Expenses, milestones and a draft final report'] },
  'card-end': { kicker: 'Together', title: '', lines: ['Create your website.', 'Launch a campaign.', 'Keep supporters connected to the impact.'], end: true },
}

const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c])

function html({ kicker, title, lines, logo, end }, logoData) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;width:1600px;height:900px;overflow:hidden}
  body{background:radial-gradient(1200px 700px at 20% 15%,#2a7350 0%,#1F5A3D 45%,#143c29 100%);color:#fffaf0;font-family:'DejaVu Sans','Noto Sans',sans-serif;display:flex;flex-direction:column;justify-content:center;padding:0 140px;box-sizing:border-box}
  .kicker{display:inline-block;align-self:flex-start;font-size:22px;letter-spacing:.14em;text-transform:uppercase;color:#1F5A3D;background:#f6d77a;padding:8px 18px;border-radius:999px;font-weight:700}
  h1{font-size:${end ? 0 : 104}px;margin:${end ? 0 : '34px 0 18px'};letter-spacing:-.02em;line-height:1.02}
  p{font-size:${end ? 54 : 38}px;margin:${end ? '26px 0 0' : '0 0 10px'};color:${end ? '#fffaf0' : '#dcefe2'};font-weight:${end ? 700 : 400};line-height:1.2}
  .note{position:absolute;left:140px;bottom:70px;font-size:22px;color:#cfe5d6;border-left:4px solid #f6d77a;padding-left:16px}
  .logo{position:absolute;right:140px;top:110px;width:150px;height:150px;border-radius:28px;background:#fff;padding:14px;box-sizing:border-box}
  </style></head><body>
  <span class="kicker">${esc(kicker)}</span>
  ${title ? `<h1>${esc(title)}</h1>` : ''}
  ${lines.map((l) => `<p>${esc(l)}</p>`).join('')}
  ${logo && logoData ? `<img class="logo" src="${logoData}">` : ''}
  <div class="note">${esc(NOTE)}</div>
  </body></html>`
}

export async function renderCards(dir, logoFile) {
  fs.mkdirSync(dir, { recursive: true })
  const logoData = fs.existsSync(logoFile) ? `data:image/png;base64,${fs.readFileSync(logoFile).toString('base64')}` : null
  const r = await createRecorder({ profile: path.join(dir, '.chrome'), port: 9566, base: 'http://127.0.0.1:9', workDir: dir, capture: false })
  const files = {}
  try {
    for (const [id, card] of Object.entries(CARD_TEXT)) {
      const page = path.join(dir, `${id}.html`)
      fs.writeFileSync(page, html(card, logoData))
      await r.call('Page.navigate', { url: `file://${page}` })
      await new Promise((done) => setTimeout(done, 600))
      await r.ev(`(()=>{const s=document.createElement('style'); s.textContent='#__demo_cursor{display:none!important}'; document.head.appendChild(s)})()`)
      await new Promise((done) => setTimeout(done, 100))
      files[id] = path.join(dir, `${id}.png`)
      await r.shot(files[id])
    }
  } finally {
    await r.finish()
    fs.rmSync(path.join(dir, '.chrome'), { recursive: true, force: true })
  }
  return files
}
