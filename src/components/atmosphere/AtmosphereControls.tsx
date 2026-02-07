import { useControls, folder } from 'leva';
import { AtmosphericSkyConfig, DEFAULT_ATMOSPHERE_CONFIG } from './AtmosphericSky';

export function useAtmosphereControls(): AtmosphericSkyConfig {
  const controls = useControls({
    'Sun Position': folder({
      sunElevation: { 
        value: DEFAULT_ATMOSPHERE_CONFIG.sunElevation, 
        min: -0.5, 
        max: Math.PI / 2, 
        step: 0.01,
        label: 'Elevation (rad)'
      },
      sunAzimuth: { 
        value: DEFAULT_ATMOSPHERE_CONFIG.sunAzimuth, 
        min: 0, 
        max: Math.PI * 2, 
        step: 0.01,
        label: 'Azimuth (rad)'
      },
      sunIntensity: { 
        value: DEFAULT_ATMOSPHERE_CONFIG.sunIntensity, 
        min: 0, 
        max: 5, 
        step: 0.1,
        label: 'Intensity'
      },
    }),
    'Atmosphere': folder({
      rayleighCoefficient: { 
        value: DEFAULT_ATMOSPHERE_CONFIG.rayleighCoefficient, 
        min: 0, 
        max: 5, 
        step: 0.1,
        label: 'Rayleigh'
      },
      mieCoefficient: { 
        value: DEFAULT_ATMOSPHERE_CONFIG.mieCoefficient, 
        min: 0, 
        max: 0.1, 
        step: 0.001,
        label: 'Mie'
      },
      mieDirectionalG: { 
        value: DEFAULT_ATMOSPHERE_CONFIG.mieDirectionalG, 
        min: 0, 
        max: 0.999, 
        step: 0.01,
        label: 'Mie G (directionality)'
      },
      turbidity: { 
        value: DEFAULT_ATMOSPHERE_CONFIG.turbidity, 
        min: 0, 
        max: 10, 
        step: 0.1,
        label: 'Turbidity (haze)'
      },
      groundColor: { 
        value: DEFAULT_ATMOSPHERE_CONFIG.groundColor,
        label: 'Ground Color'
      },
    }),
    'Time': folder({
      autoTime: { 
        value: DEFAULT_ATMOSPHERE_CONFIG.autoTime,
        label: 'Auto Animate'
      },
      timeOfDay: { 
        value: DEFAULT_ATMOSPHERE_CONFIG.timeOfDay, 
        min: 0, 
        max: 24, 
        step: 0.5,
        label: 'Time (hours)'
      },
      timeSpeed: { 
        value: DEFAULT_ATMOSPHERE_CONFIG.timeSpeed, 
        min: 0, 
        max: 2, 
        step: 0.01,
        label: 'Animation Speed'
      },
    }),
  });

  return controls as AtmosphericSkyConfig;
}
