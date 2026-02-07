import { useControls, folder, button } from 'leva';
import { StarBoxConfig } from './StarBoxScene';
import { DEFAULT_ATMOSPHERE_CONFIG, DEFAULT_CLOUD_CONFIG } from '@/components/atmosphere';

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
  nearStarScale: 1.0,
  nearStarGlow: 2.0,
  transitionDistance: 8,
  fullDistance: 2,
  showNearStars: true,
  
  // Flight controls
  flightEnabled: true,
  flightSpeed: 2,
  
  // Hyperdrive
  hyperdriveStretch: 10,
  
  // Debug
  debugColors: true,
  
  // Atmosphere
  atmosphereEnabled: false,
  atmosphereConfig: DEFAULT_ATMOSPHERE_CONFIG,
  
  // Clouds
  cloudsEnabled: true,
  cloudConfig: DEFAULT_CLOUD_CONFIG,
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
    'Atmospheric Sky': folder({
      atmosphereEnabled: { value: DEFAULT_CONFIG.atmosphereEnabled, label: 'Enable Atmosphere' },
      sunElevation: { value: DEFAULT_CONFIG.atmosphereConfig.sunElevation, min: -0.5, max: Math.PI / 2, step: 0.01, label: 'Sun Elevation' },
      sunAzimuth: { value: DEFAULT_CONFIG.atmosphereConfig.sunAzimuth, min: 0, max: Math.PI * 2, step: 0.01, label: 'Sun Azimuth' },
      sunIntensity: { value: DEFAULT_CONFIG.atmosphereConfig.sunIntensity, min: 0, max: 5, step: 0.1, label: 'Sun Intensity' },
      rayleighCoefficient: { value: DEFAULT_CONFIG.atmosphereConfig.rayleighCoefficient, min: 0, max: 5, step: 0.1, label: 'Rayleigh' },
      mieCoefficient: { value: DEFAULT_CONFIG.atmosphereConfig.mieCoefficient, min: 0, max: 0.1, step: 0.001, label: 'Mie' },
      turbidity: { value: DEFAULT_CONFIG.atmosphereConfig.turbidity, min: 0, max: 10, step: 0.1, label: 'Turbidity' },
      autoTime: { value: DEFAULT_CONFIG.atmosphereConfig.autoTime, label: 'Auto Time Animation' },
      timeSpeed: { value: DEFAULT_CONFIG.atmosphereConfig.timeSpeed, min: 0, max: 2, step: 0.01, label: 'Time Speed' },
    }),
    'Volumetric Clouds': folder({
      cloudsEnabled: { value: DEFAULT_CONFIG.cloudsEnabled, label: 'Enable Clouds' },
      cloudCoverage: { value: DEFAULT_CONFIG.cloudConfig.coverage, min: 0, max: 1, step: 0.05, label: 'Coverage' },
      cloudDensity: { value: DEFAULT_CONFIG.cloudConfig.density, min: 0, max: 3, step: 0.1, label: 'Density' },
      cloudWindSpeed: { value: DEFAULT_CONFIG.cloudConfig.windSpeed, min: 0, max: 0.2, step: 0.01, label: 'Wind Speed' },
      cloudEvolution: { value: DEFAULT_CONFIG.cloudConfig.evolutionSpeed, min: 0, max: 1, step: 0.05, label: 'Evolution Speed' },
      cloudSilverLining: { value: DEFAULT_CONFIG.cloudConfig.silverLining, min: 0, max: 2, step: 0.1, label: 'Silver Lining' },
      cloudAmbient: { value: DEFAULT_CONFIG.cloudConfig.ambientLight, min: 0, max: 1, step: 0.05, label: 'Ambient Light' },
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

  // Build the atmosphere config from individual controls
  const atmosphereConfig = {
    sunElevation: (controls as any).sunElevation ?? DEFAULT_CONFIG.atmosphereConfig.sunElevation,
    sunAzimuth: (controls as any).sunAzimuth ?? DEFAULT_CONFIG.atmosphereConfig.sunAzimuth,
    sunIntensity: (controls as any).sunIntensity ?? DEFAULT_CONFIG.atmosphereConfig.sunIntensity,
    rayleighCoefficient: (controls as any).rayleighCoefficient ?? DEFAULT_CONFIG.atmosphereConfig.rayleighCoefficient,
    mieCoefficient: (controls as any).mieCoefficient ?? DEFAULT_CONFIG.atmosphereConfig.mieCoefficient,
    mieDirectionalG: DEFAULT_CONFIG.atmosphereConfig.mieDirectionalG,
    turbidity: (controls as any).turbidity ?? DEFAULT_CONFIG.atmosphereConfig.turbidity,
    groundColor: DEFAULT_CONFIG.atmosphereConfig.groundColor,
    timeOfDay: DEFAULT_CONFIG.atmosphereConfig.timeOfDay,
    autoTime: (controls as any).autoTime ?? DEFAULT_CONFIG.atmosphereConfig.autoTime,
    timeSpeed: (controls as any).timeSpeed ?? DEFAULT_CONFIG.atmosphereConfig.timeSpeed,
  };

  // Build cloud config from individual controls
  const cloudConfig = {
    coverage: (controls as any).cloudCoverage ?? DEFAULT_CONFIG.cloudConfig.coverage,
    density: (controls as any).cloudDensity ?? DEFAULT_CONFIG.cloudConfig.density,
    altitude: DEFAULT_CONFIG.cloudConfig.altitude,
    thickness: DEFAULT_CONFIG.cloudConfig.thickness,
    baseColor: DEFAULT_CONFIG.cloudConfig.baseColor,
    topColor: DEFAULT_CONFIG.cloudConfig.topColor,
    shadowColor: DEFAULT_CONFIG.cloudConfig.shadowColor,
    windSpeed: (controls as any).cloudWindSpeed ?? DEFAULT_CONFIG.cloudConfig.windSpeed,
    windDirection: DEFAULT_CONFIG.cloudConfig.windDirection,
    evolutionSpeed: (controls as any).cloudEvolution ?? DEFAULT_CONFIG.cloudConfig.evolutionSpeed,
    sunInfluence: DEFAULT_CONFIG.cloudConfig.sunInfluence,
    ambientLight: (controls as any).cloudAmbient ?? DEFAULT_CONFIG.cloudConfig.ambientLight,
    silverLining: (controls as any).cloudSilverLining ?? DEFAULT_CONFIG.cloudConfig.silverLining,
    steps: DEFAULT_CONFIG.cloudConfig.steps,
    noiseScale: DEFAULT_CONFIG.cloudConfig.noiseScale,
    detailScale: DEFAULT_CONFIG.cloudConfig.detailScale,
  };

  return {
    ...controls,
    atmosphereConfig,
    cloudConfig,
  } as StarBoxConfig;
}
