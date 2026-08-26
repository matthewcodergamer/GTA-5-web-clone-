# Asset inspector

Development target for the Project V asset pipeline. This tool will consume normalized decoder output rather than reading game archives directly.

The archive/VFS layer stays in `packages/vfs` + `packages/rpf`; format-specific parsing stays in `packages/rage-formats` or WASM codecs.
