import { useEffect, useState, useRef } from "react";
import { useApp } from "@playcanvas/react/hooks";
import { Entity } from "@playcanvas/react";
import { GSplat } from "./GSplat";
import { animate, useSpring } from "motion/react";
import { type Asset } from "playcanvas";
import { fetchAsset } from "@playcanvas/react/utils";

interface SplatProps {
  src: string;
  opacity: any;
  onLoad?: () => void;
  position?: [number, number, number];
  rotation?: [number, number, number];
  isAnimated?: boolean;
  onAnimationComplete?: () => void;
}

export default function Splat({
  src,
  opacity,
  onLoad,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  isAnimated = false,
  onAnimationComplete,
}: SplatProps) {
  const swirl = useSpring(isAnimated ? 0 : 0);
  const { data: splat } = useSplat(src);
  const hasCalledOnLoad = useRef(false);

  useEffect(() => {
    if (splat && onLoad && !hasCalledOnLoad.current) {
      onLoad();
      hasCalledOnLoad.current = true;
    }
  }, [splat, onLoad]);

  useEffect(() => {
    if (splat) {
      if (isAnimated) {
        animate(swirl, 0, {
          duration: 5,
          onComplete: onAnimationComplete,
        });
      } else {
        swirl.set(0);
      }
    }
  }, [splat, isAnimated, swirl, onAnimationComplete]);

  return (
    <Entity
      name="splat"
      rotation={rotation}
      position={position}
      scale={[1.0, 1.0, 1.0]}
    >
      <GSplat
        swirl={swirl}
        asset={splat as Asset}
        opacity={opacity}
        isAnimated={isAnimated}
      />
    </Entity>
  );
}

const useAsset = (src: string, type: string) => {
  const app = useApp();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    if (!app || !src) return;

    setLoading(true);

    fetchAsset(app, src, type, {})
      .then((result) => {
        if (isMounted) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Asset Load Error:", err);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [app, src, type]);

  return { data, loading };
};

const useSplat = (src: string) => useAsset(src, "gsplat");
