# Native / WebAssembly layer

This directory is for small, measurable hot paths: resource decompression, texture/shader translation, swizzle/unswizzle work, and binary decoders that materially benefit from WASM.

Do not move general game state into WASM by default. Keep a narrow ABI so decoders can be fuzzed/tested independently.

Example build with Emscripten:

```bash
emcmake cmake -S native -B build/wasm -DCMAKE_BUILD_TYPE=Release
cmake --build build/wasm
```

The current module only exposes an API version and RPF magic probe. It is intentionally tiny until real profiling/fixtures justify more native code.
