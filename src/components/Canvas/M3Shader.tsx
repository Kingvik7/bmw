import { useApp } from "@playcanvas/react/hooks";
import { useLayoutEffect, useRef, useState } from "react";
import { CustomShader } from "./customShader.ts";
import { PostEffect } from "playcanvas";
import { AppBase, CameraComponent, Entity } from "playcanvas";

interface Props {
  sharpness?: number;
  enabled?: boolean;
}

/**
 * Get the currently active camera in the PlayCanvas app.
 * OR the camera with the specified name if provided.
 *
 * Note: This is not reactive to new cameras being added or removed.
 */
export function useCamera(app: AppBase, cameraEntityName?: string) {
  const cameraRef = useRef<CameraComponent | null>(null);

  /**
   * This could've been stateless, but playcanvas/react internally only
   * evaluates entities on useLayoutEffect, which means entities are not
   * available on initial render.
   */
  useLayoutEffect(() => {
    cameraRef.current = getCamera(app, cameraEntityName);
  }, [app, cameraEntityName]);

  return cameraRef;
}

export function activeCamera(app: AppBase): CameraComponent | null {
  const cameraEntities = app.systems.camera;
  if (!cameraEntities || !cameraEntities.cameras) return null;
  return cameraEntities.cameras[cameraEntities.cameras.length - 1];
}

export function getCamera(
  app: AppBase,
  cameraName?: string
): CameraComponent | null {
  if (!cameraName) return activeCamera(app);

  const cameraEntity = app.root.findByName(cameraName) as Entity | null;
  if (cameraEntity && cameraEntity.camera) return cameraEntity.camera;

  console.warn(
    `Camera entity with name "${cameraName}" not found. Using last camera found.`
  );
  return activeCamera(app);
}

/** Checks if a post-processing effect is already present in the camera's post-effects queue. */
function findDuplicateEffect(camera: CameraComponent, effect: PostEffect) {
  return camera.postEffects.effects.find(
    (postEffect) => postEffect.effect === effect
  );
}

/** Adds a post-processing effect to the camera's post-effects queue if it is not already present. */
export function addQueueEntry(camera: CameraComponent, effect: PostEffect) {
  if (!findDuplicateEffect(camera, effect))
    camera.postEffects.addEffect(effect);
}

/** Removes a post-processing effect from the camera's post-effects queue. */
export function removeQueueEntry(camera: CameraComponent, effect: PostEffect) {
  camera.postEffects.removeEffect(effect);
}

/**
 * Adds Contrast Adaptive Sharpening (CAS) effect to the camera post-effects
 * queue.
 *
 * @see {@link FSR-CAS|https://gpuopen.com/fidelityfx-cas/}
 *
 * @param [sharpness=0.2] - Sharpness level, range [0, 1].
 * @param [enabled=true] - Whether the effect is enabled.
 */
export function M3Shader({ sharpness = 0.2, enabled = true }: Props) {
  const app = useApp();
  const camera = useCamera(app);
  // Use state to manage the effect instance so effects re-run when it's created
  const [effect, setEffect] = useState<CustomShader | null>(null);

  // Create/Destroy Shader
  useLayoutEffect(() => {
    const instance = new CustomShader(app.graphicsDevice, sharpness);
    setEffect(instance);

    return () => {
      instance.destroy();
      setEffect(null);
    };
  }, [app]); // app is stable

  // Update Sharpness
  useLayoutEffect(() => {
    if (effect) {
      effect.sharpness = sharpness;
    }
  }, [effect, sharpness]);

  // Add/Remove from Camera Queue
  useLayoutEffect(() => {
    const cameraInstance = camera.current;
    if (!cameraInstance || !effect) return;

    if (enabled) {
      addQueueEntry(cameraInstance, effect);
    } else {
      removeQueueEntry(cameraInstance, effect);
    }

    return () => removeQueueEntry(cameraInstance, effect);
  }, [camera, effect, enabled]);

  return null;
}
