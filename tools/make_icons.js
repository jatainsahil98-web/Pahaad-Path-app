// Renders src/icon.svg to the PNG icons the web manifest and iOS need (run: node tools/make_icons.js).
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path');
const SRC=path.join(__dirname,'..','src');
const SIZES={'icon-192.png':192,'icon-512.png':512,'apple-touch-icon.png':180};
(async()=>{
  const svg=fs.readFileSync(path.join(SRC,'icon.svg'),'utf8');
  const b=await chromium.launch();
  for(const [name,px] of Object.entries(SIZES)){
    const p=await b.newPage({viewport:{width:px,height:px}});
    await p.setContent('<style>html,body{margin:0;background:transparent}svg{display:block;width:'+px+'px;height:'+px+'px}</style>'+svg);
    await p.screenshot({path:path.join(SRC,name),omitBackground:true,clip:{x:0,y:0,width:px,height:px}});
    await p.close();console.log(name,px);
  }
  await b.close();
})();
