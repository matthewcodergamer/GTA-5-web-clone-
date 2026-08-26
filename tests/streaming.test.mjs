import test from 'node:test';
import assert from 'node:assert/strict';
import { CellStreamer } from '../packages/streaming/src/index.js';
test('streamer loads near cells and keeps hysteresis cells',async()=>{const loaded=[],unloaded=[];const s=new CellStreamer({loadRadius:0,unloadRadius:1,loadCell:async k=>loaded.push(k),unloadCell:async k=>unloaded.push(k)});await s.update(0,0);assert.deepEqual(loaded,['0,0']);await s.update(1,0);assert.equal(unloaded.length,0);await s.update(3,0);assert.deepEqual(unloaded,['0,0','1,0']);});
