// One canvas and one animation loop for all independently switchable effects.
// No timers or animation work are retained when everything is off or the app is hidden.
const themeEffects = { purple:'stars',blue:'glints',sunset:'sparks',mono:'rain',jade:'fireflies',rose:'petals',crimson:'sparks',sand:'dust' };
function effectTypes(settings) {
  if (settings.sceneAutoEffect && themeEffects[settings.backgroundMode]) return [themeEffects[settings.backgroundMode]];
  return [['snowEffect','snow'],['sceneSparks','sparks'],['scenePetals','petals'],['sceneRain','rain'],['sceneStars','stars'],['sceneFireflies','fireflies'],['sceneGlints','glints'],['sceneDust','dust']].filter(([key])=>settings[key]).map(([,type])=>type);
}
function installEffects() {
  let canvas, ctx, frame = 0, last = 0, width = 0, height = 0, particles = [], signature = '';
  let speed = 1;
  const bounded = (value, min, max, fallback) => Number.isFinite(Number(value)) ? Math.min(max, Math.max(min, Number(value))) : fallback;
  function resize() {
    if (!canvas) return;
    width = innerWidth; height = innerHeight;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  function particle(type, scattered = false) {
    return { type, x: Math.random() * width, y: scattered ? Math.random() * height : ['sparks','fireflies','glints'].includes(type) ? height + 15 : -15,
      r: type === 'petals' ? 3 + Math.random() * 4 : 1 + Math.random() * 2.4,
      v: type==='rain'?180+Math.random()*150:type==='stars'?90+Math.random()*80:type==='dust'||type==='fireflies'||type==='glints'?4+Math.random()*10:12+Math.random()*30, phase: Math.random() * Math.PI * 2, angle: Math.random() * Math.PI * 2 };
  }
  function stop() { cancelAnimationFrame(frame); frame = 0; last = 0; }
  function draw(time) {
    frame = requestAnimationFrame(draw);
    if (last && time - last < 1000 / 30) return;
    const dt = last ? Math.min((time - last) / 1000, .1) : 0;
    last = time;
    ctx.clearRect(0, 0, width, height);
    for (const p of particles) {
      p.phase += dt; p.y += p.v * dt * speed * (p.type === 'sparks'||p.type==='fireflies'||p.type==='glints' ? -1 : 1);
      p.x += Math.sin(p.phase) * dt * (p.type === 'petals' ? 27 : 10) * speed;
      if(p.type==='stars')p.x-=p.v*dt*speed*1.8;
      if(p.type==='rain')p.x-=p.v*dt*speed*.15;
      p.angle += dt * speed;
      if (p.y > height + 20 || p.y < -25 || p.x < -30 || p.x > width + 30) Object.assign(p, particle(p.type));
      ctx.save(); ctx.translate(p.x, p.y);
      if (p.type==='rain'||p.type==='stars') {
        ctx.strokeStyle=p.type==='rain'?'rgba(191,210,231,.22)':'rgba(215,195,255,.45)';ctx.lineWidth=p.type==='rain'?.7:1.2;
        ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(p.type==='stars'?28:2,p.type==='stars'?-16:-13);ctx.stroke();
      } else if(p.type==='fireflies'||p.type==='glints'||p.type==='dust') {
        const alpha=.12+.45*Math.abs(Math.sin(p.phase*.7));
        ctx.fillStyle=p.type==='fireflies'?`rgba(190,235,120,${alpha})`:p.type==='glints'?`rgba(174,232,255,${alpha})`:`rgba(226,203,164,${alpha*.6})`;
        if(p.type!=='dust'){ctx.shadowBlur=9;ctx.shadowColor=p.type==='glints'?'#97dfff':'#a9e573';}
        ctx.beginPath();ctx.arc(0,0,p.type==='dust'?p.r*.45:p.r*.7,0,Math.PI*2);ctx.fill();
      } else if (p.type === 'petals') {
        ctx.rotate(p.angle); ctx.fillStyle = 'rgba(255,159,180,.68)';
        ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * (.35 + .15 * Math.cos(p.phase)), 0, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = p.type === 'sparks' ? `rgba(255,177,81,${.3 + .45 * Math.abs(Math.sin(p.phase))})` : 'rgba(243,247,255,.64)';
        if (p.type === 'sparks') { ctx.shadowBlur = 9; ctx.shadowColor = '#ff9d43'; }
        ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  }
  function update() {
    const settings = window.modPlayerSettings?.get() || {};
    const types = effectTypes(settings);
    speed = bounded(settings.sceneSpeed, .3, 2, 1);
    const density = bounded(settings.sceneDensity, 10, 100, 50);
    const next = JSON.stringify([types, density]);
    if (!types.length) { stop(); canvas?.remove(); canvas = ctx = undefined; particles = []; signature = ''; return; }
    if (!canvas) {
      canvas = document.createElement('canvas'); canvas.id = 'rhythm-effects'; canvas.setAttribute('aria-hidden', 'true');
      Object.assign(canvas.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '900' });
      document.body.append(canvas); ctx = canvas.getContext('2d'); resize();
    }
    canvas.dataset.effects = types.join(',');
    if (signature !== next) { signature = next; particles = types.flatMap(type => Array.from({ length: Math.max(1,Math.round(density * (type==='stars'?.055:type==='rain'?.9:.55))) }, () => particle(type, true))); }
    if (document.hidden) stop(); else if (!frame) frame = requestAnimationFrame(draw);
  }
  window.addEventListener('resize', resize);
  window.addEventListener('full-mod-settings', update);
  document.addEventListener('visibilitychange', update);
  update();
}
