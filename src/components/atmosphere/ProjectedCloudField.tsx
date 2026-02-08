import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CloudCellData, getCloudColor } from '@/lib/cloudData';

interface ProjectedCloudFieldProps {
  clouds: CloudCellData[];
  skyboxRadius: number;
  transitionDistance: number;
  fullDistance: number;
  virtualPosition: THREE.Vector3;
  sunDirection: THREE.Vector3;
  sunElevation: number;
  windOffset: THREE.Vector2;
}

/**
 * Projected Cloud Field - 2D clouds on skybox
 * 
 * Clouds exist at real 3D world positions but are PROJECTED onto a fixed
 * 2D skybox sphere. As virtual camera position changes, clouds slide
 * with parallax motion. When close enough, they fade out to be replaced
 * by 3D volumetric geometry.
 */

const projectedCloudVertexShader = `
  attribute float size;
  attribute vec3 cloudColor;
  attribute float density;
  attribute vec3 worldPosition;
  attribute vec3 cloudSize;
  
  uniform vec3 virtualCameraPos;
  uniform float skyboxRadius;
  uniform float transitionDistance;
  uniform float fullDistance;
  uniform vec3 sunDirection;
  uniform float sunElevation;
  uniform vec2 windOffset;
  
  varying vec3 vColor;
  varying float vDensity;
  varying float vOpacity;
  varying vec2 vUv;
  varying float vSunDot;
  
  void main() {
    // Apply wind to world position
    vec3 worldPos = worldPosition;
    worldPos.xz += windOffset;
    
    // Vector from virtual camera to cloud's world position
    vec3 toCloud = worldPos - virtualCameraPos;
    float distanceToCloud = length(toCloud);
    vec3 direction = normalize(toCloud);
    
    // Project onto skybox
    vec3 projectedPos = direction * skyboxRadius;
    
    // Calculate opacity: fade OUT as virtual distance decreases
    if (distanceToCloud < fullDistance) {
      vOpacity = 0.0;
    } else if (distanceToCloud < transitionDistance) {
      vOpacity = (distanceToCloud - fullDistance) / (transitionDistance - fullDistance);
    } else {
      vOpacity = 1.0;
    }
    
    // Sun lighting on cloud
    vSunDot = dot(direction, sunDirection) * 0.5 + 0.5;
    
    vColor = cloudColor;
    vDensity = density;
    vUv = vec2(0.5);
    
    vec4 mvPosition = modelViewMatrix * vec4(projectedPos, 1.0);
    
    // Size based on cloud dimensions and distance
    float avgSize = (cloudSize.x + cloudSize.y + cloudSize.z) / 3.0;
    gl_PointSize = avgSize * (200.0 / -mvPosition.z) * 0.5;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const projectedCloudFragmentShader = `
  uniform float sunElevation;
  uniform vec3 sunDirection;
  
  varying vec3 vColor;
  varying float vDensity;
  varying float vOpacity;
  varying vec2 vUv;
  varying float vSunDot;
  
  // Noise function for cloud texture
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
    if (vOpacity < 0.01) discard;
    
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    
    // Soft cloud shape with noise
    vec2 noiseCoord = gl_PointCoord * 4.0;
    float cloudNoise = fbm(noiseCoord);
    
    float edge = smoothstep(0.5, 0.2, dist);
    float cloudShape = edge * (0.5 + cloudNoise * 0.5);
    
    // Lighting
    float sunLight = max(0.3, vSunDot);
    
    // Sunset coloring
    vec3 sunsetTint = vec3(1.0);
    if (sunElevation < 0.3) {
      float t = sunElevation / 0.3;
      sunsetTint = mix(vec3(1.0, 0.6, 0.4), vec3(1.0), t);
    }
    
    vec3 finalColor = vColor * sunLight * sunsetTint;
    
    // Silver lining effect
    float silverLining = pow(max(0.0, vSunDot), 4.0) * 0.3;
    finalColor += vec3(1.0, 0.95, 0.9) * silverLining;
    
    float alpha = cloudShape * vDensity * vOpacity * 0.8;
    
    if (alpha < 0.02) discard;
    
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

export function ProjectedCloudField({
  clouds,
  skyboxRadius,
  transitionDistance,
  fullDistance,
  virtualPosition,
  sunDirection,
  sunElevation,
  windOffset,
}: ProjectedCloudFieldProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  const geometry = useMemo(() => {
    const count = clouds.length;
    const positions = new Float32Array(count * 3);
    const worldPositions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const densities = new Float32Array(count);
    const cloudSizes = new Float32Array(count * 3);
    
    clouds.forEach((cloud, i) => {
      // World positions
      worldPositions[i * 3] = cloud.position.x;
      worldPositions[i * 3 + 1] = cloud.position.y;
      worldPositions[i * 3 + 2] = cloud.position.z;
      
      // Initial position
      positions[i * 3] = cloud.position.x;
      positions[i * 3 + 1] = cloud.position.y;
      positions[i * 3 + 2] = cloud.position.z;
      
      const color = getCloudColor(cloud.type, sunElevation);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      
      sizes[i] = (cloud.size.x + cloud.size.y + cloud.size.z) / 3;
      densities[i] = cloud.density;
      
      cloudSizes[i * 3] = cloud.size.x;
      cloudSizes[i * 3 + 1] = cloud.size.y;
      cloudSizes[i * 3 + 2] = cloud.size.z;
    });
    
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('worldPosition', new THREE.BufferAttribute(worldPositions, 3));
    geo.setAttribute('cloudColor', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('density', new THREE.BufferAttribute(densities, 1));
    geo.setAttribute('cloudSize', new THREE.BufferAttribute(cloudSizes, 3));
    
    return geo;
  }, [clouds, sunElevation]);
  
  const uniforms = useMemo(() => ({
    virtualCameraPos: { value: new THREE.Vector3() },
    skyboxRadius: { value: skyboxRadius },
    transitionDistance: { value: transitionDistance },
    fullDistance: { value: fullDistance },
    sunDirection: { value: sunDirection.clone() },
    sunElevation: { value: sunElevation },
    windOffset: { value: new THREE.Vector2() },
  }), [skyboxRadius, transitionDistance, fullDistance, sunDirection, sunElevation]);
  
  useFrame(() => {
    if (!materialRef.current) return;
    
    const mat = materialRef.current;
    mat.uniforms.virtualCameraPos.value.copy(virtualPosition);
    mat.uniforms.sunDirection.value.copy(sunDirection);
    mat.uniforms.sunElevation.value = sunElevation;
    mat.uniforms.windOffset.value.copy(windOffset);
    mat.uniforms.transitionDistance.value = transitionDistance;
    mat.uniforms.fullDistance.value = fullDistance;
  });
  
  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={projectedCloudVertexShader}
        fragmentShader={projectedCloudFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </points>
  );
}
