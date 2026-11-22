import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
const source=readFileSync(new URL('../assets/js/site.js',import.meta.url),'utf8');
function fixture(mobile=true) {
 const events={},classes=new Set();
 const toggle={attributes:{},setAttribute(k,v){this.attributes[k]=v;},getAttribute(k){return this.attributes[k];},addEventListener(k,v){this[k]=v;},focus(){this.focused=true;},contains:(target)=>target==='toggle'};
 const navigation={classList:{toggle(k,on){if(on)classes.add(k);else classes.delete(k);}},addEventListener(k,v){this[k]=v;},contains:(target)=>target==='link'};
 const media={matches:mobile,addEventListener(k,v){this[k]=v;}};
 const document={activeElement:null,querySelector:(selector)=>selector==='[data-navigation-toggle]'?toggle:navigation,addEventListener:(k,v)=>events[k]=v};
 vm.runInNewContext(source,{document,window:{matchMedia:()=>media}});
 return {toggle,navigation,media,document,events,classes};
}
test('mobile navigation opens and closes with matching accessible and inert states',()=>{
 const f=fixture();assert.equal(f.navigation.inert,true);
 f.toggle.click();assert.equal(f.toggle.attributes['aria-expanded'],'true');assert.equal(f.navigation.inert,false);assert.ok(f.classes.has('is-open'));
 f.toggle.click();assert.equal(f.toggle.attributes['aria-label'],'Open navigation');assert.equal(f.navigation.inert,true);
});
test('Escape returns focus, while outside clicks and selecting a link dismiss the menu',()=>{
 const f=fixture();f.toggle.click();f.events.keydown({key:'Escape'});assert.equal(f.toggle.focused,true);assert.equal(f.navigation.inert,true);
 f.toggle.click();f.events.pointerdown({target:'link'});assert.ok(f.classes.has('is-open'));
 f.navigation.click({target:{closest:()=>true}});assert.equal(f.navigation.inert,true);
 f.toggle.click();f.events.pointerdown({target:'outside'});assert.equal(f.navigation.inert,true);
});
test('desktop navigation remains accessible and resizing closes a mobile panel safely',()=>{
 const f=fixture(false);assert.equal(f.navigation.inert,false);
 f.media.matches=true;f.document.activeElement='link';f.media.change();assert.equal(f.navigation.inert,true);assert.equal(f.toggle.focused,true);
 f.toggle.click();f.media.matches=false;f.media.change();assert.equal(f.navigation.inert,false);assert.equal(f.toggle.attributes['aria-expanded'],'false');
});
