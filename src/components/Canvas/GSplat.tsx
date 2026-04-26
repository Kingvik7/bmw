"use client";

import { useLayoutEffect, useRef, type FC } from "react";
import { type Asset, type Entity as PcEntity } from "playcanvas";
import { type MotionValue } from "motion/react";
import { useParent, useApp } from "@playcanvas/react/hooks";
// @ts-ignore
import vertex from "./shaders/splat-vertex.js";

interface GsplatProps {
  asset: Asset;
  swirl: MotionValue;
  opacity: MotionValue;
  isAnimated?: boolean;
}

export const GSplat: FC<GsplatProps> = ({
  asset,
  swirl,
  opacity,
  isAnimated = true,
}) => {
  const parent: PcEntity = useParent();
  const app = useApp();
  const assetRef = useRef<PcEntity | null>(null);

  const localTimeRef = useRef(0);
  const transitionDelay = 2.0;

  useLayoutEffect(() => {
    if (!asset || !app) return;

    const instance = (asset.resource as any).instantiate({ vertex });
    assetRef.current = instance;
    parent.addChild(instance);

    const gsplatComponent = instance.gsplat;
    if (gsplatComponent?.sorter) {
      gsplatComponent.sorter.enabled = false;
    }

    const updateMaterial = () => {
      const material = instance?.gsplat?.material;
      if (!material || !instance) return;

      const currentOpacity = opacity.get();

      instance.enabled = currentOpacity > 0.01;

      material.setParameter("uTime", isAnimated ? localTimeRef.current : 999);
      material.setParameter("uSwirlAmount", swirl.get());
      material.setParameter("uOpacity", currentOpacity);
      material.setParameter("transitionDelay", transitionDelay);

      if (gsplatComponent?.sorter && instance.enabled) {
        gsplatComponent.sorter.forceUpdate = true;
      }

      app.render();
    };

    let timerHandle: number;
    if (isAnimated) {
      const runAnimation = () => {
        localTimeRef.current += 0.016;
        updateMaterial();
        timerHandle = requestAnimationFrame(runAnimation);
      };
      timerHandle = requestAnimationFrame(runAnimation);
    } else {
      updateMaterial();
    }

    const unsubOpacity = opacity.on("change", updateMaterial);
    const unsubSwirl = swirl.on("change", updateMaterial);

    return () => {
      if (timerHandle) cancelAnimationFrame(timerHandle);
      unsubOpacity();
      unsubSwirl();
      if (assetRef.current) {
        parent.removeChild(assetRef.current);
        assetRef.current.destroy();
      }
    };
  }, [asset, parent, app, isAnimated, opacity, swirl]);

  return null;
};
