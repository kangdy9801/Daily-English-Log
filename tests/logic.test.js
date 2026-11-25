import test from 'node:test';import assert from 'node:assert/strict';import {today,diff,validateResult} from '../docs/logic.js';
test('local calendar date',()=>assert.equal(today(new Date(2026,10,25)),'2026-11-25'));
test('word diff reconstructs original and correction',()=>{const a='I study English.',b='I studied English.';const d=diff(a,b);assert.equal(d.before.map(x=>x.text).join(''),a);assert.equal(d.after.map(x=>x.text).join(''),b);assert.equal(d.before.filter(x=>x.changed).map(x=>x.text).join(''),'study');assert.equal(d.after.filter(x=>x.changed).map(x=>x.text).join(''),'studied');});
test('empty or unchanged diff',()=>{assert.deepEqual(diff('',''),{before:[],after:[]});assert.ok(diff('Hello.','Hello.').before.every(x=>!x.changed));});
test('result validation',()=>{assert.throws(()=>validateResult({sentences:[]}));const s={original:'Hi.',corrected:'Hi.',ipa:'/haɪ/',grammar:'올바른 표현'};assert.deepEqual(validateResult({sentences:[s]}),[s]);});
