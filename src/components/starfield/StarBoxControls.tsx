import { useControls, folder, button } from 'leva';
import { StarBoxConfig } from './StarBoxScene';

export const DEFAULT_CONFIG: StarBoxConfig = {
  // Star field
  starCount: 15000,
  starRadius: 100,
  galacticConcentration: 0.35,
  colorVariation: 0.15,
  twinkleIntensity: 0.25,
  twinkleSpeed: 1.0,
  starSizeMultiplier: 1.0,
  brightnessMultiplier: 1.2,
  
  // Milky Way
  milkyWayIntensity: 1.0,
  milkyWayBandWidth: 0.15,
  milkyWayCoreIntensity: 0.8,
  dustLanes: true,
  
  // Sky
  skyTopColor: '#020408',
  skyBottomColor: '#050810',
  atmosphereIntensity: 0.3,
  
  // Camera
  autoRotate: false,
  autoRotateSpeed: 0.1,
  
  // Near stars (real 3D stars)
  nearStarScale: 0.5,
  nearStarGlow: 1.5,
  transitionDistance: 15, // Start transition at 15 ly
  fullDistance: 5,        // Full 3D at 5 ly
  showNearStars: true,
  
  // Flight controls
  flightEnabled: true,
  flightSpeed: 2,
  
  // Hyperdrive
  hyperdriveStretch: 10,
  
  // Debug
  debugColors: true, // Show cyan->magenta transition for testing
};

const PRESETS = {
  'Deep Space': {
    starCount: 25000,
    starRadius: 150,
    galacticConcentration: 0.3,
    milkyWayIntensity: 1.2,
    milkyWayCoreIntensity: 1.0,
    dustLanes: true,
    skyTopColor: '#010204',
    skyBottomColor: '#020408',
    atmosphereIntensity: 0.1,
  },
  'Bright Night': {
    starCount: 12000,
    starRadius: 80,
    galacticConcentration: 0.25,
    milkyWayIntensity: 0.6,
    milkyWayCoreIntensity: 0.4,
    dustLanes: false,
    skyTopColor: '#0a0a14',
    skyBottomColor: '#101020',
    atmosphereIntensity: 0.5,
  },
  'Galactic Core': {
    starCount: 35000,
    starRadius: 200,
    galacticConcentration: 0.6,
    milkyWayIntensity: 1.5,
    milkyWayCoreIntensity: 1.5,
    dustLanes: true,
    skyTopColor: '#030206',
    skyBottomColor: '#080610',
    atmosphereIntensity: 0.2,
  },
  'Minimal': {
    starCount: 5000,
    starRadius: 60,
    galacticConcentration: 0.15,
    milkyWayIntensity: 0.3,
    milkyWayCoreIntensity: 0.2,
    dustLanes: false,
    skyTopColor: '#000000',
    skyBottomColor: '#010102',
    atmosphereIntensity: 0.0,
  },
};

export function useStarBoxControls() {
  const controls = useControls({
    'Star Field': folder({
      starCount: { value: DEFAULT_CONFIG.starCount, min: 1000, max: 100000, step: 1000 },
      starRadius: { value: DEFAULT_CONFIG.starRadius, min: 50, max: 500, step: 10 },
      galacticConcentration: { value: DEFAULT_CONFIG.galacticConcentration, min: 0, max: 1, step: 0.05 },
      colorVariation: { value: DEFAULT_CONFIG.colorVariation, min: 0, max: 0.5, step: 0.05 },
      starSizeMultiplier: { value: DEFAULT_CONFIG.starSizeMultiplier, min: 0.2, max: 5, step: 0.1 },
      brightnessMultiplier: { value: DEFAULT_CONFIG.brightnessMultiplier, min: 0.5, max: 5, step: 0.1 },
    }),
    'Scintillation': folder({
      twinkleIntensity: { value: DEFAULT_CONFIG.twinkleIntensity, min: 0, max: 1, step: 0.05 },
      twinkleSpeed: { value: DEFAULT_CONFIG.twinkleSpeed, min: 0, max: 3, step: 0.1 },
    }),
    'Milky Way': folder({
      milkyWayIntensity: { value: DEFAULT_CONFIG.milkyWayIntensity, min: 0, max: 2, step: 0.1 },
      milkyWayBandWidth: { value: DEFAULT_CONFIG.milkyWayBandWidth, min: 0.05, max: 0.5, step: 0.01 },
      milkyWayCoreIntensity: { value: DEFAULT_CONFIG.milkyWayCoreIntensity, min: 0, max: 2, step: 0.1 },
      dustLanes: { value: DEFAULT_CONFIG.dustLanes },
    }),
    'Sky': folder({
      skyTopColor: { value: DEFAULT_CONFIG.skyTopColor },
      skyBottomColor: { value: DEFAULT_CONFIG.skyBottomColor },
      atmosphereIntensity: { value: DEFAULT_CONFIG.atmosphereIntensity, min: 0, max: 1, step: 0.1 },
    }),
    'Near Stars (3D)': folder({
      showNearStars: { value: DEFAULT_CONFIG.showNearStars, label: 'Show Near Stars' },
      nearStarScale: { value: DEFAULT_CONFIG.nearStarScale, min: 0.1, max: 2, step: 0.1, label: 'Star Scale' },
      nearStarGlow: { value: DEFAULT_CONFIG.nearStarGlow, min: 0, max: 3, step: 0.1, label: 'Glow Intensity' },
      transitionDistance: { value: DEFAULT_CONFIG.transitionDistance, min: 5, max: 50, step: 1, label: 'Transition Start (ly)' },
      fullDistance: { value: DEFAULT_CONFIG.fullDistance, min: 1, max: 20, step: 1, label: 'Full 3D Distance (ly)' },
    }),
    'Flight Controls': folder({
      flightEnabled: { value: DEFAULT_CONFIG.flightEnabled, label: 'Enable Flight' },
      flightSpeed: { value: DEFAULT_CONFIG.flightSpeed, min: 0.1, max: 20, step: 0.1, label: 'Flight Speed' },
      hyperdriveStretch: { value: DEFAULT_CONFIG.hyperdriveStretch, min: 1, max: 50, step: 1, label: 'Hyperdrive Stretch' },
      autoRotate: { value: DEFAULT_CONFIG.autoRotate, label: 'Auto Rotate (when flight off)' },
      autoRotateSpeed: { value: DEFAULT_CONFIG.autoRotateSpeed, min: 0, max: 1, step: 0.05, label: 'Rotate Speed' },
    }),
    'Debug': folder({
      debugColors: { value: DEFAULT_CONFIG.debugColors, label: 'Debug Colors (Cyan=2D, Magenta=3D)' },
    }),
    'Presets': folder({
      'Deep Space': button(() => applyPreset('Deep Space')),
      'Bright Night': button(() => applyPreset('Bright Night')),
      'Galactic Core': button(() => applyPreset('Galactic Core')),
      'Minimal': button(() => applyPreset('Minimal')),
    }),
  });

  // Note: Leva doesn't support programmatic preset application easily
  function applyPreset(_presetName: keyof typeof PRESETS) {
    console.log('Apply preset:', _presetName);
  }

  return controls as StarBoxConfig;
}
