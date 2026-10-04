import {chromium} from './tools/node_modules/playwright-core/index.mjs';
const browser=await chromium.launch({executablePath:'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe',headless:true,args:['--hide-scrollbars']});
try{
 const context=await browser.newContext({viewport:{width:1600,height:1000}});const page=await context.newPage();
 async function go(p){await page.goto('http://127.0.0.1:3000'+p,{waitUntil:'domcontentloaded',timeout:90000});await page.waitForTimeout(2500);await page.addStyleTag({content:'nextjs-portal{display:none!important}'})}
 await go('/matches/1528891');
 await page.locator('.match-reactions-container').evaluate(e=>e.scrollIntoView({block:'center'}));
 await page.waitForTimeout(1000);await page.screenshot({path:'video/captures/reactions.png'});
 await page.locator('.match-tabs').getByRole('button',{name:'Summary',exact:true}).click();
 await page.locator('.match-tabs').evaluate(e=>e.scrollIntoView({block:'start'}));
 await page.screenshot({path:'video/captures/events-detail.png'});
 await context.route('**/api/auth/me',r=>r.fulfill({json:{user:{user_id:0,username:'Football Fan',role:'user',email:'fan@example.com'}}}));
 await context.route('**/api/favorites/**',r=>r.fulfill({json:{success:true,favorites:[],slugs:[]}}));
 await context.route('**/api/notifications*',r=>r.fulfill({json:{success:true,count:3,hasFavorites:true,notifications:[{id:1,matchId:1528891,type:'result',title:'Full Time',message:'England 2 – 3 Spain',time:'Recently',read:false},{id:2,matchId:1528933,type:'goal',title:'Favorite player update',message:'A new moment from a player you follow.',time:'Recently',read:false},{id:3,matchId:1528891,type:'upcoming',title:'Match Scheduled',message:'Your favorite team has a new fixture.',time:'Recently',read:true}]}}));
 await go('/teams');await page.getByRole('button',{name:/Notifications/}).click();await page.waitForTimeout(800);await page.screenshot({path:'video/captures/notifications.png'});
 console.log('Saved reactions, events, and notifications.');
}finally{await browser.close()}
