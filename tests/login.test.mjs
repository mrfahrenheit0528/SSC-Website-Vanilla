import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
test('password visibility toggles both ways without changing the entered password', () => {
  const field = {type:'password', value:'retained password'};
  const toggle = {hidden:true, attributes:{}, addEventListener(name, handler){this[name]=handler;}, setAttribute(name,value){this.attributes[name]=value;}};
  vm.runInNewContext(readFileSync(new URL('../assets/js/login.js',import.meta.url),'utf8'), {document:{querySelector:()=>toggle,getElementById:()=>field}});
  assert.equal(toggle.hidden,false);
  toggle.click(); assert.equal(field.type,'text'); assert.equal(toggle.attributes['aria-pressed'],'true');
  toggle.click(); assert.equal(field.type,'password'); assert.equal(toggle.attributes['aria-label'],'Show password');
  assert.equal(field.value,'retained password');
});
