import { Application, Entity } from "@playcanvas/react";
import { Camera } from "@playcanvas/react/components";
import { useApp } from "@playcanvas/react/hooks";
import { OrbitControls } from "@playcanvas/react/scripts";
import { AnimatePresence, motion, useMotionValue } from "framer-motion";
import type * as pc from "playcanvas";
import { FILLMODE_FILL_WINDOW, RESOLUTION_AUTO } from "playcanvas";
import { useCallback, useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { M3Shader } from "./M3Shader";
import Splat from "./Splat";

interface SceneProps {
	splatLoaded: boolean;
	setSplatLoaded: (val: boolean) => void;
	enableAnimation: boolean;
}

export default function Canvas() {
	const [splatLoaded, setSplatLoaded] = useState(false);
	const [enableAnimation] = useState(true);
	const [canvasReady, setCanvasReady] = useState(false);

	useEffect(() => {
		const timer = setTimeout(() => setCanvasReady(true), 1000);
		return () => clearTimeout(timer);
	}, []);

	return (
		<CanvasWrapper>
			{canvasReady && (
				<Application
					autoRender={false}
					fillMode={FILLMODE_FILL_WINDOW}
					resolutionMode={RESOLUTION_AUTO}
					graphicsDeviceOptions={{
						antialias: false,
						powerPreference: "low-power",
					}}
					style={{
						opacity: splatLoaded ? 1 : 0,
						transition: "opacity 1s ease",
					}}
				>
					<Scene
						splatLoaded={splatLoaded}
						setSplatLoaded={setSplatLoaded}
						enableAnimation={enableAnimation}
					/>
				</Application>
			)}

			<InteractionOverlay splatLoaded={splatLoaded} />
		</CanvasWrapper>
	);
}

function InteractionOverlay({ splatLoaded }: { splatLoaded: boolean }) {
	return (
		<OverlayWrapper>
			<AnimatePresence>
				{!splatLoaded && (
					<LoadingOverlay
						initial={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.8, ease: "easeInOut", delay: 1.0 }}
					>
						<motion.div
							style={{
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								gap: "1rem",
							}}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.5, ease: "easeInOut" }}
						>
							<IOSSpinner />
							<LoadingText>Loading</LoadingText>
						</motion.div>
					</LoadingOverlay>
				)}
			</AnimatePresence>
		</OverlayWrapper>
	);
}

function Scene({ splatLoaded, setSplatLoaded, enableAnimation }: SceneProps) {
	const cameraEntityRef = useRef<pc.Entity | null>(null);
	const app = useApp();
	const splatOpacity = useMotionValue(1);
	const animationStarted = useRef(false);

	useEffect(() => {
		if (!app || !cameraEntityRef.current) return;

		const orbitScript = cameraEntityRef.current.script?.get(
			"orbitCamera",
		) as any;
		if (!orbitScript) return;

		const handleCameraMove = () => {
			app.render();
		};

		orbitScript.on("postUpdate", handleCameraMove);

		return () => {
			orbitScript.off("postUpdate", handleCameraMove);
		};
	}, [app, splatLoaded]);

	// Monkey-patch to disable panning
	useEffect(() => {
		if (!cameraEntityRef.current) return;

		const cameraEntity = cameraEntityRef.current;

		// Helper to disable pan on a script instance
		const disablePan = (scriptName: string) => {
			const script = cameraEntity.script?.get(scriptName) as any;
			if (script) {
				script.pan = () => {
					/* Panning disabled */
				};
			}
		};

		// Try to disable immediately and also when scripts are added
		disablePan("orbitCameraInputMouse");
		disablePan("orbitCameraInputTouch");

		// Re-apply if scripts are added/replaced
		cameraEntity.on("script:add", (name: string) => {
			if (
				name === "orbitCameraInputMouse" ||
				name === "orbitCameraInputTouch"
			) {
				disablePan(name);
			}
		});
	}, []);

	const easeInOutQuad = (t: number) =>
		t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

	const animateCameraProperty = useCallback(
		(
			targetValue: number,
			duration: number,
			cameraEntity: pc.Entity,
			property: string,
			isCameraComponent: boolean = false, // Add a flag for FOV
		) => {
			if (!cameraEntity || !app) return;

			const startTime = performance.now();
			const orbitScript = cameraEntity.script?.get("orbitCamera") as any;

			const targetObject = isCameraComponent
				? cameraEntity.camera
				: orbitScript;
			if (!targetObject) return;

			const initialValue = targetObject[property];

			const animate = (timestamp: number) => {
				const elapsedTime = timestamp - startTime;
				const linearProgress = Math.min(elapsedTime / duration, 1);
				const easedProgress = easeInOutQuad(linearProgress);
				targetObject[property] =
					initialValue + (targetValue - initialValue) * easedProgress;

				app.render();

				if (linearProgress < 1) {
					requestAnimationFrame(animate);
				}
			};

			requestAnimationFrame(animate);
		},
		[app],
	);

	const ANIMATION_PRESETS = [
		{ distance: 10, yaw: -45, pitch: -15, fov: 35 },
		{ distance: 10, yaw: -130, pitch: -45, fov: 40 },
		{ distance: 10, yaw: 0, pitch: -55, fov: 35 },
		{ distance: 10, yaw: -90, pitch: -25, fov: 35 },
	];

	useEffect(() => {
		if (splatLoaded && cameraEntityRef.current && !animationStarted.current) {
			animationStarted.current = true;
			const duration = 5000;
			const entity = cameraEntityRef.current;
			const orbitScript = entity.script?.get("orbitCamera") as any;

			if (orbitScript) {
				const randomPreset =
					ANIMATION_PRESETS[
						Math.floor(Math.random() * ANIMATION_PRESETS.length)
					];

				animateCameraProperty(
					randomPreset.distance,
					duration,
					entity,
					"distance",
				);
				animateCameraProperty(randomPreset.yaw, duration, entity, "yaw");
				animateCameraProperty(randomPreset.pitch, duration, entity, "pitch");
				animateCameraProperty(randomPreset.fov, duration, entity, "fov", true);
			}
		}
	}, [splatLoaded, animateCameraProperty]);

	return (
		<>
			<Entity name="camera" ref={cameraEntityRef}>
				<Camera fov={55} clearColor="#BDB5AD" />
				<OrbitControls
					distanceMin={10}
					distance={12}
					distanceMax={18}
					pitchAngleMax={15}
					pitchAngleMin={5}
					inertiaFactor={0.1}
					mouse={{
						orbitSensitivity: 0.15,
						distanceSensitivity: 0.02,
					}}
					touch={{
						orbitSensitivity: 0.15,
						distanceSensitivity: 0.02,
					}}
				/>
			</Entity>

			<Splat
				src="/splats/bmw.ply"
				opacity={splatOpacity}
				position={[0, -0.5, 0]}
				rotation={[0, 180, 0]}
				onLoad={() => setSplatLoaded(true)}
				isAnimated={enableAnimation}
			/>

			<M3Shader sharpness={1.0} />
		</>
	);
}

const fade = keyframes`
  0% { opacity: 1; }
  100% { opacity: 0.15; }
`;

const CanvasWrapper = styled.div`
  width: 100%;
  height: 100vh;
  z-index: 5;
  position: relative;
  background: #bfc4cc;
`;

const OverlayWrapper = styled.div`
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const SpinnerContainer = styled.div`
  position: relative;
  width: 25px;
  height: 25px;
  display: flex;
  justify-content: center;
`;

const SpinnerTick = styled.div`
  animation: ${fade} 1.2s linear infinite;
  background: #ffffffc3;
  border-radius: 5px;
  height: 25%;
  width: 2px;
  position: absolute;
  top: 0;
  transform-origin: center 180%;
`;

const LoadingText = styled.div`
  font-size: 1rem;
  font-weight: 700;
  color: #ffffffc9;
`;

const LoadingOverlay = styled(motion.div)`
  position: absolute;
  inset: 0;
  display: flex;
  gap: 10px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: black;
  z-index: 10;
  pointer-events: none;
`;

const IOSSpinner = () => (
	<SpinnerContainer>
		{Array.from({ length: 12 }).map((_, i) => (
			<SpinnerTick
				key={i}
				style={{
					transform: `rotate(${i * 30}deg)`,
					animationDelay: `-${1.1 - i * 0.1}s`,
				}}
			/>
		))}
	</SpinnerContainer>
);
