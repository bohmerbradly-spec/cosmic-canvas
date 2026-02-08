import { useControls } from 'leva';
import { DEFAULT_ATMOSPHERE_SCENE_CONFIG, AtmosphereSceneConfig } from './AtmosphereScene';
import { DEFAULT_ATMOSPHERE_CONFIG } from './AtmosphericSky';
import { DEFAULT_VOLUMETRIC_CLOUD_CONFIG } from './VolumetricClouds';

export function useAtmosphereSceneControls(): AtmosphereSceneConfig {
  const atmosphere = useControls('Sun & Atmosphere', {
    sunElevation: {
      value: 0.15, // Low for good golden hour lighting
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
    turbidity: {
      value: DEFAULT_ATMOSPHERE_CONFIG.turbidity,
      min: 0.5,
      max: 10,
      step: 0.1,
      label: 'Turbidity',
    },
  });
  
  const clouds = useControls('Volumetric Clouds', {
    enabled: { value: true, label: 'Enable Clouds' },
    coverage: {
      value: DEFAULT_VOLUMETRIC_CLOUD_CONFIG.coverage,
      min: 0,
      max: 1,
      step: 0.05,
      label: 'Coverage',
    },
    density: {
      value: DEFAULT_VOLUMETRIC_CLOUD_CONFIG.density,
      min: 0.1,
      max: 2,
      step: 0.1,
      label: 'Density',
    },
    altitude: {
      value: DEFAULT_VOLUMETRIC_CLOUD_CONFIG.cloudAltitude,
      min: 500,
      max: 5000,
      step: 100,
      label: 'Altitude',
    },
    thickness: {
      value: DEFAULT_VOLUMETRIC_CLOUD_CONFIG.cloudThickness,
      min: 200,
      max: 2000,
      step: 100,
      label: 'Thickness',
    },
    raySteps: {
      value: DEFAULT_VOLUMETRIC_CLOUD_CONFIG.raySteps,
      min: 16,
      max: 64,
      step: 4,
      label: 'Quality (steps)',
    },
  });
  
  const effects = useControls('Effects', {
    godRaysEnabled: { value: true, label: 'God Rays' },
    godRaysIntensity: {
      value: 1.0,
      min: 0,
      max: 3,
      step: 0.1,
      label: 'God Rays Intensity',
    },
    cloudShadows: {
      value: 0.5,
      min: 0,
      max: 1,
      step: 0.1,
      label: 'Cloud Shadow Density',
    },
  });
  
  const scene = useControls('Scene', {
    terrainEnabled: { value: true, label: 'Show Terrain' },
    flightEnabled: { value: true, label: 'Flight Controls' },
    flightSpeed: {
      value: 100,
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
      turbidity: atmosphere.turbidity,
    },
    cloudsEnabled: clouds.enabled,
    cloudConfig: {
      ...DEFAULT_VOLUMETRIC_CLOUD_CONFIG,
      coverage: clouds.coverage,
      density: clouds.density,
      cloudAltitude: clouds.altitude,
      cloudThickness: clouds.thickness,
      raySteps: clouds.raySteps,
    },
    godRaysEnabled: effects.godRaysEnabled,
    godRaysIntensity: effects.godRaysIntensity,
    cloudShadowDensity: effects.cloudShadows,
    terrainEnabled: scene.terrainEnabled,
    flightEnabled: scene.flightEnabled,
    flightSpeed: scene.flightSpeed,
    skyboxRadius: DEFAULT_ATMOSPHERE_SCENE_CONFIG.skyboxRadius,
  };
}
