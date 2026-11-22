import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
const source=readFileSync(new URL('../assets/js/dashboard.js',import.meta.url),'utf8');
function fixture({admin=true, hash='', defaultPanel='uploaded-documents'}={}) {
  function element(extra={}) { return {handlers:{},attributes:{},hidden:false,setAttribute(name,value){this.attributes[name]=value;},focus(){this.focused=true;},addEventListener(name,handler){this.handlers[name]=handler;},emit(name,event){this.handlers[name]?.(event);},...extra}; }
  const panelIds=admin?['uploaded-documents','publishing-tools']:['uploaded-documents'];
  const tabs=panelIds.map((id,index)=>element({id:'tab-'+index,dataset:{workspaceTab:id}}));
  const panels=panelIds.map((id)=>element({id}));
  const tablist=element(),layout={dataset:{defaultPanel}};
  const rows=['treasurer','secretary','legislative'].map((category,index)=>element({dataset:{id:String(index+1),name:`${category} record.pdf`,display:index===1?'Secretariat':'Council',category}}));
  const checks=admin?rows.map((row,index)=>element({checked:false,value:String(index+1),closest:()=>row})):[];
  rows.forEach((row,index)=>{row.querySelector=()=>checks[index]||null;});
  const search=element({value:''}),category=element({value:'all'}),empty={},count={},filters={hidden:true};
  const selectAll=admin?element({checked:false}):null,selected={},apply={},action={value:'delete'};
  const bulk=admin?element({querySelector:(selector)=>({'[data-selected-count]':selected,'[data-bulk-apply]':apply,'[name=bulk_action]':action})[selector]}):null;
  const dialog=admin?element({open:false,showModal(){this.open=true;},close(){this.open=false;this.emit('close');},getBoundingClientRect:()=>({left:10,right:500,top:10,bottom:500})}):null;
  const edits=admin?rows.map((row)=>element({hidden:true,closest:()=>row})):[];
  const editFields={editId:{},editName:{},editDisplay:{},editCategory:{}};
  const confirmation=element({dataset:{confirm:'Delete this document?'}}),summary={};
  const file=element({files:[],parentElement:{querySelector:()=>summary}});
  const document={body:{style:{overflow:'auto'}},querySelector:(selector)=>({'[data-workspace-tabs]':tablist,'[data-workspace-layout]':layout,'[data-document-search]':search,'[data-document-category]':category,'[data-workspace-empty]':empty,'[data-workspace-count]':count,'[data-select-all]':selectAll,'[data-bulk-form]':bulk,'[data-workspace-filters]':filters})[selector],querySelectorAll:(selector)=>({'[data-workspace-tab]':tabs,'[data-workspace-panel]':panels,'[data-workspace-document]':rows,'[data-document-check]':checks,'[data-edit-document]':edits,'[data-confirm]':[confirmation],'[data-file-input]':[file]})[selector]||[],getElementById:(id)=>id==='editModal'?dialog:editFields[id]};
  const window={location:{hash},handlers:{},addEventListener(name,handler){this.handlers[name]=handler;},answer:true,confirmations:[],confirm(message){this.confirmations.push(message);return this.answer;}};
  window.history={replaceState(state,title,value){window.location.hash=value;}};
  vm.runInNewContext(source,{document,window});
  const submit=()=>({preventDefault(){this.prevented=true;}});
  return {rows,checks,search,category,empty,count,filters,selectAll,selected,apply,action,bulk,dialog,edits,editFields,confirmation,file,summary,document,window,submit,tabs,panels,tablist};
}
test('search and category filters work together and keep result counts accurate',()=>{
 const f=fixture(); assert.equal(f.filters.hidden,false);
 f.search.value='secretariat';f.search.emit('input');
 assert.deepEqual(f.rows.map(r=>r.hidden),[true,false,true]);assert.equal(f.count.textContent,'1 document');
 f.category.value='treasurer';f.category.emit('change');assert.equal(f.empty.hidden,false);
 f.search.value='';f.search.emit('search');assert.equal(f.rows[0].hidden,false);assert.equal(f.empty.hidden,true);
});
test('filtering clears hidden selections and select-all only acts on visible records',()=>{
 const f=fixture();f.selectAll.checked=true;f.selectAll.emit('change');assert.equal(f.selected.textContent,'3 selected');
 f.category.value='secretary';f.category.emit('change');
 assert.deepEqual(f.checks.map(c=>c.checked),[false,true,false]);assert.equal(f.selected.textContent,'1 selected');
 f.checks[1].checked=false;f.checks[1].emit('change');assert.equal(f.apply.disabled,true);
 const event=f.submit();f.bulk.emit('submit',event);assert.equal(event.prevented,true);
});
test('bulk and individual deletion require confirmation while moves do not',()=>{
 const f=fixture();f.checks[0].checked=true;f.window.answer=false;
 const event=f.submit();f.bulk.emit('submit',event);assert.equal(event.prevented,true);
 f.action.value='treasurer';const move=f.submit();f.bulk.emit('submit',move);assert.equal(move.prevented,undefined);
 const single=f.submit();f.confirmation.emit('submit',single);assert.equal(single.prevented,true);
});
test('edit dialog receives the selected record and restores scrolling on dismissal',()=>{
 const f=fixture();f.rows[1].dataset.name='<Meeting minutes>.pdf';f.edits[1].emit('click');
 assert.equal(f.dialog.open,true);assert.equal(f.editFields.editId.value,'2');assert.equal(f.editFields.editName.value,'<Meeting minutes>.pdf');
 assert.equal(f.document.body.style.overflow,'hidden');
 f.dialog.emit('click',{target:f.dialog,clientX:1,clientY:1});assert.equal(f.dialog.open,false);assert.equal(f.document.body.style.overflow,'auto');
});
test('file selection labels use filenames as text and readonly dashboards retain search',()=>{
 const f=fixture({admin:false});f.file.files=[{name:'<Council>.pdf'}];f.file.emit('change');assert.equal(f.summary.textContent,'<Council>.pdf');
 f.search.value='legislative';f.search.emit('input');assert.equal(f.count.textContent,'1 document');
});
test('dashboard tabs switch in place and preserve an in-progress upload selection',()=>{
 const f=fixture();assert.deepEqual(f.panels.map(p=>p.hidden),[false,true]);
 f.file.files=[{name:'draft.pdf'}];
 const event=f.submit();f.tabs[1].emit('click',event);
 assert.equal(event.prevented,true);assert.deepEqual(f.panels.map(p=>p.hidden),[true,false]);
 assert.equal(f.tabs[1].attributes['aria-selected'],'true');assert.equal(f.window.location.hash,'#publishing-tools');
 f.tabs[0].emit('click',f.submit());f.tabs[1].emit('click',f.submit());
 assert.equal(f.file.files[0].name,'draft.pdf');
});
test('dashboard tabs support keyboard navigation, legacy anchors and post-upload defaults',()=>{
 const f=fixture({hash:'#upload-documents'});assert.equal(f.panels[1].hidden,false);
 const event={key:'ArrowLeft',preventDefault(){this.prevented=true;}};f.tabs[1].emit('keydown',event);
 assert.equal(event.prevented,true);assert.equal(f.tabs[0].focused,true);assert.equal(f.panels[0].hidden,false);
 f.window.location.hash='#publishing-tools';f.window.handlers.hashchange();assert.equal(f.panels[1].hidden,false);
 assert.equal(fixture({defaultPanel:'publishing-tools'}).panels[1].hidden,false);
 const member=fixture({admin:false,hash:'#publishing-tools'});assert.equal(member.tabs.length,1);assert.equal(member.panels[0].hidden,false);
});
