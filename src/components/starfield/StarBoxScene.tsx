import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { Suspense, useState, useCallback } from 'react';
import * as THREE from 'three';
import { MilkyWay } from './MilkyWay';
import { SkyBox } from './SkyBox';
import { FlightControls } from './FlightControls';
import { ProjectedStarField } from './ProjectedStarField';
import { Star3D } from './Star3D';
import { NEAR_STARS } from '@/lib/nearStarData';

export interface StarBoxConfig {
  // Star field settings
  starCount: number;
  starRadius: number;
  galacticConcentration: number;
  colorVariation: number;
  twinkleIntensity: number;
  twinkleSpeed: number;
  starSizeMultiplier: number;
  brightnessMultiplier: number;
  
  // Milky Way settings
  milkyWayIntensity: number;
  milkyWayBandWidth: number;
  milkyWayCoreIntensity: number;
  dustLanes: boolean;
  
  // Sky settings
  skyTopColor: string;
  skyBottomColor: string;
  atmosphereIntensity: number;
  
  // Camera settings
  autoRotate: boolean;
  autoRotateSpeed: number;
  
  // Near star settings
  nearStarScale: number;
  nearStarGlow: number;
  transitionDistance: number;
  fullDistance: number;
  showNearStars: boolean;
  
  // Flight settings
  flightEnabled: boolean;
  flightSpeed: number;
  
  // Hyperdrive settings
  hyperdriveStretch: number;
}

interface StarBoxSceneProps {
  config: StarBoxConfig;
}

interface SceneProps {
  config: StarBoxConfig;
  cameraPosition: THREE.Vector3;
  velocity: THREE.Vector3;
  hyperdrive: boolean;
}

function Scene({ config, cameraPosition, velocity, hyperdrive }: SceneProps) {
  return (
    <>
      {/* Background sky sphere - follows camera */}
      <group position={cameraPosition}>
        <SkyBox
          radius={config.starRadius + 5}
          topColor={config.skyTopColor}
          bottomColor={config.skyBottomColor}
          atmosphereIntensity={config.atmosphereIntensity}
        />
        
        {/* Milky Way band - on skybox */}
        <MilkyWay
          radius={config.starRadius + 2}
          intensity={config.milkyWayIntensity}
          bandWidth={config.milkyWayBandWidth}
          dustLanes={config.dustLanes}
          coreIntensity={config.milkyWayCoreIntensity}
        />
      </group>
      
      {/* 
        Projected Star Field - stars with 3D world positions
        but rendered as 2D projections on the skybox with parallax.
        They fade out as camera approaches (transition to 3D).
      */}
      {config.showNearStars && (
        <ProjectedStarField
          stars={NEAR_STARS}
          skyboxRadius={config.starRadius}
          transitionDistance={config.transitionDistance}
          fullDistance={config.fullDistance}
          starSizeMultiplier={config.starSizeMultiplier}
          brightnessMultiplier={config.brightnessMultiplier}
          twinkleIntensity={config.twinkleIntensity}
          twinkleSpeed={config.twinkleSpeed}
          velocity={velocity}
          hyperdrive={hyperdrive}
          hyperdriveStretch={config.hyperdriveStretch}
        />
      )}
      
      {/* 
        3D Stars - actual geometry in world space.
        These fade IN as camera approaches (taking over from 2D projection).
      */}
      {config.showNearStars && NEAR_STARS.map((star) => {
        // Skip Sol (we're at Sol)
        if (star.distance === 0) return null;
        
        return (
          <Star3D
            key={star.id}
            star={star}
            transitionDistance={config.transitionDistance}
            fullDistance={config.fullDistance}
            starScale={config.nearStarScale}
            glowIntensity={config.nearStarGlow}
          />
        );
      })}
    </>
  );
}

export function StarBoxScene({ config }: StarBoxSceneProps) {
  const [cameraPosition, setCameraPosition] = useState(new THREE.Vector3(0, 0, 0));
  const [velocity, setVelocity] = useState(new THREE.Vector3(0, 0, 0));
  const [hyperdrive, setHyperdrive] = useState(false);
  
  const handlePositionChange = useCallback((position: THREE.Vector3) => {
    setCameraPosition(position.clone());
  }, []);
  
  const handleVelocityChange = useCallback((vel: THREE.Vector3) => {
    setVelocity(vel.clone());
    // Detect hyperdrive based on speed (H key toggle is in FlightControls)
    // We check if we're moving very fast
  }, []);

  return (
    <Canvas
      gl={{ 
        antialias: true, 
        alpha: false,
        powerPreference: 'high-performance',
      }}
      dpr={[1, 2]}
    >
      <PerspectiveCamera 
        makeDefault 
        position={[0, 0, 0.1]} 
        fov={75}
        near={0.001}
        far={config.starRadius * 3}
      />
      
      {/* Flight controls - click canvas to enable mouse look, H for hyperdrive */}
      {config.flightEnabled && (
        <FlightControls
          speed={config.flightSpeed}
          rotationSpeed={0.002}
          enabled={config.flightEnabled}
          onPositionChange={handlePositionChange}
          onVelocityChange={handleVelocityChange}
        />
      )}
      
      <Suspense fallback={null}>
        <Scene 
          config={config} 
          cameraPosition={cameraPosition}
          velocity={velocity}
          hyperdrive={hyperdrive}
        />
      </Suspense>
    </Canvas>
  );
}
