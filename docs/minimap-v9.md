# Project V v9 radar / minimap research

Project V v9 adds a clean-room browser implementation of the visual and functional ideas behind the GTA V radar/minimap. It does **not** ship Rockstar's `minimap.gfx`, `minimap.ytd`, extracted blip textures, or Rockstar map tiles.

## What the research shows

GTA V's HUD/minimap is implemented through the game's Scaleform HUD stack. Community reverse-engineering documents `minimap.gfx` and `minimap.ytd` as the key minimap UI/texture resources.

Reference:
- https://gist.github.com/ItsJunction/7af8035660c366d769811c2bf5214bd5

Cfx/FiveM documents the game blip naming and behavior, including `radar_north`, `radar_waypoint`, police, hospital, safehouse/character-style map blips and hundreds of later sprites.

Reference:
- https://docs.fivem.net/docs/game-references/blips/

The public HUD native documentation confirms several behaviors that Project V mirrors:

- Radar visibility is independently controlled.
- Radar zoom has a configurable scale.
- Blips can be shown on the minimap, pause map, or both.
- A blip can enable a GPS route.
- Multi-point GPS routes are supported.

References:
- https://github.com/citizenfx/natives/blob/master/HUD/DisplayRadar.md
- https://github.com/citizenfx/natives/blob/master/HUD/SetRadarZoom.md
- https://github.com/citizenfx/natives/blob/master/HUD/SetBlipDisplay.md
- https://github.com/citizenfx/natives/blob/master/HUD/SetBlipRoute.md
- https://github.com/citizenfx/natives/blob/master/HUD/StartGpsMultiRoute.md

## Project V implementation

The v9 radar uses:

1. A translucent charcoal map surface with deterministic grain.
2. High-contrast grey road vectors and dark block silhouettes.
3. Player-relative map rotation while the player chevron remains fixed.
4. A moving north indicator.
5. A purple GPS route generated from the player's current world position.
6. Tap-to-place waypoint input.
7. Double-tap zoom levels.
8. Hold-to-expand radar mode.
9. Functional health, armor and special-ability bars.
10. A clean-room vector icon registry for the map roles Project V currently needs.

The icon registry is intentionally original vector drawing code. Public GTA/FiveM blip names are used only as behavior/category research; Rockstar artwork is not copied into this repository.

## Runtime API

`window.ProjectVHUD` and `window.ProjectVMinimap` expose:

```js
ProjectVHUD.setHealth(75);
ProjectVHUD.setArmor(50);
ProjectVHUD.setSpecial(80);
ProjectVHUD.damage(25);
ProjectVHUD.heal(20);
ProjectVHUD.addArmor(25);

ProjectVHUD.setWaypoint(32, -16);
ProjectVHUD.clearWaypoint();
ProjectVHUD.cycleZoom();
ProjectVHUD.toggleExpanded();

ProjectVHUD.addBlip({
  id: 'airport-demo',
  type: 'airport',
  x: 48,
  z: 32,
  color: '#f4f4f2'
});
ProjectVHUD.removeBlip('airport-demo');
```

This gives later combat, police, mission, vehicle and world-streaming systems a direct way to update the HUD without rewriting the radar.
