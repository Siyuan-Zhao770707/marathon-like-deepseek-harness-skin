// Optional documentation capture: isolated samples, real production CSS/masks.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {performance}=require('node:perf_hooks'),{chromium}=require('playwright');
const {startShowcase}=require('./serve-showcase.cjs');
const root=path.resolve(__dirname,'..'),raw=path.join(root,'.recordings');
let browser,server;
(async()=>{
  const preview=await startShowcase();server=preview.server;
  browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});
  const page=await browser.newPage({viewport:{width:1280,height:820}}),errors=[],requests=[];
  page.on('pageerror',error=>{errors.push(error.message);console.error('Preview error: '+error.message);});page.on('request',request=>requests.push(request.url()));
  async function open(){await page.goto(preview.url+'/docs/showcase/next.html');await page.waitForFunction(()=>window.showcaseReady);await page.waitForTimeout(650);}
  const run=(method,...args)=>page.evaluate(({method,args})=>window.showcase[method](...args),{method,args});
  await open();assert.equal(await page.locator('[data-acid-ws-strip]').count(),6);
  assert.equal(Math.round((await page.locator('.mP3x-q_sidebarCol').boundingBox()).width),113);
  await page.screenshot({path:path.join(root,'docs/media/next-overview.png')});
  await run('showFlyout',1);await page.waitForTimeout(450);
  assert.equal(await page.locator('.acid-ws-flyout').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(0, 0, 0)');
  await run('setPalette','acid','day');
  assert.equal(await page.locator('.acid-ws-flyout').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(255, 255, 255)');
  await run('closeFlyout');await run('setDeliverables',true);await page.waitForTimeout(400);
  assert.notEqual(await page.locator('.K5rwea_file').first().evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(34, 34, 34)');
  await page.screenshot({path:path.join(root,'docs/media/deliverables-day.png')});await run('setDeliverables',false);
  await run('setPalette','acid','night');
  await run('setStyle','classic');await page.waitForTimeout(500);
  const buttons=await page.locator('.wtg9ga_newSession,.wtg9ga_panelList .wtg9ga_panelRow').evaluateAll(nodes=>nodes.map(n=>({x:n.getBoundingClientRect().x,y:n.getBoundingClientRect().y,h:n.getBoundingClientRect().height})));
  assert.equal(buttons.length,4);assert.equal(buttons[0].y,buttons[1].y);assert.equal(buttons[2].y,buttons[3].y);assert.equal(buttons[0].h,36);
  await page.locator('[data-composer-input=true]').focus();await page.waitForTimeout(500);
  assert.equal(await page.locator('.acid-accepted-composer.acid-composer-focused').count(),1);
  await page.screenshot({path:path.join(root,'docs/media/classic-overview.png')});
  await page.locator('[data-composer-card=true]').screenshot({path:path.join(root,'docs/media/composer-2.4.6.png')});
  await run('setStyle','next');await run('toggleDrawer');await page.waitForTimeout(650);
  assert.equal(await page.locator('.wtg9ga_footArea').getAttribute('data-acid-drawer'),'open');
  await run('toggleDrawer');await page.waitForTimeout(650);
  assert.equal(await page.locator('.wtg9ga_footArea').getAttribute('data-acid-drawer'),'closed');
  for(const viewport of [{width:800,height:600},{width:520,height:600}]){
    await page.setViewportSize(viewport);await open();assert.equal((await run('inspect')).overflow,false);
    await page.locator('.acid-drawer-handle').click();await page.waitForTimeout(600);
    const box=await page.locator('.wtg9ga_footArea').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=viewport.width&&box.y>=0);
  }
  await page.setViewportSize({width:1280,height:820});const report=[];
  async function record(name,duration,events){
    await open();await page.mouse.move(600,200);
    const directory=path.join(raw,name);fs.mkdirSync(directory,{recursive:true});
    const frames=[],start=performance.now();let next=0;
    while(performance.now()-start<duration){
      while(next<events.length&&performance.now()-start>=events[next][0])await events[next++][1]();
      const time=Math.round(performance.now()-start),file=`frame-${String(frames.length).padStart(4,'0')}.jpg`;
      await page.screenshot({path:path.join(directory,file),quality:88});frames.push({file,time});
      const delay=95-(performance.now()-start-time);if(delay>0)await page.waitForTimeout(delay);
    }
    const metadata={name,durationMs:Math.round(performance.now()-start),frames,speed:1,source:'fictional documentation host, production CSS and mask controller'};
    fs.writeFileSync(path.join(directory,'frames.json'),JSON.stringify(metadata,null,2));report.push({name,frames:frames.length,durationMs:metadata.durationMs});console.log(JSON.stringify(report.at(-1)));
  }
  if(!process.argv.includes('--preview-only')){
    await record('20-next-sidebar',6200,[[500,()=>run('showFlyout',1)],[2000,()=>run('setPalette','acid','day')],[3400,async()=>{await run('closeFlyout');await run('setPalette','acid','night');await run('setWorkspace',3);}],[4500,()=>run('showFlyout',3)]]);
    await record('21-classic-switch',7400,[[400,()=>run('openPalette')],[1400,()=>page.getByRole('combobox',{name:'工作区样式'}).selectOption('classic')],[2200,()=>run('closeDialog')],[3400,()=>page.locator('[data-composer-input=true]').focus()],[4400,()=>run('openPalette')],[5500,()=>page.getByRole('combobox',{name:'工作区样式'}).selectOption('next')],[6400,()=>run('closeDialog')]]);
    await record('22-more-palette',7900,[[400,()=>page.locator('.acid-drawer-handle').click()],[1800,()=>page.locator('.wtg9ga_settingsArea [data-native-more]').click()],[2900,()=>page.getByRole('menuitem',{name:'设置'}).click()],[3500,()=>run('setPalette','orange')],[4400,()=>run('toggleDrawer')],[5700,()=>run('toggleDrawer')],[7000,()=>run('toggleDrawer')]]);
  }
  assert.deepEqual(errors,[]);assert.ok(requests.every(url=>new URL(url).origin===preview.url));
  const result={passed:true,browserErrors:errors,externalRequests:0,clips:report};fs.mkdirSync(raw,{recursive:true});fs.writeFileSync(path.join(raw,'workspaces-report.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
})().catch(error=>{console.error(error.stack);process.exitCode=1;}).finally(async()=>{await browser?.close();await new Promise(resolve=>server?server.close(resolve):resolve());});
