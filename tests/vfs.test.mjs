import test from 'node:test';
import assert from 'node:assert/strict';
import { BlobSource,VfsMountTable,normalizePath } from '../packages/vfs/src/index.js';
test('BlobSource returns exact byte ranges',async()=>{const source=new BlobSource(new Blob([Uint8Array.from([10,20,30,40,50])]));assert.equal(await source.size(),5);assert.deepEqual([...new Uint8Array(await source.read(1,3))],[20,30,40]);});
test('VFS normalizes paths and chooses longest mount',()=>{assert.equal(normalizePath('/a/./b/../c'),'/a/c');const vfs=new VfsMountTable();vfs.mount('/game',{name:'root'});vfs.mount('/game/x64',{name:'x64'});assert.equal(vfs.resolve('/game/x64/a.rpf').provider.name,'x64');assert.throws(()=>normalizePath('../../escape'));});
