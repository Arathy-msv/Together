// Development helper: dumps the visible structure of pages so recording steps can target real controls.
// Usage: node explore.mjs <profileDir> <identityId|guest|-> <path> [<path> ...]
import { openBrowser } from './cdp.mjs'
import fs from 'node:fs'

const [profile, identity, ...paths] = process.argv.slice(2)
const BASE = process.env.APP_URL || 'http://127.0.0.1:4321'
const b = await openBrowser(9400 + Math.floor(Math.random() * 300), profile)
await b.size(1600, 900)
fs.mkdirSync('/tmp/shots', { recursive: true })
if (identity && identity !== '-') {
  await b.go(BASE + '/demo-identities')
  await b.ev(`(async()=>{const m=await import('/src/lib/identity.ts'); m.switchIdentity(${identity === 'guest' ? 'null' : JSON.stringify(identity)})})()`)
}
let n = 0
for (const path of paths) {
  await b.go(BASE + path)
  await b.sleep(600)
  const info = await b.ev(`(()=>{
    const vis=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0}
    const t=e=>(e.innerText||e.value||e.getAttribute('aria-label')||'').trim().replace(/\\s+/g,' ').slice(0,80)
    const out=[]
    out.push('URL '+location.pathname+location.search)
    document.querySelectorAll('h1,h2,h3').forEach(e=>vis(e)&&out.push(e.tagName+' '+t(e)))
    document.querySelectorAll('button,a.btn,[role=tab],a.link-button').forEach(e=>vis(e)&&out.push('BTN '+t(e)+(e.className?' .'+String(e.className).split(' ').join('.'):'')))
    document.querySelectorAll('input,textarea,select').forEach(e=>{if(!vis(e))return;const l=e.labels&&e.labels[0]?t(e.labels[0]):'';out.push('FIELD '+e.tagName+' #'+e.id+' type='+(e.type||'')+' label='+l+' val='+String(e.value).slice(0,40))})
    return out.join('\\n')})()`)
  console.log('==== ' + path + '\n' + info)
  await b.shot('explore-' + n++)
}
await b.close()
