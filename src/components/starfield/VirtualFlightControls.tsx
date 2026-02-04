import { useRef, useCallback, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface VirtualFlightControlsProps {
  speed: number;
  rotationSpeed: number;
  enabled: boolean;
  onVirtualPositionChange: (position: THREE.Vector3) => void;
  onVelocityChange: (velocity: THREE.Vector3) => void;
  hyperdriveMultiplier?: number;
}

const keyState: Record<string, boolean> = {};

/**
 * Virtual Flight Controls
 * 
 * The CAMERA stays at origin (0,0,0) and only rotates.
 * The VIRTUAL POSITION tracks where we "are" in space.
 * This virtual position is used to calculate star parallax on the fixed skybox.
 */
export function VirtualFlightControls({
  speed = 5,
  rotationSpeed = 0.002,
  enabled = true,
  onVirtualPositionChange,
  onVelocityChange,
  hyperdriveMultiplier = 50,
}: VirtualFlightControlsProps) {
  const { camera, gl } = useThree();
  const virtualPosition = useRef(new THREE.Vector3(0, 0, 0));
  const velocityRef = useRef(new THREE.Vector3());
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const isPointerLocked = useRef(false);
  const hyperdrive = useRef(false);

  // Keep camera at origin
  useEffect(() => {
    camera.position.set(0, 0, 0);
  }, [camera]);

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
    
    if (event.code === 'KeyH') {
      hyperdrive.current = !hyperdrive.current;
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

  useEffect(() => {
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

  useFrame((_, delta) => {
    if (!enabled) return;

    // Ensure camera stays at origin
    camera.position.set(0, 0, 0);

    const velocity = velocityRef.current;
    const currentSpeed = hyperdrive.current ? speed * hyperdriveMultiplier : speed;
    const actualSpeed = currentSpeed * delta;

    // Get direction vectors from camera rotation
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0);

    velocity.set(0, 0, 0);

    // WASD updates VIRTUAL position, not camera
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
    
    if (keyState['Space']) {
      velocity.add(up.clone().multiplyScalar(actualSpeed));
    }
    if (keyState['ShiftLeft'] || keyState['ShiftRight']) {
      velocity.add(up.clone().multiplyScalar(-actualSpeed));
    }

    if (keyState['KeyQ']) {
      velocity.multiplyScalar(3);
    }

    // Update virtual position (where we "are" in space)
    virtualPosition.current.add(velocity);

    onVirtualPositionChange(virtualPosition.current.clone());
    onVelocityChange(velocity.clone());
  });

  return null;
}

