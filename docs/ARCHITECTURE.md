# Project V Architecture

## Design rule

No renderer, physics system, UI, or gameplay code is allowed to know where an asset physically lives inside an RPF archive. Archive/container concerns end at the asset runtime boundary.

## Layers

### 1. Byte sources

`packages/vfs` exposes bounded random-access byte reads from local `File`/`Blob` objects, HTTP Range endpoints and nested subranges. This is the only layer that cares whether bytes came from an iPhone file picker, Cloudflare R2 or another archive.

### 2. VFS and archive mounts

The mount table resolves normalized paths. RPF archives will mount as providers once the Xbox 360 directory/index parser is verified by fixtures.

### 3. RAGE resource formats

`packages/rage-formats` owns decoders and normalized outputs. A YDR decoder should return normalized mesh/material data; it should not create Three.js meshes. A YMAP decoder should return placements; it should not add them to the scene.

### 4. World database and streaming

World metadata is converted into spatial cells. The streamer requests cells around the player, keeps a wider unload radius to prevent thrash, and releases GPU/physics resources when cells fall outside that radius.

### 5. Runtime systems

Gameplay, animation and physics operate on runtime entities. They depend on normalized data and stable IDs, not archive offsets.

### 6. Renderer backends

`renderer-three` is the Phase 1 backend. It lets us get correct assets/world sectors on screen quickly. `renderer-webgpu` is a separate backend target so performance work does not contaminate file decoders.

### 7. WASM/native codecs

WASM is for measured hot paths and platform-specific translation: decompression, Xbox 360 texture swizzles, shader bytecode translation, and binary transforms. Keep the ABI narrow.

## Generation model

The compatibility layer should support explicit generations/platforms instead of pretending all RAGE versions are identical:

- `ny-xbox360` — future GTA IV research target;
- `five-xbox360` — primary Project V target;
- `five-pc` — optional reference/testing target when format behavior overlaps.

Common infrastructure should be shared, while platform-specific decoders remain separate.

## Failure philosophy

Unknown data must fail loudly with offsets, expected values and source identity. Never silently guess a structure and continue rendering corrupted data.
