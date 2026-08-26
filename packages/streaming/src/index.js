/** Hysteresis keeps cells loaded until they pass unloadRadius, avoiding boundary thrash. */
export class CellStreamer {
  constructor({loadRadius=3,unloadRadius=5,loadCell,unloadCell}){if(unloadRadius<loadRadius)throw new Error('unloadRadius must be >= loadRadius');this.loadRadius=loadRadius;this.unloadRadius=unloadRadius;this.loadCell=loadCell;this.unloadCell=unloadCell;this.loaded=new Set();this.center=null;}
  key(x,z){return`${x},${z}`;}
  desired(cx,cz,radius){const set=new Set();for(let z=cz-radius;z<=cz+radius;z++)for(let x=cx-radius;x<=cx+radius;x++)set.add(this.key(x,z));return set;}
  async update(cx,cz){this.center=[cx,cz];const loadSet=this.desired(cx,cz,this.loadRadius),keepSet=this.desired(cx,cz,this.unloadRadius);const toUnload=[...this.loaded].filter(key=>!keepSet.has(key));const toLoad=[...loadSet].filter(key=>!this.loaded.has(key));await Promise.all(toUnload.map(async key=>{await this.unloadCell?.(key);this.loaded.delete(key);}));await Promise.all(toLoad.map(async key=>{await this.loadCell?.(key);this.loaded.add(key);}));return{loaded:[...this.loaded],added:toLoad,removed:toUnload};}
}
