export class SpatialCellDatabase {
  constructor({cellSize=256}={}){this.cellSize=cellSize;this.cells=new Map();}
  cellCoords(x,z){return[Math.floor(x/this.cellSize),Math.floor(z/this.cellSize)];}
  key(cx,cz){return`${cx},${cz}`;}
  insert(entity){const[cx,cz]=this.cellCoords(entity.position[0],entity.position[2]);const key=this.key(cx,cz);const cell=this.cells.get(key)||[];cell.push(entity);this.cells.set(key,cell);return key;}
  get(cx,cz){return this.cells.get(this.key(cx,cz))||[];}
  keysInRadius(cx,cz,radius){const out=[];for(let z=cz-radius;z<=cz+radius;z++)for(let x=cx-radius;x<=cx+radius;x++)out.push(this.key(x,z));return out;}
}
