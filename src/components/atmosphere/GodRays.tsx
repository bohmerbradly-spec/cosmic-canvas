import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface GodRaysProps {
  sunDirection: THREE.Vector3;
  sunElevation: number;
  radius: number;
  intensity?: number;
  samples?: number;
}

/**
 * God Rays / Crepuscular Rays Effect
 * 
 * Renders volumetric light shafts when the sun is near the horizon.
 * Uses radial blur from sun position to create light ray effect.
 */

const godRaysVertexShader = `
  varying vec3 vWorldPosition;
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const godRaysFragmentShader = `
  precision highp float;
  
  uniform vec3 uSunDirection;
  uniform float uSunElevation;
  uniform float uIntensity;
  uniform float uTime;
  
  varying vec3 vWorldPosition;
  varying vec2 vUv;
  
  const float PI = 3.141592653589793;
  
  // Noise for ray variation
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
    for (int i = 0; i < 4; i++) {
      value += amplitude * noise(p);
      p *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }
  
  void main() {
    vec3 rayDir = normalize(vWorldPosition);
    
    // Only render in upper hemisphere
    if (rayDir.y < -0.1) {
      gl_FragColor = vec4(0.0);
      return;
    }
    
    // Sun must be near horizon for god rays
    float elevDeg = uSunElevation * 57.2957795;
    if (elevDeg > 25.0 || elevDeg < -10.0) {
      gl_FragColor = vec4(0.0);
      return;
    }
    
    // Intensity falls off as sun goes higher or lower
    float horizonFactor = 1.0 - abs(elevDeg - 5.0) / 30.0;
    horizonFactor = clamp(horizonFactor, 0.0, 1.0);
    horizonFactor = pow(horizonFactor, 2.0);
    
    // Angle from sun
    float cosAngle = dot(rayDir, uSunDirection);
    
    // God rays are strongest looking toward sun
    float rayMask = pow(max(0.0, cosAngle), 4.0);
    
    // Create ray pattern using noise
    vec2 rayUv = vec2(atan(rayDir.x, rayDir.z), rayDir.y);
    rayUv.x *= 10.0; // Radial frequency
    rayUv.y *= 5.0;
    
    // Animated noise for rays
    float rayNoise = fbm(rayUv + vec2(uTime * 0.1, 0.0));
    rayNoise = smoothstep(0.3, 0.7, rayNoise);
    
    // Create discrete ray bands
    float rayBands = sin(rayUv.x * 20.0 + rayNoise * 5.0) * 0.5 + 0.5;
    rayBands = pow(rayBands, 3.0);
    
    // Combine
    float rays = rayMask * rayBands * horizonFactor;
    rays *= smoothstep(-0.05, 0.1, rayDir.y); // Fade at horizon
    
    // Sun color
    vec3 rayColor = vec3(1.0, 0.9, 0.7);
    if (elevDeg < 10.0) {
      float t = elevDeg / 10.0;
      rayColor = mix(vec3(1.0, 0.6, 0.3), vec3(1.0, 0.9, 0.7), t);
    }
    if (elevDeg < 0.0) {
      float t = (elevDeg + 10.0) / 10.0;
      rayColor = mix(vec3(0.8, 0.3, 0.2), vec3(1.0, 0.6, 0.3), t);
    }
    
    float alpha = rays * uIntensity * 0.3;
    
    gl_FragColor = vec4(rayColor * alpha, alpha);
  }
`;

export function GodRays({ sunDirection, sunElevation, radius, intensity = 1.0, samples = 32 }: GodRaysProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  const uniforms = useMemo(() => ({
    uSunDirection: { value: sunDirection.clone() },
    uSunElevation: { value: sunElevation },
    uIntensity: { value: intensity },
    uTime: { value: 0 },
  }), []);
  
  useFrame((_, delta) => {
    if (!materialRef.current) return;
    
    materialRef.current.uniforms.uSunDirection.value.copy(sunDirection);
    materialRef.current.uniforms.uSunElevation.value = sunElevation;
    materialRef.current.uniforms.uIntensity.value = intensity;
    materialRef.current.uniforms.uTime.value += delta;
  });
  
  return (
    <mesh scale={[-1, 1, 1]} renderOrder={15}>
      <sphereGeometry args={[radius * 0.99, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={godRaysVertexShader}
        fragmentShader={godRaysFragmentShader}
        uniforms={uniforms}
        side={THREE.BackSide}
        transparent={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
