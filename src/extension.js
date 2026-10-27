(() => {
  'use strict';
  if (window.__spotifyScenes) return;
  window.__spotifyScenes = {version:'0.1.0'};
  const wallpapers = [['purple','Фиолетовый город'],['blue','Голубое побережье'],['sunset','Закат у храма'],['mono','Чёрно-белый дождь'],['jade','Нефритовый туман'],['rose','Розовая сакура'],['crimson','Алый вечер'],['sand','Песочный рассвет']];
  const fonts = ['Comfortaa','Unbounded','Jura','Russo One','Golos Text','Rubik'];
  const effects = [['snowEffect','Снег'],['sceneSparks','Искры'],['scenePetals','Лепестки'],['sceneRain','Дождь'],['sceneStars','Звёзды'],['sceneFireflies','Светлячки'],['sceneGlints','Блики'],['sceneDust','Пыль']];
  const defaults = {"backgroundMode":"jade","font":"Jura","backgroundFit":"cover","backgroundDim":35,"backgroundBlur":0,"sceneAutoEffect":true,"sceneDensity":100,"sceneSpeed":0.8,"layout":true,"sidebarCollapsed":true,"mediaMode":"verity","verityDance":"auto","verityEmotion":"auto","veritySpeed":1,"snowEffect":false,"sceneSparks":false,"scenePetals":false,"sceneRain":false,"sceneStars":false,"sceneFireflies":false,"sceneGlints":false,"sceneDust":false};
  let settings, storageKey, customUrl='', db, background, panel, nav, home, quality, ready=false;
  const clamp=(v,a,b,f)=>Number.isFinite(Number(v))?Math.max(a,Math.min(b,Number(v))):f;
  function normalize(input) {
    const s={...defaults,...input};
    if(!['off','custom',...wallpapers.map(x=>x[0])].includes(s.backgroundMode))s.backgroundMode='jade';
    if(!['',...fonts].includes(s.font))s.font='Jura';
    s.backgroundDim=clamp(s.backgroundDim,0,85,35);s.backgroundBlur=clamp(s.backgroundBlur,0,20,0);
    s.sceneDensity=clamp(s.sceneDensity,10,100,100);s.sceneSpeed=clamp(s.sceneSpeed,.3,2,.8);
    if(!['video','verity','off'].includes(s.mediaMode))s.mediaMode='video';
    if(!VERITY_DANCES.some(x=>x[0]===s.verityDance))s.verityDance='auto';
    if(!VERITY_EMOTIONS.some(x=>x[0]===s.verityEmotion))s.verityEmotion='auto';
    s.veritySpeed=clamp(s.veritySpeed,.5,1.7,1);
    s.backgroundFit=s.backgroundFit==='contain'?'contain':'cover';
    for(const key of ['layout','sidebarCollapsed','sceneAutoEffect',...effects.map(x=>x[0])])s[key]=Boolean(s[key]);
    return s;
  }
  function save(patch) {
    const next=normalize({...settings,...patch});
    try {localStorage.setItem(storageKey,JSON.stringify(next));settings=next;}
    catch {Spicetify.showNotification('Не удалось сохранить настройки: хранилище заполнено.',true);return;}
    apply();window.dispatchEvent(new Event('full-mod-settings'));
  }
  function imageStore(mode,value) {
    return new Promise((resolve,reject)=>{const tx=db.transaction('images',mode==='get'?'readonly':'readwrite');const store=tx.objectStore('images');const req=mode==='get'?store.get(storageKey):mode==='delete'?store.delete(storageKey):store.put(value,storageKey);req.onsuccess=()=>{if(mode==='get')resolve(req.result)};tx.oncomplete=()=>resolve(req.result);tx.onerror=()=>reject(tx.error);});
  }
  async function openStore(){db=await new Promise((resolve,reject)=>{const r=indexedDB.open('spotify-scenes',1);r.onupgradeneeded=()=>r.result.createObjectStore('images');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});const blob=await imageStore('get');if(blob)customUrl=URL.createObjectURL(blob);}
  function el(tag,props={},...children){const n=document.createElement(tag);for(const [k,v]of Object.entries(props)){if(k==='class')n.className=v;else if(k==='text')n.textContent=v;else if(k.startsWith('on'))n.addEventListener(k.slice(2),v);else n.setAttribute(k,v);}n.append(...children);return n;}
  function button(text,fn,props={}){return el('button',{type:'button',text,onclick:fn,...props});}
  function apply(){
    const s=settings;const root=document.documentElement;
    document.body.classList.toggle('sc-layout',s.layout);document.body.classList.toggle('sc-wide-nav',!s.sidebarCollapsed);
    document.body.dataset.sceneMedia=s.mediaMode;
    const url=s.backgroundMode==='custom'?customUrl:ASSETS.backgrounds[s.backgroundMode];
    document.body.classList.toggle('sc-background',Boolean(url));
    background.style.backgroundImage=url?`url(${JSON.stringify(url)})`:'none';background.style.backgroundSize=s.backgroundFit;
    background.style.filter=`blur(${s.backgroundBlur}px)`;root.style.setProperty('--sc-dim',s.backgroundDim/100);
    root.style.setProperty('--sc-font',s.font?`"${s.font}",sans-serif`:'"SpotifyMixUI",sans-serif');document.body.classList.toggle('sc-font',Boolean(s.font));
    nav?.querySelector('[data-collapse]')?.setAttribute('aria-label',s.sidebarCollapsed?'Развернуть меню':'Свернуть меню');
    if(nav)nav.hidden=!s.layout;
    syncWindowChrome();
    mountHome();
    syncMediaPreview();
  }
  let titlebarHeight;
  function syncWindowChrome(){
    const height=settings.layout?48:64;
    if(height===titlebarHeight)return;
    const native=Spicetify.Platform.ControlMessageAPI;
    if(typeof native?.setTitlebarHeight==='function'){
      titlebarHeight=height;
      Promise.resolve(native.setTitlebarHeight(height)).catch(()=>{titlebarHeight=undefined});
    }
  }
  function installVerity(){
    const face=happy=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><radialGradient id="ball" cx="35%" cy="25%" r="78%"><stop stop-color="#fff181"/><stop offset=".5" stop-color="#ffdc25"/><stop offset="1" stop-color="#d79808"/></radialGradient></defs><circle cx="32" cy="32" r="31" fill="url(#ball)"/><ellipse cx="23" cy="25" rx="3.2" ry="5" fill="#17130b"/><ellipse cx="41" cy="25" rx="3.2" ry="5" fill="#17130b"/><path d="${happy?'M17 37 Q32 55 47 37':'M19 47 Q32 32 45 47'}" fill="none" stroke="#17130b" stroke-width="3.8" stroke-linecap="round"/></svg>`;
    const images=[false,true].map(x=>`url("data:image/svg+xml,${encodeURIComponent(face(x))}")`);let last;
    const update=()=>{
      const native=document.querySelector('[data-testid=control-button-playpause]');
      const label=native?.getAttribute('aria-label')||'';let playing=false;
      try{playing=/пауза|приостанов|pause/i.test(label)||(!/слушать|воспроизвести|play/i.test(label)&&Boolean(Spicetify.Player.isPlaying?.()))}catch{}
      document.querySelectorAll('[data-testid=control-button-playpause],.sc-home-play').forEach(n=>n.classList.add('sc-verity-button'));
      if(last!==playing){last=playing;document.documentElement.style.setProperty('--sc-verity-face',images[Number(playing)]);document.body.dataset.verity=playing?'happy':'sad';}
      const hero=document.querySelector('.sc-home-play');if(hero){const text=playing?'Приостановить музыку':'Включить музыку';if(hero.getAttribute('aria-label')!==text)hero.setAttribute('aria-label',text);}
      syncSavedIcons();
    };
    Spicetify.Player.addEventListener('onplaypause',update);Spicetify.Player.addEventListener('songchange',update);
    const observer=new MutationObserver(update);observer.observe(document.querySelector('#main')||document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['aria-label','aria-checked','aria-pressed']});update();
  }
  function syncSavedIcons(){
    for(const control of document.querySelectorAll('button[aria-checked],button[aria-pressed],button[data-testid=add-button]')){
      const label=control.getAttribute('aria-label')||'';
      const relevant=/любим|плейлист|медиатек|библиотек|liked|playlist|library|saved/i.test(label)&&!/скрыть|hide/i.test(label);
      const saved=control.getAttribute('aria-checked')==='true'||control.getAttribute('aria-pressed')==='true';
      control.classList.toggle('sc-mogity-saved',relevant&&saved);
    }
  }
  function mainPlay(){if(Spicetify.Player.data?.item||document.querySelector('[data-testid=now-playing-widget-v2] a'))Spicetify.Player.togglePlay();else void randomLikes();}
  let mediaOpenRequested=false;
  function openHomeMedia(attempt=0){
    if(!settings.layout||!['/','/home'].includes(Spicetify.Platform.History.location.pathname)||mediaOpenRequested)return;
    if(document.querySelector('.sc-native-right [aria-hidden=false] [data-npv-root]')){mediaOpenRequested=true;return;}
    const cover=document.querySelector('[data-testid=cover-art-button]');
    if(cover){mediaOpenRequested=true;cover.click();}
    else if(attempt<30)setTimeout(()=>openHomeMedia(attempt+1),500);
  }
  let lyricsUri='',lyricsData=null,lyricsRequest=0,lyricsActive=-1,lyricsManualUntil=0;
  async function loadFullLyrics(){
    const uri=Spicetify.Player.data?.item?.uri||'';
    if(uri===lyricsUri)return;
    lyricsUri=uri;lyricsData=null;lyricsActive=-1;lyricsManualUntil=0;const request=++lyricsRequest;
    document.querySelector('.sc-lyrics-full')?.remove();
    if(!/^spotify:track:[a-zA-Z0-9]+$/.test(uri))return;
    try{
      const result=await Spicetify.CosmosAsync.get('https://spclient.wg.spotify.com/color-lyrics/v2/track/'+uri.split(':')[2]+'?format=json&vocalRemoval=false');
      if(request!==lyricsRequest)return;
      const lines=result.lyrics?.lines;
      if(!Array.isArray(lines)||!lines.some(line=>line.words?.trim()))return;
      lyricsData={lines:lines.map(line=>({text:String(line.words||''),time:Number(line.startTimeMs)||0})),synced:result.lyrics.syncType==='LINE_SYNCED',rtl:Boolean(result.lyrics.isRtlLanguage)};
      syncMediaPreview();updateFullLyrics();
    }catch{/* Keep the native text when full lyrics are unavailable. */}
  }
  function clipLyricsLines(box){
    const bounds=box.getBoundingClientRect(),panel=box.closest('.sc-native-right')?.getBoundingClientRect();
    const top=Math.max(bounds.top,panel?.top??bounds.top),bottom=Math.min(bounds.bottom,panel?.bottom??bounds.bottom)-3;
    for(const line of box.querySelectorAll(box.classList.contains('sc-lyrics-full')?':scope > p':'.J4_kkGYm5hjbZlztykxr')){
      const r=line.getBoundingClientRect();line.classList.toggle('sc-line-clipped',r.top<top-.5||r.bottom>bottom+.5);
    }
  }
  let verityScene=null,verityHost=null;
  function syncVerityScene(grid){
    const enabled=settings.layout&&settings.mediaMode==='verity'&&document.body.classList.contains('sc-home-mode')&&grid;
    if(!enabled||verityHost?.parentElement!==grid){verityScene?.destroy();verityScene=null;verityHost?.remove();verityHost=null;}
    if(!enabled||verityScene)return;
    verityHost=el('section',{class:'sc-verity-stage','aria-label':'Верити 3D'});grid.append(verityHost);
    try{verityScene=createVerity3D(verityHost,()=>({playing:document.body.dataset.verity==='happy',dance:settings.verityDance,emotion:settings.verityEmotion,speed:settings.veritySpeed,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches}));}
    catch{verityHost.textContent='☺';verityHost.classList.add('sc-verity-fallback');verityScene={destroy(){}};}
  }
  function updateLyricsVisibility(){for(const box of document.querySelectorAll('.sc-lyrics-full,[data-testid=lyrics-npv-section]'))clipLyricsLines(box);}
  function updateFullLyrics(){
    updateLyricsVisibility();
    const box=document.querySelector('.sc-lyrics-full');if(!box||!lyricsData?.synced)return;
    const progress=Spicetify.Player.getProgress();let index=-1;
    for(let i=0;i<lyricsData.lines.length;i++){if(lyricsData.lines[i].time<=progress)index=i;else break;}
    if(index===lyricsActive)return;lyricsActive=index;
    [...box.children].forEach((line,i)=>line.classList.toggle('sc-line-active',i===index));
    const current=box.children[index];if(current&&Date.now()>lyricsManualUntil)box.scrollTo({top:Math.max(0,current.offsetTop-box.offsetTop-box.clientHeight*.35),behavior:'smooth'});
  }
  const videoBorders=new WeakMap();
  function detectVideoBorders(pixels,width,height){
    let lit=0;for(let i=0;i<pixels.length;i+=4)if(Math.max(pixels[i],pixels[i+1],pixels[i+2])>32)lit++;
    if(lit<width*height*.2)return null;
    const black=(x,y)=>{const i=(y*width+x)*4;return Math.max(pixels[i],pixels[i+1],pixels[i+2])<=10};
    function edge(horizontal,reverse){const length=horizontal?height:width,cross=horizontal?width:height,limit=Math.floor(length*.3);let count=0;for(;count<limit;count++){let dark=0;const at=reverse?length-1-count:count;for(let j=0;j<cross;j++)if(horizontal?black(j,at):black(at,j))dark++;if(dark/cross<.985)break;}return count>=2&&count<limit?count/length*100:0;}
    return[edge(true,false),edge(false,true),edge(true,true),edge(false,false)];
  }
  function trimVideoBorders(){
    if(!settings.layout||!document.body.classList.contains('sc-home-mode')||document.hidden)return;
    for(const video of document.querySelectorAll('.sc-native-right .HuKs8FZg6Y75cV9Lh0Kk video')){
      if(video.readyState<2||!video.videoWidth||!video.videoHeight)continue;
      const source=video.currentSrc||video.srcObject;let state=videoBorders.get(video);
      if(!state||state.source!==source){state={source,canvas:document.createElement('canvas'),candidate:null,count:0,blocked:false};videoBorders.set(video,state);video.classList.remove('sc-trim-bars');}
      if(state.blocked)continue;
      try{
        const scale=192/Math.max(video.videoWidth,video.videoHeight),canvas=state.canvas;canvas.width=Math.max(1,Math.round(video.videoWidth*scale));canvas.height=Math.max(1,Math.round(video.videoHeight*scale));
        const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(video,0,0,canvas.width,canvas.height);
        const insets=detectVideoBorders(context.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height);if(!insets)continue;
        if(state.candidate&&insets.every((n,i)=>Math.abs(n-state.candidate[i])<1.2))state.count++;else{state.candidate=insets;state.count=1;}
        if(state.count<3)continue;
        for(let i=0;i<4;i++)video.style.setProperty('--sc-trim-'+i,insets[i].toFixed(2)+'%');
        video.classList.toggle('sc-trim-bars',insets.some(n=>n>0));
      }catch{state.blocked=true;/* Protected streams retain their complete native frame. */}
    }
  }
  function syncMediaPreview(){
    const grid=document.querySelector('.sc-native-right .PrgN1zoSiZcVCNSWQwci');syncVerityScene(grid);if(!grid)return;
    const media=grid.querySelector('.HuKs8FZg6Y75cV9Lh0Kk');media?.classList.toggle('sc-cover-only',!media.querySelector('video')&&Boolean(media.querySelector('img')));
    for(const image of grid.querySelectorAll('.HuKs8FZg6Y75cV9Lh0Kk img')){
      let shell=image.parentElement;while(shell&&!shell.classList.contains('HuKs8FZg6Y75cV9Lh0Kk')){shell.classList.add('sc-cover-shell');shell=shell.parentElement;}
    }
    for(const video of grid.querySelectorAll('.HuKs8FZg6Y75cV9Lh0Kk video')){
      let shell=video.parentElement;while(shell&&!shell.classList.contains('HuKs8FZg6Y75cV9Lh0Kk')){shell.classList.add('sc-video-shell');shell=shell.parentElement;}
    }
    if(lyricsData&&document.body.classList.contains('sc-home-mode')){
      if(!grid.querySelector('.sc-lyrics-full')){
        const box=el('section',{class:'sc-lyrics-full',dir:lyricsData.rtl?'rtl':'auto','aria-label':'Текст песни'});
        for(const line of lyricsData.lines){
          const row=el('p',{text:line.text||'♪'});
          if(lyricsData.synced){const seek=()=>{lyricsManualUntil=0;lyricsActive=-1;Spicetify.Player.seek(line.time);updateFullLyrics()};row.setAttribute('role','button');row.tabIndex=0;row.addEventListener('click',seek);row.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();seek()}});}
          box.append(row);
        }
        box.addEventListener('wheel',()=>{lyricsManualUntil=Date.now()+6000},{passive:true});
        box.addEventListener('scroll',()=>clipLyricsLines(box),{passive:true});
        grid.append(box);clipLyricsLines(box);lyricsActive=-1;
      }
      grid.classList.add('sc-has-full-lyrics');grid.querySelector('.sc-lyrics-empty')?.remove();return;
    }
    grid.classList.remove('sc-has-full-lyrics');grid.querySelector('.sc-lyrics-full')?.remove();
    const existing=grid.querySelector('.sc-lyrics-empty');
    if(!document.body.classList.contains('sc-home-mode')||grid.querySelector('[data-testid=lyrics-npv-section]')){existing?.remove();return;}
    if(!existing)grid.append(el('section',{class:'sc-lyrics-empty'},el('p',{text:'Для этого трека текст сейчас недоступен.'})));
  }
  function markLayout(){
    const root=document.querySelector('.Root__top-container');if(!root)return;
    for(const n of root.children){const area=getComputedStyle(n).gridArea;
      if(area==='left-sidebar')n.classList.add('sc-native-sidebar');
      else if(area==='main-view')n.classList.add('sc-native-main');
      else if(area==='now-playing-bar')n.classList.add('sc-native-player');
      else if(area==='right-sidebar')n.classList.add('sc-native-right');
      else if(!n.classList.contains('Root__globalNav')&&!n.classList.contains('Root__lyrics-cinema')&&area.includes('/')&&getComputedStyle(n).display==='grid')n.classList.add('sc-native-resizer');
    }
  }
  let searchOpen=false;
  function syncSearch(){
    const path=Spicetify.Platform.History.location.pathname;
    document.body.classList.toggle('sc-search-mode',settings.layout&&(searchOpen||path.startsWith('/search')));
    document.body.classList.toggle('sc-search-empty',settings.layout&&/^\/search\/?$/.test(path));
    document.body.classList.toggle('sc-content-only',settings.layout&&(path.startsWith('/search')||path==='/collection/tracks'||/^\/(playlist|station|radio|album|artist)\//.test(path)));
    document.body.classList.toggle('sc-liked-mode',settings.layout&&path==='/collection/tracks');
  }
  function openSearch(){searchOpen=true;Spicetify.Platform.History.push('/search');mountHome();requestAnimationFrame(()=>{const input=document.querySelector('input[data-top-bar-search]');input?.focus();input?.select();});}
  function navigate(path){if(path==='/search'){openSearch();return;}searchOpen=false;if(path==='/collection'){syncSearch();void showLibrary();return;}Spicetify.Platform.History.push(path);mountHome();}
  async function showLibrary(){
    document.querySelector('#sc-library')?.remove();
    const dialog=el('dialog',{id:'sc-library','aria-labelledby':'sc-library-title'});
    const body=el('div',{class:'sc-settings-body'},button('♡  Любимые треки',()=>{dialog.close();navigate('/collection/tracks')}));
    const status=el('p',{class:'sc-note',text:'Загрузка коллекции…'});body.append(status);
    dialog.append(el('header',{},el('h2',{id:'sc-library-title',text:'Моя коллекция'}),button('×',()=>dialog.close(),{'aria-label':'Закрыть коллекцию'})),body);document.body.append(dialog);dialog.showModal();
    try{
      const root=await Spicetify.Platform.RootlistAPI.getContents();let count=0;
      function appendItems(items,depth=0){for(const item of items||[]){if(item.type==='folder'){body.append(el('h3',{text:item.name||'Папка'}));appendItems(item.items,depth+1);}else if(item.type==='playlist'&&/^spotify:playlist:[a-zA-Z0-9]+$/.test(item.uri)){count++;const b=button(item.name||'Плейлист',()=>{dialog.close();navigate('/playlist/'+item.uri.split(':')[2])},{class:'sc-library-item'});b.style.marginLeft=Math.min(depth*12,48)+'px';body.append(b)}}}
      appendItems(root.items);status.textContent=count?'Твои сохранённые плейлисты':'Сохранённых плейлистов пока нет';
    }catch{status.textContent='Не удалось загрузить плейлисты. Попробуй ещё раз.';}
  }
  const icons={home:'<path d="m3 10 9-7 9 7v11h-6v-7H9v7H3z"/>',search:'<circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 6 6"/>',library:'<path d="M4 3v18M10 3v18M16 3l5 18"/>',heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>',settings:'<circle cx="12" cy="12" r="3"/><path d="m9 2-1 4-4 1-2 4 3 3v4l4 3 4-2 4 1 3-4-1-4 2-4-4-3-4 1z"/>',menu:'<path d="M4 6h16M4 12h16M4 18h16"/>'};
  function icon(kind){const n=el('span',{'aria-hidden':'true',class:'sc-icon'});n.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${icons[kind]}</svg>`;return n;}
  function makeNav(){nav=el('nav',{id:'sc-nav','aria-label':'Музыка'});for(const [kind,label,path]of [['home','Главная','/'],['search','Поиск','/search'],['heart','Любимые треки','/collection/tracks']]){const b=button('',()=>navigate(path),{'aria-label':label,title:label});b.append(icon(kind),el('span',{class:'sc-nav-label',text:label}));nav.append(b)}nav.append(el('div',{class:'sc-spacer'}));const b=button('',showSettings,{'aria-label':'Настройки оформления',title:'Настройки оформления'});b.append(icon('settings'),el('span',{class:'sc-nav-label',text:'Настройки'}));nav.append(b);const collapse=button('',()=>save({sidebarCollapsed:!settings.sidebarCollapsed}),{'data-collapse':'',title:'Размер меню'});collapse.append(icon('menu'));nav.append(collapse);document.body.append(nav);}
  function mountHome(){
    syncSearch();
    const path=Spicetify.Platform.History.location.pathname;const target=document.querySelector('.main-home-home')||document.querySelector('.sc-native-main main');
    if(!settings.layout||!['/','/home'].includes(path)||!target){document.body.classList.remove('sc-home-mode');home?.remove();document.querySelector('#sc-home-wave')?.remove();home=null;syncVerityScene(null);return;}
    document.body.classList.add('sc-home-mode');
    if(!target.querySelector('#sc-home-wave')){
      const wave=el('div',{id:'sc-home-wave','aria-hidden':'true'});
      for(let i=0;i<80;i++){const height=8+Math.abs(Math.sin(i*.73)*Math.cos(i*.19))*26;wave.append(el('i',{style:`--sc-wave-height:${height.toFixed(1)}px;--sc-wave-delay:${(-i*.17).toFixed(2)}s;--sc-wave-duration:${(1.2+(i%7)*.17).toFixed(2)}s`}))}
      target.append(wave);
    }
    const wave=target.querySelector('#sc-home-wave');if(wave?.nextElementSibling)target.append(wave);
    if(home?.isConnected)return;
    home=el('section',{id:'sc-home','aria-label':'Моя музыка'});
    const shortcuts=el('div',{class:'sc-shortcuts'},button('♡  Любимые треки',()=>navigate('/collection/tracks')),button('♫  Моя коллекция',()=>navigate('/collection')),button('⌕  Найти музыку',()=>navigate('/search')));
    const center=el('div',{class:'sc-home-center'},el('h1',{text:'Моя музыка'}),el('p',{text:'Случайный трек из любимых'}),button('▶',mainPlay,{'aria-label':'Включить музыку',class:'sc-home-play'}));
    home.append(shortcuts,center);target.prepend(home);
    openHomeMedia();
  }
  let randomBusy=false;
  let likedCache=[],likedCacheTime=0;
  async function pickLiked(){
    const api=Spicetify.Platform.LibraryAPI;
    if(typeof api?.getTracks!=='function')throw Error('Клиент не предоставляет медиатеку');
    const first=await api.getTracks({offset:0,limit:1});
    const total=first.totalLength??first.total;
    if(!Number.isInteger(total)||total<0)throw Error('Не удалось прочитать размер медиатеки');
    if(!total){
      // Some client builds return tracks while omitting the length fields.
      if(Date.now()-likedCacheTime>300000||!likedCache.length){
        const uris=[];
        for(let offset=0;offset<100000;offset+=200){const page=await api.getTracks({offset,limit:200});for(const t of page.items||[]){const uri=t.uri??t.track?.uri;if(uri?.startsWith('spotify:track:')&&t.isPlayable!==false)uris.push(uri)}if((page.items?.length||0)<200)break;if(offset===99800)throw Error('Медиатека слишком велика для случайного выбора');}
        likedCache=uris;likedCacheTime=Date.now();
      }
      if(!likedCache.length)throw Error('В любимых пока нет доступных треков');
      return likedCache[Math.floor(Math.random()*likedCache.length)];
    }
    const offset=Math.floor(Math.random()*total);const result=await api.getTracks({offset,limit:1});
    const item=result.items?.[0];const uri=item?.uri??item?.track?.uri;
    if(!uri?.startsWith('spotify:track:'))throw Error('Этот трек недоступен');
    return uri;
  }
  async function randomLikes(){
    if(randomBusy)return;randomBusy=true;
    try{const uri=await pickLiked();await Spicetify.Player.playUri(uri);Spicetify.showNotification('Случайный трек из любимых');}
    catch(e){Spicetify.showNotification(e.message||'Не удалось запустить любимые треки',true)}finally{randomBusy=false}
  }
  function qualityText(){
    const q=Spicetify.Player.data?.playbackQuality;
    // The enum is undocumented. Never turn enum numbers or a target preference into a bitrate claim.
    if(!q)return 'Клиент не сообщает качество текущего потока';
    return 'Клиент сообщает служебные уровни качества, без подтверждённого битрейта. Точное значение недоступно.';
  }
  function field(label,input){return el('label',{class:'sc-field'},el('span',{text:label}),input)}
  function select(key,options){const n=el('select',{'aria-label':key});for(const [value,label]of options)n.append(el('option',{value,text:label}));n.value=String(settings[key]);n.addEventListener('change',()=>{save({[key]:n.value});if(key==='backgroundMode')updateSelections()});return n;}
  function range(key,min,max,step,unit){const n=el('input',{type:'range',min,max,step,value:settings[key]});const output=el('output',{text:settings[key]+unit});n.addEventListener('input',()=>{save({[key]:Number(n.value)});output.value=n.value+unit});return el('span',{class:'sc-range'},n,output)}
  function check(key,text){const n=el('input',{type:'checkbox'});n.checked=settings[key];n.addEventListener('change',()=>{save({[key]:n.checked});updateSelections()});return field(text,n)}
  function updateSelections(){panel?.querySelectorAll('[data-bg]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.bg===settings.backgroundMode)));panel?.querySelectorAll('[data-effect]').forEach(n=>{n.disabled=settings.sceneAutoEffect});}
  function showSettings(){
    if(panel?.open){panel.focus();return;}
    panel?.remove();panel=el('dialog',{id:'sc-settings','aria-labelledby':'sc-title'});
    const header=el('header',{},el('h2',{id:'sc-title',text:'Оформление'}),button('×',()=>panel.close(),{'aria-label':'Закрыть'}));
    const body=el('div',{class:'sc-settings-body'});
    body.append(el('h3',{text:'Фон'}));const grid=el('div',{class:'sc-wallpapers'});
    for(const[id,name]of wallpapers){const b=button('',()=>{save({backgroundMode:id});updateSelections()},{'data-bg':id,'aria-pressed':String(settings.backgroundMode===id)});b.append(el('img',{src:ASSETS.previews[id],alt:'',loading:'lazy'}),el('span',{text:name}));grid.append(b)}body.append(grid);
    const file=el('input',{type:'file',accept:'image/jpeg,image/png,image/webp,image/gif',hidden:''});
    file.addEventListener('change',async()=>{const f=file.files[0];if(!f)return;if(f.size>20*1024*1024){Spicetify.showNotification('Выбери изображение до 20 МБ',true);return}const url=URL.createObjectURL(f);try{const img=new Image();img.src=url;await img.decode();if(!db)await openStore();await imageStore('put',f);if(customUrl)URL.revokeObjectURL(customUrl);customUrl=url;save({backgroundMode:'custom'});updateSelections();}catch{URL.revokeObjectURL(url);Spicetify.showNotification('Не удалось сохранить изображение',true)}finally{file.value=''}});
    body.append(el('div',{class:'sc-actions'},button('Своё изображение',()=>file.click()),button('Без фона',()=>{save({backgroundMode:'off'});updateSelections()})),file);
    body.append(field('Заполнение окна',select('backgroundFit',[['cover','Заполнить окно'],['contain','Показать целиком']])));
    body.append(field('Затемнение',range('backgroundDim',0,85,1,'%')),field('Размытие',range('backgroundBlur',0,20,1,' px')));
    body.append(el('h3',{text:'Видеоряд и Верити'}),field('Вместо видеоряда',select('mediaMode',[['video','Видеоряд / обложка'],['verity','Верити 3D'],['off','Скрыть видеоряд']])));
    const character=el('div',{class:'sc-verity-settings'});
    character.append(field('Танец Верити',select('verityDance',VERITY_DANCES)),field('Эмоция Верити',select('verityEmotion',VERITY_EMOTIONS)),field('Скорость движений',range('veritySpeed',.5,1.7,.1,'×')),el('p',{class:'sc-note',text:'В автоматическом режиме Верити меняет танцы и эмоции. На паузе отдыхает. Нажми на него, чтобы сменить танец.'}));body.append(character);
    body.append(el('h3',{text:'Шрифт'}),field('Шрифт интерфейса',select('font',[['','Стандартный Spotify'],...fonts.map(x=>[x,x])])));
    body.append(el('h3',{text:'Эффекты'}),check('sceneAutoEffect','Подбирать эффект под фон'));
    const effectGrid=el('div',{class:'sc-effect-grid'});for(const[key,name]of effects){const row=check(key,name);row.querySelector('input').dataset.effect=key;effectGrid.append(row)}body.append(effectGrid,field('Плотность',range('sceneDensity',10,100,1,'%')),field('Скорость',range('sceneSpeed',.3,2,.1,'×')));
    body.append(el('h3',{text:'Расположение'}),check('layout','Расположение в духе Яндекс Музыки'),check('sidebarCollapsed','Компактное меню слева'));
    body.append(el('h3',{text:'Качество аудио'}),el('p',{class:'sc-note',text:qualityText()}));
    panel.append(header,body);document.body.append(panel);panel.addEventListener('click',e=>{if(e.target===panel){const r=panel.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)panel.close()}});updateSelections();panel.showModal();
  }
  async function init(){
    if(!window.Spicetify?.Platform?.History||!Spicetify.Topbar||!Spicetify.Player||!document.body){setTimeout(init,300);return}
    const user=Spicetify.Platform.username??Spicetify.Platform.Session?.username??Spicetify.Platform.Session?.user?.username;
    if(!user){setTimeout(init,500);return;}
    storageKey='spotify-scenes:v1:'+user;
    try{settings=normalize(JSON.parse(localStorage.getItem(storageKey)||'{}'))}catch{settings=normalize({})}
    window.modPlayerSettings={get:()=>settings};
    const style=el('style',{id:'sc-style',text:STYLE});document.head.append(style);
    if(ASSETS.mogity)document.documentElement.style.setProperty('--sc-mogity-face',`url("${ASSETS.mogity}")`);
    for(const [name,data]of Object.entries(ASSETS.fonts)){try{const face=new FontFace(name,`url(${data})`);document.fonts.add(face);face.load().catch(()=>{})}catch{}}
    background=el('div',{id:'sc-background','aria-hidden':'true'});document.body.prepend(background);document.body.prepend(el('div',{id:'sc-shade','aria-hidden':'true'}));
    try{await openStore()}catch{Spicetify.showNotification('Хранилище своего фона недоступно',true)}
    markLayout();makeNav();apply();installEffects();installVerity();
    window.addEventListener('resize',updateLyricsVisibility);
    document.addEventListener('keydown',event=>{if(event.key==='Escape'){searchOpen=false;syncSearch();}});
    document.addEventListener('focusout',event=>{if(event.target.matches?.('input[data-top-bar-search]'))setTimeout(()=>{if(!document.querySelector('[role=search]')?.contains(document.activeElement)){searchOpen=false;syncSearch();}},150)});
    Spicetify.Player.addEventListener('songchange',()=>{void loadFullLyrics()});void loadFullLyrics();setInterval(()=>{void loadFullLyrics();updateFullLyrics()},500);
    setInterval(trimVideoBorders,1600);
    new Spicetify.Topbar.Button('Оформление',icons.settings?`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">${icons.settings}</svg>`:'',showSettings,false,true);
    new Spicetify.Menu.Item('Оформление',false,showSettings,'edit').register();
    Spicetify.Platform.History.listen(()=>setTimeout(mountHome,100));
    const observer=new MutationObserver(()=>{if(!ready){ready=true;requestAnimationFrame(()=>{ready=false;markLayout();mountHome();syncMediaPreview()})}});observer.observe(document.querySelector('#main')||document.body,{subtree:true,childList:true});syncMediaPreview();
    Object.assign(window.__spotifyScenes,{getSettings:()=>({...settings}),qualityText,pickLiked});
  }
  init();
})();

