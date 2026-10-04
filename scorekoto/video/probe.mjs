import { chromium } from './tools/node_modules/playwright-core/index.mjs';
const browser = await chromium.launch({executablePath:'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe',headless:true,args:['--disable-gpu','--hide-scrollbars']});
try {
  const page = await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:1});
  page.on('pageerror', e=>console.log('PAGE ERROR',e.message));
  await page.goto('http://127.0.0.1:3000', {waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForTimeout(12000);
  await page.addStyleTag({content:'nextjs-portal{display:none!important}'});
  await page.screenshot({path:'video/captures/probe.png'});
  console.log((await page.locator('body').innerText()).slice(0,7000));
  console.log('links',await page.locator('a[href^="/matches/"]').evaluateAll(es=>es.slice(0,5).map(e=>e.getAttribute('href'))));
} finally { await browser.close(); }
