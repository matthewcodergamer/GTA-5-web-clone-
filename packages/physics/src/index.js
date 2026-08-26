export class PhysicsBackend{async initialize(){}addStaticCollision(_id,_collisionData){throw new Error('addStaticCollision not implemented');}remove(_id){}step(_seconds){}}
export function createPhysicsConfig(){return{gravity:[0,-9.81,0],fixedStep:1/60,maxSubsteps:3,activeRagdoll:false};}
