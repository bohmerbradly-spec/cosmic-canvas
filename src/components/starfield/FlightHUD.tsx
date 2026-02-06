import { useMemo } from 'react';
import * as THREE from 'three';
import { NearStarData } from '@/lib/nearStarData';

interface FlightHUDProps {
  virtualPosition: THREE.Vector3;
  stars: NearStarData[];
  transitionDistance: number;
  fullDistance: number;
}

export function FlightHUD({ virtualPosition, stars, transitionDistance, fullDistance }: FlightHUDProps) {
  const { nearestStar, nearestDistance, starsIn3D, starsTransitioning } = useMemo(() => {
    let nearest: NearStarData | null = null;
    let minDist = Infinity;
    let in3D = 0;
    let transitioning = 0;
    
    stars.forEach(star => {
      if (star.distance === 0) return; // Skip Sol
      
      const starPos = new THREE.Vector3(star.position.x, star.position.y, star.position.z);
      const dist = starPos.distanceTo(virtualPosition);
      
      if (dist < minDist) {
        minDist = dist;
        nearest = star;
      }
      
      if (dist < fullDistance) {
        in3D++;
      } else if (dist < transitionDistance) {
        transitioning++;
      }
    });
    
    return {
      nearestStar: nearest,
      nearestDistance: minDist,
      starsIn3D: in3D,
      starsTransitioning: transitioning,
    };
  }, [virtualPosition, stars, transitionDistance, fullDistance]);

  return (
    <div className="absolute top-4 left-4 bg-black/70 text-white p-4 rounded-lg font-mono text-sm space-y-2 pointer-events-none z-10">
      <div className="text-cyan-400 font-bold">Virtual Flight Position</div>
      <div>
        X: {virtualPosition.x.toFixed(2)} ly
      </div>
      <div>
        Y: {virtualPosition.y.toFixed(2)} ly
      </div>
      <div>
        Z: {virtualPosition.z.toFixed(2)} ly
      </div>
      
      <div className="border-t border-white/30 pt-2 mt-2">
        <div className="text-yellow-400">Nearest Star:</div>
        <div>{nearestStar?.name || 'None'}</div>
        <div>{nearestDistance.toFixed(2)} ly away</div>
      </div>
      
      <div className="border-t border-white/30 pt-2 mt-2">
        <div className="text-magenta-400" style={{ color: '#ff00ff' }}>
          3D Stars (magenta): {starsIn3D}
        </div>
        <div className="text-purple-400">
          Transitioning: {starsTransitioning}
        </div>
        <div className="text-cyan-400">
          2D Stars (cyan): {stars.length - starsIn3D - starsTransitioning - 1}
        </div>
      </div>
      
      <div className="border-t border-white/30 pt-2 mt-2 text-xs text-gray-400">
        <div>Click canvas → WASD to fly</div>
        <div>Mouse to look • H for hyperdrive</div>
        <div>Transition: {fullDistance}-{transitionDistance} ly</div>
      </div>
    </div>
  );
}
