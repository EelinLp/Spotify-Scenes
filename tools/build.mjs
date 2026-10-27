import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const version=fs.readFileSync(path.join(root,'VERSION'),'utf8').trim();if(!/^\d+\.\d+\.\d+$/.test(version))throw Error('Invalid VERSION');
const output=path.join(root,'dist',`Spotify-Scenes-${version}`);fs.mkdirSync(output,{recursive:true});
const read=p=>fs.readFileSync(path.join(root,p),'utf8'),data=(p,type)=>`data:${type};base64,${fs.readFileSync(path.join(root,p)).toString('base64')}`;
const assets={backgrounds:{},previews:{},fonts:{},mogity:data('assets/mogity.png','image/png')};
for(const id of ['purple','blue','sunset','mono','jade','rose','crimson','sand']){assets.backgrounds[id]=data(`assets/backgrounds/${id}.jpg`,'image/jpeg');assets.previews[id]=data(`assets/previews/${id}.jpg`,'image/jpeg');}
for(const name of ['Comfortaa','Unbounded','Jura','Russo One','Golos Text','Rubik'])assets.fonts[name]=data(`assets/fonts/${name}.ttf`,'font/ttf');
const defaults=JSON.parse(read('src/defaults.json'));let extension=read('src/extension.js').replace(/const defaults = \{[^\n]+\};/,'const defaults = '+JSON.stringify(defaults)+';');
const bundle=`(() => {\nconst ASSETS=${JSON.stringify(assets)};\nconst STYLE=${JSON.stringify(read('src/style.css'))};\n${read('src/effects.js')}\n${read('src/verity-3d.js')}\n${extension}\n})();`.replaceAll('window.modPlayerSettings','window.__spotifyScenes.settingsBridge').replaceAll('full-mod-settings','spotify-scenes-settings');
fs.writeFileSync(path.join(output,'spotify-scenes.js'),bundle);fs.cpSync(path.join(root,'src'),path.join(output,'source'),{recursive:true});fs.copyFileSync(path.join(root,'assets/mogity.png'),path.join(output,'source/mogity.png'));
fs.copyFileSync(path.join(root,'tools/portable-build.cjs'),path.join(output,'source/build.cjs'));
for(const name of ['Install.cmd','Install.ps1','Uninstall.cmd','Uninstall.ps1','NativeProcess.ps1'])fs.copyFileSync(path.join(root,'installer',name),path.join(output,name));
fs.cpSync(path.join(root,'vendor/spicetify'),path.join(output,'runtime'),{recursive:true});fs.cpSync(path.join(root,'licenses'),path.join(output,'licenses'),{recursive:true});
for(const name of ['README.md','THIRD_PARTY.md'])fs.copyFileSync(path.join(root,name),path.join(output,name));
// Keep upstream license notices in distributions even when the repository uses
// the notices under licenses/ instead of a top-level LICENSE file.
fs.copyFileSync(fs.existsSync(path.join(root,'LICENSE'))?path.join(root,'LICENSE'):path.join(root,'licenses/LICENSE'),path.join(output,'LICENSE'));
fs.mkdirSync(path.join(output,'theme'),{recursive:true});fs.copyFileSync(path.join(root,'installer/color.ini'),path.join(output,'theme/color.ini'));fs.writeFileSync(path.join(output,'theme/user.css'),'/* Styling is managed by spotify-scenes.js. */\n');
fs.writeFileSync(path.join(output,'ЗАПУСК.txt'),'Запусти Install.cmd и открой Spotify. Настройки — шестерёнка слева.\nВидео, Верити 3D или скрытый видеоряд — раздел «Видеоряд и Верити».\nУдаление: Uninstall.cmd.\n');
console.log(JSON.stringify({version,output,defaultFont:defaults.font,defaultMedia:defaults.mediaMode,bytes:Buffer.byteLength(bundle)}));
