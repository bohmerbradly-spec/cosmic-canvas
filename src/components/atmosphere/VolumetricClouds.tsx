import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface VolumetricCloudConfig {
  // Coverage and density
  coverage: number;           // 0-1, how much sky is covered
  density: number;            // cloud density multiplier
  cloudAltitude: number;      // base altitude of cloud layer
  cloudThickness: number;     // vertical thickness
  
  // Detail
  noiseScale: number;         // base noise frequency
  detailScale: number;        // fine detail frequency
  erosion: number;            // edge erosion amount
  
  // Lighting
  ambientLight: number;       // ambient light level
  lightAbsorption: number;    // how much light clouds absorb
  silverLiningIntensity: number;
  
  // Animation
  windSpeed: number;
  windDirection: number;      // radians
  evolutionSpeed: number;     // cloud morphing speed
  
  // Quality
  raySteps: number;           // raymarch steps
  lightSteps: number;         // light raymarch steps
}

export const DEFAULT_VOLUMETRIC_CLOUD_CONFIG: VolumetricCloudConfig = {
  coverage: 0.5,
  density: 0.8,
  cloudAltitude: 2000,
  cloudThickness: 800,
  noiseScale: 0.0004,
  detailScale: 0.002,
  erosion: 0.3,
  ambientLight: 0.4,
  lightAbsorption: 0.5,
  silverLiningIntensity: 1.0,
  windSpeed: 20,
  windDirection: 0.5,
  evolutionSpeed: 0.02,
  raySteps: 32,
  lightSteps: 6,
};

// Full volumetric raymarched cloud shader
const cloudVertexShader = `
  varying vec3 vWorldPosition;
  varying vec3 vViewDir;
  
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vViewDir = normalize(worldPosition.xyz - cameraPosition);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const cloudFragmentShader = `
  precision highp float;
  
  uniform float uTime;
  uniform vec3 uSunDirection;
  uniform float uSunElevation;
  uniform vec3 uVirtualPosition;
  
  uniform float uCoverage;
  uniform float uDensity;
  uniform float uCloudAltitude;
  uniform float uCloudThickness;
  uniform float uNoiseScale;
  uniform float uDetailScale;
  uniform float uErosion;
  uniform float uAmbientLight;
  uniform float uLightAbsorption;
  uniform float uSilverLiningIntensity;
  uniform vec2 uWindOffset;
  uniform float uEvolutionTime;
  uniform int uRaySteps;
  uniform int uLightSteps;
  
  varying vec3 vWorldPosition;
  varying vec3 vViewDir;
  
  const float PI = 3.141592653589793;
  
  // ========== NOISE FUNCTIONS ==========
  
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
  
  // FBM noise with 5 octaves
  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    
    for (int i = 0; i < 5; i++) {
      value += amplitude * snoise(p * frequency);
      frequency *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }
  
  // Worley/cellular noise for cloud billows
  float worley(vec3 p) {
    vec3 id = floor(p);
    vec3 fd = fract(p);
    
    float minDist = 1.0;
    for (int x = -1; x <= 1; x++) {
      for (int y = -1; y <= 1; y++) {
        for (int z = -1; z <= 1; z++) {
          vec3 coord = vec3(float(x), float(y), float(z));
          vec3 cellId = id + coord;
          vec3 offset = vec3(
            fract(sin(dot(cellId, vec3(127.1, 311.7, 74.7))) * 43758.5453),
            fract(sin(dot(cellId, vec3(269.5, 183.3, 246.1))) * 43758.5453),
            fract(sin(dot(cellId, vec3(113.5, 271.9, 124.6))) * 43758.5453)
          );
          vec3 pos = coord + offset - fd;
          float dist = length(pos);
          minDist = min(minDist, dist);
        }
      }
    }
    return 1.0 - minDist;
  }
  
  // ========== CLOUD DENSITY ==========
  
  // Height gradient - clouds are denser at base, wispy at top
  float heightGradient(float y) {
    float normalizedHeight = (y - uCloudAltitude) / uCloudThickness;
    normalizedHeight = clamp(normalizedHeight, 0.0, 1.0);
    
    // Cumulus shape: dense base, wispy top
    float gradient = normalizedHeight * (1.0 - normalizedHeight) * 4.0;
    gradient *= smoothstep(0.0, 0.1, normalizedHeight);
    gradient *= smoothstep(1.0, 0.8, normalizedHeight);
    
    return gradient;
  }
  
  // Sample cloud density at world position
  float sampleCloud(vec3 pos) {
    // Apply wind
    vec3 windPos = pos;
    windPos.xz += uWindOffset;
    windPos.y += uEvolutionTime * 10.0;
    
    // Height check
    float heightAboveCloud = pos.y - uCloudAltitude;
    if (heightAboveCloud < 0.0 || heightAboveCloud > uCloudThickness) {
      return 0.0;
    }
    
    float hGrad = heightGradient(pos.y);
    
    // Multi-scale noise
    float baseNoise = fbm(windPos * uNoiseScale) * 0.5 + 0.5;
    float detailNoise = fbm(windPos * uDetailScale) * 0.5 + 0.5;
    float cellNoise = worley(windPos * uNoiseScale * 2.0);
    
    // Combine noises for cloud shape
    float shape = baseNoise;
    shape = shape * 0.7 + cellNoise * 0.3;
    shape *= hGrad;
    
    // Apply coverage
    float coverageThreshold = 1.0 - uCoverage;
    shape = smoothstep(coverageThreshold, coverageThreshold + 0.2, shape);
    
    // Add detail and erosion
    shape -= detailNoise * uErosion * 0.5;
    
    return max(0.0, shape * uDensity);
  }
  
  // ========== LIGHTING ==========
  
  // Henyey-Greenstein phase function
  float hgPhase(float cosTheta, float g) {
    float g2 = g * g;
    return (1.0 - g2) / (4.0 * PI * pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5));
  }
  
  // Beer-Lambert light absorption
  float beer(float density) {
    return exp(-density * uLightAbsorption);
  }
  
  // Powder effect - enhanced scattering at cloud edges
  float powder(float density) {
    return 1.0 - exp(-density * 2.0);
  }
  
  // Light march toward sun for self-shadowing
  float lightMarch(vec3 pos) {
    float stepSize = uCloudThickness / float(uLightSteps);
    float totalDensity = 0.0;
    
    vec3 rayPos = pos;
    for (int i = 0; i < 8; i++) {
      if (i >= uLightSteps) break;
      rayPos += uSunDirection * stepSize;
      totalDensity += sampleCloud(rayPos) * stepSize * 0.01;
    }
    
    return beer(totalDensity) * mix(1.0, powder(totalDensity), 0.5);
  }
  
  // Sunset color based on sun elevation
  vec3 getSunColor() {
    float elevDeg = uSunElevation * 57.2957795;
    
    if (elevDeg > 15.0) {
      return vec3(1.0, 0.98, 0.95);
    } else if (elevDeg > 5.0) {
      float t = (elevDeg - 5.0) / 10.0;
      return mix(vec3(1.0, 0.8, 0.5), vec3(1.0, 0.98, 0.95), t);
    } else if (elevDeg > 0.0) {
      float t = elevDeg / 5.0;
      return mix(vec3(1.0, 0.5, 0.2), vec3(1.0, 0.8, 0.5), t);
    } else {
      float t = clamp((elevDeg + 10.0) / 10.0, 0.0, 1.0);
      return mix(vec3(0.3, 0.2, 0.3), vec3(1.0, 0.5, 0.2), t);
    }
  }
  
  // ========== RAY-SPHERE INTERSECTION ==========
  
  vec2 raySphereBounds(vec3 rayOrigin, vec3 rayDir, float innerRadius, float outerRadius) {
    // Returns entry and exit distances for ray through spherical shell
    float a = dot(rayDir, rayDir);
    float b = 2.0 * dot(rayOrigin, rayDir);
    
    float cInner = dot(rayOrigin, rayOrigin) - innerRadius * innerRadius;
    float cOuter = dot(rayOrigin, rayOrigin) - outerRadius * outerRadius;
    
    float discInner = b * b - 4.0 * a * cInner;
    float discOuter = b * b - 4.0 * a * cOuter;
    
    float tNear = 0.0;
    float tFar = 10000.0;
    
    if (discOuter >= 0.0) {
      float sqrtDisc = sqrt(discOuter);
      tNear = max(0.0, (-b - sqrtDisc) / (2.0 * a));
      tFar = (-b + sqrtDisc) / (2.0 * a);
    }
    
    return vec2(tNear, tFar);
  }
  
  void main() {
    vec3 rayDir = normalize(vViewDir);
    
    // Only render above horizon
    if (rayDir.y < 0.0) {
      gl_FragColor = vec4(0.0);
      return;
    }
    
    // Ray origin at virtual camera position (but using world space)
    vec3 rayOrigin = uVirtualPosition;
    rayOrigin.y = max(rayOrigin.y, 100.0); // Min altitude
    
    // Cloud layer bounds (as distances along ray)
    float innerRadius = uCloudAltitude;
    float outerRadius = uCloudAltitude + uCloudThickness;
    
    // Calculate where ray enters/exits cloud layer
    float tEnter = 0.0;
    float tExit = 50000.0;
    
    // Simple plane intersection for flat cloud layer
    if (abs(rayDir.y) > 0.001) {
      float tBottom = (uCloudAltitude - rayOrigin.y) / rayDir.y;
      float tTop = (uCloudAltitude + uCloudThickness - rayOrigin.y) / rayDir.y;
      
      if (rayDir.y > 0.0) {
        tEnter = max(0.0, tBottom);
        tExit = tTop;
      } else {
        tEnter = max(0.0, tTop);
        tExit = tBottom;
      }
    }
    
    // Check if ray misses cloud layer
    if (tEnter > tExit || tExit < 0.0) {
      gl_FragColor = vec4(0.0);
      return;
    }
    
    // Limit ray march distance
    tExit = min(tExit, 30000.0);
    
    // Raymarch through clouds
    float stepSize = (tExit - tEnter) / float(uRaySteps);
    float t = tEnter;
    
    vec3 sunColor = getSunColor();
    vec3 skyColor = vec3(0.5, 0.6, 0.8);
    
    float transmittance = 1.0;
    vec3 scatteredLight = vec3(0.0);
    
    // Phase function for view direction
    float cosTheta = dot(rayDir, uSunDirection);
    float phase = hgPhase(cosTheta, 0.3) * 0.5 + hgPhase(cosTheta, -0.3) * 0.5;
    float forwardPhase = hgPhase(cosTheta, 0.8);
    
    for (int i = 0; i < 64; i++) {
      if (i >= uRaySteps) break;
      if (transmittance < 0.01) break;
      
      vec3 pos = rayOrigin + rayDir * t;
      float density = sampleCloud(pos);
      
      if (density > 0.001) {
        // Light from sun (with self-shadowing)
        float lightEnergy = lightMarch(pos);
        
        // Silver lining effect
        float silverLining = forwardPhase * uSilverLiningIntensity * lightEnergy;
        
        // Combine direct and ambient light
        vec3 lightColor = sunColor * (phase + silverLining) * lightEnergy;
        lightColor += skyColor * uAmbientLight;
        
        // Accumulate scattering
        float sampleTransmittance = beer(density * stepSize * 0.1);
        vec3 sampleColor = lightColor * density;
        
        scatteredLight += sampleColor * transmittance * stepSize * 0.01;
        transmittance *= sampleTransmittance;
      }
      
      t += stepSize;
    }
    
    float alpha = 1.0 - transmittance;
    
    // Soften edges
    alpha *= smoothstep(0.0, 0.05, rayDir.y);
    
    gl_FragColor = vec4(scatteredLight, alpha);
  }
`;

interface VolumetricCloudsProps {
  config: VolumetricCloudConfig;
  sunDirection: THREE.Vector3;
  sunElevation: number;
  virtualPosition: THREE.Vector3;
  radius: number;
}

export function VolumetricClouds({ config, sunDirection, sunElevation, virtualPosition, radius }: VolumetricCloudsProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const windOffsetRef = useRef(new THREE.Vector2(0, 0));
  const evolutionTimeRef = useRef(0);
  
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uSunDirection: { value: sunDirection.clone() },
    uSunElevation: { value: sunElevation },
    uVirtualPosition: { value: virtualPosition.clone() },
    uCoverage: { value: config.coverage },
    uDensity: { value: config.density },
    uCloudAltitude: { value: config.cloudAltitude },
    uCloudThickness: { value: config.cloudThickness },
    uNoiseScale: { value: config.noiseScale },
    uDetailScale: { value: config.detailScale },
    uErosion: { value: config.erosion },
    uAmbientLight: { value: config.ambientLight },
    uLightAbsorption: { value: config.lightAbsorption },
    uSilverLiningIntensity: { value: config.silverLiningIntensity },
    uWindOffset: { value: new THREE.Vector2(0, 0) },
    uEvolutionTime: { value: 0 },
    uRaySteps: { value: config.raySteps },
    uLightSteps: { value: config.lightSteps },
  }), []);
  
  useFrame((_, delta) => {
    if (!materialRef.current) return;
    
    const mat = materialRef.current;
    
    // Update wind
    const windX = Math.cos(config.windDirection) * config.windSpeed * delta;
    const windY = Math.sin(config.windDirection) * config.windSpeed * delta;
    windOffsetRef.current.x += windX;
    windOffsetRef.current.y += windY;
    
    // Update evolution
    evolutionTimeRef.current += delta * config.evolutionSpeed;
    
    // Update all uniforms
    mat.uniforms.uTime.value += delta;
    mat.uniforms.uSunDirection.value.copy(sunDirection);
    mat.uniforms.uSunElevation.value = sunElevation;
    mat.uniforms.uVirtualPosition.value.copy(virtualPosition);
    mat.uniforms.uCoverage.value = config.coverage;
    mat.uniforms.uDensity.value = config.density;
    mat.uniforms.uCloudAltitude.value = config.cloudAltitude;
    mat.uniforms.uCloudThickness.value = config.cloudThickness;
    mat.uniforms.uNoiseScale.value = config.noiseScale;
    mat.uniforms.uDetailScale.value = config.detailScale;
    mat.uniforms.uErosion.value = config.erosion;
    mat.uniforms.uAmbientLight.value = config.ambientLight;
    mat.uniforms.uLightAbsorption.value = config.lightAbsorption;
    mat.uniforms.uSilverLiningIntensity.value = config.silverLiningIntensity;
    mat.uniforms.uWindOffset.value.copy(windOffsetRef.current);
    mat.uniforms.uEvolutionTime.value = evolutionTimeRef.current;
    mat.uniforms.uRaySteps.value = config.raySteps;
    mat.uniforms.uLightSteps.value = config.lightSteps;
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
