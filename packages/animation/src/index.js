export class AnimationRuntime{constructor(){this.clips=new Map();}register(name,clip){this.clips.set(name,clip);}get(name){return this.clips.get(name);}}
export const AnimationLayers=Object.freeze(['locomotion','upperBody','action','reaction','additive']);
