# Michael texture set

User-supplied texture atlases used by the Project V character material mapper.

Runtime order: shoes, hair, hands, face/body, pants, mouth/teeth, jacket/shirt.

The runtime first uses existing FBX material groups when available. If the FBX is merged to one material, it falls back to conservative body-region grouping so the character is no longer rendered as an untextured gray mesh.
