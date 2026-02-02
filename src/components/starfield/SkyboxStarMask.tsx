import { useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { NearStarData } from '@/lib/nearStarData';

interface SkyboxStarMaskProps {
  nearStars: NearStarData[];
  skyboxRadius: number;
  transitionDistance: number;
  fullDistance: number;
}

/**
 * This hook provides data to mask out near stars from the skybox
 * as they transition to 3D. Returns positions on the skybox sphere
 * that should be dimmed/hidden.
 */
export function useSkyboxStarMasks({
  nearStars,
  skyboxRadius,
  transitionDistance,
  fullDistance,
}: SkyboxStarMaskProps) {
  const { camera } = useThree();
  
  return useMemo(() => {
    const masks: Array<{
      direction: THREE.Vector3;
      radius: number;
      opacity: number;
    }> = [];
    
    const cameraPos = camera.position;
    
    nearStars.forEach((star) => {
      if (star.distance === 0) return; // Skip Sol
      
      const starWorldPos = new THREE.Vector3(
        star.position.x,
        star.position.y,
        star.position.z
      );
      
      // Direction from camera to star
      const direction = starWorldPos.clone().sub(cameraPos).normalize();
      
      // Distance to star
      const distance = cameraPos.distanceTo(starWorldPos);
      
      // Calculate how visible the 3D star is (inverse of this masks the skybox)
      let visibility3D = 0;
      if (distance < fullDistance) {
        visibility3D = 1;
      } else if (distance < transitionDistance) {
        visibility3D = 1 - (distance - fullDistance) / (transitionDistance - fullDistance);
      }
      
      if (visibility3D > 0.01) {
        masks.push({
          direction,
          radius: 0.02 + visibility3D * 0.02, // Angular radius on skybox
          opacity: visibility3D,
        });
      }
    });
    
    return masks;
  }, [camera.position, nearStars, transitionDistance, fullDistance]);
}

/**
 * Project a 3D star position onto the skybox sphere
 */
export function projectToSkybox(
  starPosition: THREE.Vector3,
  cameraPosition: THREE.Vector3,
  skyboxRadius: number
): THREE.Vector3 {
  const direction = starPosition.clone().sub(cameraPosition).normalize();
  return cameraPosition.clone().add(direction.multiplyScalar(skyboxRadius));
}

/**
 * Calculate the angular size of a star on the skybox based on distance
 */
export function getAngularSize(
  starPosition: THREE.Vector3,
  cameraPosition: THREE.Vector3,
  starRadius: number = 1
): number {
  const distance = starPosition.distanceTo(cameraPosition);
  if (distance < 0.001) return Math.PI; // Very close
  
  // Angular diameter in radians
  return 2 * Math.atan(starRadius / distance);
}
