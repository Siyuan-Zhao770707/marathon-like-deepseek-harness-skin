// NEXT sidebar: staggered workspace strips, hover flyout, identity colours.
// Native rows stay mounted and own every action; this layer only arranges
// them and proxies clicks, so ordering, menus and drag reorder stay native.
const IDENTITY_PREF=`${ID}:workspace-identity`;
const IDENTITY_COLORS=Object.freeze(['#C8FF00','#FF2BD6','#FF6A13','#2F5BFF','#00E1FF','#FFE600','#FF2D4F','#8B5CFF','#00F5A0','#FF9F1C']);
function assignIdentity(state,ids){
  const next={next:Number.isSafeInteger(state?.next)&&state.next>=0?state.next:0,map:{...(state&&typeof state.map==='object'?state.map:{})}};
  let changed=false;
  for(const id of ids){
    const current=next.map[id];
    if(Number.isInteger(current)&&current>=0&&current<IDENTITY_COLORS.length)continue;
    next.map[id]=next.next%IDENTITY_COLORS.length;next.next+=1;changed=true;
  }
  return {state:next,changed};
}
function loadIdentity(){try{return JSON.parse(localStorage.getItem(IDENTITY_PREF))||{};}catch{return {};}}
function workspaceIdentity(ids){
  const {state,changed}=assignIdentity(loadIdentity(),ids);
  if(changed)try{localStorage.setItem(IDENTITY_PREF,JSON.stringify(state));}catch{}
  return Object.fromEntries(ids.map(id=>[id,IDENTITY_COLORS[state.map[id]]]));
}
function identityInk(hex){return foreground(hex);}
// Stable, append-style numbering. The skin keeps its own ordered list of
// workspace ids: the first run adopts the native order (so nothing visibly
// renumbers), new workspaces are appended (number = count + 1), deleted ones
// drop out and the rest close the gap in order. A reorder the user performs
// (native drag, or dragging strips) rewrites the order, so numbers always
// follow what is on screen.
const ORDER_PREF=`${ID}:workspace-order`;
function rankWorkspaces(stored,ids,adopt=false){
  const present=new Set(ids);
  let order=[...new Set((Array.isArray(stored)?stored:[]).filter(id=>typeof id==='string'))];
  if(ids.length){
    if(adopt)order=[...ids];
    else{order=order.filter(id=>present.has(id));for(const id of ids)if(!order.includes(id))order.push(id);}
  }
  const numbers={};let n=0;
  for(const id of order)if(present.has(id))numbers[id]=++n;
  return {order,numbers};
}
function moveInOrder(order,id,beforeId){
  const next=order.filter(entry=>entry!==id);
  const at=beforeId==null?-1:next.indexOf(beforeId);
  if(at<0)next.push(id);else next.splice(at,0,id);
  return next;
}
let workspaceAdoptUntil=0;
function markWorkspaceReorder(){workspaceAdoptUntil=Date.now()+5000;}
function loadWorkspaceOrder(){try{const value=JSON.parse(localStorage.getItem(ORDER_PREF));return Array.isArray(value)?value:null;}catch{return null;}}
function saveWorkspaceOrder(order){try{localStorage.setItem(ORDER_PREF,JSON.stringify(order));}catch{}}
function workspaceNumbers(items){
  const ids=(items||[]).map(item=>String(item.workspaceId));
  const stored=loadWorkspaceOrder();
  let adopt=false;
  // Only a pure permutation right after a native drag is adopted.
  if(stored&&workspaceAdoptUntil>Date.now()){
    const known=stored.filter(id=>ids.includes(id));
    if(known.length===ids.length&&known.join('|')!==ids.join('|')){adopt=true;workspaceAdoptUntil=0;}
  }
  const {order,numbers}=rankWorkspaces(stored,ids,adopt);
  if(ids.length&&JSON.stringify(order)!==JSON.stringify(stored))saveWorkspaceOrder(order);
  return numbers;
}
function moveWorkspace(id,beforeId){
  const order=moveInOrder(loadWorkspaceOrder()||[],String(id),beforeId==null?null:String(beforeId));
  saveWorkspaceOrder(order);return order;
}

// Placement on a half-strip grid: 001 is the lead strip beside the command
// stack, then each workspace alternates column one half-step lower.
function stripPlacement(index){
  if(index===0)return {column:1,row:1,span:4,lead:true};
  return {column:index%2===1?2:1,row:index+3,span:2,lead:false};
}

function nextSidebarList(){
  const frame=[...document.querySelectorAll('.BynINW_frame')].find(node=>!node.closest('[data-acid-motion-owned]'));
  return frame?.querySelector('[data-slot="sidebar.workspaces"] ._9lTDKa_list')??null;
}
function nativeCommands(){
  const root=document.querySelector('.BynINW_frame ._2H3hWW_root');
  if(!root)return [];
  const panels=[...root.querySelectorAll('._2H3hWW_panelList ._2H3hWW_panelRow')];
  return [root.querySelector('._2H3hWW_newSession'),...panels].filter(Boolean).slice(0,3);
}
function sessionRows(group){
  return [...group.querySelectorAll('[data-row-key^="session:"][role="treeitem"]')].map(row=>({
    key:row.dataset.rowKey,row,title:row.querySelector('.hIlkoa_title')?.textContent||'—',time:row.querySelector('.hIlkoa_time')?.textContent||'',selected:row.getAttribute('aria-selected')==='true'
  }));
}

function CommandStack({tick}){
  const commands=nativeCommands();
  const glyphs=['+','▦','◷'];
  return h('div',{className:'acid-ws-commands',role:'group','aria-label':'commands','data-tick':tick},...commands.map((button,i)=>{
    const label=button.querySelector('._2H3hWW_newSessionLabel,._2H3hWW_panelTitle')?.textContent||button.getAttribute('aria-label')||'';
    const active=button.classList.contains('_2H3hWW_panelActive');
    return h('button',{key:i,type:'button',className:'acid-ws-command','data-command':['new','plugins','automations'][i],'aria-pressed':i?active:undefined,'aria-label':button.getAttribute('aria-label')||label,
      onClick:()=>{button.click();}},h('i',{'aria-hidden':true},glyphs[i]),h('span',null,label),h('b',{'aria-hidden':true},String(i+1).padStart(2,'0')));
  }));
}

function WorkspaceFlyout({state,t,onEnter,onLeave,onClose,motion}){
  const ref=React.useRef(null);
  const [rows,setRows]=React.useState(()=>sessionRows(state.group));
  React.useEffect(()=>{
    const refresh=()=>setRows(sessionRows(state.group));refresh();
    const observer=new MutationObserver(refresh);
    observer.observe(state.group,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['aria-selected']});
    return()=>observer.disconnect();
  },[state.group]);
  // Reuse the skin's own four-colour wipe, sideways like the sidebar itself.
  React.useLayoutEffect(()=>{if(ref.current)activeAcceptedMotion?.mask(ref.current,{kind:'hover',direction:'left-right'});},[]);
  const place=state.anchor,below=place.top+340>window.innerHeight;
  const style={left:place.left+'px','--acid-ws-id':state.color,'--acid-ws-id-fore':identityInk(state.color)};
  if(below)style.bottom=Math.max(8,window.innerHeight-place.bottom)+'px';else style.top=Math.max(8,place.top)+'px';
  const create=state.group.querySelector('.hIlkoa_projectRow .hIlkoa_rowActions button[aria-keyshortcuts]');
  const open=(entry)=>{motion()?.captureStage();entry.row.click();onClose();};
  return createPortal(h('aside',{ref,className:'acid-ws-flyout','data-acid-motion-owned':'flyout','data-placement':below?'up':'down',style,role:'dialog','aria-label':`${state.number} ${state.name}`,onPointerEnter:onEnter,onPointerLeave:onLeave,onKeyDown:event=>{if(event.key==='Escape'){event.stopPropagation();onClose(true);}}},
    h('header',{className:'acid-ws-fly-head'},
      h('span',{className:'acid-ws-fly-number'},state.number),
      h('span',{className:'acid-ws-fly-title'},h('small',null,'WORKSPACE // ID-'+state.number),h('strong',null,state.name),state.path?h('em',{title:state.path},state.path):null),
      create?h('button',{type:'button',className:'acid-ws-fly-new','aria-label':create.getAttribute('aria-label'),title:create.getAttribute('aria-label'),onClick:()=>{motion()?.captureStage();create.click();onClose();}},'+'):null),
    h('div',{className:'acid-ws-fly-meta','aria-hidden':true},h('span',null,`SESSIONS ${String(rows.length).padStart(2,'0')}`),h('i',{className:'acid-ws-fly-stripes'})),
    rows.length?h('div',{className:'acid-ws-fly-list',role:'list'},...rows.map((entry,i)=>h('button',{key:entry.key,type:'button',role:'listitem',className:'acid-ws-fly-row','aria-current':entry.selected?'true':undefined,
      onClick:()=>open(entry),onContextMenu:event=>{event.preventDefault();entry.row.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:event.clientX,clientY:event.clientY,button:2}));}},
      h('span',{className:'acid-ws-fly-index','aria-hidden':true},String(i+1).padStart(2,'0')),h('span',{className:'acid-ws-fly-name'},entry.title),entry.time?h('span',{className:'acid-ws-fly-time'},entry.time):null))):
      h('p',{className:'acid-ws-fly-empty'},'NO SESSIONS // —')),document.body);
}

function SidebarNext({items,numbers,workspaceId,onPick,t,motion,toggleSidebar}){
  const [list,setList]=React.useState(null),[tick,setTick]=React.useState(0),[fly,setFly]=React.useState(null);
  const timers=React.useRef({}),flyRef=React.useRef(null),expanded=React.useRef(new Set());
  flyRef.current=fly;
  const ids=items.map(item=>String(item.workspaceId));
  const identity=React.useMemo(()=>workspaceIdentity(ids),[ids.join('|')]);
  const byId=React.useMemo(()=>new Map(items.map((item,i)=>[String(item.workspaceId),{item,index:i}])),[items]);
  const live=React.useRef({});live.current={identity,byId,onPick,workspaceId,numbers};
  // Locate the native workspace tree in the main frame.
  React.useLayoutEffect(()=>{
    let frame=0,signature='';
    const sync=()=>{
      frame=0;const next=nextSidebarList();setList(previous=>previous===next?previous:next);
      const groups=next?next.querySelectorAll(':scope > ._9lTDKa_groupSection').length:0;
      const value=groups+'|'+(next?.childElementCount??0)+'|'+nativeCommands().map(button=>button.className+(button.textContent||'')).join('/');
      if(value!==signature){signature=value;setTick(x=>x+1);}
    };
    const observer=new MutationObserver(()=>{if(!frame)frame=requestAnimationFrame(sync);});
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-sidebar-collapsed','data-row-key']});
    sync();return()=>{observer.disconnect();if(frame)cancelAnimationFrame(frame);};
  },[]);
  // One sidebar mode only: the wide/rail switch is retired.
  React.useEffect(()=>{
    const block=event=>{if((event.ctrlKey||event.metaKey)&&!event.altKey&&event.key?.toLowerCase()==='b'){event.preventDefault();event.stopImmediatePropagation();}};
    window.addEventListener('keydown',block,true);
    const frame=document.querySelector('.BynINW_frame');
    if(frame?.hasAttribute('data-sidebar-collapsed')&&window.innerWidth>=760)toggleSidebar?.();
    return()=>window.removeEventListener('keydown',block,true);
  },[]);
  const groups=list?[...list.children].filter(node=>node.classList?.contains('_9lTDKa_groupSection')&&node.querySelector(':scope [data-row-key^="workspace:"]')):[];
  const active=groups.length>0;
  React.useLayoutEffect(()=>{
    const root=document.documentElement;
    if(active)root.setAttribute('data-acid-sidebar','next');else root.removeAttribute('data-acid-sidebar');
    return()=>root.removeAttribute('data-acid-sidebar');
  },[active]);
  // Arrange strips and paint identity colours on every render of the tree.
  React.useLayoutEffect(()=>{
    if(!list||!active)return;
    list.setAttribute('data-acid-ws-grid','');
    groups.forEach((group,k)=>{
      const row=group.querySelector('[data-row-key^="workspace:"]'),id=row.dataset.rowKey.slice(10),i=(numbers?.[id]??k+1)-1;
      const place=stripPlacement(i),color=identity[id]||IDENTITY_COLORS[i%IDENTITY_COLORS.length];
      const count=byId.get(id)?.item.sessionIds?.length??sessionRows(group).length;
      group.style.gridColumn=String(place.column);group.style.gridRow=`${place.row} / span ${place.span}`;
      group.style.setProperty('--acid-ws-id',color);group.style.setProperty('--acid-ws-id-fore',identityInk(color));
      group.style.setProperty('--acid-ws-fill',Math.min(1,count/12).toFixed(3));
      group.dataset.acidWsStrip=place.lead?'lead':'strip';group.dataset.acidWsCount=row.dataset.acidCount=String(count).padStart(2,'0');
      if(id===String(workspaceId))group.dataset.acidWsActive='';else delete group.dataset.acidWsActive;
      const item=byId.get(id)?.item,title=row.querySelector('.hIlkoa_title'),fallback=item?.title||item?.name||item?.path?.split(/[\\/]/).filter(Boolean).at(-1)||'—';
      if(title&&title.dataset.acidFallback!==fallback)title.dataset.acidFallback=fallback;

    });
  });
  React.useEffect(()=>()=>{
    if(!list)return;list.removeAttribute('data-acid-ws-grid');
    for(const group of list.querySelectorAll('[data-acid-ws-strip]')){
      for(const name of ['grid-column','grid-row','--acid-ws-id','--acid-ws-id-fore','--acid-ws-fill'])group.style.removeProperty(name);
      delete group.dataset.acidWsStrip;delete group.dataset.acidWsCount;delete group.dataset.acidWsActive;const row=group.querySelector('[data-row-key^="workspace:"]');if(row){delete row.dataset.acidCount;const title=row.querySelector('.hIlkoa_title');if(title)delete title.dataset.acidFallback;}
    }
  },[list]);
  // Interaction: strips open their workspace; hover/focus opens the flyout.
  React.useEffect(()=>{
    if(!list||!active)return;
    const clear=name=>{clearTimeout(timers.current[name]);timers.current[name]=undefined;};
    const restore=group=>{if(group&&expanded.current.has(group)){expanded.current.delete(group);const row=group.querySelector('[data-row-key^="workspace:"]');if(row?.getAttribute('aria-expanded')==='true')row.click();}};
    const close=()=>{clear('open');const current=flyRef.current;if(current){restore(current.group);current.group.removeAttribute('data-acid-ws-open');}setFly(null);};
    const open=group=>{
      const row=group.querySelector('[data-row-key^="workspace:"]');if(!row)return;
      const id=row.dataset.rowKey.slice(10),{identity,byId}=live.current;
      if(flyRef.current?.group===group)return;
      if(flyRef.current){restore(flyRef.current.group);flyRef.current.group.removeAttribute('data-acid-ws-open');}
      if(row.getAttribute('aria-expanded')==='false'){expanded.current.add(group);row.click();}
      const rect=group.getBoundingClientRect(),side=document.querySelector('.BynINW_sidebarCol')?.getBoundingClientRect();
      const entry=byId.get(id);const index=live.current.numbers?.[id]??(entry?entry.index+1:groups.indexOf(group)+1);
      group.setAttribute('data-acid-ws-open','');
      setFly({group,id,color:identity[id]||IDENTITY_COLORS[0],number:row.getAttribute('data-acid-ordinal')||formatWorkspaceIndex(index),
        name:row.querySelector('.hIlkoa_title')?.textContent||entry?.item.title||entry?.item.name||'—',path:entry?.item.path||'',anchor:{top:rect.top,bottom:rect.bottom,left:(side?.right??rect.right)+2}});
    };
    // Micro-movements inside the same strip must not keep postponing the open.
    const schedule=(group,delay=90)=>{
      clear('close');if(flyRef.current?.group===group)return;
      if(timers.current.pending===group&&timers.current.open)return;
      clear('open');timers.current.pending=group;
      timers.current.open=setTimeout(()=>{timers.current.open=undefined;timers.current.pending=undefined;open(group);},delay);
    };
    const leave=()=>{clear('open');timers.current.pending=undefined;clear('close');timers.current.close=setTimeout(close,200);};
    const groupOf=node=>node?.closest?.('[data-acid-ws-strip]');
    const over=event=>{const group=groupOf(event.target);if(group&&list.contains(group))schedule(group);};
    const out=event=>{const from=groupOf(event.target),to=groupOf(event.relatedTarget);if(from&&from!==to&&!event.relatedTarget?.closest?.('.acid-ws-flyout'))leave();};
    const focus=event=>{const group=groupOf(event.target);if(group)schedule(group,0);};
    const pick=event=>{
      if(!event.isTrusted)return;
      const row=event.target.closest?.('[data-row-key^="workspace:"]');
      if(!row||!list.contains(row)||event.target.closest('.hIlkoa_rowActions'))return;
      if(event.type==='keydown'&&event.key==='ArrowRight'){event.preventDefault();event.stopPropagation();open(row.closest('[data-acid-ws-strip]'));setTimeout(()=>document.querySelector('.acid-ws-flyout .acid-ws-fly-row,.acid-ws-flyout button')?.focus(),30);return;}
      if(event.type==='keydown'&&!['Enter',' '].includes(event.key))return;
      event.preventDefault();event.stopPropagation();close();
      live.current.onPick(row.dataset.rowKey.slice(10));
    };
    list.addEventListener('pointerover',over);list.addEventListener('pointerout',out);list.addEventListener('focusin',focus);
    list.addEventListener('click',pick,true);list.addEventListener('keydown',pick,true);
    const dropped=()=>markWorkspaceReorder();list.addEventListener('drop',dropped,true);list.addEventListener('dragend',dropped,true);list.addEventListener('pointerup',dropped,true);
    timers.current.api={enter:()=>clear('close'),leave,close};
    const scroll=()=>close();list.addEventListener('scroll',scroll,{passive:true});window.addEventListener('resize',scroll);
    return()=>{list.removeEventListener('pointerover',over);list.removeEventListener('pointerout',out);list.removeEventListener('focusin',focus);
      list.removeEventListener('click',pick,true);list.removeEventListener('keydown',pick,true);list.removeEventListener('drop',dropped,true);list.removeEventListener('dragend',dropped,true);list.removeEventListener('pointerup',dropped,true);list.removeEventListener('scroll',scroll);window.removeEventListener('resize',scroll);close();};
  },[list,active]);
  if(!list||!active)return null;
  const api=timers.current.api||{enter(){},leave(){},close(){}};
  return h(React.Fragment,null,createPortal(h(CommandStack,{tick}),list),
    fly?h(WorkspaceFlyout,{key:fly.id,state:fly,t,motion,onEnter:()=>api.enter(),onLeave:()=>api.leave(),onClose:refocus=>{api.close();if(refocus)fly.group.querySelector('[data-row-key^="workspace:"]')?.focus();}}):null);
}
