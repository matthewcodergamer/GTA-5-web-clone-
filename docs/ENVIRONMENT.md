# Project V Environment — Chrometry + GTA V-style atmosphere

## Palette source

Project V v8 uses the user-supplied Chrometry semantic palettes as authored inputs rather than arbitrary hard-coded scene colors.

### Day
- sky/atmosphere `#F1FBFB`
- vegetation/grass `#73894E`
- earth/terrain `#625851`
- sunlight/highlight `#929395`
- shadow/AO `#070707`
- water/cool material `#263251`
- neutral structure `#2B2E2C`
- accent/signage `#515F88`

### Sunrise
- sky/atmosphere `#DBDFDD`
- vegetation/grass `#64733A`
- earth/terrain `#D8D1B6`
- sunlight/highlight `#9E987F`
- shadow/AO `#20211F`
- water/cool material `#7F8D4E`
- neutral structure `#40433F`
- accent/signage `#674342`

### Evening
- sky/atmosphere `#9C8690`
- vegetation/grass `#41564D`
- earth/terrain `#353A4F`
- sunlight/highlight `#918394`
- shadow/AO `#121B1C`
- water/cool material `#262D3F`
- neutral structure `#2A282A`
- accent/signage `#2F3933`

The runtime interpolates between presets instead of snapping colors. The same semantic palette drives the sky, fog, hemisphere light, directional sun, grass, road/structure materials, vegetation and cloud shading.

## GTA V rendering research used for the implementation

A public graphics study of GTA V by Adrian Courrèges shows that the original GTA V sky is rendered with a huge sky dome, followed by clouds. The clouds are described as a large ring-shaped horizon mesh using seamless density and normal maps. The same study describes half-resolution ray-marched light shafts and cloud shadow contribution to atmosphere/shadow buffers.

Source: https://www.adriancourreges.com/blog/2015/11/02/gta-v-graphics-study/

Additional reverse-engineering work documents two coexisting GTA V cloud ideas: procedural sky-shader clouds and authored CloudHat geometry chosen by weather. Project V does not copy Rockstar assets or shaders; it uses those broad rendering ideas to build an original Three.js implementation.

Source: https://blancodagoat.dev/gtav-rage-formats/rendering-laws/

## Project V mobile implementation

Full volumetric ray marching is intentionally not the default on iPhone. v8 uses a lower-cost hybrid:

1. a large inside-facing sky dome;
2. two inside-facing ring meshes around the horizon;
3. procedural four-octave FBM density in the cloud shader instead of shipping Rockstar cloud textures;
4. low-poly instanced authored cloud clusters to add CloudHat-like geometric breakup;
5. Chrometry-driven cloud highlight/shadow colors;
6. slow cloud movement and coverage-based sun occlusion;
7. a Fast mode that disables the secondary ring and authored cloud clusters while preserving the main sky/cloud pass.

This keeps the architecture close to the useful GTA V approach—sky dome + horizon cloud geometry + weather-driven shading—while remaining realistic for mobile Safari.

## Texture mapping status

Michael's user-supplied texture atlases are loaded as local WebP data reconstructed from repository-safe base64 chunks. The FBX exposes a merged skinned mesh, so v8 preserves skin attributes and groups triangles into conservative body regions. The v8 pass tightens the hand boundary and restricts the mouth/teeth atlas to a small front-center face region instead of allowing it to spill across the head.
