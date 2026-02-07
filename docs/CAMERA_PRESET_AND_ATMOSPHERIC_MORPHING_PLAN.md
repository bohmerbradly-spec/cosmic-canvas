# Camera Preset System & Atmospheric Morphing Integration Plan

**Purpose:** Design for the camera preset/screenshot system and integration of atmospheric color morphing from existing ION-LucidEngine and GPTVolumetricMastery globe views into the 6-LOD engine.

**Status:** Architecture and implementation plan  
**Last Updated:** 2026-02-05

---

## 1. Camera Preset System

### 1.1 What It Does

A complete camera preset system enabling:
- **Save** camera position, rotation, target, FOV with a name and notes
- **Store** full engine parameter snapshot (all 48+ Leva controls as JSON)
- **Screenshot** capture associated with each preset (canvas.toDataURL)
- **LOD tagging** (ground / low / mid / high / orbital / space) for systematic testing
- **Import/export** as JSON for sharing, version control, and AI analysis
- **Default presets** for key LOD transition points (9 defaults covering all bands)

### 1.2 Default Presets (Already Implemented in CameraPresetSystem.ts)

| Preset | Altitude | LOD | Purpose |
|--------|----------|-----|---------|
| Ground Level — Inside Fog | 50m | LOD 0 | Fog wisps, light shafts, near particles |
| Below Cloud Layer — Looking Up | 800m | LOD 1 | Flat bases, coverage patterns, silver lining |
| At Cloud Level — Inside Clouds | 2000m | LOD 1 | Fly-through density, visibility |
| Above Cloud Layer — Cloud Tops | 5000m | LOD 1-2 | Top-down, mid-layer, high cirrus |
| High Altitude — Aerial View | 15km | LOD 2 | 2D sheets, aerial perspective, blue haze |
| Suborbital — Earth Curvature | 100km | LOD 2-3 | Transition zone, atmosphere line |
| Orbital — Full Cloud Systems | 500km | LOD 3-4 | Weather systems, frontal bands |
| Sunset — Ground Level | 500m | LOD 1 | Atmospheric color morphing, warm clouds |
| Storm System — Approaching Front | 3km | LOD 1 | Dark bases, dramatic lighting |

### 1.3 UI Design

The preset panel integrates into the engine page as a collapsible sidebar:

```
┌─────────────────────────────┐
│ 📷 Camera Presets           │
├─────────────────────────────┤
│ [Save Current] [Screenshot] │
│                             │
│ Name: ________________      │
│ Notes: _______________      │
│ LOD: [auto-detect ▾]       │
│ Tags: ________________      │
│                             │
│ ─── Default Presets ─────── │
│ 🟢 Ground Level — Fog      │
│ 🔵 Below Clouds — Up       │
│ 🔵 Inside Clouds            │
│ 🟣 Above Clouds             │
│ 🟡 High Altitude            │
│ 🔴 Suborbital               │
│ 🔴 Orbital View             │
│ 🟠 Sunset Ground            │
│ ⛈ Storm Approaching         │
│                             │
│ ─── User Presets ────────── │
│ 📷 My Custom View 1        │
│ 📷 My Custom View 2        │
│                             │
│ [Export All] [Import]       │
└─────────────────────────────┘
```

Each preset shows:
- LOD color badge (green/blue/purple/amber/red)
- Thumbnail screenshot (if captured)
- Click to load (camera animates to position)
- Right-click for edit/delete

### 1.4 JSON Export Format

```json
{
  "version": 1,
  "metadata": {
    "projectName": "Effect Setup Hub — 6-LOD Volumetric Engine",
    "createdBy": "Camera Preset System",
    "description": "Camera positions, parameters, screenshots for volumetric testing",
    "lastExported": "2026-02-05T22:00:00Z"
  },
  "presets": [
    {
      "id": "user-1738792800000-abc123",
      "name": "Golden Hour Cumulus",
      "notes": "Beautiful warm light through scattered cumulus, backlit silver lining visible. Good reference for sunset color calibration.",
      "lod": "low-altitude",
      "position": [0, 800, 2000],
      "target": [-5000, 1500, 0],
      "fov": 70,
      "engineParams": {
        "Weather Simulation": { "simSpeed": 0.1 },
        "Sun & Lighting": { "sunElevation": 0.15, "sunAzimuth": 4.7, "sunIntensity": 2.8, "ambientIntensity": 0.4 },
        "Cloud Layers": { "l0Coverage": 0.55, "l0Density": 6.0 }
      },
      "screenshotDataUrl": "data:image/png;base64,iVBOR...",
      "createdAt": "2026-02-05T22:00:00Z",
      "updatedAt": "2026-02-05T22:00:00Z",
      "tags": ["user", "sunset", "golden-hour", "reference"]
    }
  ]
}
```

This format is designed for both human readability and AI consumption — an AI agent can read the presets, understand the scene parameters, and reproduce exact views.

---

## 2. Atmospheric Color Morphing

### 2.1 Audit of Existing Systems

**ION-LucidEngine Globe View (BEST EXISTING):**
- Physically-based Rayleigh/Mie scattering (Nishita model)
- Sun direction drives phase functions (cosTheta)
- Rayleigh coefficients: RGB (5.802e-6, 13.558e-6, 33.1e-6)
- Mie coefficient: 21e-6, g=0.758
- Scale heights: Rayleigh=8000m, Mie=1200m
- Sunset tinting on clouds: `smoothstep(0.0, 0.3, horizonAngle)` with `vec3(1.0, 0.6, 0.3)`
- Real astronomical sun position from `astronomy.ts`
- **Quality: 9/10** — production-ready, portable

**GPTVolumetricMastery AtmosphereShell:**
- Same Rayleigh/Mie physics (ported from ION)
- Simple and physical modes
- Camera-aware side switching (inside/outside atmosphere)
- Configurable sample counts (4-24)
- **Quality: 8/10** — good, React-integrated

**What's Missing in Both:**
- ❌ No altitude-dependent atmospheric density adjustment (should thin with altitude)
- ❌ No ozone absorption for deep blue twilight
- ❌ No explicit color morphing curves for sunset/sunrise transitions
- ❌ No precomputed atmospheric LUTs (Bruneton 2017 style)
- ❌ No earth shadow / belt of Venus
- ❌ No crepuscular rays from atmospheric scattering

### 2.2 Atmospheric Morphing Design

**Goal:** As the sun moves from noon → sunset → twilight → night, ALL atmospheric effects should smoothly morph:

```
Sun Elevation → Visual Effects:

  90° (Noon)
  │  Sky: Deep blue zenith, light blue horizon
  │  Clouds: Bright white tops, gray bases
  │  Atmosphere: Minimal haze, high visibility
  │
  30° (Afternoon)
  │  Sky: Blue, warmer horizon
  │  Clouds: Warm whites, longer shadows
  │  Atmosphere: Slight golden tint
  │
  10° (Golden Hour)
  │  Sky: Blue zenith, orange/amber horizon
  │  Clouds: Golden tops, warm orange bases
  │  Atmosphere: Strong golden haze, god rays
  │
  2° (Sunset)
  │  Sky: Purple zenith, deep orange horizon
  │  Clouds: Fire-lit, deep reds and oranges
  │  Atmosphere: Maximum scatter, deep colors
  │
  -2° (Civil Twilight)
  │  Sky: Deep blue/purple, orange band at horizon
  │  Clouds: Dark silhouettes with pink/orange edges
  │  Atmosphere: Belt of Venus visible (pink band opposite sun)
  │
  -6° (Nautical Twilight)
  │  Sky: Dark blue, faint glow at horizon
  │  Clouds: Dark with slight illumination
  │  Atmosphere: Stars beginning visible
  │
  -18° (Night)
     Sky: Black, stars, Milky Way
     Clouds: Dark, moonlit silver
     Atmosphere: None (transparent to stars)
```

### 2.3 Implementation Architecture

**Phase 1: Port ION-LucidEngine Atmosphere (Week 1)**

Port `atmosphereShader.ts` from ION-LucidEngine into the 6-LOD engine as the unified sky rendering system. Replace the simple sky gradient sphere with proper Rayleigh/Mie scattering.

```typescript
// src/engine/atmosphere/AtmosphereRenderer.tsx
// Port of ION-LucidEngine/src/globe/shaders/atmosphereShader.ts
// Modifications:
// - Works in flat-earth (LOD 0-2) AND globe (LOD 3-5) modes
// - Camera altitude affects density
// - Sun position drives all color morphing automatically
```

**Phase 2: Altitude-Dependent Density (Week 2)**

Add camera altitude to atmospheric scattering calculations:

```glsl
// In atmosphere fragment shader
uniform float uCameraAltitude;

// Density seen from camera position decreases with altitude
// (less atmosphere above you = less Rayleigh scattering)
float altitudeAdjust = exp(-uCameraAltitude / rayleighScaleHeight);

// Apply to Rayleigh coefficients for camera's view
vec3 adjustedRayleigh = rayleighCoefficients * altitudeAdjust;
```

**Phase 3: Enhanced Sunset Color Morphing (Week 3)**

Use sun elevation to drive smooth color transitions:

```glsl
uniform float uSunElevation;  // radians, from Leva or astronomy

// Sunset color band (enhanced)
float sunAngleDeg = uSunElevation * 57.2957795;

// Sunset gradient: warm colors when sun is near horizon
vec3 sunsetColor;
if (sunAngleDeg > 10.0) {
  sunsetColor = vec3(1.0);  // White (noon)
} else if (sunAngleDeg > 2.0) {
  float t = (sunAngleDeg - 2.0) / 8.0;
  sunsetColor = mix(vec3(1.0, 0.7, 0.4), vec3(1.0), t);  // Golden
} else if (sunAngleDeg > -2.0) {
  float t = (sunAngleDeg + 2.0) / 4.0;
  sunsetColor = mix(vec3(1.0, 0.3, 0.1), vec3(1.0, 0.7, 0.4), t);  // Orange → Red
} else {
  float t = clamp((sunAngleDeg + 6.0) / 4.0, 0.0, 1.0);
  sunsetColor = mix(vec3(0.1, 0.1, 0.3), vec3(1.0, 0.3, 0.1), t);  // Twilight
}

// Apply to cloud lighting
cloudColor *= sunsetColor;
```

**Phase 4: Cloud Lighting Response (Week 4)**

Clouds respond to sun position with physically-motivated color changes:

- **Sun above 30°:** Clouds are white/bright, bases gray
- **Sun 10-30°:** Clouds warm slightly, shadows lengthen
- **Sun 0-10°:** Clouds lit from below with orange/red, tops remain blue
- **Sun below 0°:** Only highest clouds lit (cirrus glow), lower clouds dark silhouettes
- **Silver lining intensity** increases dramatically at low sun angles (longer path through cloud)

### 2.4 Integration with Leva Controls

Add to existing control panel:

```typescript
useControls("Atmosphere", {
  atmosphereMode: { value: "physical", options: ["physical", "simple", "off"], label: "Mode" },
  rayleighStrength: { value: 1.0, min: 0, max: 3, step: 0.1, label: "Rayleigh Strength" },
  mieStrength: { value: 1.0, min: 0, max: 3, step: 0.1, label: "Mie Strength" },
  mieG: { value: 0.758, min: -1, max: 1, step: 0.01, label: "Mie Directional G" },
  ozoneDensity: { value: 0.3, min: 0, max: 2, step: 0.1, label: "Ozone Density" },
  sunsetIntensity: { value: 1.0, min: 0, max: 3, step: 0.1, label: "Sunset Intensity" },
  nightSkyBrightness: { value: 0.5, min: 0, max: 2, step: 0.1, label: "Night Sky" },
});

useControls("Time of Day", {
  useRealTime: { value: false, label: "Use Real Sun Position" },
  timeOfDay: { value: 12, min: 0, max: 24, step: 0.1, label: "Time (hours)" },
  dayOfYear: { value: 172, min: 1, max: 365, step: 1, label: "Day of Year" },
  latitude: { value: 45, min: -90, max: 90, step: 1, label: "Latitude" },
});
```

---

## 3. Cross-App Feature Comparison

### 3.1 What Other Apps Have That We Should Integrate

| Feature | ION-LucidEngine | GPTVolumetricMastery | StudioEarth | Our Engine (Planned) |
|---------|-----------------|----------------------|-------------|---------------------|
| Rayleigh/Mie scattering | ✅ Physical | ✅ Physical | ❓ | ✅ Port from ION |
| Sun drives sky color | ✅ Full | ✅ Full | ❓ | ✅ Full |
| Sunset color morphing | ⚠️ Basic (cloud tint) | ⚠️ Basic | ❓ | ✅ Enhanced (gradient LUT) |
| Camera altitude effects | ⚠️ Implicit | ⚠️ Implicit | ❓ | ✅ Explicit altitude adjustment |
| Real astronomical sun | ✅ astronomy.ts | ❌ | ❓ | ✅ Port astronomy.ts |
| Day/night terminator | ✅ (globe shader) | ❌ | ❓ | ✅ Phase 2 |
| Stars/Milky Way | ❌ | ❌ | ❓ | ✅ Phase 3 (drei Stars + custom) |
| God rays | ❌ (in atmosphere) | ❌ (separate post) | ❓ | ✅ Phase 4 (in cloud volume) |
| Moon/moonlight | ❌ | ❌ | ❓ | 🔜 Phase 5 |
| Aurora | ❌ | ❌ | ❓ | 🔜 Phase 6 (from optics analysis) |
| Screenshot system | ❌ | ❌ | ❌ | ✅ Built (CameraPresetSystem) |
| Camera presets | ❌ | ❌ | ❌ | ✅ Built (9 defaults + custom) |
| Full param JSON export | ❌ | ❌ | ❌ | ✅ Built |

### 3.2 Priority Integration Order

1. **Now:** Camera preset system (built)
2. **Next:** Port ION atmosphere shader → replace sky sphere
3. **Then:** Sunset color morphing enhancement
4. **Then:** Altitude-dependent density
5. **Then:** Port astronomy.ts for real sun position
6. **Later:** God rays, stars, moon, aurora

---

## 4. Documentation Needs

### 4.1 New Documents to Create

| Document | Purpose | Priority |
|----------|---------|----------|
| `ATMOSPHERIC_MORPHING_SPEC.md` | Detailed shader specs for Rayleigh/Mie port, sunset gradients, altitude effects | High (before implementation) |
| `CAMERA_PRESET_USER_GUIDE.md` | How to use camera presets, create custom, export/import | Medium (after UI built) |
| `CROSS_APP_ATMOSPHERE_AUDIT.md` | Detailed comparison of all atmospheric implementations across GPTworking apps | Medium (reference) |
| `TIME_OF_DAY_INTEGRATION.md` | How time-of-day drives sun position, sky color, cloud lighting, stars, moon | Medium (before Phase 3) |

### 4.2 Existing Docs to Update

| Document | Update Needed |
|----------|---------------|
| `BUILD_READINESS_ASSESSMENT.md` | Add camera preset system and atmospheric morphing to Phase list |
| `SIX_LOD_ATMOSPHERIC_RENDERING_SYSTEM.md` | Add atmospheric color morphing section, altitude-dependent density |
| `PROJECT_ORCHESTRATION_EXPANDED.md` | Add atmospheric morphing and camera preset phases |
| `FULL_BUILD_AUDIT.md` | Add atmospheric morphing to engine comparison matrix |

---

## 5. Implementation Roadmap

### Week 1: Camera Preset UI + Port Atmosphere Shader
- [ ] Build CameraPresetPanel React component (sidebar)
- [ ] Wire screenshot capture to R3F canvas
- [ ] Implement save/load/export/import in UI
- [ ] Port ION-LucidEngine `atmosphereShader.ts` into engine
- [ ] Replace SkySphere with proper AtmosphereRenderer

### Week 2: Sunset Morphing + Altitude Effects
- [ ] Implement enhanced sunset color gradient (noon→sunset→twilight→night)
- [ ] Add altitude-dependent density to atmosphere
- [ ] Add sun elevation to Leva controls (or port time-of-day slider)
- [ ] Test all 9 default presets with atmosphere changes

### Week 3: Astronomy + Advanced Effects
- [ ] Port `astronomy.ts` for real date/time-based sun position
- [ ] Add time-of-day slider (0-24h)
- [ ] Add stars (drei Stars + custom Milky Way)
- [ ] Add Belt of Venus (pink band opposite sun at sunset)

### Week 4: Polish + Documentation
- [ ] Test screenshot quality across all LODs
- [ ] Build preset gallery view (thumbnails)
- [ ] Export/import testing
- [ ] Write user guide
- [ ] Update all related docs

---

## Revision History

| Date | Change |
|------|--------|
| 2026-02-05 | Initial plan: camera preset system design, atmospheric morphing audit (ION-LucidEngine, GPTVolumetricMastery), integration architecture, cross-app comparison, implementation roadmap. |

---

*For the 6-LOD rendering system, see SIX_LOD_ATMOSPHERIC_RENDERING_SYSTEM.md*  
*For weather integration, see DEEP_WEATHER_TERRAIN_OPTICS_INTEGRATION.md*  
*For camera preset code, see src/engine/CameraPresetSystem.ts*
