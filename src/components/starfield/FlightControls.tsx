import { useRef, useCallback, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface FlightControlsProps {
  speed: number;
  rotationSpeed: number;
  enabled: boolean;
  onPositionChange?: (position: THREE.Vector3) => void;
  onVelocityChange?: (velocity: THREE.Vector3) => void;
  hyperdriveMultiplier?: number;
}

const keyState: Record<string, boolean> = {};

export function FlightControls({
  speed = 5,
  rotationSpeed = 0.002,
  enabled = true,
  onPositionChange,
  onVelocityChange,
  hyperdriveMultiplier = 50,
}: FlightControlsProps) {
  const { camera, gl } = useThree();
  const velocityRef = useRef(new THREE.Vector3());
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const isPointerLocked = useRef(false);
  const [hyperdrive, setHyperdrive] = useState(false);

  const onMouseMove = useCallback((event: MouseEvent) => {
    if (!enabled || !isPointerLocked.current) return;

    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;

    euler.current.setFromQuaternion(camera.quaternion);
    euler.current.y -= movementX * rotationSpeed;
    euler.current.x -= movementY * rotationSpeed;
    euler.current.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, euler.current.x));

    camera.quaternion.setFromEuler(euler.current);
  }, [camera, enabled, rotationSpeed]);

  const onKeyDown = useCallback((event: KeyboardEvent) => {
    keyState[event.code] = true;
    
    // Toggle hyperdrive with H
    if (event.code === 'KeyH') {
      setHyperdrive(prev => !prev);
    }
  }, []);

  const onKeyUp = useCallback((event: KeyboardEvent) => {
    keyState[event.code] = false;
  }, []);

  const onPointerLockChange = useCallback(() => {
    isPointerLocked.current = document.pointerLockElement === gl.domElement;
  }, [gl]);

  const requestPointerLock = useCallback(() => {
    if (enabled) {
      gl.domElement.requestPointerLock();
    }
  }, [enabled, gl]);

  // Setup event listeners
  useFrame(() => {}, -1); // Run before other useFrames
  
  const setupListeners = useCallback(() => {
    const canvas = gl.domElement;

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('pointerlockchange', onPointerLockChange);
    canvas.addEventListener('click', requestPointerLock);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      canvas.removeEventListener('click', requestPointerLock);
    };
  }, [gl, onMouseMove, onKeyDown, onKeyUp, onPointerLockChange, requestPointerLock]);

  // Use effect for setup
  const hasSetup = useRef(false);
  useFrame(() => {
    if (!hasSetup.current) {
      hasSetup.current = true;
      const cleanup = setupListeners();
      // Store cleanup for later (though in R3F this is tricky)
      (window as any).__flightControlsCleanup = cleanup;
    }
  });

  useFrame((_, delta) => {
    if (!enabled) return;

    const velocity = velocityRef.current;
    const currentSpeed = hyperdrive ? speed * hyperdriveMultiplier : speed;
    const actualSpeed = currentSpeed * delta;

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0);

    velocity.set(0, 0, 0);

    // WASD movement
    if (keyState['KeyW'] || keyState['ArrowUp']) {
      velocity.add(forward.clone().multiplyScalar(actualSpeed));
    }
    if (keyState['KeyS'] || keyState['ArrowDown']) {
      velocity.add(forward.clone().multiplyScalar(-actualSpeed));
    }
    if (keyState['KeyA'] || keyState['ArrowLeft']) {
      velocity.add(right.clone().multiplyScalar(-actualSpeed));
    }
    if (keyState['KeyD'] || keyState['ArrowRight']) {
      velocity.add(right.clone().multiplyScalar(actualSpeed));
    }
    
    // Vertical movement
    if (keyState['Space']) {
      velocity.add(up.clone().multiplyScalar(actualSpeed));
    }
    if (keyState['ShiftLeft'] || keyState['ShiftRight']) {
      velocity.add(up.clone().multiplyScalar(-actualSpeed));
    }

    // Boost with Q (additional boost on top of hyperdrive)
    if (keyState['KeyQ']) {
      velocity.multiplyScalar(3);
    }

    camera.position.add(velocity);

    if (velocity.length() > 0) {
      onPositionChange?.(camera.position.clone());
      onVelocityChange?.(velocity.clone());
    } else {
      onVelocityChange?.(new THREE.Vector3(0, 0, 0));
    }
  });

  return null;
}

export function useFlightState() {
  const [position, setPosition] = useState(new THREE.Vector3(0, 0, 0));
  const [velocity, setVelocity] = useState(new THREE.Vector3(0, 0, 0));
  const [hyperdrive, setHyperdrive] = useState(false);
  
  return {
    position,
    setPosition,
    velocity,
    setVelocity,
    hyperdrive,
    setHyperdrive,
  };
}
