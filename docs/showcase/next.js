/* Fictional documentation host. Production CSS, placement, identity colors,
   digit renderer and mask controller are loaded from the built plugin. */
(() => {
  const core=window.showcaseCore,html=document.documentElement,$=s=>document.querySelector(s);
  const names=['Design Studio','Motion Lab','Prototype','Type Archive','Signal Notes','Release Kit'];
  const conversations=['界面结构草图','颜色与排版实验','本地预览记录'];
  const palettes={acid:core.PALETTE_PRESETS.acid,orange:core.PALETTE_PRESETS.orange,polar:core.PALETTE_PRESETS.polar};
  let mode='night',palette='acid',style='next',active=2,flyout,dialog,menu,drawerTransition;
  const controller=core.createAcceptedMotionController(()=>html.dataset.industrialMotion);
  $('[data-wordmark]').innerHTML=core.MASTHEAD;
  document.querySelectorAll('[data-symbol]').forEach(n=>n.innerHTML=core.SYMBOL);
  function setPalette(next=palette,nextMode=mode){
    palette=next;mode=nextMode;
    const scheme=core.makeScheme(mode,palettes[palette][mode]);
    for(const [key,value] of Object.entries({...scheme.tokens,...scheme.variables}))html.style.setProperty(key,value);
    html.dataset.industrialMode=mode;html.style.colorScheme=mode==='night'?'dark':'light';
    document.querySelectorAll('[data-mode]').forEach(n=>n.setAttribute('aria-pressed',String(n.dataset.mode===mode)));
  }
  function setWorkspace(index){
    active=index;const color=core.IDENTITY_COLORS[index];
    html.style.setProperty('--acid-ws-context',color);html.style.setProperty('--acid-ws-context-fore',core.foreground(color));
    $('.acid-context').dataset.acidIdentity=color;
    core.paintDigits($('#workspace-index'),String(index+1).padStart(3,'0'));
    $('#workspace-name').textContent=names[index];$('[data-workspace-name]').textContent=names[index];
    $('.demo-session-heading>span').textContent='WORKSPACE / '+String(index+1).padStart(3,'0');
    document.querySelectorAll('.GAkraW_groupSection').forEach((group,i)=>group.toggleAttribute('data-acid-ws-active',i===active));
  }
  function renderList(){
    const list=$('#workspace-list');list.replaceChildren();
    if(style==='next'){
      list.setAttribute('data-acid-ws-grid','');
      const commands=element('div',{className:'acid-ws-commands',role:'group','aria-label':'commands'});
      Object.entries(core.COMMAND_ICONS).forEach(([kind,d],i)=>{
        const button=element('button',{className:'acid-ws-command','data-command':kind,'aria-label':['新会话','插件','自动化任务'][i]});
        button.innerHTML=`<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="${d}"/></svg>`;commands.append(button);
      });list.append(commands);
    }else list.removeAttribute('data-acid-ws-grid');
    names.forEach((name,i)=>{
      const group=element('section',{className:'GAkraW_groupSection','data-demo-index':i});
      const row=element('div',{className:'wnFoaW_projectRow',role:'treeitem',tabindex:0,'data-row-key':'workspace:demo-'+i,'data-acid-ordinal':String(i+1).padStart(3,'0'),'aria-label':name},element('span',{className:'wnFoaW_folder'},'▱'),element('span',{className:'wnFoaW_projectText'},element('span',{className:'wnFoaW_title'},name)));
      group.append(element('div',{},row));
      conversations.slice(0,i%3+1).forEach((title,j)=>group.append(element('div',{className:'demo-native-session'},element('span',{},title),element('small',{},j?'昨天':'刚刚'))));
      if(style==='next'){
        const place=core.stripPlacement(i);group.style.gridColumn=place.column;group.style.gridRow=`${place.row} / span ${place.span}`;
        group.style.setProperty('--acid-ws-id',core.IDENTITY_COLORS[i]);group.dataset.acidWsStrip=place.lead?'lead':'strip';
        row.addEventListener('pointerenter',()=>showFlyout(i));row.addEventListener('focus',()=>showFlyout(i));
      }
      row.addEventListener('click',()=>{setWorkspace(i);closeFlyout();});
      row.addEventListener('keydown',event=>{if(event.key==='Enter'){setWorkspace(i);closeFlyout();}});
      list.append(group);
    });setWorkspace(active);
  }
  function closeFlyout(){flyout?.remove();flyout=undefined;document.querySelectorAll('[data-acid-ws-open]').forEach(n=>n.removeAttribute('data-acid-ws-open'));}
  function showFlyout(index){
    if(style!=='next'||flyout?.dataset.demoIndex===String(index))return;closeFlyout();
    const group=$(`[data-demo-index="${index}"]`),rect=group.getBoundingClientRect(),number=String(index+1).padStart(3,'0');
    group.setAttribute('data-acid-ws-open','');
    flyout=element('aside',{className:'acid-ws-flyout',role:'dialog','aria-label':number+' '+names[index],'data-demo-index':index,'data-acid-motion-owned':'flyout',style:{left:'115px',top:Math.max(132,Math.min(innerHeight-260,rect.top))+'px','--acid-ws-id':core.IDENTITY_COLORS[index]}});
    flyout.append(element('header',{className:'acid-ws-fly-head'},element('span',{className:'acid-ws-fly-number'},number),element('span',{className:'acid-ws-fly-title'},element('strong',{},names[index]),element('em',{},'DEMO / '+names[index]))),element('div',{className:'acid-ws-fly-meta'},element('span',{},'CONVERSATIONS 03'),element('button',{className:'acid-ws-fly-new'},'+ NEW CHAT HERE')));
    const list=element('div',{className:'acid-ws-fly-list',role:'list'});
    conversations.forEach((name,i)=>list.append(element('button',{className:'acid-ws-fly-row',role:'listitem','aria-current':i===0?'true':undefined,onClick:()=>{setWorkspace(index);closeFlyout();}},element('span',{className:'acid-ws-fly-name'},name),element('span',{className:'acid-ws-fly-time'},i?'昨天':'刚刚'))));
    flyout.append(list);document.body.append(flyout);controller.mask(flyout,{kind:'hover',direction:'left-right'});
  }
  function setStyle(value){
    closeFlyout();drawerTransition?.finish(false);style=value;
    if(style==='next')html.dataset.acidSidebar='next';else html.removeAttribute('data-acid-sidebar');
    $('.wtg9ga_footArea').dataset.acidDrawer='closed';$('.acid-drawer-handle').setAttribute('aria-expanded','false');
    renderList();
  }
  function toggleDrawer(){
    closeFlyout();const area=$('.wtg9ga_footArea'),handle=$('.acid-drawer-handle');
    if(area.dataset.acidClosing){drawerTransition=controller.reopenSurface(area);return;}
    if(area.dataset.acidDrawer==='open')drawerTransition=controller.closeSurface(area,()=>{area.dataset.acidDrawer='closed';handle.setAttribute('aria-expanded','false');},'menu');
    else{area.dataset.acidDrawer='open';handle.setAttribute('aria-expanded','true');drawerTransition=controller.mask(area,{kind:'menu'});}
  }
  function openPalette(){
    closeFlyout();if(dialog)return;
    dialog=element('dialog',{className:'demo-dialog','data-acid-dialog-surface':''});
    dialog.append(element('header',{},element('h2',{},'调色盘'),element('button',{'aria-label':'关闭调色盘',onClick:closeDialog},'×')));
    const select=element('select',{'aria-label':'工作区样式',onChange:event=>setStyle(event.target.value)},element('option',{value:'next'},'新版色条'),element('option',{value:'classic'},'经典工作区'));select.value=style;
    dialog.append(element('label',{className:'demo-setting'},element('span',{},'工作区样式'),select));
    const row=element('div',{className:'demo-presets'});
    for(const [key,label] of [['acid','经典酸性'],['orange','工业橙'],['polar','极地信号']])row.append(element('button',{onClick:()=>setPalette(key)},label));
    dialog.append(row,element('p',{},'两种工作区布局即时切换；正式插件会在本机保存偏好。'));
    dialog.addEventListener('cancel',event=>{event.preventDefault();closeDialog();});document.body.append(dialog);dialog.showModal();
  }
  function closeDialog(){if(!dialog)return;const node=dialog;controller.closeSurface(node,()=>{node.close();node.remove();if(dialog===node)dialog=undefined;},'dialog');}
  function openMore(){
    if(menu){menu.remove();menu=undefined;return;}
    menu=element('section',{className:'demo-more-menu','data-menu-material':'','data-acid-motion-owned':'menu',role:'menu'});
    ['设置','工作区','帮助'].forEach(title=>menu.append(element('button',{role:'menuitem',onClick:()=>{menu.remove();menu=undefined;}},title)));
    document.body.append(menu);controller.mask(menu,{kind:'menu'});
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button)return;
    if(button.matches('.acid-drawer-handle'))toggleDrawer();
    if(button.matches('[data-palette]'))openPalette();
    if(button.id==='style-toggle')setStyle(style==='next'?'classic':'next');
    if(button.dataset.mode)setPalette(palette,button.dataset.mode==='adaptive'?'night':button.dataset.mode);
    if(button.hasAttribute('data-native-more'))openMore();
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeFlyout();if(menu){menu.remove();menu=undefined;}else if(!dialog&&$('.wtg9ga_footArea').dataset.acidDrawer==='open')toggleDrawer();}});
  $('.mP3x-q_centerCol').addEventListener('pointerenter',closeFlyout);
  setPalette();renderList();
  if(new URL(location.href).searchParams.get('scene')==='deliverables'){$('#deliverables').hidden=false;setPalette('acid','day');}
  window.showcase={setPalette,setWorkspace,setStyle,showFlyout,closeFlyout,toggleDrawer,openPalette,closeDialog,
    setDeliverables(visible){$('#deliverables').hidden=!visible;},
    inspect(){return{mode,palette,style,active,overflow:html.scrollWidth>innerWidth,fonts:document.fonts.check('20px "Industrial GRID"')&&document.fonts.check('12px "Industrial SIGNAL"')};}};
  document.fonts.ready.then(()=>window.showcaseReady=true);
  window.addEventListener('pagehide',()=>controller.dispose(),{once:true});
})();
