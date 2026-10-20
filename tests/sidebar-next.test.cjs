const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function load(){
  let api;
  const code=fs.readFileSync(path.join(__dirname,'../lib/client.js'),'utf8').replace("return { inject: ['slots'","return { assignIdentity, stripPlacement, IDENTITY_COLORS, inject: ['slots'");
  vm.runInNewContext(code,{window:{__ModuleLoader__:{load:module=>api=module.factory(()=>({createElement:(...args)=>args}))}}});
  return api;
}
test('identity colours are assigned once per workspace and stay stable',()=>{
  const {assignIdentity,IDENTITY_COLORS}=load();
  const first=assignIdentity({},['a','b','c']);
  assert.equal(first.changed,true);assert.deepEqual({...first.state.map},{a:0,b:1,c:2});
  const again=assignIdentity(first.state,['c','a','b']);
  assert.equal(again.changed,false);assert.deepEqual({...again.state.map},{a:0,b:1,c:2});
  const created=assignIdentity(again.state,['a','b','c','d']);
  assert.equal(created.state.map.d,3);assert.equal(created.state.next,4);
  assert.ok(IDENTITY_COLORS.length>=8);assert.equal(new Set(IDENTITY_COLORS).size,IDENTITY_COLORS.length);
  const wrapped=assignIdentity({next:IDENTITY_COLORS.length-1,map:{}},['x','y']);
  assert.equal(wrapped.state.map.x,IDENTITY_COLORS.length-1);assert.equal(wrapped.state.map.y,0);
  const repaired=assignIdentity({next:2,map:{bad:'no',big:99}},['bad','big']);
  assert.equal(repaired.state.map.bad,2);assert.equal(repaired.state.map.big,3);
});
test('strips alternate columns half a step apart beside the command stack',()=>{
  const {stripPlacement}=load();
  assert.deepEqual({...stripPlacement(0)},{column:1,row:1,span:4,lead:true});
  const rest=[1,2,3,4,5].map(i=>({...stripPlacement(i)}));
  assert.deepEqual(rest.map(p=>p.column),[2,1,2,1,2]);
  assert.deepEqual(rest.map(p=>p.row),[4,5,6,7,8]);
  // the second strip overlaps the lead's last row, and columns never collide
  assert.ok(rest[0].row<=1+4-1);
  for(let i=2;i<rest.length;i++)assert.ok(rest[i].row>=rest[i-2].row+rest[i-2].span);
});
function loadNumbering(){
  let api;const store={};
  const code=fs.readFileSync(path.join(__dirname,'../lib/client.js'),'utf8');
  const localStorage={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v);}};
  vm.runInNewContext(code,{localStorage,window:{__ModuleLoader__:{load:module=>api=module.factory(()=>({createElement:(...args)=>args}))}}});
  return {api,store};
}
test('numbering is stable and append-style: new workspaces get count + 1',()=>{
  const {rankWorkspaces}=loadNumbering().api;
  const seed=rankWorkspaces(null,['a','b','c']);
  assert.deepEqual([...seed.order],['a','b','c']);assert.deepEqual({...seed.numbers},{a:1,b:2,c:3});
  // native list puts the new workspace on top; it is still appended as 004
  const added=rankWorkspaces(seed.order,['d','a','b','c']);
  assert.deepEqual({...added.numbers},{a:1,b:2,c:3,d:4});
  // delete closes the gap without reshuffling the remaining order
  const removed=rankWorkspaces(added.order,['d','a','c']);
  assert.deepEqual({...removed.numbers},{a:1,c:2,d:3});
  // a reorder the user performed is adopted wholesale
  const moved=rankWorkspaces(removed.order,['c','a','d'],true);
  assert.deepEqual({...moved.numbers},{c:1,a:2,d:3});
  // empty native list (still loading) never wipes the stored order
  assert.deepEqual([...rankWorkspaces(moved.order,[]).order],['c','a','d']);
});
test('workspaceNumbers persists order and only adopts permutations after a reorder',()=>{
  const {api,store}=loadNumbering();
  const items=ids=>ids.map(workspaceId=>({workspaceId}));
  assert.deepEqual({...api.workspaceNumbers(items(['a','b']))},{a:1,b:2});
  assert.deepEqual(JSON.parse(store['dsh-industrial-acid-skin:workspace-order']),['a','b']);
  assert.deepEqual({...api.workspaceNumbers(items(['n','a','b']))},{a:1,b:2,n:3});
  // native order differs without a user reorder: numbers stay put
  assert.deepEqual({...api.workspaceNumbers(items(['b','n','a']))},{a:1,b:2,n:3});
  api.markWorkspaceReorder();
  assert.deepEqual({...api.workspaceNumbers(items(['b','n','a']))},{b:1,n:2,a:3});
  assert.deepEqual([...api.moveInOrder(['a','b','c'],'c','a')],['c','a','b']);
  assert.deepEqual([...api.moveInOrder(['a','b','c'],'a',null)],['b','c','a']);
});
