# Project V — Browser-Native RAGE Compatibility Runtime

Project V is changing direction.

The repository is no longer centered on a hand-authored Three.js GTA-style scene or the temporary Meshy Michael rig. The new goal is a **browser-native compatibility runtime for user-supplied, legally obtained Xbox 360 Grand Theft Auto V data**, with a format/VFS/streaming layer that can progressively turn original game data into a playable web world.

```text
User-owned Xbox 360 GTA V files
          │
          ▼
 Cloudflare R2 / local files
          │
          ▼
   Project V Virtual FS
          │
          ├── HTTP Range / R2 byte sources
          ├── local Blob/File sources
          └── archive mounts
          │
          ▼
      RPF compatibility
          │
          ▼
  RAGE resource decoders
   YTD / YDR / YDD / YFT
   YBN / YMAP / metadata
          │
          ▼
 normalized engine data
          │
   ┌──────┼─────────┐
   ▼      ▼         ▼
streaming physics  gameplay
   │      │         │
   └──────┼─────────┘
          ▼
 renderer backend
 Three.js first → WebGPU later
```

## Why this direction

There is no public drop-in `RAGE -> Emscripten -> GTA V` codebase comparable to reVC for Vice City. The practical route is a hybrid compatibility engine:

- use public reverse-engineering work to understand structures and engine behavior;
- keep Project V's runtime browser-native;
- read the user's original game data rather than redistributing it;
- implement vertically, one format and one visible milestone at a time;
- keep Three.js as the first renderer while the asset/runtime architecture stabilizes;
- move GPU-heavy paths to a custom WebGPU backend when the data path is proven.

Useful references include CodeWalker for GTA V RPF/world/resource structure, CitizenFX for multi-generation RAGE format work, LibertyRecomp for Xbox 360 GTA IV recompilation/platform lessons, OpenSA for browser VFS/streaming/WebGPU architecture, and wasm-reVC for browser hosting around an existing reconstructed engine. These projects have different licenses and goals: **study interfaces and behavior, do not blindly copy incompatible code.**

## Current phase: Asset Runtime Foundation

The first target is not missions, Euphoria, or a full city. It is a deterministic pipeline that can answer:

1. Where is an asset stored?
2. What byte range is required?
3. What RAGE resource type is it?
4. Can we decode it into a normalized representation?
5. Can we stream only the world cells currently needed?
6. Can the renderer consume that representation without knowing about RPF internals?

## Repository layout

```text
apps/
  engine-lab/          browser diagnostics + local RPF probing
  game/                future playable runtime shell

packages/
  vfs/                 byte sources, HTTP Range, mount table
  rpf/                 RPF probing and archive compatibility layer
  rage-formats/        decoder registry + normalized resource types
  streaming/           cell load/unload scheduler
  world/               spatial cell database
  renderer-three/      Phase 1 renderer adapter
  renderer-webgpu/     future high-performance backend contract
  wasm-bridge/         WebAssembly module/codec bridge
  physics/             physics backend contract
  animation/           animation runtime contract
  gameplay/            gameplay/runtime composition

tools/
  rpf-indexer/         archive/index CLI workbench
  asset-inspector/     metadata inspection
  texture-viewer/      YTD/texture development target
  model-viewer/        YDR/YDD development target
  world-debugger/      YMAP/streaming development target

native/
  include/             WASM/native ABI
  src/                 C++ core entry points

docs/
  ARCHITECTURE.md
  ROADMAP.md
  ASSET_PIPELINE.md
  R2_LAYOUT.md
  DECODER_CONTRACT.md
  RESEARCH_REFERENCES.md
```

## What works in this foundation

- Browser/local-file byte sources with bounded reads.
- HTTP `Range` byte source for future R2/Worker streaming.
- VFS mount table with path normalization and traversal protection.
- RPF magic/version probing without assuming a finished directory decoder.
- Endian-aware binary cursor suitable for Xbox 360 research.
- Decoder registry for RAGE resource types.
- Normalized mesh, texture, placement and collision shapes.
- Spatial cell database and hysteresis-based streaming scheduler.
- Renderer contracts that keep Three.js and WebGPU behind the same runtime boundary.
- WASM module loader contract for performance-sensitive decoders/translators.
- A small native/Emscripten ABI scaffold.
- Node tests for VFS, RPF probing and streaming behavior.
- Engine Lab web page that can probe a local `.rpf` header without uploading the file.

## Xbox 360 note

The target source is the Xbox 360 release, so compatibility code must not assume the PC edition's exact resource layout, shader binaries, texture swizzles, endianness, encryption, or platform metadata. The current RPF layer deliberately stops at safe header probing until fixtures from the user's own game data are available.

That is intentional: **encode every confirmed format fact into fixtures/tests before expanding the parser.**

## Cloudflare R2 role

R2 is an asset backend, not the runtime's filesystem API. Project V should access it through a Worker/service that supports authenticated metadata requests and byte ranges.

```text
R2 object
  ↓
archive manifest / index
  ↓
Range request for exact bytes
  ↓
decoder
  ↓
normalized runtime object
  ↓
cache + streaming manager
```

No Cloudflare secret or R2 API token belongs in browser JavaScript or this repository.

## Vertical milestones

1. RPF source opens and archive tree can be indexed.
2. One real GTA V texture is decoded and displayed.
3. One real GTA V drawable is decoded.
4. Drawable + texture render correctly together.
5. YMAP placements create a small real world sector.
6. Spatial streaming loads/unloads nearby sectors.
7. LOD selection works.
8. Collision becomes walkable.
9. Extracted player/ped assets replace all temporary character content.
10. Vehicles and handling data enter the runtime.
11. Animation, active-ragdoll/balance and gameplay systems build on the real skeleton/resources.
12. Profile and migrate hot rendering/decoder paths toward WebGPU/WASM.

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for acceptance criteria.

## Assets and legal boundary

Project V does **not** ship GTA V game data, encryption keys, or a downloadable game copy. Users provide files from a copy they are authorized to use. Private source archives should stay outside Git and can be mounted locally or stored in the user's own R2 bucket.

`game-src/`, `extracted/`, `private/`, raw RPF files and generated proprietary exports are ignored by Git.

The old Meshy Michael FBX/texture prototype assets are retired from the new runtime path. Real player assets will only enter the runtime through the user's extraction/index pipeline.

## Development

```bash
npm test
npm run check
python3 -m http.server 8000
```

Then open `http://localhost:8000/` and use Engine Lab to probe a local file.

For the native/WASM scaffold, see [`native/README.md`](native/README.md).

## Next input needed

When the Xbox 360 archive becomes available through local files or the R2 Worker, the next concrete task is to capture small non-redistributed fixtures/metadata from the archive header and directory structures, then implement the first real RPF index path behind tests.
