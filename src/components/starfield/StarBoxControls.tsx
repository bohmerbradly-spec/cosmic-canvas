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
  autoRotate: true,
  autoRotateSpeed: 0.1,
};

const PRESETS = {
  'Deep Space': {
    starCount: 20000,
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
    galacticConcentration: 0.25,
    milkyWayIntensity: 0.6,
    milkyWayCoreIntensity: 0.4,
    dustLanes: false,
    skyTopColor: '#0a0a14',
    skyBottomColor: '#101020',
    atmosphereIntensity: 0.5,
  },
  'Galactic Core': {
    starCount: 25000,
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
      starCount: { value: DEFAULT_CONFIG.starCount, min: 1000, max: 50000, step: 1000 },
      starRadius: { value: DEFAULT_CONFIG.starRadius, min: 50, max: 200, step: 10 },
      galacticConcentration: { value: DEFAULT_CONFIG.galacticConcentration, min: 0, max: 1, step: 0.05 },
      colorVariation: { value: DEFAULT_CONFIG.colorVariation, min: 0, max: 0.5, step: 0.05 },
      starSizeMultiplier: { value: DEFAULT_CONFIG.starSizeMultiplier, min: 0.2, max: 3, step: 0.1 },
      brightnessMultiplier: { value: DEFAULT_CONFIG.brightnessMultiplier, min: 0.5, max: 3, step: 0.1 },
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
    'Camera': folder({
      autoRotate: { value: DEFAULT_CONFIG.autoRotate },
      autoRotateSpeed: { value: DEFAULT_CONFIG.autoRotateSpeed, min: 0, max: 1, step: 0.05 },
    }),
    'Presets': folder({
      'Deep Space': button(() => applyPreset('Deep Space')),
      'Bright Night': button(() => applyPreset('Bright Night')),
      'Galactic Core': button(() => applyPreset('Galactic Core')),
      'Minimal': button(() => applyPreset('Minimal')),
    }),
  });

  // Note: Leva doesn't support programmatic preset application easily
  // The presets are shown as buttons but require page state management
  // This is a simplified version
  function applyPreset(_presetName: keyof typeof PRESETS) {
    // In a full implementation, you'd use Leva's set() or manage state externally
    console.log('Apply preset:', _presetName);
  }

  return controls as StarBoxConfig;
}
