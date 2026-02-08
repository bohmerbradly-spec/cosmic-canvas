import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface TerrainLayerProps {
  sunDirection: THREE.Vector3;
  sunElevation: number;
  radius: number;
}

/**
 * Terrain Layer - Ground plane with procedural heightmap
 * 
 * Creates a vast terrain that extends to the horizon, providing
 * a grounding element for the atmospheric scene.
 */

const terrainVertexShader = `
  uniform float time;
  
  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying float vHeight;
  varying vec2 vUv;
  
  // Noise functions
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }
  
  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 6; i++) {
      value += amplitude * snoise(p);
      p *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }
  
  void main() {
    vUv = uv;
    
    vec3 pos = position;
    
    // Multi-octave terrain height
    vec3 noisePos = pos * 0.005;
    float height = fbm(noisePos) * 50.0;
    height += fbm(noisePos * 3.0) * 15.0;
    height += fbm(noisePos * 8.0) * 5.0;
    
    pos.y += height;
    vHeight = height;
    
    // Calculate normal from height derivatives
    float eps = 0.5;
    float hL = fbm((position + vec3(-eps, 0, 0)) * 0.005) * 50.0;
    float hR = fbm((position + vec3(eps, 0, 0)) * 0.005) * 50.0;
    float hD = fbm((position + vec3(0, 0, -eps)) * 0.005) * 50.0;
    float hU = fbm((position + vec3(0, 0, eps)) * 0.005) * 50.0;
    
    vec3 terrainNormal = normalize(vec3(hL - hR, 2.0, hD - hU));
    vNormal = normalize(normalMatrix * terrainNormal);
    
    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPosition.xyz;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const terrainFragmentShader = `
  uniform vec3 sunDirection;
  uniform float sunElevation;
  uniform vec3 grassColor;
  uniform vec3 rockColor;
  uniform vec3 snowColor;
  
  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying float vHeight;
  varying vec2 vUv;
  
  void main() {
    // Terrain coloring based on height and slope
    float slope = 1.0 - vNormal.y;
    
    // Height-based color zones
    vec3 color;
    if (vHeight > 40.0) {
      color = snowColor;
    } else if (vHeight > 25.0 || slope > 0.6) {
      float t = smoothstep(25.0, 40.0, vHeight);
      color = mix(rockColor, snowColor, t);
    } else {
      float t = smoothstep(0.3, 0.6, slope);
      color = mix(grassColor, rockColor, t);
    }
    
    // Lighting
    float NdotL = max(0.0, dot(vNormal, sunDirection));
    float ambient = 0.2;
    
    // Sunset coloring
    vec3 sunColor = vec3(1.0);
    if (sunElevation < 0.3) {
      float t = sunElevation / 0.3;
      sunColor = mix(vec3(1.0, 0.6, 0.4), vec3(1.0), t);
    }
    
    vec3 diffuse = color * (ambient + NdotL * (1.0 - ambient));
    diffuse *= sunColor;
    
    // Distance fog
    float dist = length(vWorldPosition.xz);
    float fog = 1.0 - exp(-dist * 0.0003);
    vec3 fogColor = mix(vec3(0.7, 0.8, 0.9), sunColor * 0.5, 0.5);
    
    vec3 finalColor = mix(diffuse, fogColor, fog);
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export function TerrainLayer({ sunDirection, sunElevation, radius }: TerrainLayerProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  const uniforms = useMemo(() => ({
    time: { value: 0 },
    sunDirection: { value: sunDirection.clone() },
    sunElevation: { value: sunElevation },
    grassColor: { value: new THREE.Color(0x3d5c3a) },
    rockColor: { value: new THREE.Color(0x6b6b6b) },
    snowColor: { value: new THREE.Color(0xf0f0f5) },
  }), [sunDirection, sunElevation]);
  
  useFrame((_, delta) => {
    if (!materialRef.current) return;
    
    const mat = materialRef.current;
    mat.uniforms.time.value += delta;
    mat.uniforms.sunDirection.value.copy(sunDirection);
    mat.uniforms.sunElevation.value = sunElevation;
  });
  
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -100, 0]}>
      <planeGeometry args={[radius * 4, radius * 4, 256, 256]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={terrainVertexShader}
        fragmentShader={terrainFragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}
