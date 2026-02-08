import { useControls, folder } from 'leva';
import { DEFAULT_ATMOSPHERE_SCENE_CONFIG, AtmosphereSceneConfig } from './AtmosphereScene';
import { DEFAULT_ATMOSPHERE_CONFIG } from './AtmosphericSky';
import { DEFAULT_CLOUD_CONFIG } from './CloudLayer';

export function useAtmosphereSceneControls(): AtmosphereSceneConfig {
  const atmosphere = useControls('Atmosphere', {
    sunElevation: {
      value: DEFAULT_ATMOSPHERE_CONFIG.sunElevation,
      min: -0.2,
      max: Math.PI / 2,
      step: 0.01,
      label: 'Sun Elevation',
    },
    sunAzimuth: {
      value: DEFAULT_ATMOSPHERE_CONFIG.sunAzimuth,
      min: 0,
      max: Math.PI * 2,
      step: 0.01,
      label: 'Sun Azimuth',
    },
    sunIntensity: {
      value: DEFAULT_ATMOSPHERE_CONFIG.sunIntensity,
      min: 0,
      max: 50,
      step: 0.5,
      label: 'Sun Intensity',
    },
    rayleighCoeff: {
      value: DEFAULT_ATMOSPHERE_CONFIG.rayleighCoefficient,
      min: 0.1,
      max: 5,
      step: 0.1,
      label: 'Rayleigh',
    },
    mieCoeff: {
      value: DEFAULT_ATMOSPHERE_CONFIG.mieCoefficient,
      min: 0.001,
      max: 0.1,
      step: 0.001,
      label: 'Mie',
    },
  });
  
  const clouds = useControls('Clouds', {
    enabled: { value: true, label: 'Enable Clouds' },
    coverage: {
      value: DEFAULT_CLOUD_CONFIG.coverage,
      min: 0,
      max: 1,
      step: 0.05,
      label: 'Coverage',
    },
    density: {
      value: DEFAULT_CLOUD_CONFIG.density,
      min: 0.1,
      max: 2,
      step: 0.1,
      label: 'Density',
    },
    transitionDist: {
      value: DEFAULT_ATMOSPHERE_SCENE_CONFIG.cloudTransitionDistance,
      min: 1000,
      max: 10000,
      step: 500,
      label: 'Transition Distance',
    },
    fullDist: {
      value: DEFAULT_ATMOSPHERE_SCENE_CONFIG.cloudFullDistance,
      min: 100,
      max: 3000,
      step: 100,
      label: 'Full 3D Distance',
    },
  });
  
  const scene = useControls('Scene', {
    terrainEnabled: { value: true, label: 'Show Terrain' },
    flightEnabled: { value: true, label: 'Flight Controls' },
    flightSpeed: {
      value: DEFAULT_ATMOSPHERE_SCENE_CONFIG.flightSpeed,
      min: 10,
      max: 500,
      step: 10,
      label: 'Flight Speed',
    },
  });
  
  return {
    atmosphereConfig: {
      ...DEFAULT_ATMOSPHERE_CONFIG,
      sunElevation: atmosphere.sunElevation,
      sunAzimuth: atmosphere.sunAzimuth,
      sunIntensity: atmosphere.sunIntensity,
      rayleighCoefficient: atmosphere.rayleighCoeff,
      mieCoefficient: atmosphere.mieCoeff,
    },
    cloudsEnabled: clouds.enabled,
    cloudConfig: {
      ...DEFAULT_CLOUD_CONFIG,
      coverage: clouds.coverage,
      density: clouds.density,
    },
    cloudTransitionDistance: clouds.transitionDist,
    cloudFullDistance: clouds.fullDist,
    terrainEnabled: scene.terrainEnabled,
    flightEnabled: scene.flightEnabled,
    flightSpeed: scene.flightSpeed,
    skyboxRadius: DEFAULT_ATMOSPHERE_SCENE_CONFIG.skyboxRadius,
  };
}
