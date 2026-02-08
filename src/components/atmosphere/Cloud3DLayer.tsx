import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CloudCellData } from '@/lib/cloudData';

interface Cloud3DLayerProps {
  clouds: CloudCellData[];
  virtualPosition: THREE.Vector3;
  transitionDistance: number;
  fullDistance: number;
  sunDirection: THREE.Vector3;
  sunElevation: number;
}

/**
 * 3D Cloud Layer - Volumetric clouds in 3D space
 * 
 * Like the star system: clouds are positioned at a FIXED render distance
 * from the camera and scaled based on virtual distance. This creates the
 * illusion of flying through clouds.
 */

const RENDER_DISTANCE = 50; // Fixed distance from camera for 3D clouds

const cloud3DVertexShader = `
  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    vNormal = normalize(normalMatrix * normal);
    
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewDir = -normalize(mvPosition.xyz);
    
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const cloud3DFragmentShader = `
  uniform vec3 cloudColor;
  uniform float density;
  uniform float opacity;
  uniform vec3 sunDirection;
  uniform float sunElevation;
  uniform float time;
  uniform float seed;
  
  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec2 vUv;
  
  // 3D noise for volumetric effect
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
    for (int i = 0; i < 5; i++) {
      value += amplitude * snoise(p);
      p *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }
  
  void main() {
    if (opacity < 0.01) discard;
    
    // Volumetric noise for cloud density variation
    vec3 noisePos = vWorldPosition * 0.02 + seed;
    noisePos.y += time * 0.1;
    float cloudNoise = fbm(noisePos);
    
    // Edge softening based on normal
    float edgeFade = pow(max(0.0, dot(vNormal, vViewDir)), 0.5);
    
    // Sun lighting
    float NdotL = dot(vNormal, sunDirection) * 0.5 + 0.5;
    
    // Subsurface scattering approximation
    float scatter = pow(max(0.0, dot(vViewDir, -sunDirection)), 4.0) * 0.5;
    
    // Silver lining on edges
    float fresnel = 1.0 - abs(dot(vNormal, vViewDir));
    float silverLining = pow(fresnel, 3.0) * max(0.0, dot(vViewDir, sunDirection) + 0.5);
    
    // Base cloud color with lighting
    vec3 shadowColor = cloudColor * 0.4;
    vec3 litColor = cloudColor;
    
    // Sunset tinting
    vec3 sunsetTint = vec3(1.0);
    if (sunElevation < 0.3) {
      float t = sunElevation / 0.3;
      sunsetTint = mix(vec3(1.0, 0.5, 0.3), vec3(1.0), t);
    }
    
    vec3 finalColor = mix(shadowColor, litColor, NdotL);
    finalColor += scatter * sunsetTint;
    finalColor += silverLining * vec3(1.0, 0.95, 0.9) * sunsetTint;
    finalColor *= sunsetTint;
    
    // Density modulation with noise
    float finalDensity = density * (0.5 + cloudNoise * 0.5);
    float alpha = edgeFade * finalDensity * opacity;
    
    // Add some ambient glow at edges
    alpha = max(alpha, fresnel * 0.1 * opacity);
    
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

interface CloudMeshData {
  cloud: CloudCellData;
  material: THREE.ShaderMaterial;
  groupRef: { current: THREE.Group | null };
  meshRef: { current: THREE.Mesh | null };
}

export function Cloud3DLayer({
  clouds,
  virtualPosition,
  transitionDistance,
  fullDistance,
  sunDirection,
  sunElevation,
}: Cloud3DLayerProps) {
  const groupRef = useRef<THREE.Group>(null);
  
  const cloudMeshes = useMemo<CloudMeshData[]>(() => {
    return clouds.map(cloud => ({
      cloud,
      material: new THREE.ShaderMaterial({
        vertexShader: cloud3DVertexShader,
        fragmentShader: cloud3DFragmentShader,
        uniforms: {
          cloudColor: { value: new THREE.Color(0xffffff) },
          density: { value: cloud.density },
          opacity: { value: 0 },
          sunDirection: { value: sunDirection.clone() },
          sunElevation: { value: sunElevation },
          time: { value: 0 },
          seed: { value: cloud.seed },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
      groupRef: { current: null },
      meshRef: { current: null },
    }));
  }, [clouds, sunDirection, sunElevation]);
  
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    cloudMeshes.forEach(({ cloud, material, groupRef: cloudGroupRef, meshRef }) => {
      if (!cloudGroupRef.current || !meshRef.current) return;
      
      // Cloud's world position
      const cloudWorldPos = cloud.position.clone();
      
      // Vector from virtual camera to cloud
      const toCloud = cloudWorldPos.sub(virtualPosition);
      const virtualDistance = toCloud.length();
      const direction = toCloud.normalize();
      
      // Calculate opacity: fade IN as we get close
      let opacity = 0;
      if (virtualDistance < fullDistance) {
        opacity = 1;
      } else if (virtualDistance < transitionDistance) {
        opacity = 1 - (virtualDistance - fullDistance) / (transitionDistance - fullDistance);
      }
      
      // Position at FIXED render distance, in the direction of the cloud
      cloudGroupRef.current.position.copy(direction.clone().multiplyScalar(RENDER_DISTANCE));
      
      // Scale based on virtual distance
      const distanceScale = Math.max(0.1, fullDistance / Math.max(0.1, virtualDistance));
      const finalScale = distanceScale * 0.1; // Scale down for reasonable size
      
      meshRef.current.scale.set(
        cloud.size.x * finalScale * 0.01,
        cloud.size.y * finalScale * 0.01,
        cloud.size.z * finalScale * 0.01
      );
      
      // Update material uniforms
      material.uniforms.opacity.value = opacity;
      material.uniforms.sunDirection.value.copy(sunDirection);
      material.uniforms.sunElevation.value = sunElevation;
      material.uniforms.time.value = time;
      
      // Sunset color
      const baseColor = new THREE.Color(0xffffff);
      if (sunElevation < 0.3) {
        const t = sunElevation / 0.3;
        const sunsetColor = new THREE.Color(0xffaa66);
        baseColor.lerp(sunsetColor, 1 - t);
      }
      material.uniforms.cloudColor.value = baseColor;
    });
  });
  
  return (
    <group ref={groupRef}>
      {cloudMeshes.map(({ cloud, material, groupRef: cloudGroupRef, meshRef }, index) => (
        <group
          key={cloud.id}
          ref={(el) => { cloudGroupRef.current = el; }}
        >
          <mesh
            ref={(el) => { meshRef.current = el; }}
            material={material}
          >
            <sphereGeometry args={[1, 16, 12]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
