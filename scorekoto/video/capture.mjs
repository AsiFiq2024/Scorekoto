import { chromium } from './tools/node_modules/playwright-core/index.mjs';
import fs from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe',headless:true,args:['--hide-scrollbars']});
const context=await browser.newContext({viewport:{width:1600,height:1000},deviceScaleFactor:1});
const page=await context.newPage();
page.setDefaultTimeout(15000);
const manifest=[];
async function settle(ms=1600){await page.waitForTimeout(ms);await page.evaluate(()=>document.fonts.ready);await page.addStyleTag({content:'nextjs-portal{display:none!important}'});}
async function go(url){await page.goto('http://127.0.0.1:3000'+url,{waitUntil:'domcontentloaded',timeout:120000});await settle(2400);}
async function shot(name,selector){await settle(); const target=selector?page.locator(selector).first():page;await target.screenshot({path:`video/captures/${name}.png`});manifest.push({name,url:page.url(),selector:selector||null});console.log('CAPTURE',name);}
async function tab(group,name){await page.locator(group).getByRole('button',{name,exact:true}).click();await settle(1200);}
async function main(){
  await go('/');
  await page.getByRole('button',{name:'Show previous day'}).click();
  await page.getByRole('button',{name:'Finished',exact:true}).click();await settle(4000);
  await shot('matches');
  await page.locator('.date-current-button').click();await shot('calendar');await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Switch to dark mode'}).click();await shot('matches-dark');
  await page.getByRole('button',{name:'Switch to light mode'}).click();
  await go('/matches/1528891');await shot('match');
  for(const [name,filename] of [['Commentary','commentary'],['Stats','stats'],['Lineups','lineups'],['H2H','h2h']]){
    try{await tab('.match-tabs',name);await shot(filename);await page.locator('.match-tabs').evaluate(e=>e.scrollIntoView({block:'start'}));await shot(filename+'-detail');await page.evaluate(()=>window.scrollTo(0,0));}catch(e){console.log('SKIP',filename,e.message.slice(0,140));}
  }
  const reactions=page.locator('.match-reactions-container');if(await reactions.count()){await reactions.scrollIntoViewIfNeeded();await shot('reactions');}
  await go('/teams');await shot('teams');
  await go('/teams/541');await shot('team');
  for(const [name,filename] of [['Squad','squad'],['Statistics','team-stats'],['Compare','compare']]){
    await tab('.team-tabs',name);await shot(filename);await page.locator('.team-tabs').evaluate(e=>e.scrollIntoView({block:'start'}));await shot(filename+'-detail');await page.evaluate(()=>window.scrollTo(0,0));
  }
  await go('/players/1100');await shot('player');await tab('.player-tabs','Statistics');await shot('player-stats');
  await go('/leagues');await shot('leagues');
  await go('/leagues/39?season=2023');await shot('league');
  for(const [name,filename] of [['Standings','standings'],['Top Scorers','scorers'],['Statistics','league-stats']]){
    try{await tab('.league-tabs',name);await shot(filename);await page.locator('.league-tabs').evaluate(e=>e.scrollIntoView({block:'start'}));await shot(filename+'-detail');await page.evaluate(()=>window.scrollTo(0,0));}catch(e){console.log('SKIP',filename,e.message.slice(0,140));}
  }
  await go('/news');await shot('news');
  await page.locator('.global-search input').fill('Real');await settle(2000);await shot('search');
  await go('/register');await shot('register');
  await go('/login');await shot('login');
  // Isolated presentation data; no real user identity or server authentication.
  const user={user_id:0,username:'Football Fan',email:'fan@example.com',role:'admin',created_at:'2026-01-01T00:00:00Z'};
  const teams=[{team_id:541,name:'Real Madrid',slug:'real-madrid',short_name:'RMA',stadium_name:'Santiago Bernabéu',logo_url:'https://media.api-sports.io/football/teams/541.png'},{team_id:40,name:'Liverpool',slug:'liverpool',short_name:'LIV',stadium_name:'Anfield',logo_url:'https://media.api-sports.io/football/teams/40.png'}];
  const leagues=[{league_id:39,name:'Premier League',country:'England',type:'League',slug:'premier-league',logo_url:'https://media.api-sports.io/football/leagues/39.png'},{league_id:2,name:'UEFA Champions League',country:'World',type:'Cup',slug:'uefa-champions-league',logo_url:'https://media.api-sports.io/football/leagues/2.png'}];
  const players=[{player_id:1100,name:'Erling Haaland',first_name:'Erling',last_name:'Haaland',slug:'erling-braut-haaland',position:'Attacker',nationality:'Norway',photo:'https://media.api-sports.io/football/players/1100.png',team_name:'Manchester City',team_id:50}];
  await context.route('**/api/auth/me',r=>r.fulfill({json:{user}}));
  await context.route('**/api/user/profile',r=>r.fulfill({json:{user,recentReactions:[]}}));
  for(const [type,favorites] of Object.entries({teams,leagues,players}))await context.route(`**/api/favorites/${type}*`,r=>r.fulfill({json:{success:true,favorites,slugs:favorites.map(f=>f.slug),teamIds:teams.map(t=>t.team_id),leagueIds:leagues.map(l=>l.league_id)}}));
  await context.route('**/api/notifications*',r=>r.fulfill({json:{success:true,hasFavorites:true,notifications:[{id:'demo-1',match_id:1528891,title:'Match update',message:'England 2 – 3 Spain',type:'finished',time:'Recently',read:false,link:'/matches/1528891'}]}}));
  // A placeholder cookie only permits rendering of the local page shell.
  // All private data requests below are intercepted; it is not a valid login token.
  await context.addCookies([{name:'scorekoto_token',value:'showcase-preview-only',domain:'127.0.0.1',path:'/'}]);
  await go('/favorites');await shot('favorites');
  await go('/profile');await shot('profile');
  await context.route('**/api/admin/**',async r=>{
    const url=new URL(r.request().url());
    if(url.pathname.endsWith('/options'))return r.fulfill({json:{teams,seasons:[]}});
    if(url.pathname.endsWith('/audit-logs'))return r.fulfill({json:{logs:[]}});
    return r.fulfill({json:{results:url.searchParams.get('type')==='teams'?teams:[]}});
  });
  await go('/admin');await page.locator('.admin-tabs').getByRole('button',{name:/Teams/}).click();await shot('admin');
  await go('/admin/sync');await shot('sync');
  await context.clearCookies();await context.unroute('**/api/auth/me');
  await go('/teams/541');
  await page.setViewportSize({width:430,height:900});await shot('mobile-team');
  await go('/leagues');await shot('mobile-leagues');
  await fs.writeFile('video/captures/manifest.json',JSON.stringify(manifest,null,2));
}
try{await main();}finally{await fs.writeFile('video/captures/manifest.json',JSON.stringify(manifest,null,2));await browser.close();}
