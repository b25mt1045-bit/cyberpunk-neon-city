// Renders public/og.png (1200×630) from the running site: the scene at the avenue, no HUD,
// with the name and title from content.ts overlaid. Re-run whenever content.ts changes.
//
//   npm run dev            (in another terminal)
//   npm run og             (or: npm run og -- http://localhost:4173 with `npm run preview`)
//
// Needs Chrome: set CHROME_PATH if it isn't in the default macOS location.
import puppeteer from 'puppeteer-core'

const url = process.argv[2] ?? 'http://localhost:5173/'
const chrome = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PROGRESS = 0.335 // the avenue entrance, jellyfish ahead

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: 'new',
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
})
try {
  const page = await browser.newPage()
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 })
  await page.goto(`${url}${url.includes('?') ? '&' : '?'}quality=high`, { waitUntil: 'networkidle0' })
  await page.waitForFunction(() => !document.querySelector('.loader'), { timeout: 90000 })
  await page.evaluate((p) => window.scrollTo(0, p * (document.documentElement.scrollHeight - innerHeight)), PROGRESS)
  await new Promise((r) => setTimeout(r, 4000))

  await page.evaluate(() => {
    const name = document.querySelector('#hero h1')?.textContent ?? ''
    const title = document.querySelector('#hero p')?.textContent ?? ''
    for (const el of document.querySelectorAll('.hud, .hud-cursor')) el.style.display = 'none'
    const card = document.createElement('div')
    card.style.cssText =
      'position:fixed;inset:auto 0 0 0;z-index:99;padding:120px 64px 56px;background:linear-gradient(to top,rgba(5,6,15,.92),rgba(5,6,15,0));'
    card.innerHTML = `<div style="font:700 92px/1 'Chakra Petch',sans-serif;color:#fff;letter-spacing:.02em;text-shadow:-5px 3px 0 rgba(255,43,214,.65),0 0 28px rgba(0,240,255,.55)"></div>
      <div style="margin-top:18px;font:600 26px 'JetBrains Mono',monospace;color:#00ffc8;letter-spacing:.32em;text-transform:uppercase"></div>`
    card.children[0].textContent = name
    card.children[1].textContent = title
    document.body.append(card)
  })
  await new Promise((r) => setTimeout(r, 400))
  await page.screenshot({ path: 'public/og.png', type: 'png' })
  console.log('wrote public/og.png')
} finally {
  await browser.close()
}
