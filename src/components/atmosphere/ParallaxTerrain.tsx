import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ParallaxTerrainProps {
  sunDirection: THREE.Vector3;
  sunElevation: number;
  virtualPosition: THREE.Vector3;
  radius: number;
  cloudShadowDensity?: number;
}

/**
 * Parallax Terrain Layer
 * 
 * Terrain that moves with virtual position to create proper parallax.
 * The terrain is rendered on a large plane that shifts based on where
 * the virtual camera is, creating the illusion of flying over land.
 * 
 * Includes cloud shadow projection.
 */

const terrainVertexShader = `
  uniform float uTime;
  uniform vec3 uVirtualPosition;
  
  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying float vHeight;
  varying vec2 vUv;
  varying vec3 vLocalPos;
  
  // Noise for terrain height
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
    
    // World position with virtual camera offset for parallax
    vec3 worldPos = position;
    worldPos.x += uVirtualPosition.x;
    worldPos.z += uVirtualPosition.z;
    
    vLocalPos = worldPos;
    
    // Multi-octave terrain height at world coordinates
    vec3 noisePos = worldPos * 0.001;
    float height = fbm(noisePos) * 200.0;
    height += fbm(noisePos * 3.0) * 60.0;
    height += fbm(noisePos * 8.0) * 20.0;
    
    vec3 pos = position;
    pos.y = height - 200.0; // Base altitude offset
    
    vHeight = height;
    
    // Calculate normal from height derivatives
    float eps = 1.0;
    vec3 offsetX = vec3(eps, 0.0, 0.0);
    vec3 offsetZ = vec3(0.0, 0.0, eps);
    
    float hL = fbm((worldPos - offsetX) * 0.001) * 200.0;
    float hR = fbm((worldPos + offsetX) * 0.001) * 200.0;
    float hD = fbm((worldPos - offsetZ) * 0.001) * 200.0;
    float hU = fbm((worldPos + offsetZ) * 0.001) * 200.0;
    
    vec3 terrainNormal = normalize(vec3(hL - hR, 2.0, hD - hU));
    vNormal = normalize(normalMatrix * terrainNormal);
    
    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPosition.xyz;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const terrainFragmentShader = `
  precision highp float;
  
  uniform vec3 uSunDirection;
  uniform float uSunElevation;
  uniform vec3 uGrassColor;
  uniform vec3 uRockColor;
  uniform vec3 uSnowColor;
  uniform float uCloudShadowDensity;
  uniform float uTime;
  uniform vec3 uVirtualPosition;
  
  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying float vHeight;
  varying vec2 vUv;
  varying vec3 vLocalPos;
  
  // Noise for cloud shadows
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
  
  // Sample cloud shadow at world position
  float cloudShadow(vec2 worldXZ) {
    // Project sun direction to find shadow offset
    vec2 shadowOffset = uSunDirection.xz / max(0.1, uSunDirection.y) * 2000.0;
    
    // Cloud pattern (matching cloud layer)
    vec2 cloudUv = (worldXZ + shadowOffset) * 0.0002;
    cloudUv += uTime * 0.01; // Wind movement
    
    float cloudNoise = fbm(cloudUv);
    cloudNoise += fbm(cloudUv * 3.0) * 0.3;
    
    // Coverage threshold
    float shadow = smoothstep(0.4, 0.7, cloudNoise);
    
    return shadow * uCloudShadowDensity;
  }
  
  void main() {
    // Terrain coloring based on height and slope
    float slope = 1.0 - vNormal.y;
    
    vec3 color;
    if (vHeight > 180.0) {
      color = uSnowColor;
    } else if (vHeight > 120.0 || slope > 0.6) {
      float t = smoothstep(120.0, 180.0, vHeight);
      color = mix(uRockColor, uSnowColor, t);
    } else if (slope > 0.4) {
      float t = smoothstep(0.4, 0.6, slope);
      color = mix(uGrassColor, uRockColor, t);
    } else {
      color = uGrassColor;
    }
    
    // Sun lighting
    float NdotL = max(0.0, dot(vNormal, uSunDirection));
    float ambient = 0.25;
    
    // Cloud shadows
    float shadow = cloudShadow(vLocalPos.xz);
    float shadowMultiplier = 1.0 - shadow * 0.6;
    
    // Sunset coloring
    vec3 sunColor = vec3(1.0);
    float elevDeg = uSunElevation * 57.2957795;
    if (elevDeg < 15.0) {
      float t = elevDeg / 15.0;
      sunColor = mix(vec3(1.0, 0.6, 0.4), vec3(1.0), t);
    }
    
    vec3 diffuse = color * (ambient + NdotL * (1.0 - ambient) * shadowMultiplier);
    diffuse *= sunColor;
    
    // Distance fog
    float dist = length(vWorldPosition.xz);
    float fog = 1.0 - exp(-dist * 0.00015);
    vec3 fogColor = mix(vec3(0.7, 0.8, 0.9), sunColor * 0.6, 0.3);
    
    // Aerial perspective - more blue in distance
    vec3 finalColor = mix(diffuse, fogColor, fog);
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export function ParallaxTerrain({ sunDirection, sunElevation, virtualPosition, radius, cloudShadowDensity = 0.5 }: ParallaxTerrainProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uSunDirection: { value: sunDirection.clone() },
    uSunElevation: { value: sunElevation },
    uVirtualPosition: { value: virtualPosition.clone() },
    uGrassColor: { value: new THREE.Color(0x3d6b3a) },
    uRockColor: { value: new THREE.Color(0x6b6b6b) },
    uSnowColor: { value: new THREE.Color(0xf0f0f5) },
    uCloudShadowDensity: { value: cloudShadowDensity },
  }), []);
  
  useFrame((_, delta) => {
    if (!materialRef.current) return;
    
    const mat = materialRef.current;
    mat.uniforms.uTime.value += delta;
    mat.uniforms.uSunDirection.value.copy(sunDirection);
    mat.uniforms.uSunElevation.value = sunElevation;
    mat.uniforms.uVirtualPosition.value.copy(virtualPosition);
    mat.uniforms.uCloudShadowDensity.value = cloudShadowDensity;
  });
  
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[radius * 2, radius * 2, 256, 256]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={terrainVertexShader}
        fragmentShader={terrainFragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}
