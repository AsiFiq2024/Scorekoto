/* Deterministic, editable 1080p motion design. All screen assets are project captures. */
const canvas=document.querySelector('#film');
const c=canvas.getContext('2d',{alpha:false});
const W=1920,H=1080,MINT='#62efb5',WHITE='#effaf5',MUTED='#9aafa4';
const pictures={};
const scenes=[
 {at:0,end:6,key:'intro',tag:'MEET SCOREKOTO'},
 {at:6,end:13,key:'matches',tag:'01 / MATCH CENTER',title:['Match day.','Made simple.'],body:['Live scores, upcoming fixtures,','and results in one place.'],pills:['Date & calendar filters','Grouped by competition']},
 {at:13,end:19,key:'lineups',tag:'02 / INSIDE THE MATCH',title:['See the','whole pitch.'],body:['Formations. Starting XIs.','Substitutes and player ratings.'],pills:['Visual lineups','Match events']},
 {at:19,end:25,key:'analysis',tag:'03 / THE DETAILS',title:['Go beyond','the score.'],body:['Possession, shots, commentary','and head-to-head history.'],pills:['Detailed statistics','Minute-by-minute context']},
 {at:25,end:31,key:'teams',tag:'04 / CLUBS',title:['Know your','club.'],body:['Team profiles, squads, fixtures,','form and season statistics.'],pills:['Search the club directory','Explore every position']},
 {at:31,end:36,key:'compare',tag:'05 / TEAM COMPARISON',title:['Two teams.','One view.'],body:['Compare rivals side by side.','Form, standings and top scorers.'],pills:['Head-to-head records','Club performance']},
 {at:36,end:42,key:'players',tag:'06 / PLAYER PROFILES',title:['The players.','The numbers.'],body:['Profiles, match history, goals,','assists and season breakdowns.'],pills:['Season selector','Competition statistics']},
 {at:42,end:49,key:'leagues',tag:'07 / COMPETITIONS',title:['Follow the','title race.'],body:['League tables, fixtures, teams','and leading goalscorers.'],pills:['Browse competitions','Explore past seasons']},
 {at:49,end:53,key:'search',tag:'08 / GLOBAL SEARCH',title:['Less looking.','More finding.'],body:['Search teams, players, leagues,','matches and news together.'],pills:['One search. Across the project.']},
 {at:53,end:58,key:'news',tag:'09 / FOOTBALL NEWS',title:['Stay in','the story.'],body:['Headlines from around football,','with team and league news.'],pills:['Browse the latest stories','Open the original source']},
 {at:58,end:65,key:'personal',tag:'10 / YOUR FOOTBALL',title:['Make it','personal.'],body:['Save teams, players and leagues.','Keep your favorites close.'],pills:['Account & profile','Personal match notifications'],demo:true},
 {at:65,end:70,key:'community',tag:'11 / MATCH REACTIONS',title:['Feel it.','Share it.'],body:['React to the action.','Join the match conversation.'],pills:['Emoji reactions','Match comments']},
 {at:70,end:76,key:'design',tag:'12 / EVERY SCREEN',title:['Your game.','Your way.'],body:['Light or dark. Desktop or mobile.','Football that fits your screen.'],pills:['Responsive layouts','Light & dark themes']},
 {at:76,end:84,key:'admin',tag:'13 / BEHIND THE SCENES',title:['Built to','manage it all.'],body:['Manage matches, teams and players.','Review changes and sync data.'],pills:['Admin management & audit trail','Data synchronization'],demo:true},
 {at:84,end:90,key:'outro',tag:'FOOTBALL, IN FOCUS.'}
];
window.filmScenes=scenes;window.filmDuration=90;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const ease=v=>1-Math.pow(1-clamp(v),4);
const smooth=v=>{v=clamp(v);return v*v*(3-2*v)};
const lerp=(a,b,v)=>a+(b-a)*v;
function rr(x,y,w,h,r,fill,stroke){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.lineWidth=1.5;c.stroke()}}
function txt(s,x,y,size=24,color=WHITE,weight=500,align='left'){c.font=`${weight} ${size}px Manrope, Arial`;c.fillStyle=color;c.textAlign=align;c.textBaseline='alphabetic';c.fillText(s,x,y)}
function line(x1,y1,x2,y2,color,width=1){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke()}
function dot(x,y,r,color){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill()}
function animate(t,delay,draw){const p=ease((t-delay)/.8);c.save();c.globalAlpha*=p;c.translate(0,36*(1-p));draw(p);c.restore()}
function mark(x,y,s=1){c.save();c.translate(x,y);c.scale(s,s);const paths=['M9 13 27 23.4c-4-2.2-7 .2-7 4.5v9L8 30C3.8 27.5 2.4 22 5 17.8A12 12 0 0 1 9 13Z','m9 13 11.2-6.6a7.5 7.5 0 0 1 7.6 0L42 14.8a8 8 0 0 1 4 6.9V31Z','m4 32 17 9.8c4.6 2.7 7 .8 7-3.8v-7l16 9.2v10.1a8 8 0 0 1-4 6.9l-12.2 7.1a7.5 7.5 0 0 1-7.6 0L8 57.2a8 8 0 0 1-4-6.9Z','m28 31 12 7a10.7 10.7 0 0 1 4 14.7c-2.7 4.6-8.7 6.1-13.3 3.4L21 50.5c4.5 2.6 7 .5 7-4Z'];paths.forEach((p,i)=>{c.fillStyle=[WHITE,MINT,MINT,WHITE][i];c.fill(new Path2D(p))});c.restore()}
function brand(x,y,size=32){mark(x,y-size*.93,size/48);txt('Score',x+size*1.18,y,size,WHITE,800);c.font=`800 ${size}px Manrope`;const offset=c.measureText('Score').width;c.font=`700 ${size*1.1}px Bengali, 'Nirmala UI'`;c.fillStyle=MINT;c.fillText('কত?',x+size*1.18+offset,y+1)}
function pill(label,x,y,green=false){c.font='600 19px Manrope';const w=c.measureText(label).width+36;rr(x,y,w,42,21,green?'#62efb5':'#10231a',green?null:'#2a4537');txt(label,x+18,y+28,19,green?'#072016':'#c2d7cb',600);return w}
function backdrop(t){c.fillStyle='#060e0a';c.fillRect(0,0,W,H);let g=c.createRadialGradient(1450+Math.sin(t*.14)*120,350,0,1400,450,1180);g.addColorStop(0,'#133f2d');g.addColorStop(.52,'#0b2117');g.addColorStop(1,'#060e0a');c.fillStyle=g;c.fillRect(0,0,W,H);c.strokeStyle='#8ce8b907';c.lineWidth=1;for(let x=-70;x<W+70;x+=80){c.beginPath();c.moveTo(x+(t*2)%80,0);c.lineTo(x+(t*2)%80,H);c.stroke()}for(let y=0;y<H;y+=80){line(0,y,W,y,'#8ce8b907')}c.save();c.translate(1500,510);c.rotate(t*.012);c.strokeStyle='#67ddaa12';for(const r of [360,495,630]){c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.stroke()}c.restore();}
function chrome(t,s){brand(94,81,31);txt('PROJECT SHOWCASE',1826,66,17,MUTED,700,'right');txt('FOOTBALL. CONNECTED.',1826,92,13,'#567b65',600,'right');line(94,115,1826,115,'#315b3f66');
 const chapters=['MATCHES','CLUBS & PLAYERS','COMPETITIONS','YOUR FOOTBALL','CONTROL'];const starts=[6,25,42,58,76];
 chapters.forEach((name,i)=>{const x=94+i*350;line(x,1009,x+326,1009,'#213b2c',3);const pr=clamp((t-starts[i])/((starts[i+1]||84)-starts[i]));line(x,1009,x+326*pr,1009,MINT,3);txt(name,x,1042,14,t>=starts[i]?MINT:'#627d6e',700)});
}
function shadowBox(x,y,w,h,r=22){c.save();c.shadowColor='#00000070';c.shadowBlur=48;c.shadowOffsetY=22;rr(x,y,w,h,r,'#11261b');c.restore()}
function screen(name,x,y,w,h,{crop=null,zoom=1,pan=-.5,label='',alpha=1,border=true}={}){const im=pictures[name];if(!im)return;c.save();c.globalAlpha*=alpha;shadowBox(x,y,w,h);c.beginPath();c.roundRect(x,y,w,h,20);c.clip();c.fillStyle='#f2f8f4';c.fillRect(x,y,w,h);const r=crop||[0,0,im.width,im.height];const targetRatio=w/h;let sw=r[2]/zoom,sh=r[3]/zoom;if(sw/sh>targetRatio)sw=sh*targetRatio;else sh=sw/targetRatio;const sx=r[0]+(r[2]-sw)/2,sy=r[1]+(r[3]-sh)*clamp(.5+pan);c.drawImage(im,sx,sy,sw,sh,x,y,w,h);c.restore();if(border)rr(x,y,w,h,20,null,'#8da99855');if(label){rr(x+20,y+h-55,Math.min(w-40,label.length*10+36),35,17,'#07180deb');txt(label,x+38,y+h-31,16,MINT,600)}}
function contentCopy(s,u){animate(u,.08,()=>{txt(s.tag,94,195,17,MINT,700);line(94,218,164,218,MINT,3)});s.title.forEach((t,i)=>animate(u,.18+i*.12,()=>txt(t,94,330+i*72,61,i===1?MINT:WHITE,800)));s.body.forEach((t,i)=>animate(u,.48,()=>txt(t,96,515+i*34,24,MUTED,500)));s.pills.forEach((t,i)=>animate(u,.75+i*.15,()=>{dot(104,626+i*51,4.5,MINT);txt(t,125,633+i*51,20,'#d0dfd5',600)}));if(s.demo)animate(u,.85,()=>pill('DEMO DATA',95,755));}
function swapScreens(a,b,u,total,x,y,w,h,opts={}){const mix=smooth((u-total*.51)/.65);screen(a,x,y,w,h,{...opts,zoom:1.015+.02*clamp(u/total)});if(mix>0)screen(b,x+36*(1-mix),y,w,h,{...opts,alpha:mix,zoom:1.01+.02*clamp(u/total)});}
function frameContent(s,u){const enter=ease(u/.95),float=Math.sin(u*.65)*4;const x=650+95*(1-enter),y=182+float,w=1176,h=754;c.save();c.globalAlpha*=enter;
switch(s.key){
 case'matches':swapScreens('matches','calendar',u,7,x,y,w,h,{crop:[255,100,1325,860]});break;
 case'lineups':screen('lineups-detail',x+105,y,970,820,{crop:[530,115,780,665],zoom:1.005+.01*u/6});break;
 case'analysis':swapScreens('stats-detail','commentary-detail',u,6,x+25,y,1125,794,{crop:[525,75,795,800]});break;
 case'teams':swapScreens('team','squad',u,6,x,y,w,h,{crop:[410,103,1020,880]});break;
 case'compare':screen('compare-detail',x,y,w,h,{crop:[410,65,1020,855],zoom:1.015+u*.006});break;
 case'players':swapScreens('player','player-stats',u,6,x,y,w,h,{crop:[360,90,1090,880]});break;
 case'leagues':swapScreens('standings','scorers',u,7,x,y,w,h,{crop:[355,100,1130,880]});break;
 case'search':screen('search',x,y,w,h,{crop:[450,0,1050,710],zoom:1+u*.006});break;
 case'news':screen('news',x,y,w,h,{crop:[255,90,1325,880],zoom:1+u*.006,pan:-.1});break;
 case'personal':swapScreens('favorites','profile',u,7,x,y,w,h,{crop:[255,90,1325,880]});break;
 case'community':screen('reactions',x,y,w,h,{crop:[470,80,930,850],zoom:1+u*.005});break;
 case'design':{
   screen('matches-dark',x-50,y+50,1060,720,{crop:[255,100,1325,860],zoom:1.02});
   const px=1535+60*(1-enter),py=160+Math.sin(u*.7)*7;shadowBox(px-12,py-12,308,660,42);rr(px-12,py-12,308,660,42,'#121c17','#7b938477');screen('mobile-team',px,py,284,636,{crop:[0,0,430,900],border:false});rr(px+95,py+7,94,20,10,'#101411');break;}
 case'admin':swapScreens('admin','sync',u,8,x,y,w,h,{crop:[255,90,1325,880]});break;
}
c.restore();}
function pitch(t,x,y,w,h,opacity=.2){c.save();c.globalAlpha*=opacity;c.strokeStyle=MINT;c.lineWidth=2;rr(x,y,w,h,6,null,MINT);line(x+w/2,y,x+w/2,y+h,MINT,2);c.beginPath();c.arc(x+w/2,y+h/2,h*.19,0,Math.PI*2);c.stroke();rr(x,y+h*.22,w*.14,h*.56,0,null,MINT);rr(x+w*.86,y+h*.22,w*.14,h*.56,0,null,MINT);for(let i=0;i<8;i++){const a=t*.15+i*2.4;dot(x+w*(.15+(i%4)*.23)+Math.sin(a)*8,y+h*(i<4?.26:.74)+Math.cos(a)*9,5,MINT)}c.restore()}
function intro(u){
 pitch(u,820,252,970,560,.17);
 animate(u,.08,()=>pill('THE FOOTBALL PROJECT',96,205));
 ['Every match.','Every detail.','One place.'].forEach((s,i)=>animate(u,.25+i*.19,()=>txt(s,94,380+i*124,108,i===2?MINT:WHITE,800)));
 animate(u,1.05,()=>txt('Meet ScoreKoto.',99,825,31,'#bad0c2',500));
 const e=ease((u-.65)/1.1);c.save();c.globalAlpha*=e;c.translate(1450,560);c.rotate(-.07+.009*u);screen('matches-dark',-445+70*(1-e),-303,845,542,{crop:[265,115,1300,820],zoom:1.025});c.restore();
 animate(u,1.25,()=>{rr(1100,760,590,119,22,'#62efb5');txt('THE GAME. AT A GLANCE.',1130,810,21,'#0d3623',800);txt('Scores • insights • your favorites',1130,853,24,'#10442c',600)});
}
function outro(u){pitch(u,420,195,1080,610,.09);animate(u,.04,()=>{mark(888,175,2.8)});animate(u,.18,()=>{c.save();c.translate(624,0);brand(0,493,100);c.restore()});animate(u,.42,()=>txt('All your football. One place.',960,610,57,WHITE,700,'center'));animate(u,.68,()=>txt('FOLLOW  ·  EXPLORE  ·  COMPARE  ·  CONNECT',960,696,20,MINT,700,'center'));animate(u,.88,()=>{const labels=['MATCHES','TEAMS','PLAYERS','LEAGUES','NEWS'];let x=498;labels.forEach(label=>{x+=pill(label,x,790)+16})});}
function sceneDraw(s,t){const u=t-s.at;backdrop(t);if(s.key==='intro')intro(u);else if(s.key==='outro')outro(u);else{contentCopy(s,u);frameContent(s,u)}chrome(t,s);}
window.renderFrame=function(t){const i=Math.max(0,scenes.findLastIndex(s=>t>=s.at));const s=scenes[i];const transition=.6;if(i>0&&t-s.at<transition){sceneDraw(scenes[i-1],t);const p=smooth((t-s.at)/transition);c.save();c.globalAlpha=p;c.translate(70*(1-p),0);sceneDraw(s,t);c.restore();const edge=1920*p;c.fillStyle=`rgba(98,239,181,${Math.sin(p*Math.PI)*.055})`;c.fillRect(0,0,W,H)}else sceneDraw(s,t);if(t>89){c.fillStyle=`rgba(3,9,5,${smooth((t-89)/1)*.95})`;c.fillRect(0,0,W,H)};return true;};
window.ready=(async()=>{await document.fonts.load('800 70px Manrope');await document.fonts.load('700 70px Bengali');const names=['matches','calendar','matches-dark','lineups-detail','stats-detail','commentary-detail','team','squad','compare-detail','player','player-stats','standings','scorers','search','news','favorites','profile','reactions','mobile-team','admin','sync'];await Promise.all(names.map(async n=>{const im=new Image();im.src=`captures/${n}.png`;await im.decode();pictures[n]=im}));window.renderFrame(0);return true})();
let playing=false,startTime=0,current=0;const play=document.querySelector('#play'),seek=document.querySelector('#seek'),timer=document.querySelector('#time');
function clockLabel(v){return`${Math.floor(v/60)}:${String(Math.floor(v%60)).padStart(2,'0')}`}
play.onclick=()=>{playing=!playing;play.textContent=playing?'Pause':'Play';startTime=performance.now()-current*1000;if(playing)requestAnimationFrame(tick)};
seek.oninput=()=>{current=+seek.value;startTime=performance.now()-current*1000;window.renderFrame(current);timer.textContent=clockLabel(current)};
function tick(now){if(!playing)return;current=Math.min(90,(now-startTime)/1000);window.renderFrame(current);seek.value=current;timer.textContent=clockLabel(current);if(current<90)requestAnimationFrame(tick);else{playing=false;play.textContent='Play';current=0}}
if(new URLSearchParams(location.search).has('render'))document.body.classList.add('render');
