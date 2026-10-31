// opens the prototype offline in Chromium and returns {browser,page}
const {chromium}=require('playwright');
module.exports=async function(file,qs){
  const browser=await chromium.launch();
  const page=await browser.newPage();
  await page.route(/^https?:\/\//,r=>r.abort());
  const errs=[];page.on('pageerror',e=>errs.push(String(e)));
  await page.goto('file://'+file+(qs||''));
  await page.waitForFunction(()=>window.PP&&window.PP.st.series);
  return {browser,page,errs};
};
