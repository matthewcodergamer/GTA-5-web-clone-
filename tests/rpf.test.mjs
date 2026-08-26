import test from 'node:test';
import assert from 'node:assert/strict';
import { probeRpfHeader,BinaryCursor } from '../packages/rpf/src/index.js';
test('probes RPF7 big-endian ASCII magic',()=>{const bytes=Uint8Array.from([0x52,0x50,0x46,0x37,0,0,0,0]);assert.deepEqual(probeRpfHeader(bytes.buffer),{isRpf:true,version:'RPF7',magic:'RPF7',byteOrder:'big',rawMagic:0x52504637});});
test('BinaryCursor honors byte order',()=>{const buffer=Uint8Array.from([0x12,0x34,0x56,0x78]).buffer;assert.equal(new BinaryCursor(buffer,{littleEndian:false}).u32(),0x12345678);assert.equal(new BinaryCursor(buffer,{littleEndian:true}).u32(),0x78563412);});
