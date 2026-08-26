/** Conservative RPF probing. Directory parsing is fixture-driven and intentionally not guessed. */
export const RPF_MAGIC = Object.freeze({ RPF2:0x52504632, RPF3:0x52504633, RPF4:0x52504634, RPF6:0x52504636, RPF7:0x52504637, RPF8:0x52504638 });

export class BinaryCursor {
  constructor(buffer, { littleEndian = false, offset = 0 } = {}) { this.view = buffer instanceof DataView ? buffer : new DataView(buffer); this.littleEndian = littleEndian; this.offset = offset; }
  ensure(bytes) { if (this.offset + bytes > this.view.byteLength) throw new RangeError('BinaryCursor overrun'); }
  u8() { this.ensure(1); return this.view.getUint8(this.offset++); }
  u16() { this.ensure(2); const v=this.view.getUint16(this.offset,this.littleEndian); this.offset+=2; return v; }
  u32() { this.ensure(4); const v=this.view.getUint32(this.offset,this.littleEndian); this.offset+=4; return v; }
  bytes(length) { this.ensure(length); const out=new Uint8Array(this.view.buffer,this.view.byteOffset+this.offset,length); this.offset+=length; return out; }
  seek(offset) { if (!Number.isSafeInteger(offset)||offset<0||offset>this.view.byteLength) throw new RangeError('Invalid seek'); this.offset=offset; }
}

export function magicToAscii(value) { return String.fromCharCode((value>>>24)&255,(value>>>16)&255,(value>>>8)&255,value&255); }

export function probeRpfHeader(buffer) {
  const view=buffer instanceof DataView?buffer:new DataView(buffer);
  if(view.byteLength<4)return{isRpf:false,reason:'Need at least 4 bytes'};
  const be=view.getUint32(0,false),le=view.getUint32(0,true);
  const known=new Map(Object.entries(RPF_MAGIC).map(([version,magic])=>[magic,version]));
  if(known.has(be))return{isRpf:true,version:known.get(be),magic:magicToAscii(be),byteOrder:'big',rawMagic:be};
  if(known.has(le))return{isRpf:true,version:known.get(le),magic:magicToAscii(le),byteOrder:'little',rawMagic:le};
  const first=new TextDecoder('ascii').decode(new Uint8Array(view.buffer,view.byteOffset,Math.min(4,view.byteLength)));
  return{isRpf:false,reason:`Unknown magic ${JSON.stringify(first)}`,rawMagicBE:be,rawMagicLE:le};
}

export async function probeRpfSource(source) { const size=await source.size(); const header=await source.read(0,Math.min(64,size)); return{size,...probeRpfHeader(header)}; }

export class RpfArchive {
  constructor(source,probe){this.source=source;this.probe=probe;}
  static async open(source){const probe=await probeRpfSource(source);if(!probe.isRpf)throw new Error(probe.reason||'Not an RPF archive');return new RpfArchive(source,probe);}
  async listEntries(){throw new Error(`RPF ${this.probe.version} directory parsing is not enabled yet. Add an Xbox 360 fixture/test before implementing it.`);}
}
