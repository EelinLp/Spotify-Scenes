const VERITY_DANCES=[['auto','Менять автоматически'],['groove','Грув'],['bounce','Пружинка'],['sway','Покачивания'],['spin','Вертушка'],['shuffle','Шаффл'],['disco','Диско'],['robot','Робот'],['swing','Свинг'],['twist','Твист'],['moonwalk','Лунная походка'],['salsa','Сальса'],['hop','Прыжки'],['orbit','Орбита'],['wave','Волна руками'],['headbang','Хедбэнг'],['victory','Победный танец']];
const VERITY_EMOTIONS=[['auto','Менять автоматически'],['smile','Улыбка'],['grin','Широкая улыбка'],['wink','Подмигивание'],['love','Влюблённый'],['surprise','Удивление'],['cool','Крутой'],['laugh','Смех'],['focus','Сосредоточенный'],['sad','Грустный'],['sleepy','Сонный']];
function createVerity3D(host,getOptions){
  const canvas=document.createElement('canvas');canvas.className='sc-verity-canvas';canvas.setAttribute('aria-label','Верити: нажми, чтобы сменить танец');canvas.setAttribute('role','button');canvas.tabIndex=0;host.append(canvas);
  const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false});
  if(!gl){canvas.remove();const fallback=document.createElement('div');fallback.className='sc-verity-fallback';fallback.textContent='☺';host.append(fallback);host.dataset.renderer='fallback';return{destroy(){fallback.remove()}};}
  host.dataset.renderer='webgl';
  const vertex=`attribute vec3 aPosition;attribute vec3 aNormal;attribute vec2 aUv;uniform mat4 uModel;uniform mat4 uProjection;varying vec3 vNormal;varying vec3 vPosition;varying vec2 vUv;void main(){vec4 p=uModel*vec4(aPosition,1.0);vPosition=p.xyz;vNormal=normalize(mat3(uModel)*aNormal);vUv=aUv;p.z-=4.8;gl_Position=uProjection*p;}`;
  const fragment=`precision mediump float;varying vec3 vNormal;varying vec3 vPosition;varying vec2 vUv;uniform sampler2D uTexture;uniform float uTextured;uniform vec4 uColor;void main(){vec3 n=normalize(vNormal);vec3 l=normalize(vec3(-3.0,4.0,5.0)-vPosition);vec3 eye=normalize(vec3(0.0,0.0,4.8)-vPosition);float diffuse=max(dot(n,l),0.0);float spec=pow(max(dot(n,normalize(l+eye)),0.0),38.0);vec3 base=mix(uColor.rgb,texture2D(uTexture,vUv).rgb,uTextured);vec3 color=base*(0.43+0.57*diffuse)+vec3(1.0,0.94,0.65)*spec*0.30;gl_FragColor=vec4(color,uColor.a);}`;
  function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
  const vs=shader(gl.VERTEX_SHADER,vertex),fs=shader(gl.FRAGMENT_SHADER,fragment),program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
  const vertices=[],indices=[],lat=32,lon=48;
  for(let y=0;y<=lat;y++){const theta=y/lat*Math.PI;for(let x=0;x<=lon;x++){const phi=x/lon*Math.PI*2;const p=[Math.sin(theta)*Math.sin(phi),Math.cos(theta),-Math.sin(theta)*Math.cos(phi)];vertices.push(...p,...p,x/lon,1-y/lat);}}
  for(let y=0;y<lat;y++)for(let x=0;x<lon;x++){const a=y*(lon+1)+x,b=a+lon+1;indices.push(a,b,a+1,a+1,b,b+1);}
  const vb=gl.createBuffer(),ib=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
  for(const[name,size,offset]of[['aPosition',3,0],['aNormal',3,12],['aUv',2,24]]){const a=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,size,gl.FLOAT,false,32,offset);}
  const locations={};for(const name of['uModel','uProjection','uTexture','uTextured','uColor'])locations[name]=gl.getUniformLocation(program,name);
  const texture=gl.createTexture(),face=document.createElement('canvas');face.width=512;face.height=256;const ctx=face.getContext('2d');
  gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.uniform1i(locations.uTexture,0);
  gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  function identity(){return[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];}
  function multiply(a,b){const out=Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];return out;}
  function model(position,rotation,scale){let m=identity();m[12]=position[0];m[13]=position[1];m[14]=position[2];for(let axis=0;axis<3;axis++){const c=Math.cos(rotation[axis]),s=Math.sin(rotation[axis]),r=identity();if(axis===0){r[5]=c;r[6]=s;r[9]=-s;r[10]=c;}if(axis===1){r[0]=c;r[2]=-s;r[8]=s;r[10]=c;}if(axis===2){r[0]=c;r[1]=s;r[4]=-s;r[5]=c;}m=multiply(m,r);}const s=identity();s[0]=scale[0];s[5]=scale[1];s[10]=scale[2];return multiply(m,s);}
  function draw(position,rotation,scale,color,textured=false){gl.uniformMatrix4fv(locations.uModel,false,new Float32Array(model(position,rotation,scale)));gl.uniform4fv(locations.uColor,color);gl.uniform1f(locations.uTextured,textured?1:0);gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0);}
  function heart(x,y,size){ctx.beginPath();ctx.moveTo(x,y+size*.4);ctx.bezierCurveTo(x-size,y-size*.3,x-size*.6,y-size,x,y-size*.35);ctx.bezierCurveTo(x+size*.6,y-size,x+size,y-size*.3,x,y+size*.4);ctx.fill();}
  let lastFace='';
  function paintFace(emotion,blink){const key=emotion+':'+blink;if(lastFace===key)return;lastFace=key;ctx.fillStyle='#ffdb29';ctx.fillRect(0,0,512,256);ctx.fillStyle='#1b160c';ctx.strokeStyle='#1b160c';ctx.lineCap='round';ctx.lineWidth=4;
    for(let i=0;i<2;i++){const x=230+i*52,y=106;if(emotion==='love'&&!blink){ctx.fillStyle='#d74940';heart(x,y,13);ctx.fillStyle='#1b160c';}else if(blink||emotion==='sleepy'||emotion==='laugh'||(emotion==='wink'&&i===1)){ctx.beginPath();ctx.moveTo(x-8,y);ctx.quadraticCurveTo(x,y+(emotion==='laugh'?-5:3),x+8,y);ctx.stroke();}else if(emotion==='cool'){ctx.fillRect(x-14,y-11,28,20);ctx.beginPath();ctx.moveTo(242,98);ctx.lineTo(270,98);ctx.stroke();}else{ctx.beginPath();ctx.ellipse(x,y,emotion==='focus'?6:8,emotion==='focus'?9:17,emotion==='focus'?(i?-.2:.2):0,0,Math.PI*2);ctx.fill();}}
    ctx.beginPath();
    if(emotion==='surprise'){ctx.ellipse(256,151,12,18,0,0,Math.PI*2);ctx.fill();}
    else if(emotion==='sad'){ctx.moveTo(218,163);ctx.quadraticCurveTo(256,130,294,163);ctx.stroke();}
    else if(emotion==='sleepy'){ctx.moveTo(244,151);ctx.quadraticCurveTo(256,155,268,151);ctx.stroke();}
    else if(emotion==='focus'){ctx.moveTo(231,150);ctx.quadraticCurveTo(256,154,281,148);ctx.stroke();}
    else if(emotion==='grin'||emotion==='laugh'){ctx.moveTo(210,143);ctx.quadraticCurveTo(256,163,302,143);ctx.quadraticCurveTo(284,186,256,183);ctx.quadraticCurveTo(228,186,210,143);ctx.fill();ctx.fillStyle='#fff9dc';ctx.beginPath();ctx.moveTo(217,149);ctx.quadraticCurveTo(256,165,295,149);ctx.lineTo(290,159);ctx.quadraticCurveTo(256,174,222,159);ctx.closePath();ctx.fill();}
    else{ctx.moveTo(211,144);ctx.quadraticCurveTo(256,188,301,emotion==='cool'?137:144);ctx.stroke();}
    if(emotion==='focus'||emotion==='sad'){ctx.beginPath();ctx.moveTo(218,80);ctx.lineTo(241,emotion==='focus'?89:73);ctx.moveTo(271,emotion==='focus'?89:73);ctx.lineTo(294,80);ctx.stroke();}
    gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,face);
  }
  const dances=VERITY_DANCES.slice(1).map(x=>x[0]),emotions=['smile','grin','wink','love','surprise','cool','laugh','focus'];
  let danceIndex=Math.floor(Math.random()*dances.length),emotionIndex=0,lastDanceAt=-20,lastEmotionAt=-20,manualUntil=0,boostUntil=0;
  function next(){danceIndex=(danceIndex+1)%dances.length;manualUntil=performance.now()/1000+12;boostUntil=performance.now()/1000+2;}
  canvas.addEventListener('click',next);canvas.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();next();}});
  function pose(name,t){const s=Math.sin,c=Math.cos,beat=t*Math.PI*2*1.7,b=s(beat),a=c(beat),slow=s(beat*.5),p={x:0,y:0,z:0,rx:0,ry:0,rz:0,sx:1,sy:1,sz:1,l:[-1.16,-.05,.1],r:[1.16,-.05,.1],lf:[-.45,-1.12,.15],rf:[.45,-1.12,.15]};
    switch(name){
      case'groove':p.x=.16*b;p.y=.07*a;p.rz=.1*b;p.l[1]=.1+.2*a;p.r[1]=.1-.2*a;break;
      case'bounce':p.y=.26*Math.abs(b);p.sy=1-.09*Math.max(0,-b);p.sx=1+.05*Math.max(0,-b);p.l[1]=.15+.23*Math.abs(b);p.r[1]=p.l[1];break;
      case'sway':p.x=.34*slow;p.rz=-.16*slow;p.ry=.15*slow;p.l[1]=.18*b;p.r[1]=-.18*b;break;
      case'spin':p.ry=beat*.42;p.y=.14*Math.abs(slow);p.l=[-1.28,.28,0];p.r=[1.28,.28,0];break;
      case'shuffle':p.x=.2*slow;p.rz=.07*b;p.lf[0]-=.26*b;p.rf[0]-=.26*b;p.lf[2]=.15+.16*a;p.rf[2]=.15-.16*a;p.y=.06*Math.abs(b);break;
      case'disco':p.rz=.14*slow;p.ry=.18*slow;p.r=[1.02,.85+.18*b,0];p.l=[-.92,-.48,.2];p.lf[0]-=.13*b;p.rf[0]+=.13*b;break;
      case'robot':p.ry=Math.round(slow*3)*.17;p.rz=Math.round(b*2)*.07;p.l=[-1.13,.2+Math.round(a*2)*.14,.2];p.r=[1.13,.2-Math.round(a*2)*.14,.2];break;
      case'swing':p.x=.25*slow;p.y=.1*Math.abs(b);p.rz=-.12*slow;p.l[2]=.35+.25*b;p.r[2]=.35-.25*b;p.lf[0]-=.15*slow;p.rf[0]-=.15*slow;break;
      case'twist':p.ry=.42*b;p.rz=.08*slow;p.l[2]=.2+.35*b;p.r[2]=.2-.35*b;p.lf[0]+=.16*b;p.rf[0]-=.16*b;break;
      case'moonwalk':p.x=.38*slow;p.rx=-.07;p.ry=.12;p.lf[2]=.2+.28*b;p.rf[2]=.2-.28*b;p.lf[1]+=.12*Math.max(0,b);p.rf[1]+=.12*Math.max(0,-b);p.l[1]=-.14+.12*a;p.r[1]=-.14-.12*a;break;
      case'salsa':p.x=.22*slow;p.y=.06*Math.abs(b);p.rz=.1*b;p.ry=.25*slow;p.l=[-1.05,.3+.2*b,.2];p.r=[1.05,.3-.2*b,.2];p.lf[0]-=.2*slow;p.rf[0]-=.2*slow;break;
      case'hop':p.y=.32*Math.abs(b);p.rz=.14*slow;p.l=[-1.1,.35+.2*Math.abs(b),0];p.r=[1.1,.35+.2*Math.abs(b),0];p.lf[1]+=.08*a;p.rf[1]+=.08*a;break;
      case'orbit':p.x=.28*s(beat*.4);p.z=.12*c(beat*.4);p.ry=.22*s(beat*.4);p.rz=.06*b;p.l=[-1.18,.4*s(beat*.7),.3*c(beat*.7)];p.r=[1.18,-.4*s(beat*.7),-.3*c(beat*.7)];break;
      case'wave':p.rz=.08*slow;p.l=[-1.1,.55+.3*s(beat*.7),.1];p.r=[1.1,.55+.3*s(beat*.7-1.8),.1];p.y=.05*a;break;
      case'headbang':p.rx=.32*b;p.y=.1*b;p.rz=.06*slow;p.l=[-1.13,-.22,.15];p.r=[1.13,-.22,.15];break;
      case'victory':p.y=.2*Math.abs(b);p.ry=.2*slow;p.rz=.12*b;p.l=[-1.05,.85+.1*b,.05];p.r=[1.05,.85-.1*b,.05];p.lf[0]-=.15;p.rf[0]+=.15;break;
    }return p;
  }
  let stopped=false,frame=0,lastFrame=-100,clock=0,lastTime=performance.now(),state={dance:dances[danceIndex],emotion:'smile'};
  function render(now){if(stopped)return;frame=requestAnimationFrame(render);if(now-lastFrame<32)return;lastFrame=now;const options=getOptions();const visible=host.isConnected&&!document.hidden&&host.getBoundingClientRect().width>0;if(!visible){lastTime=now;return;}const delta=Math.min(.08,(now-lastTime)/1000);lastTime=now;clock+=delta*(options.speed||1);const real=now/1000;
    if(options.playing&&options.dance==='auto'&&real>manualUntil&&clock-lastDanceAt>9){danceIndex=(danceIndex+1)%dances.length;lastDanceAt=clock;}
    if(options.playing&&clock-lastEmotionAt>4.8){emotionIndex=(emotionIndex+1)%emotions.length;lastEmotionAt=clock;}
    const dance=real<manualUntil||options.dance==='auto'||!options.dance?dances[danceIndex]:options.dance;
    const emotion=real<boostUntil?'grin':options.emotion&&options.emotion!=='auto'?options.emotion:options.playing?emotions[emotionIndex]:Math.floor(clock/6)%2?'sleepy':'sad';
    const blink=(clock%3.7)>.0&&(clock%3.7)<.12;paintFace(emotion,blink);
    if(state.dance!==dance||state.emotion!==emotion){state={dance,emotion};host.dataset.dance=dance;host.dataset.emotion=emotion;}
    let p;if(options.playing||real<boostUntil){p=pose(dance,clock);}else{p=pose('groove',0);p.y=.035*Math.sin(clock*1.5);p.ry=.07*Math.sin(clock*.7);p.rz=.025*Math.sin(clock);p.l[1]=-.23;p.r[1]=-.23;}
    if(options.reducedMotion){p=pose('groove',0);}
    const rect=host.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,1.5),w=Math.max(1,Math.round(rect.width*ratio)),h=Math.max(1,Math.round(rect.height*ratio));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);const f=1/Math.tan(40*Math.PI/360),near=.1,far=30;gl.uniformMatrix4fv(locations.uProjection,false,new Float32Array([f/(w/h),0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]));}
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    draw([p.x,-1.38,0],[0,0,0],[.9+.08*p.y,.025,.34],[.03,.025,.01,.13]);
    const gold=[1,.79,.10,1],shoe=[.96,.65,.05,1],rot=[p.rx,p.ry,p.rz];
    for(const foot of[p.lf,p.rf])draw([foot[0]+p.x*.6,foot[1]+p.y*.65,foot[2]],rot,[.28,.13,.32],shoe);
    for(const hand of[p.l,p.r])draw([hand[0]+p.x,hand[1]+p.y,hand[2]],[0,0,p.rz],[.17,.22,.17],gold);
    draw([p.x,p.y+.12,p.z],rot,[.92*p.sx,.92*p.sy,.92*p.sz],gold,true);
    host.dataset.frame=String(Number(host.dataset.frame||0)+1);
  }
  frame=requestAnimationFrame(render);
  return{destroy(){stopped=true;cancelAnimationFrame(frame);gl.deleteBuffer(vb);gl.deleteBuffer(ib);gl.deleteTexture(texture);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);gl.getExtension('WEBGL_lose_context')?.loseContext();canvas.remove();},getState:()=>({...state})};
}
