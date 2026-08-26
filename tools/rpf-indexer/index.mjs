#!/usr/bin/env node
import fs from 'node:fs/promises';
import { ByteSource } from '../../packages/vfs/src/index.js';
import { probeRpfSource } from '../../packages/rpf/src/index.js';
class NodeFileSource extends ByteSource {
  constructor(path){super();this.path=path;this.handle=null;this.byteLength=null;}
  async open(){this.handle??=await fs.open(this.path,'r');if(this.byteLength==null)this.byteLength=Number((await this.handle.stat()).size);return this;}
  async size(){await this.open();return this.byteLength;}
  async read(offset,length){await this.open();const out=Buffer.alloc(length);const{bytesRead}=await this.handle.read(out,0,length,offset);if(bytesRead!==length)throw new Error(`Short read ${bytesRead}/${length}`);return out.buffer.slice(out.byteOffset,out.byteOffset+out.byteLength);}
  async close(){await this.handle?.close();this.handle=null;}
}
const path=process.argv[2];if(!path){console.error('Usage: node tools/rpf-indexer/index.mjs <archive.rpf>');process.exit(2);}const source=await new NodeFileSource(path).open();try{console.log(JSON.stringify({path,...(await probeRpfSource(source))},null,2));}finally{await source.close();}
