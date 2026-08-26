export const ResourceKind=Object.freeze({TEXTURE_DICTIONARY:'ytd',DRAWABLE:'ydr',DRAWABLE_DICTIONARY:'ydd',FRAGMENT:'yft',BOUNDS:'ybn',MAP_DATA:'ymap',MAP_TYPES:'ytyp',ANIMATION:'animation',AUDIO:'audio',UNKNOWN:'unknown'});

export class DecoderRegistry {
  constructor(){this.decoders=new Map();}
  register(kind,decoder){if(!kind||typeof decoder?.decode!=='function')throw new TypeError('decoder must expose decode(context)');this.decoders.set(kind,decoder);return this;}
  has(kind){return this.decoders.has(kind);}
  async decode(kind,context){const decoder=this.decoders.get(kind);if(!decoder)throw new Error(`No decoder registered for ${kind}`);return decoder.decode(context);}
}

export function inferResourceKind(name=''){const ext=name.toLowerCase().split('.').pop();return Object.values(ResourceKind).includes(ext)?ext:ResourceKind.UNKNOWN;}
export function meshData({positions,normals=null,uvs=null,indices,materials=[],bounds=null}){if(!positions||!indices)throw new Error('MeshData requires positions and indices');return{type:'mesh',positions,normals,uvs,indices,materials,bounds};}
export function textureData({width,height,format,mipLevels=[],srgb=true,name=''}){return{type:'texture',width,height,format,mipLevels,srgb,name};}
export function placementData({archetype,position,rotation,scale=[1,1,1],lodLevel=0,lodDistance=0,flags=0}){return{type:'placement',archetype,position,rotation,scale,lodLevel,lodDistance,flags};}
export function collisionData({bounds,shapes=[]}){return{type:'collision',bounds,shapes};}
