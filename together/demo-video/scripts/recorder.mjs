// Drives the real running app in an isolated headless Chrome profile and records it with the
// DevTools screencast. Every scene is real UI interaction; nothing is composited into the page
// except a pointer overlay so viewers can follow clicks.
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const CURSOR_SCRIPT = `
(() => {
  if (window.__demoCursorInstalled) return
  window.__demoCursorInstalled = true
  const install = () => {
    if (!document.body || document.getElementById('__demo_cursor')) return
    const style = document.createElement('style')
    style.textContent = '#__demo_cursor{position:fixed;left:0;top:0;width:22px;height:22px;margin:-3px 0 0 -3px;z-index:2147483647;pointer-events:none;transition:transform .05s linear;filter:drop-shadow(0 1px 2px rgba(0,0,0,.45))}' +
      '.__demo_ripple{position:fixed;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:3px solid rgba(255,170,40,.95);background:rgba(255,190,60,.25);z-index:2147483646;pointer-events:none;animation:__demo_rip .55s ease-out forwards}' +
      '@keyframes __demo_rip{from{transform:scale(.4);opacity:1}to{transform:scale(1.6);opacity:0}}'
    document.head.appendChild(style)
    const cursor = document.createElement('div')
    cursor.id = '__demo_cursor'
    cursor.innerHTML = '<svg width="22" height="22" viewBox="0 0 22 22"><path d="M3 2 L3 18 L7.5 14 L10.5 20.5 L13.5 19 L10.5 12.8 L16.5 12.8 Z" fill="#fff" stroke="#111" stroke-width="1.5" stroke-linejoin="round"/></svg>'
    const last = window.__demoCursorPos || { x: -40, y: -40 }
    cursor.style.transform = 'translate(' + last.x + 'px,' + last.y + 'px)'
    document.body.appendChild(cursor)
  }
  const move = (x, y) => { window.__demoCursorPos = { x, y }; const c = document.getElementById('__demo_cursor'); if (c) c.style.transform = 'translate(' + x + 'px,' + y + 'px)' }
  window.addEventListener('mousemove', (e) => move(e.clientX, e.clientY), true)
  window.addEventListener('mousedown', (e) => {
    const r = document.createElement('div'); r.className = '__demo_ripple'; r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px'
    document.body.appendChild(r); setTimeout(() => r.remove(), 650)
  }, true)
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install()
  new MutationObserver(install).observe(document.documentElement, { childList: true, subtree: true })
})()`

export async function createRecorder({ profile, port = 9555, base, workDir, width = 1600, height = 900, scale = 1.2, capture = true, durations = {} }) {
  try {
    await fetch(`http://127.0.0.1:${port}/json/version`)
    throw new Error(`Port ${port} is already used by another browser; close it first.`)
  } catch (error) {
    if (String(error.message).startsWith('Port')) throw error
  }
  fs.rmSync(profile, { recursive: true, force: true })
  const prefsDir = path.join(profile, 'Default')
  fs.mkdirSync(prefsDir, { recursive: true })
  fs.writeFileSync(path.join(prefsDir, 'Preferences'), JSON.stringify({
    download: { prompt_for_download: false, directory_upgrade: true },
    profile: { default_content_setting_values: { automatic_downloads: 1 } },
    safebrowsing: { enabled: false },
  }))
  const chrome = spawn('google-chrome', ['--headless=new', '--no-sandbox', '--hide-scrollbars', '--mute-audio', '--disable-gpu', '--force-color-profile=srgb', '--font-render-hinting=none', '--disable-features=DownloadBubble,DownloadBubbleV2', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, `--window-size=${width},${height}`, 'about:blank'], { stdio: 'ignore' })
  process.on('exit', () => chrome.kill())
  let version
  for (let i = 0; i < 60; i += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`)
      if (response.ok) { version = await response.json(); break }
    } catch { /* starting */ }
    await sleep(200)
  }
  if (!version) throw new Error('Chrome did not start')
  const ws = new WebSocket(version.webSocketDebuggerUrl)
  let nextId = 0
  const pending = new Map()
  const listeners = []
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    if (message.id && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); return }
    for (const listener of listeners) listener(message)
  })
  await new Promise((resolve) => ws.addEventListener('open', resolve))
  const send = (method, params = {}, sessionId) => {
    const id = ++nextId
    return new Promise((resolve, reject) => {
      pending.set(id, (m) => (m.error ? reject(new Error(`${method} ${JSON.stringify(m.error)}`)) : resolve(m.result)))
      ws.send(JSON.stringify({ id, method, params, sessionId }))
    })
  }
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
  const call = (method, params = {}) => send(method, params, sessionId)
  await call('Page.enable')
  await call('Runtime.enable')
  await send('Browser.grantPermissions', { origin: new URL(base).origin, permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'] })
  await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: false })
  await call('Page.addScriptToEvaluateOnNewDocument', { source: CURSOR_SCRIPT + `;window.__errs=[];window.addEventListener('error',e=>window.__errs.push(String(e.message)));const __oe=console.error;console.error=(...a)=>{window.__errs.push(a.map(String).join(' ').slice(0,300));__oe(...a)}` })

  const framesDir = path.join(workDir, 'frames')
  fs.mkdirSync(framesDir, { recursive: true })
  const frameLog = []
  let frameSeq = 0
  let screencasting = false
  listeners.push((message) => {
    if (message.method !== 'Page.screencastFrame' || message.sessionId !== sessionId) return
    const { data, sessionId: ack } = message.params
    const file = path.join(framesDir, `${String(++frameSeq).padStart(6, '0')}.jpg`)
    fs.writeFileSync(file, Buffer.from(data, 'base64'))
    frameLog.push({ t: Date.now() / 1000, file })
    call('Page.screencastFrameAck', { sessionId: ack }).catch(() => {})
  })
  async function startCapture() {
    if (!capture || screencasting) return
    screencasting = true
    await call('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: Math.round(width * scale), maxHeight: Math.round(height * scale), everyNthFrame: 1 })
  }

  let pointer = { x: width / 2, y: height / 2 }
  let lastFinder = 'null'
  const scenes = []
  let currentScene = null

  const r = {
    /** Scene pacing pause. Dry runs shorten these so flows can be checked quickly. */
    sleep: (ms) => sleep(capture ? ms : Math.min(ms, 150)),
    call,
    browserCall: send,
    base,
    width,
    height,
    async ev(expression) {
      const result = await call('Runtime.evaluate', { returnByValue: true, awaitPromise: true, expression })
      if (result.exceptionDetails) throw new Error(`eval failed: ${JSON.stringify(result.exceptionDetails).slice(0, 500)}`)
      return result.result.value
    },
    /** Full page load. Use for the first visit; later moves prefer in-app navigation. */
    async go(pathname) {
      await call('Page.navigate', { url: base + pathname })
      await r.waitFor('body', 8000)
      await sleep(700)
      await call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pointer.x, y: pointer.y })
    },
    /** Client-side navigation through the app router (no reload flash). */
    async nav(pathname) {
      await r.ev(`(()=>{history.pushState({}, '', ${JSON.stringify(pathname)}); dispatchEvent(new PopStateEvent('popstate')); scrollTo(0,0)})()`)
      await sleep(700)
    },
    async waitFor(selectorOrText, timeout = 6000) {
      const start = Date.now()
      while (Date.now() - start < timeout) {
        const found = await r.ev(`(()=>{const q=${JSON.stringify(selectorOrText)}; try{ if(document.querySelector(q)) return true }catch{} return document.body && document.body.innerText.includes(q)})()`).catch(() => false)
        if (found) return true
        await sleep(120)
      }
      throw new Error(`Timed out waiting for ${selectorOrText} on ${await r.ev('location.pathname').catch(() => '?')}`)
    },
    async text() { return r.ev('document.body.innerText') },
    async expectText(text) {
      const body = await r.text()
      if (!body.includes(text)) throw new Error(`Expected text not shown: ${text} (on ${await r.ev('location.pathname')})`)
    },
    async rejectText(text) {
      const body = await r.text()
      if (body.includes(text)) throw new Error(`Unexpected text shown: ${text}`)
    },
    /** Finds an element by CSS selector, optionally filtered by visible text, and scrolls it into view. */
    async locate(selector, { text, exact = false, index = 0, within } = {}) {
      const finder = `(()=>{
        const root = ${within ? `document.querySelector(${JSON.stringify(within)})` : 'document'}
        if (!root) return null
        const want = ${JSON.stringify(text ?? null)}
        const norm = s => (s||'').replace(/\\s+/g,' ').trim()
        const all = [...root.querySelectorAll(${JSON.stringify(selector)})].filter(e => { const b=e.getBoundingClientRect(); return b.width>0 && b.height>0 })
        const matches = want === null ? all : all.filter(e => { const t = norm(e.innerText || e.value || e.getAttribute('aria-label')); return ${exact} ? t === want : t.includes(want) })
        return matches[${index}] || null
      })()`
      const found = await r.ev(`(()=>{ const e = ${finder}; if (!e) return false; const b=e.getBoundingClientRect(); if (b.top < 150 || b.bottom > innerHeight - 40) e.scrollIntoView({ block: 'center', behavior: 'instant' }); return true })()`)
      if (!found) throw new Error(`Could not find ${selector}${text ? ` with text "${text}"` : ''} on ${await r.ev('location.pathname')}`)
      await sleep(500)
      lastFinder = finder
      return r.measure(finder)
    },
    async measure(finder = lastFinder) {
      return r.ev(`(()=>{ const e = ${finder}; if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x + b.width/2, y: b.y + b.height/2 } })()`)
    },
    async moveTo(x, y, duration = 450) {
      const steps = Math.max(6, Math.round(duration / 16))
      const from = { ...pointer }
      for (let i = 1; i <= steps; i += 1) {
        const p = i / steps
        const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
        await call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: from.x + (x - from.x) * ease, y: from.y + (y - from.y) * ease })
        await sleep(16)
      }
      pointer = { x, y }
    },
    async clickAt(x, y) {
      await r.moveTo(x, y)
      await sleep(120)
      await call('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 })
      await sleep(70)
      await call('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 })
      await sleep(350)
    },
    async click(selector, options = {}) {
      let point = await r.locate(selector, options)
      for (let i = 0; i < 5; i += 1) {
        await r.moveTo(point.x, point.y, i === 0 ? 450 : 140)
        await sleep(90)
        const now = await r.measure()
        if (!now) throw new Error(`${selector} disappeared before it could be clicked`)
        const drifted = Math.abs(now.x - point.x) > 2 || Math.abs(now.y - point.y) > 2
        point = now
        if (!drifted) break
      }
      // Late layout growth (panels, images) can push the target below the fold after it was scrolled to.
      if (point.y < 0 || point.y > (await r.ev('innerHeight'))) {
        point = await r.locate(selector, options)
        await r.moveTo(point.x, point.y, 200)
      }
      await call('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 })
      await sleep(70)
      await call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 })
      pointer = { x: point.x, y: point.y }
      await sleep(200)
    },
    /** Clicks a button or link by its visible text. */
    async press(text, options = {}) {
      await r.click(options.selector ?? 'button, a, [role=tab], [role=radio], summary, label', { text, ...options })
    },
    async hover(selector, options = {}) {
      const point = await r.locate(selector, options)
      await r.moveTo(point.x, point.y)
    },
    /** Types into a field the way a person would: focus, select existing text, then type. */
    async fill(selector, value, { options = {}, delay = 28, clear = true } = {}) {
      await r.click(selector, options)
      if (clear) {
        await r.ev(`(()=>{const e=document.activeElement; if(e && 'select' in e) e.select()})()`)
        await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 })
        await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 })
      }
      if (!capture) await call('Input.insertText', { text: value })
      else for (const char of value) {
        await call('Input.insertText', { text: char })
        if (delay) await sleep(delay)
      }
      await sleep(200)
    },
    async fieldByLabel(label, within = 'body') {
      const id = await r.ev(`(()=>{const norm=s=>(s||'').replace(/\\s+/g,' ').trim(); const l=[...document.querySelector(${JSON.stringify(within ?? 'body')}).querySelectorAll('label')].find(l=>norm(l.innerText).startsWith(${JSON.stringify(label)})); if(!l) return null; const el=l.control || l.querySelector('input,textarea,select'); if(!el) return null; if(!el.id) el.id='__f_'+Math.random().toString(36).slice(2); return el.id})()`)
      if (!id) throw new Error(`No field labelled ${label}`)
      return `#${CSS_ESCAPE(id)}`
    },
    async fillLabel(label, value, opts = {}) { await r.fill(await r.fieldByLabel(label, opts.within), value, opts) },
    /** Sets a <select> through a real change event after pointing at it. */
    async choose(selector, value) {
      await r.hover(selector)
      await sleep(200)
      await r.ev(`(()=>{const s=document.querySelector(${JSON.stringify(selector)}); const set=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set; set.call(s, ${JSON.stringify(value)}); s.dispatchEvent(new Event('change',{bubbles:true})); return s.value})()`)
      await sleep(400)
    },
    async chooseOption(selector, optionText) {
      const value = await r.ev(`(()=>{const s=document.querySelector(${JSON.stringify(selector)}); const o=[...s.options].find(o=>o.text.includes(${JSON.stringify(optionText)})); return o ? o.value : null})()`)
      if (value === null) throw new Error(`No option ${optionText} in ${selector}`)
      await r.choose(selector, value)
    },
    async chooseLabel(label, value, within) { await r.choose(await r.fieldByLabel(label, within), value) },
    async scrollBy(dy, duration = 700) {
      await r.ev(`scrollBy({top:${dy},behavior:'smooth'})`)
      await sleep(duration)
    },
    async scrollToSel(selector, options = {}) { await r.locate(selector, options); await sleep(300) },
    async scrollTop() { await r.ev(`scrollTo({top:0,behavior:'smooth'})`); await sleep(600) },
    async key(key, code = key, keyCode = 0) {
      await call('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: keyCode })
      await call('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: keyCode })
    },
    /** Calls the app's own module code inside the page (used for off-camera demo data preparation). */
    async app(body) {
      return r.ev(`(async()=>{ ${body} })()`)
    },
    async switchTo(userId) {
      await r.app(`const m=await import('/src/lib/identity.ts'); m.switchIdentity(${userId === null ? 'null' : JSON.stringify(userId)})`)
      await sleep(300)
    },
    /** CSS selector for the table row (or list item) that contains some text. */
    async rowWith(text, rows = '.campaign-table tbody tr') {
      const n = await r.ev(`[...document.querySelectorAll(${JSON.stringify(rows)})].findIndex(e => e.innerText.includes(${JSON.stringify(text)}))`)
      if (n < 0) throw new Error(`No row containing ${text}`)
      return `${rows}:nth-child(${n + 1})`
    },
    /** Gives a file to a (possibly hidden) file input, as a person picking a file would. */
    async upload(expression, file) {
      const { result } = await call('Runtime.evaluate', { expression })
      if (!result.objectId) throw new Error(`No file input for ${expression}`)
      await call('DOM.setFileInputFiles', { files: [file], objectId: result.objectId })
      await sleep(900)
    },
    /** Development aid: headings, buttons and fields currently on screen. */
    async dump() {
      return r.ev(`(()=>{
        const vis=e=>{const b=e.getBoundingClientRect();return b.width>0&&b.height>0}
        const t=e=>(e.innerText||e.value||e.getAttribute('aria-label')||'').trim().replace(/\\s+/g,' ').slice(0,90)
        const out=['URL '+location.pathname+location.search]
        document.querySelectorAll('h1,h2,h3,legend,.notice').forEach(e=>vis(e)&&out.push(e.tagName+' '+t(e)))
        document.querySelectorAll('button,a.btn,[role=tab],[role=radio],summary').forEach(e=>vis(e)&&out.push('BTN '+t(e)+' .'+String(e.className).split(' ').join('.')))
        document.querySelectorAll('input,textarea,select').forEach(e=>{if(!vis(e)&&e.type!=='checkbox'&&e.type!=='radio')return;const l=e.labels&&e.labels[0]?t(e.labels[0]):'';out.push('FIELD '+e.tagName+' #'+e.id+' type='+(e.type||'')+' label='+l.slice(0,60)+' val='+String(e.type==='checkbox'||e.type==='radio'?e.checked:e.value).slice(0,40))})
        return out.join('\\n')})()`)
    },
    async errors() { return r.ev('(window.__errs||[]).slice()') },
    async shot(file) {
      const s = await call('Page.captureScreenshot', { format: 'png' })
      fs.writeFileSync(file, Buffer.from(s.data, 'base64'))
    },
    /** Starts a recorded scene. */
    async scene(id) {
      await startCapture()
      await sleep(80)
      currentScene = { id, start: Date.now() / 1000, notes: [] }
      scenes.push(currentScene)
      console.log(`▶ ${id}`)
    },
    note(text) { currentScene?.notes.push(text) },
    /** Ends a scene, holding the live screen until the scene's narration has room to finish. */
    async end() {
      if (!currentScene) return
      const need = (durations[currentScene.id] ?? 0) + 1.2
      const elapsed = Date.now() / 1000 - currentScene.start
      if (capture && need > elapsed) await sleep((need - elapsed) * 1000)
      if (!capture) await sleep(200)
      currentScene.end = Date.now() / 1000
      const errs = await r.errors().catch(() => [])
      if (errs.length) { currentScene.consoleErrors = errs; await r.ev('window.__errs=[]').catch(() => {}) }
      currentScene = null
    },
    async finish() {
      if (screencasting) await call('Page.stopScreencast').catch(() => {})
      await sleep(300)
      fs.writeFileSync(path.join(workDir, 'timeline.json'), JSON.stringify({ scenes, frames: frameLog.map((f) => ({ t: f.t, file: path.relative(workDir, f.file) })) }, null, 1))
      ws.close()
      chrome.kill()
    },
  }
  return r
}

function CSS_ESCAPE(id) {
  return id.replace(/([^a-zA-Z0-9_-])/g, '\\$1')
}
