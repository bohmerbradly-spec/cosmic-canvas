import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface MilkyWayProps {
  radius: number;
  intensity: number;
  bandWidth: number;
  dustLanes: boolean;
  coreIntensity: number;
}

const milkyWayVertexShader = `
  varying vec3 vPosition;
  varying vec3 vNormal;
  
  void main() {
    vPosition = position;
    vNormal = normal;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const milkyWayFragmentShader = `
  uniform float uIntensity;
  uniform float uBandWidth;
  uniform float uCoreIntensity;
  uniform float uTime;
  uniform bool uDustLanes;
  
  varying vec3 vPosition;
  varying vec3 vNormal;
  
  // Noise functions for dust lanes
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  
  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p);
      p *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }
  
  void main() {
    vec3 normalized = normalize(vPosition);
    
    // Galactic coordinates
    float galacticLat = asin(normalized.y);
    float galacticLon = atan(normalized.z, normalized.x);
    
    // Main band - Gaussian profile
    float bandProfile = exp(-(galacticLat * galacticLat) / (2.0 * uBandWidth * uBandWidth));
    
    // Galactic core bulge
    float coreDistance = length(vec2(galacticLon, galacticLat * 3.0));
    float coreBulge = exp(-coreDistance * coreDistance * 2.0) * uCoreIntensity;
    
    // Spiral arm structure
    float spiralAngle = galacticLon * 2.0 + galacticLat * 0.5;
    float spiralArms = 0.5 + 0.5 * sin(spiralAngle * 2.0);
    spiralArms = pow(spiralArms, 0.5);
    
    // Dust lanes (dark absorption)
    float dust = 1.0;
    if (uDustLanes) {
      vec2 dustCoord = vec2(galacticLon * 5.0, galacticLat * 20.0);
      float dustNoise = fbm(dustCoord);
      dust = 0.6 + 0.4 * dustNoise;
      
      // Central dust lane
      float centralDust = smoothstep(0.0, 0.1, abs(galacticLat)) * 0.5 + 0.5;
      dust *= centralDust;
    }
    
    // Combine all effects
    float milkyWay = bandProfile * spiralArms * dust + coreBulge;
    milkyWay *= uIntensity;
    
    // Color gradient - warm core, cooler edges
    vec3 coreColor = vec3(1.0, 0.9, 0.7);
    vec3 edgeColor = vec3(0.7, 0.75, 0.9);
    vec3 dustColor = vec3(0.3, 0.25, 0.2);
    
    vec3 color = mix(edgeColor, coreColor, coreBulge);
    if (uDustLanes) {
      color = mix(dustColor, color, dust);
    }
    
    // Very subtle stars within the milky way
    float starField = noise(vec2(galacticLon * 50.0, galacticLat * 100.0));
    starField = pow(starField, 8.0) * 0.3 * bandProfile;
    
    float alpha = milkyWay * 0.15 + starField;
    
    gl_FragColor = vec4(color, alpha);
  }
`;

export function MilkyWay({
  radius,
  intensity,
  bandWidth,
  dustLanes,
  coreIntensity,
}: MilkyWayProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  const uniforms = useMemo(() => ({
    uIntensity: { value: intensity },
    uBandWidth: { value: bandWidth },
    uCoreIntensity: { value: coreIntensity },
    uTime: { value: 0 },
    uDustLanes: { value: dustLanes },
  }), []);
  
  // Update uniforms when props change
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uIntensity.value = intensity;
      materialRef.current.uniforms.uBandWidth.value = bandWidth;
      materialRef.current.uniforms.uCoreIntensity.value = coreIntensity;
      materialRef.current.uniforms.uDustLanes.value = dustLanes;
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });
  
  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[radius - 0.1, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={milkyWayVertexShader}
        fragmentShader={milkyWayFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
