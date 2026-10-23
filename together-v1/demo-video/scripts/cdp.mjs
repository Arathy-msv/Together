import { spawn } from 'node:child_process'
import fs from 'node:fs'
export async function openBrowser(port, profile) {
  const chrome = spawn('google-chrome', ['--headless=new','--disable-gpu','--no-sandbox',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'--window-size=1400,900','about:blank'], {stdio:'ignore'})
  const sleep = (ms) => new Promise(r => setTimeout(r, ms))
  let v
  for (let i=0;i<40;i++){ try{ const r=await fetch(`http://127.0.0.1:${port}/json/version`); if(r.ok){ v=await r.json(); break } }catch{} await sleep(200) }
  const ws = new WebSocket(v.webSocketDebuggerUrl)
  let id=0; const pending=new Map()
  ws.addEventListener('message', ev => { const m=JSON.parse(ev.data); if(m.id&&pending.has(m.id)){pending.get(m.id)(m); pending.delete(m.id)} })
  await new Promise(r=>ws.addEventListener('open', r))
  const send=(method, params={}, sessionId)=>{ const mid=++id; return new Promise((res,rej)=>{ pending.set(mid, m=>m.error?rej(new Error(method+' '+JSON.stringify(m.error))):res(m.result)); ws.send(JSON.stringify({id:mid,method,params,sessionId})) }) }
  const {targetId}=await send('Target.createTarget',{url:'about:blank'})
  const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true})
  const call=(m,p={})=>send(m,p,sessionId)
  await call('Page.enable'); await call('Runtime.enable')
  const api = {
    sleep, call,
    async size(w,h,mobile=false){ await call('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile}) ; if (mobile) await call('Emulation.setTouchEmulationEnabled',{enabled:true}) },
    async go(url){ await call('Page.navigate',{url}); await sleep(900); if (process.env.AUTO_INTRO) { const r = await call('Runtime.evaluate',{returnByValue:true, expression:`(() => { const b = document.querySelector('.game-intro .btn-primary'); if (b) { b.click(); return true } return false })()`}); if (r.result.value) await sleep(500) } },
    async ev(expr){ const r=await call('Runtime.evaluate',{returnByValue:true, awaitPromise:true, expression:expr}); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0,400)); return r.result.value },
    async box(sel){ return api.ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return null; e.scrollIntoView({block:'center'}); const b=e.getBoundingClientRect(); return {x:b.x+b.width/2,y:b.y+b.height/2,w:b.width,h:b.height}})()`) },
    async click(sel){ const b=await api.box(sel); if(!b) throw new Error('no '+sel); await api.clickAt(b.x,b.y); return b },
    async clickAt(x,y){ await call('Input.dispatchMouseEvent',{type:'mouseMoved',x,y}); await call('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1}); await call('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',clickCount:1}) },
    async drag(x1,y1,x2,y2,steps=12){ await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:x1,y:y1}); await call('Input.dispatchMouseEvent',{type:'mousePressed',x:x1,y:y1,button:'left',clickCount:1}); for(let i=1;i<=steps;i++){ await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:x1+(x2-x1)*i/steps,y:y1+(y2-y1)*i/steps,button:'left',buttons:1}); await sleep(16) } await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:x2,y:y2,button:'left',clickCount:1}) },
    async key(key, code=key, keyCode=0){ await call('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:keyCode}); await call('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:keyCode}) },
    async type(text){ await call('Input.insertText',{text}) },
    async shot(name){ const s=await call('Page.captureScreenshot',{format:'png'}); fs.writeFileSync(`/tmp/shots/${name}.png`, Buffer.from(s.data,'base64')) },
    async close(){ ws.close(); chrome.kill() },
  }
  return api
}
export const TAB = ['Tab','Tab',9]
export const ESC = ['Escape','Escape',27]
