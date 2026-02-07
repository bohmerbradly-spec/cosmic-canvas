import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface CloudLayerConfig {
  // Layer settings
  coverage: number;        // 0-1, how much sky is covered
  density: number;         // cloud density multiplier
  altitude: number;        // cloud layer altitude
  thickness: number;       // vertical thickness of layer
  
  // Appearance
  baseColor: string;       // cloud base color
  topColor: string;        // cloud top color (sunlit)
  shadowColor: string;     // shadow/base color
  
  // Animation
  windSpeed: number;       // cloud drift speed
  windDirection: number;   // radians
  evolutionSpeed: number;  // cloud morphing speed
  
  // Lighting
  sunInfluence: number;    // how much sun affects cloud color
  ambientLight: number;    // ambient light level
  silverLining: number;    // edge glow intensity
  
  // Rendering
  steps: number;           // raymarch steps (quality)
  noiseScale: number;      // noise frequency
  detailScale: number;     // detail noise frequency
}

export const DEFAULT_CLOUD_CONFIG: CloudLayerConfig = {
  coverage: 0.5,
  density: 1.0,
  altitude: 2000,
  thickness: 500,
  baseColor: '#ffffff',
  topColor: '#ffffee',
  shadowColor: '#8899aa',
  windSpeed: 0.02,
  windDirection: 0,
  evolutionSpeed: 0.1,
  sunInfluence: 1.0,
  ambientLight: 0.3,
  silverLining: 0.5,
  steps: 16,
  noiseScale: 1.0,
  detailScale: 3.0,
};

const cloudVertexShader = `
  varying vec3 vWorldPosition;
  varying vec2 vUv;
  
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const cloudFragmentShader = `
  precision highp float;
  
  uniform float uTime;
  uniform vec3 uSunDirection;
  uniform float uSunElevation;
  uniform float uCoverage;
  uniform float uDensity;
  uniform float uNoiseScale;
  uniform float uDetailScale;
  uniform vec3 uBaseColor;
  uniform vec3 uTopColor;
  uniform vec3 uShadowColor;
  uniform float uSunInfluence;
  uniform float uAmbientLight;
  uniform float uSilverLining;
  uniform vec2 uWindOffset;
  uniform float uEvolutionTime;
  
  varying vec3 vWorldPosition;
  varying vec2 vUv;
  
  const float PI = 3.141592653589793;
  
  // Simplex noise functions
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
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }
  
  // FBM noise for cloud density
  float fbm(vec3 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    
    for (int i = 0; i < 6; i++) {
      if (i >= octaves) break;
      value += amplitude * snoise(p * frequency);
      frequency *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }
  
  // Henyey-Greenstein phase function
  float hgPhase(float cosTheta, float g) {
    float g2 = g * g;
    return (1.0 - g2) / (4.0 * PI * pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5));
  }
  
  // Cloud density at a point on the skybox
  float cloudDensity(vec3 dir) {
    // Project direction to cloud plane
    vec3 p = dir * 10.0; // Scale for noise sampling
    p.xz += uWindOffset;
    p.y += uEvolutionTime * 0.1;
    
    // Multi-octave noise for cloud shapes
    float base = fbm(p * uNoiseScale, 4);
    float detail = fbm(p * uDetailScale + vec3(100.0), 3) * 0.3;
    
    // Coverage threshold - shapes clouds
    float density = base + detail;
    density = smoothstep(1.0 - uCoverage * 2.0, 1.0, density + 0.5);
    
    // Height-based density falloff (denser at base)
    float heightFactor = smoothstep(-0.3, 0.5, dir.y);
    density *= heightFactor * (1.0 - heightFactor * 0.5);
    
    return density * uDensity;
  }
  
  void main() {
    vec3 rayDir = normalize(vWorldPosition);
    
    // Only render clouds above horizon
    if (rayDir.y < -0.05) {
      gl_FragColor = vec4(0.0);
      return;
    }
    
    // Sample cloud density
    float density = cloudDensity(rayDir);
    
    if (density < 0.01) {
      gl_FragColor = vec4(0.0);
      return;
    }
    
    // Lighting calculations
    float cosTheta = dot(rayDir, uSunDirection);
    
    // Phase function for forward scattering (silver lining)
    float phase = hgPhase(cosTheta, 0.6) * 0.5 + 0.5;
    
    // Sun elevation affects coloring
    float sunFactor = max(0.0, uSunElevation * 2.0);
    
    // Sunset tinting
    vec3 sunsetTint = vec3(1.0);
    float elevDeg = uSunElevation * 57.2957795;
    if (elevDeg < 15.0) {
      float t = clamp(elevDeg / 15.0, 0.0, 1.0);
      sunsetTint = mix(vec3(1.0, 0.5, 0.3), vec3(1.0), t);
    }
    if (elevDeg < 5.0) {
      float t = clamp((elevDeg + 5.0) / 10.0, 0.0, 1.0);
      sunsetTint = mix(vec3(1.0, 0.3, 0.2), vec3(1.0, 0.5, 0.3), t);
    }
    
    // Light direction dot product for shading
    float NdotL = dot(rayDir, uSunDirection) * 0.5 + 0.5;
    
    // Mix between shadow and lit colors based on light direction
    vec3 baseLight = mix(uShadowColor, uBaseColor, NdotL * sunFactor);
    
    // Add sun influence (top lighting)
    vec3 sunLight = uTopColor * sunsetTint * NdotL * uSunInfluence * sunFactor;
    
    // Silver lining effect - bright edges when looking toward sun
    float silverLining = pow(phase, 3.0) * uSilverLining * density;
    vec3 silverColor = vec3(1.0, 0.95, 0.9) * sunsetTint * silverLining;
    
    // Combine lighting
    vec3 cloudColor = baseLight + sunLight + silverColor;
    cloudColor += uBaseColor * uAmbientLight; // Ambient
    
    // Apply density to alpha
    float alpha = smoothstep(0.0, 0.5, density);
    alpha *= 0.95; // Slight transparency
    
    // Soft edges
    alpha *= smoothstep(-0.05, 0.1, rayDir.y);
    
    gl_FragColor = vec4(cloudColor, alpha);
  }
`;

interface CloudLayerProps {
  config: CloudLayerConfig;
  sunDirection: THREE.Vector3;
  sunElevation: number;
  radius: number;
}

export function CloudLayer({ config, sunDirection, sunElevation, radius }: CloudLayerProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const windOffsetRef = useRef(new THREE.Vector2(0, 0));
  const evolutionTimeRef = useRef(0);
  
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uSunDirection: { value: sunDirection.clone() },
    uSunElevation: { value: sunElevation },
    uCoverage: { value: config.coverage },
    uDensity: { value: config.density },
    uNoiseScale: { value: config.noiseScale },
    uDetailScale: { value: config.detailScale },
    uBaseColor: { value: new THREE.Color(config.baseColor) },
    uTopColor: { value: new THREE.Color(config.topColor) },
    uShadowColor: { value: new THREE.Color(config.shadowColor) },
    uSunInfluence: { value: config.sunInfluence },
    uAmbientLight: { value: config.ambientLight },
    uSilverLining: { value: config.silverLining },
    uWindOffset: { value: new THREE.Vector2(0, 0) },
    uEvolutionTime: { value: 0 },
  }), []);
  
  useFrame((_, delta) => {
    if (!materialRef.current) return;
    
    const mat = materialRef.current;
    
    // Update wind offset
    const windX = Math.cos(config.windDirection) * config.windSpeed * delta;
    const windY = Math.sin(config.windDirection) * config.windSpeed * delta;
    windOffsetRef.current.x += windX;
    windOffsetRef.current.y += windY;
    
    // Update evolution time
    evolutionTimeRef.current += delta * config.evolutionSpeed;
    
    // Update uniforms
    mat.uniforms.uTime.value += delta;
    mat.uniforms.uSunDirection.value.copy(sunDirection);
    mat.uniforms.uSunElevation.value = sunElevation;
    mat.uniforms.uCoverage.value = config.coverage;
    mat.uniforms.uDensity.value = config.density;
    mat.uniforms.uNoiseScale.value = config.noiseScale;
    mat.uniforms.uDetailScale.value = config.detailScale;
    mat.uniforms.uBaseColor.value.set(config.baseColor);
    mat.uniforms.uTopColor.value.set(config.topColor);
    mat.uniforms.uShadowColor.value.set(config.shadowColor);
    mat.uniforms.uSunInfluence.value = config.sunInfluence;
    mat.uniforms.uAmbientLight.value = config.ambientLight;
    mat.uniforms.uSilverLining.value = config.silverLining;
    mat.uniforms.uWindOffset.value.copy(windOffsetRef.current);
    mat.uniforms.uEvolutionTime.value = evolutionTimeRef.current;
  });
  
  return (
    <mesh scale={[-1, 1, 1]} renderOrder={10}>
      <sphereGeometry args={[radius, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={cloudVertexShader}
        fragmentShader={cloudFragmentShader}
        uniforms={uniforms}
        side={THREE.BackSide}
        transparent={true}
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </mesh>
  );
}
