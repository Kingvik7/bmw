// Image3D.tsx
// Renders a 2D image on a plane in 3D space, supports depth occlusion with splats

"use client";

import { useLayoutEffect, useRef, type FC, useEffect } from "react";
import * as pc from "playcanvas";
import { useParent, useApp } from "@playcanvas/react/hooks";
import { type MotionValue } from "framer-motion";

interface Image3DProps {
  src: string;
  position?: [number, number, number];
  positionY?: number | MotionValue<number>;
  rotation?: [number, number, number];
  scale?: [number, number, number];
  opacity?: number | MotionValue<number>;
  doubleSided?: boolean;
}

export const Image3D: FC<Image3DProps> = ({
  src,
  position = [0, 0, 0],
  positionY,
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  opacity = 1,
  doubleSided = true,
}) => {
  const parent = useParent();
  const app = useApp();
  const entityRef = useRef<pc.Entity | null>(null);
  const textureRef = useRef<pc.Texture | null>(null);
  const materialRef = useRef<pc.StandardMaterial | null>(null);

  useLayoutEffect(() => {
    if (!app || !parent) return;

    // Create the entity for the image plane
    const entity = new pc.Entity("image3d");
    entityRef.current = entity;

    // Set initial transform (will be updated when image loads with correct aspect ratio)
    const initialY =
      positionY !== undefined
        ? typeof positionY === "object" && "get" in positionY
          ? positionY.get()
          : positionY
        : position[1];
    entity.setLocalPosition(position[0], initialY, position[2]);
    entity.setLocalEulerAngles(rotation[0], rotation[1], rotation[2]);
    entity.setLocalScale(scale[0], scale[1], scale[2]);

    // Create material first (mesh will be created after we know the aspect ratio)
    const material = new pc.StandardMaterial();
    materialRef.current = material;

    // Configure material for proper alpha transparency (PNG support)
    material.blendType = pc.BLEND_NORMAL; // Always use blending for PNG transparency
    material.depthWrite = true;
    material.depthTest = true; // Still test against depth buffer
    material.cull = doubleSided ? pc.CULLFACE_NONE : pc.CULLFACE_BACK;
    const initialOpacity =
      typeof opacity === "object" && "get" in opacity ? opacity.get() : opacity;
    material.opacity = initialOpacity;
    material.opacityMapChannel = "a"; // Use alpha channel
    material.useLighting = false;
    material.emissive = new pc.Color(1, 1, 1);
    material.alphaTest = 0.01; // Discard nearly-transparent pixels for proper occlusion

    // Load texture and create properly sized mesh
    const loadTexture = async () => {
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";

        img.onload = () => {
          // Calculate aspect ratio from the loaded image
          const aspectRatio = img.width / img.height;

          // Create a plane mesh with correct aspect ratio
          const halfWidth = 0.5 * aspectRatio;
          const halfHeight = 0.5;
          const planeMesh = pc.Mesh.fromGeometry(
            app.graphicsDevice,
            new pc.PlaneGeometry({
              halfExtents: new pc.Vec2(halfWidth, halfHeight),
            })
          );

          // Create and set up texture
          const texture = new pc.Texture(app.graphicsDevice, {
            mipmaps: true,
            minFilter: pc.FILTER_LINEAR_MIPMAP_LINEAR,
            magFilter: pc.FILTER_LINEAR,
            anisotropy: 16,
          });
          texture.setSource(img);
          textureRef.current = texture;

          // Apply texture to material
          material.emissiveMap = texture;
          material.opacityMap = texture;
          material.update();

          // Create mesh instance with the correctly sized mesh
          const meshInstance = new pc.MeshInstance(planeMesh, material);

          // Add render component
          entity.addComponent("render", {
            meshInstances: [meshInstance],
            castShadows: false,
            receiveShadows: false,
          });
        };

        img.onerror = (err) => {
          console.error("Failed to load image:", src, err);
        };

        img.src = src;
      } catch (error) {
        console.error("Error loading texture:", error);
      }
    };

    loadTexture();

    parent.addChild(entity);

    return () => {
      if (entityRef.current) {
        parent.removeChild(entityRef.current);
        entityRef.current.destroy();
      }
      if (textureRef.current) {
        textureRef.current.destroy();
      }
      if (materialRef.current) {
        materialRef.current.destroy();
      }
    };
  }, [app, parent, src, position, rotation, scale, opacity, doubleSided]);

  // Handle dynamic opacity changes (supports both number and MotionValue)
  useEffect(() => {
    const updateOpacity = (value: number) => {
      if (materialRef.current) {
        materialRef.current.opacity = value;
        materialRef.current.update();
      }
    };

    // Check if opacity is a MotionValue
    if (typeof opacity === "object" && "get" in opacity) {
      // It's a MotionValue - subscribe to changes
      const motionValue = opacity as MotionValue<number>;
      updateOpacity(motionValue.get());
      const unsubscribe = motionValue.on("change", updateOpacity);
      return () => unsubscribe();
    } else {
      // It's a plain number
      updateOpacity(opacity as number);
    }
  }, [opacity]);

  // Handle dynamic positionY changes (supports both number and MotionValue)
  useEffect(() => {
    if (positionY === undefined) return;

    const updatePositionY = (value: number) => {
      if (entityRef.current) {
        const pos = entityRef.current.getLocalPosition();
        entityRef.current.setLocalPosition(pos.x, value, pos.z);
      }
    };

    if (typeof positionY === "object" && "get" in positionY) {
      const motionValue = positionY as MotionValue<number>;
      updatePositionY(motionValue.get());
      const unsubscribe = motionValue.on("change", updatePositionY);
      return () => unsubscribe();
    } else {
      updatePositionY(positionY as number);
    }
  }, [positionY]);

  return null;
};

export default Image3D;
