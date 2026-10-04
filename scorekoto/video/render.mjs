import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {chromium} from './tools/node_modules/playwright-core/index.mjs';
const root=path.resolve('video');
const preview=process.argv.includes('--preview');
const ffmpeg=path.join(root,'tools/node_modules/ffmpeg-static/ffmpeg.exe');
const audio=process.env.SHOWCASE_AUDIO||'C:/Users/Asif/Downloads/Feel Good Inc. (Instrumental).mp4';
const server=http.createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname);const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return}const type={'.html':'text/html','.js':'text/javascript','.png':'image/png','.woff2':'font/woff2','.json':'application/json'}[path.extname(file)]||'application/octet-stream';res.writeHead(200,{'Content-Type':type});res.end(data)})});
server.listen(0,'127.0.0.1');await once(server,'listening');
const browser=await chromium.launch({executablePath:'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe',headless:true,args:['--hide-scrollbars']});
let encoder;
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080}});
 page.on('pageerror',e=>console.error(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/film.html?render`);
 await page.evaluate(()=>window.ready);
 const scenes=await page.evaluate(()=>window.filmScenes);
 for(const s of scenes){const t=s.at+Math.min(2.5,(s.end-s.at)/2);await page.evaluate(t=>window.renderFrame(t),t);await page.screenshot({path:path.join(root,`output/preview-${s.key}.jpg`),type:'jpeg',quality:88});}
 console.log('Saved',scenes.length,'preview frames');
 // Compact contact sheet for visual inspection of all chapters.
 const sheet=await browser.newPage({viewport:{width:1440,height:Math.ceil(scenes.length/3)*294},deviceScaleFactor:1});
 await sheet.goto(`http://127.0.0.1:${server.address().port}/film.html?render`);
 await sheet.setContent(`<body style="margin:0;background:#10241a;display:grid;grid-template-columns:repeat(3,480px);font:16px Arial;color:#fff">${scenes.map(s=>`<div><img width="480" height="270" src="http://127.0.0.1:${server.address().port}/output/preview-${s.key}.jpg"><div style="height:24px;padding-left:12px">${s.at}s / ${s.key}</div></div>`).join('')}</body>`);
 await sheet.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
 await sheet.screenshot({path:path.join(root,'output/storyboard.jpg'),fullPage:true});await sheet.close();
 if(!preview){
  const output=path.join(root,'output/ScoreKoto-Project-Showcase-1080p.mp4');
  const log=fs.createWriteStream(path.join(root,'render.log'));
  encoder=spawn(ffmpeg,['-y','-hide_banner','-loglevel','warning','-f','image2pipe','-framerate','30','-vcodec','mjpeg','-i','pipe:0','-i',audio,'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-r','30','-c:a','aac','-b:a','256k','-af','afade=t=in:st=0:d=0.7,afade=t=out:st=86:d=4,alimiter=limit=0.95','-t','90','-movflags','+faststart','-metadata','title=ScoreKoto | Every match. Every detail.','-metadata','comment=Project showcase; account and admin screens use labeled demo data.',output],{windowsHide:true,stdio:['pipe','ignore','pipe']});
  encoder.stderr.pipe(log);let encodeError=null;encoder.on('error',e=>encodeError=e);encoder.stdin.on('error',e=>encodeError=e);const finished=once(encoder,'close');
  const begin=Date.now();
  for(let frame=0;frame<2700;frame++){
    if(encodeError)throw encodeError;
    const data=await page.evaluate(t=>{window.renderFrame(t);return document.querySelector('canvas').toDataURL('image/jpeg',.95).split(',')[1]},frame/30);
    if(!encoder.stdin.write(Buffer.from(data,'base64')))await once(encoder.stdin,'drain');
    if(frame%150===0)console.log(`Rendered ${frame}/2700 frames (${(frame/30).toFixed(0)}s), elapsed ${Math.round((Date.now()-begin)/1000)}s`);
  }
  encoder.stdin.end();const [code]=await finished;if(code!==0)throw Error(`FFmpeg exited ${code}. See video/render.log`);console.log('EXPORTED',output);
 }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
