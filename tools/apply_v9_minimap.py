from pathlib import Path

path = Path("src/v7.js")
s = path.read_text()

if "createProjectVMinimap" not in s:
    anchor = "import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';"
    assert anchor in s, "GLTFLoader import anchor missing"
    s = s.replace(anchor, anchor + "\nimport { createProjectVMinimap } from './minimap.js';", 1)

s = s.replace("const VERSION = 8;", "const VERSION = 9;", 1)
s = s.replace("// PROJECT_V_ENVIRONMENT_V8", "// PROJECT_V_ENVIRONMENT_V8\n// PROJECT_V_MINIMAP_V9", 1)

if "const minimap = createProjectVMinimap" not in s:
    anchor = "atmosphere = buildAtmosphere();"
    assert anchor in s, "atmosphere init anchor missing"
    s = s.replace(anchor, anchor + "\nconst minimap = createProjectVMinimap({ root, worldExtent: 60, toast });", 1)

old_frame = "updateEnvironment(dt,now);updateCharacter(dt);updateCamera(dt);renderer.render(scene,camera);"
new_frame = "updateEnvironment(dt,now);updateCharacter(dt);updateCamera(dt);minimap.update(dt,now,{gameState,speed,runHeld,aim,ready});renderer.render(scene,camera);"
if new_frame not in s:
    assert old_frame in s, "frame update anchor missing"
    s = s.replace(old_frame, new_frame, 1)

s = s.replace("Project V v7 boot failed:", "Project V v9 boot failed:", 1)

path.write_text(s)
print("Project V v9 minimap bridge applied.")
