/** Phase-1 renderer adapter. Keep Three.js-specific objects behind this boundary. */
export class ThreeRendererBackend {
  constructor({THREE,scene,renderer}){this.THREE=THREE;this.scene=scene;this.renderer=renderer;this.objects=new Map();}
  get name(){return'three';}
  async uploadMesh(id,meshData){if(!this.THREE)throw new Error('THREE namespace not supplied');const geometry=new this.THREE.BufferGeometry();geometry.setAttribute('position',new this.THREE.BufferAttribute(meshData.positions,3));if(meshData.normals)geometry.setAttribute('normal',new this.THREE.BufferAttribute(meshData.normals,3));if(meshData.uvs)geometry.setAttribute('uv',new this.THREE.BufferAttribute(meshData.uvs,2));geometry.setIndex(new this.THREE.BufferAttribute(meshData.indices,1));return geometry;}
  dispose(id){const object=this.objects.get(id);object?.traverse?.(node=>{node.geometry?.dispose?.();if(Array.isArray(node.material))node.material.forEach(m=>m.dispose?.());else node.material?.dispose?.();});this.objects.delete(id);}
}
