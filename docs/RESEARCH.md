# Project V Research Notes

These notes guide the architecture without copying Rockstar code or redistributing Rockstar assets.

## Character motion / Euphoria direction

Historical Rockstar/NaturalMotion material describes Euphoria-style character behavior as adaptive motion synthesized from physical control rather than only replaying fixed clips. The useful architectural lesson for this project is **animation for intent + runtime variation for physical response**.

Sources:

- Rockstar Newswire — Worldwide Grand Theft Auto V Previews: https://www.rockstargames.com/newswire/article/o349k552514927/worldwide-grand-theft-auto-v-previews.html
- Game Developer — GTA IV Using NaturalMotion's Euphoria: https://www.gamedeveloper.com/game-platforms/product-i-grand-theft-auto-iv-i-using-naturalmotion-s-euphoria

### Practical interpretation

- impact direction -> spine / shoulder offset
- impact strength -> balance-loss amount
- velocity -> stumble severity
- foot placement -> recovery attempt
- extreme impulse -> partial ragdoll later
- stabilization -> blend back to authored locomotion

Do not encode the whole reaction into one huge animation clip.

## GTA V rendering observations

Adrian Courrèges' GTA V frame analysis identifies an HDR deferred pipeline, G-buffer, cascaded shadows, SSAO, reflections, fog/atmosphere, bloom, tone mapping, adaptive exposure and extensive LOD/streaming.

Sources:

- https://www.adriancourreges.com/blog/2015/11/02/gta-v-graphics-study/
- https://www.adriancourreges.com/blog/2015/11/02/gta-v-graphics-study-part-2/
- https://www.adriancourreges.com/blog/2015/11/02/gta-v-graphics-study-part-3/

### iPhone/Web interpretation

Do not reproduce the full console/PC frame graph. Start with the high-value pieces:

- ACES/HDR-style tone mapping
- one strong directional sun
- cheap hemisphere/ambient fill
- nearby soft shadows
- atmosphere/fog for distant-detail control
- glTF PBR materials
- LOD / streamed chunks later

Only add full-screen SSAO, SSR or bloom after profiling on the target iPhone.

## Three.js implementation notes

The project uses Three.js import maps plus `FBXLoader` and `GLTFLoader`. Because the supplied character and Meshy walk share bone names, the current walk bridge maps tracks directly by normalized bone name rather than doing a generalized humanoid retarget.

`SkeletonHelper` is part of the normal scene graph and is **not** called with `skeletonHelper.update()`. The previous repeated console error came from trying to call a method that `SkeletonHelper` does not expose.

Sources:

- Three.js installation: https://threejs.org/manual/en/installation.html
- Three.js SkeletonHelper: https://threejs.org/docs/#api/en/helpers/SkeletonHelper
- Three.js SkeletonUtils: https://threejs.org/docs/pages/module-SkeletonUtils.html

## Selected legal weapon candidates

Poly Pizza currently lists the following Quaternius models as Public Domain (CC0) and downloadable in FBX/GLTF or GLB-compatible formats:

- Pistol: https://poly.pizza/m/J3i9KDQ3kt
- Submachine Gun: https://poly.pizza/m/7ehatxr7FY
- Ultimate Guns Pack: https://poly.pizza/bundle/Ultimate-Guns-Pack-cpgUfI4t2F

The Ultimate Guns Pack contains pistol, submachine-gun and sawed-off-shotgun options and is published under CC0. See `assets/WEAPONS.md` for the exact prototype choices.

### Production asset rule

Do not depend permanently on a third-party CDN. Before shipping, download the selected CC0 models, retain license/source notes, convert/optimize to local GLB, and serve them from `assets/weapons/`.
