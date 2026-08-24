# Project V Research Notes

These notes guide the architecture without copying Rockstar code or redistributing Rockstar assets.

## Character motion / Euphoria direction

Rockstar publicly described GTA V combat as evolving from GTA IV, Red Dead Redemption and Max Payne 3, and specifically referenced Euphoria-provided animations in combat. Historical reporting on Rockstar + NaturalMotion describes Euphoria as synthesizing adaptive character motion using simulated motor control, muscles and biomechanics rather than relying only on fixed clips.

Sources:

- Rockstar Newswire — Worldwide Grand Theft Auto V Previews: https://www.rockstargames.com/newswire/article/o349k552514927/worldwide-grand-theft-auto-v-previews.html
- Game Developer — GTA IV Using NaturalMotion's Euphoria: https://www.gamedeveloper.com/game-platforms/product-i-grand-theft-auto-iv-i-using-naturalmotion-s-euphoria

### Practical interpretation for this Three.js project

Use animation for intention, then add runtime physics variation:

- impact direction -> spine/shoulder offset
- impact strength -> balance loss amount
- velocity -> stumble step selection
- foot placement -> recovery attempt
- extreme impulse -> partial ragdoll
- stabilization -> blend back to authored motion

Do not try to encode the entire physical response into one huge animation clip.

## GTA V rendering observations

Adrian Courrèges' frame analysis of GTA V identifies a deferred pipeline with HDR buffers, a G-buffer, cascaded shadow maps, SSAO, reflections, fog/atmosphere, bloom, tone mapping and adaptive exposure. The same study emphasizes extensive LOD/streaming and inexpensive distant representations.

Sources:

- Part 1: https://www.adriancourreges.com/blog/2015/11/02/gta-v-graphics-study/
- Part 2: https://www.adriancourreges.com/blog/2015/11/02/gta-v-graphics-study-part-2/
- Part 3: https://www.adriancourreges.com/blog/2015/11/02/gta-v-graphics-study-part-3/

### What we copy conceptually on iPhone

We do not try to reproduce the full PC/console frame graph. Start with:

- ACES/HDR-style tone mapping
- one high-quality directional sun
- cheap hemisphere/ambient fill
- nearby soft shadows
- fog for atmosphere and distant-detail control
- glTF/GLB PBR materials later
- LOD and streamed chunks later

Avoid expensive full-screen SSAO/SSR/bloom until profiling proves the device budget can handle them.

## Three.js implementation notes

Current Three.js docs recommend import maps for CDN usage. Three.js `SkeletonUtils` provides `retarget` and `retargetClip` helpers for more complex rig conversions, while this project currently uses direct bone-name mapping because both supplied FBX files use the same bone names.

`SkeletonHelper` should not be treated like helpers such as `CameraHelper` that expose an `update()` function. The previous `skeletonHelper.update is not a function` error came from calling a method that does not exist on `SkeletonHelper`.

Sources:

- Installation: https://threejs.org/manual/en/installation.html
- SkeletonUtils: https://threejs.org/docs/pages/module-SkeletonUtils.html
- Three.js r185 CDN: https://cdn.jsdelivr.net/npm/three/

## Legal weapon asset candidates

Do not use ripped GTA weapon models. These are legal prototype candidates:

### Quaternius Ultimate Guns Pack

- 40 weapon models
- FBX / OBJ / Blend
- CC0
- includes pistol, Glock-style, rifles, shotguns, SMGs and sniper-style weapons
- https://quaternius.com/packs/ultimategun.html

### Quaternius Animated Guns Pack

- 6 animated weapons
- pistol, revolver, shotgun, sniper and others
- FBX / OBJ / Blend
- CC0
- https://quaternius.com/packs/animatedguns.html

### Quaternius Universal Animation Library

- 120+ humanoid animations
- locomotion, combat and gun motions
- FBX / GLB / Blend
- CC0
- useful as a fallback/retarget library when an AI-generated motion is missing
- https://quaternius.com/packs/universalanimationlibrary.html

### Poly Pizza CC0 pistol examples

- Quaternius pistol, GLTF/FBX, CC0: https://poly.pizza/m/J3i9KDQ3kt
- Colt 1911 by AdamKokrito, GLTF/FBX, CC0, separate magazine/slide/trigger/hammer: https://poly.pizza/m/zmuVJOUn4p

For a more realistic final visual style, replace low-poly placeholders with a higher-quality legally licensed PBR model, but keep the same weapon-socket interface.
