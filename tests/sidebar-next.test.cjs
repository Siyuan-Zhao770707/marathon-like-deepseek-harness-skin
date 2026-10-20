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
