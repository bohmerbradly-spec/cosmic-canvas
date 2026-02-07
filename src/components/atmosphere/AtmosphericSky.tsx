import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface AtmosphericSkyConfig {
  // Sun position
  sunElevation: number;      // radians, 0 = horizon, PI/2 = zenith
  sunAzimuth: number;        // radians, 0 = north
  sunIntensity: number;      // multiplier
  
  // Atmosphere
  rayleighCoefficient: number;
  mieCoefficient: number;
  mieDirectionalG: number;   // Henyey-Greenstein g parameter
  turbidity: number;         // aerosol/haze amount
  
  // Colors
  groundColor: string;
  
  // Time
  timeOfDay: number;         // 0-24 hours (optional auto mode)
  autoTime: boolean;
  timeSpeed: number;
}

export const DEFAULT_ATMOSPHERE_CONFIG: AtmosphericSkyConfig = {
  sunElevation: 0.4,
  sunAzimuth: 0,
  sunIntensity: 1.5,
  rayleighCoefficient: 2.0,
  mieCoefficient: 0.005,
  mieDirectionalG: 0.8,
  turbidity: 2.0,
  groundColor: '#1a1a2e',
  timeOfDay: 10,
  autoTime: false,
  timeSpeed: 0.1,
};

// Physically-based Rayleigh/Mie scattering sky shader
const atmosphereVertexShader = `
  varying vec3 vWorldPosition;
  varying vec3 vSunDirection;
  
  uniform vec3 uSunDirection;
  
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vSunDirection = uSunDirection;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const atmosphereFragmentShader = `
  precision highp float;
  
  uniform vec3 uSunDirection;
  uniform float uSunIntensity;
  uniform float uRayleighCoefficient;
  uniform float uMieCoefficient;
  uniform float uMieDirectionalG;
  uniform float uTurbidity;
  uniform vec3 uGroundColor;
  uniform float uSunElevation;
  
  varying vec3 vWorldPosition;
  
  // Physical constants
  const float PI = 3.141592653589793;
  const float TWO_PI = 6.283185307179586;
  
  // Rayleigh scattering coefficients at sea level (per km)
  // These produce the blue sky color
  const vec3 RAYLEIGH_BETA = vec3(5.8e-6, 13.5e-6, 33.1e-6);
  
  // Mie scattering coefficient (aerosols)
  const float MIE_BETA = 21e-6;
  
  // Scale heights (km)
  const float RAYLEIGH_SCALE_HEIGHT = 8.0;
  const float MIE_SCALE_HEIGHT = 1.2;
  
  // Earth parameters
  const float EARTH_RADIUS = 6371.0; // km
  const float ATMOSPHERE_HEIGHT = 100.0; // km
  
  // Rayleigh phase function
  float rayleighPhase(float cosTheta) {
    return (3.0 / (16.0 * PI)) * (1.0 + cosTheta * cosTheta);
  }
  
  // Henyey-Greenstein phase function for Mie scattering
  float hgPhase(float cosTheta, float g) {
    float g2 = g * g;
    float denom = 1.0 + g2 - 2.0 * g * cosTheta;
    return (1.0 - g2) / (4.0 * PI * pow(denom, 1.5));
  }
  
  // Compute sun disk
  float sunDisk(vec3 rayDir, vec3 sunDir) {
    float cosAngle = dot(rayDir, sunDir);
    float sunAngularRadius = 0.00935; // ~0.53 degrees
    float sunEdge = smoothstep(cos(sunAngularRadius * 1.5), cos(sunAngularRadius * 0.5), cosAngle);
    return sunEdge * 100.0;
  }
  
  // Sunset color morphing based on sun elevation
  vec3 getSunsetTint(float sunElevation) {
    float elevDeg = sunElevation * 57.2957795;
    
    if (elevDeg > 15.0) {
      // Daytime - white sun
      return vec3(1.0, 1.0, 1.0);
    } else if (elevDeg > 5.0) {
      // Afternoon - warm
      float t = (elevDeg - 5.0) / 10.0;
      return mix(vec3(1.0, 0.9, 0.7), vec3(1.0, 1.0, 1.0), t);
    } else if (elevDeg > 0.0) {
      // Golden hour
      float t = elevDeg / 5.0;
      return mix(vec3(1.0, 0.6, 0.3), vec3(1.0, 0.9, 0.7), t);
    } else if (elevDeg > -6.0) {
      // Sunset/twilight
      float t = (elevDeg + 6.0) / 6.0;
      return mix(vec3(0.8, 0.3, 0.2), vec3(1.0, 0.6, 0.3), t);
    } else {
      // Night
      float t = clamp((elevDeg + 18.0) / 12.0, 0.0, 1.0);
      return mix(vec3(0.1, 0.1, 0.2), vec3(0.8, 0.3, 0.2), t);
    }
  }
  
  // Get sky color at elevation angle
  vec3 getZenithColor(float sunElevation) {
    float elevDeg = sunElevation * 57.2957795;
    
    if (elevDeg > 10.0) {
      // Day - deep blue zenith
      return vec3(0.1, 0.3, 0.8);
    } else if (elevDeg > 0.0) {
      // Golden hour - blue with purple tint
      float t = elevDeg / 10.0;
      return mix(vec3(0.2, 0.2, 0.6), vec3(0.1, 0.3, 0.8), t);
    } else if (elevDeg > -6.0) {
      // Twilight - purple/dark blue
      float t = (elevDeg + 6.0) / 6.0;
      return mix(vec3(0.05, 0.05, 0.15), vec3(0.2, 0.2, 0.6), t);
    } else {
      // Night
      float t = clamp((elevDeg + 18.0) / 12.0, 0.0, 1.0);
      return mix(vec3(0.01, 0.01, 0.03), vec3(0.05, 0.05, 0.15), t);
    }
  }
  
  void main() {
    vec3 rayDir = normalize(vWorldPosition);
    
    // Compute scattering angle
    float cosTheta = dot(rayDir, uSunDirection);
    
    // Height-based density
    float height = max(rayDir.y, 0.0);
    float rayleighDensity = exp(-height * 10.0 / RAYLEIGH_SCALE_HEIGHT);
    float mieDensity = exp(-height * 2.0 / MIE_SCALE_HEIGHT) * uTurbidity;
    
    // Rayleigh scattering (blue sky)
    vec3 rayleighScatter = RAYLEIGH_BETA * uRayleighCoefficient * rayleighDensity;
    float rayleighPhaseFn = rayleighPhase(cosTheta);
    vec3 rayleigh = rayleighScatter * rayleighPhaseFn;
    
    // Mie scattering (sun glow, haze)
    float mieScatter = MIE_BETA * uMieCoefficient * mieDensity * 1000.0;
    float miePhaseFn = hgPhase(cosTheta, uMieDirectionalG);
    vec3 mie = vec3(mieScatter) * miePhaseFn;
    
    // Get sunset tinting
    vec3 sunsetTint = getSunsetTint(uSunElevation);
    vec3 zenithColor = getZenithColor(uSunElevation);
    
    // Combine scattering with sunset colors
    vec3 inscatter = (rayleigh * zenithColor + mie * sunsetTint) * uSunIntensity;
    
    // Horizon enhancement
    float horizonFade = 1.0 - abs(rayDir.y);
    horizonFade = pow(horizonFade, 3.0);
    
    // Add horizon glow during sunset
    vec3 horizonGlow = sunsetTint * horizonFade * 0.5 * max(0.0, 1.0 - uSunElevation * 3.0);
    
    // Sun disk
    float sun = sunDisk(rayDir, uSunDirection);
    vec3 sunColor = sunsetTint * sun * uSunIntensity;
    
    // Ground color for below-horizon
    vec3 groundBlend = mix(uGroundColor, inscatter, smoothstep(-0.1, 0.1, rayDir.y));
    
    // Final color
    vec3 color = groundBlend + horizonGlow + sunColor;
    
    // Tone mapping
    color = 1.0 - exp(-color * 1.5);
    
    // Gamma correction
    color = pow(color, vec3(1.0 / 2.2));
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

interface AtmosphericSkyProps {
  config: AtmosphericSkyConfig;
  radius: number;
}

export function AtmosphericSky({ config, radius }: AtmosphericSkyProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const timeRef = useRef(config.timeOfDay);
  
  // Compute sun direction from elevation and azimuth
  const sunDirection = useMemo(() => {
    const elev = config.sunElevation;
    const azim = config.sunAzimuth;
    return new THREE.Vector3(
      Math.cos(elev) * Math.sin(azim),
      Math.sin(elev),
      Math.cos(elev) * Math.cos(azim)
    ).normalize();
  }, [config.sunElevation, config.sunAzimuth]);
  
  const uniforms = useMemo(() => ({
    uSunDirection: { value: sunDirection },
    uSunIntensity: { value: config.sunIntensity },
    uRayleighCoefficient: { value: config.rayleighCoefficient },
    uMieCoefficient: { value: config.mieCoefficient },
    uMieDirectionalG: { value: config.mieDirectionalG },
    uTurbidity: { value: config.turbidity },
    uGroundColor: { value: new THREE.Color(config.groundColor) },
    uSunElevation: { value: config.sunElevation },
  }), []);
  
  // Update uniforms on config change and animate time
  useFrame((_, delta) => {
    if (!materialRef.current) return;
    
    const mat = materialRef.current;
    
    // Auto time animation
    if (config.autoTime) {
      timeRef.current += delta * config.timeSpeed;
      if (timeRef.current > 24) timeRef.current -= 24;
      
      // Convert time to sun elevation
      // 6am = sunrise (0), 12pm = noon (PI/2), 6pm = sunset (0), 12am = midnight (-PI/2)
      const hour = timeRef.current;
      const elevation = Math.sin((hour - 6) / 24 * Math.PI * 2) * (Math.PI / 2);
      mat.uniforms.uSunElevation.value = elevation;
      
      // Update sun direction
      const azim = config.sunAzimuth;
      mat.uniforms.uSunDirection.value.set(
        Math.cos(elevation) * Math.sin(azim),
        Math.sin(elevation),
        Math.cos(elevation) * Math.cos(azim)
      ).normalize();
    } else {
      mat.uniforms.uSunElevation.value = config.sunElevation;
      mat.uniforms.uSunDirection.value.copy(sunDirection);
    }
    
    mat.uniforms.uSunIntensity.value = config.sunIntensity;
    mat.uniforms.uRayleighCoefficient.value = config.rayleighCoefficient;
    mat.uniforms.uMieCoefficient.value = config.mieCoefficient;
    mat.uniforms.uMieDirectionalG.value = config.mieDirectionalG;
    mat.uniforms.uTurbidity.value = config.turbidity;
    mat.uniforms.uGroundColor.value.set(config.groundColor);
  });
  
  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[radius, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={atmosphereVertexShader}
        fragmentShader={atmosphereFragmentShader}
        uniforms={uniforms}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}
