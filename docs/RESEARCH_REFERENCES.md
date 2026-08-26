# Research References

These are architectural/reverse-engineering references, not dependencies to copy indiscriminately.

## CodeWalker
https://github.com/dexyfex/CodeWalker

Useful for GTA V RPF/world/resource terminology and relationships: YTD textures, YDR drawables, YDD dictionaries, YFT fragments, YMAP placements and LOD hierarchy.

## CitizenFX / FiveM
https://github.com/citizenfx/fivem

Useful for RAGE-facing architecture and multi-generation format concepts. Its format code visibly distinguishes game generations such as `ny`, `five`, `payne` and `rdr3`, reinforcing Project V's decision to make generation/platform explicit.

## LibertyRecomp
https://github.com/OZORDI/LibertyRecomp

Useful for lessons from an Xbox 360 GTA IV static-recompilation project: platform boundary, PowerPC recompilation, Xenos shader translation, VFS/RPF handling, and the scale of remaining RAGE/GPU work.

## OpenSA
https://github.com/AlexSergey/opensa

Useful as a browser-engine architecture reference: bring-your-own-files, VFS/loaders, world streaming, physics, isolated tools, and the later move from Three.js to a custom WebGPU renderer after the data/runtime path existed.

## wasm-reVC
https://github.com/origami-ltd/wasm-revc

Useful for browser hosting/Emscripten lessons around a reconstructed engine: streamed user-owned game files, persistent browser data and WebAssembly integration. Project V differs because GTA V does not have an equivalent complete reconstructed engine available to simply compile.

## Research discipline

- Confirm a fact in more than one place when possible.
- Record platform/version with every structure.
- Keep source links in issues/notes for each parser change.
- Respect each reference project's license before adapting code.
