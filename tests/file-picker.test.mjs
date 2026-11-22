import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source=readFileSync(new URL('../assets/js/file-picker.js',import.meta.url),'utf8');
function fixture({kind='pdf',disabled=false,rejectDrop=false}={}) {
  function element(extra={}) {
    const classes=new Set();
    return {handlers:{},attributes:{},children:[],hidden:false,addEventListener(name,handler){this.handlers[name]=handler;},emit(name,event){this.handlers[name]?.(event);},setAttribute(name,value){this.attributes[name]=value;},append(...children){this.children.push(...children);},replaceChildren(...children){this.children=children;},classList:{toggle(name,on){if(on)classes.add(name);else classes.delete(name);},remove(name){classes.delete(name);},contains(name){return classes.has(name);}},...extra};
  }
  let files=[];
  const input=element({multiple:kind==='pdf',matches:()=>disabled,focus(){this.focused=true;}});
  Object.defineProperty(input,'files',{get:()=>files,set(value){if(rejectDrop)throw new Error('Unsupported file assignment');files=value;}});
  Object.defineProperty(input,'value',{set(value){if(value==='')files=[];}});
  const drop=element({contains:()=>false}),summary=element(),list=element(),clear=element(),error=element(),hint=element();
  const nodes={'[data-file-input]':input,'[data-file-drop]':drop,'[data-file-summary]':summary,'[data-file-list]':list,'[data-file-clear]':clear,'[data-file-error]':error,'[data-file-hint]':hint};
  const picker=element({dataset:{fileKind:kind},querySelector:(selector)=>nodes[selector]});
  vm.runInNewContext(source,{document:{querySelectorAll:()=>[picker],createElement:()=>element()}});
  const choose=(selected)=>{files=selected;input.emit('change');};
  const drag=(selected)=>({dataTransfer:{types:['Files'],files:selected},preventDefault(){this.prevented=true;}});
  return {input,drop,summary,list,clear,error,hint,picker,choose,drag};
}
test('choosing files shows safe filenames, readable sizes and selection count',()=>{
 const f=fixture();f.choose([{name:'Council <report>.pdf',size:2048},{name:'Budget.pdf',size:1572864}]);
 assert.equal(f.summary.textContent,'2 files selected');assert.equal(f.list.hidden,false);assert.equal(f.clear.hidden,false);
 assert.equal(f.list.children[0].children[0].textContent,'Council <report>.pdf');
 assert.equal(f.list.children[0].children[1].textContent,'2 KB');assert.equal(f.list.children[1].children[1].textContent,'1.5 MB');
 assert.equal(f.picker.attributes['data-file-ready'],'');
});
test('clearing a selection empties the native input and restores keyboard focus',()=>{
 const f=fixture();f.choose([{name:'Council.pdf',size:100}]);f.clear.emit('click');
 assert.equal(f.input.files.length,0);assert.equal(f.list.hidden,true);assert.equal(f.clear.hidden,true);assert.equal(f.summary.textContent,'No files selected.');assert.equal(f.input.focused,true);
});
test('dragging and dropping PDFs updates the same native input used for form submission',()=>{
 const f=fixture();const event=f.drag([{name:'Council.PDF',size:200},{name:'Budget.pdf',size:300}]);
 f.drop.emit('dragover',event);assert.equal(event.prevented,true);assert.equal(event.dataTransfer.dropEffect,'copy');assert.equal(f.drop.classList.contains('is-dragging'),true);
 f.drop.emit('drop',event);assert.equal(f.input.files,event.dataTransfer.files);assert.equal(f.summary.textContent,'2 files selected');assert.equal(f.drop.classList.contains('is-dragging'),false);
});
test('an invalid drop preserves an existing selection and explains the allowed file type',()=>{
 const f=fixture();const original=[{name:'Original.pdf',size:100}];f.choose(original);
 f.drop.emit('drop',f.drag([{name:'Image.png',size:200}]));
 assert.equal(f.input.files,original);assert.equal(f.error.hidden,false);assert.match(f.error.textContent,/Only PDF files/);assert.equal(f.list.children[0].children[0].textContent,'Original.pdf');
});
test('the paused announcement picker prevents drops from selecting or replacing images',()=>{
 const f=fixture({kind:'image',disabled:true});const event=f.drag([{name:'Event.jpg',size:100}]);
 f.drop.emit('dragover',event);assert.equal(event.dataTransfer.dropEffect,'none');
 f.drop.emit('drop',event);assert.equal(event.prevented,true);assert.equal(f.input.files.length,0);assert.equal(f.clear.hidden,true);
});
test('image selection accepts one image at a time and falls back to Browse on unsupported drops',()=>{
 const f=fixture({kind:'image'});const original=[{name:'Event.webp',size:100}];f.drop.emit('drop',f.drag(original));assert.equal(f.input.files,original);
 f.drop.emit('drop',f.drag([{name:'One.png'},{name:'Two.jpg'}]));assert.equal(f.input.files,original);assert.equal(f.error.hidden,false);
 const unsupported=fixture({rejectDrop:true});unsupported.drop.emit('drop',unsupported.drag([{name:'Council.pdf',size:100}]));assert.match(unsupported.error.textContent,/Browse files/);assert.equal(unsupported.error.hidden,false);
});
