import { Link, createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Joystick, JoystickShape } from "react-joystick-component";
import type { IJoystickUpdateEvent } from "react-joystick-component/build/lib/Joystick";
import logo from "../logo.svg";

export const Route = createFileRoute("/")({
	component: App,
});

interface JoystickData {
	x?: number;
	y?: number;
}

function App() {
	const [leftJoystick, setLeftJoystick] = useState<JoystickData>({
		x: 0,
		y: 0,
	});
	const [rightJoystick, setRightJoystick] = useState<JoystickData>({
		x: 0,
		y: 0,
	});
	const [connectionStatus, setConnectionStatus] = useState<
		"connecting" | "connected" | "disconnected"
	>("disconnected");

	const wsRef = useRef<WebSocket | null>(null);

	useEffect(() => {
		const connectWebSocket = () => {
			try {
				setConnectionStatus("connecting");
				wsRef.current = new WebSocket("ws://192.168.1.50:8000/ws");

				wsRef.current.onopen = () => {
					console.log("WebSocket connected");
					setConnectionStatus("connected");
				};

				wsRef.current.onclose = () => {
					console.log("WebSocket disconnected");
					setConnectionStatus("disconnected");
					// Attempt to reconnect after 3 seconds
					setTimeout(connectWebSocket, 3000);
				};

				wsRef.current.onerror = (error) => {
					console.error("WebSocket error:", error);
					setConnectionStatus("disconnected");
				};
			} catch (error) {
				console.error("Failed to connect WebSocket:", error);
				setConnectionStatus("disconnected");
			}
		};

		connectWebSocket();

		return () => {
			if (wsRef.current) {
				wsRef.current.close();
			}
		};
	}, []);

	// Send joystick data via WebSocket
	const sendJoystickData = (left: JoystickData, right: JoystickData) => {
		if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
			const data = {
				type: "joystick_data",
				timestamp: Date.now(),
				left: {
					x: Number((left.x ?? 0).toFixed(5)),
					y: Number((left.y ?? 0).toFixed(5)),
				},
				right: {
					x: Number((right.x ?? 0).toFixed(5)),
					y: Number((right.y ?? 0).toFixed(5)),
				},
			};

			wsRef.current.send(JSON.stringify(data));
		}
	};

	const handleStop = (isLeft: boolean) => {
		const newLeft = isLeft ? { x: 0, y: 0 } : leftJoystick;
		const newRight = isLeft ? rightJoystick : { x: 0, y: 0 };

		if (isLeft) {
			setLeftJoystick(newLeft);
		} else {
			setRightJoystick(newRight);
		}

		sendJoystickData(newLeft, newRight);
	};

	const handleLeftJoystickMove = (event: IJoystickUpdateEvent) => {
		const newLeft = { x: event.x ?? 0, y: event.y ?? 0 };
		setLeftJoystick(newLeft);
		sendJoystickData(newLeft, rightJoystick);
	};

	const handleRightJoystickMove = (event: IJoystickUpdateEvent) => {
		const newRight = { x: event.x ?? 0, y: event.y ?? 0 };
		setRightJoystick(newRight);
		sendJoystickData(leftJoystick, newRight);
	};

	return (
		<div className="relative w-full h-screen overflow-hidden">
			<img
				src="https://picsum.photos/id/17/1920/1080"
				alt="MJPEG Stream"
				className="absolute inset-0 w-full h-full object-cover"
			/>

			<div className="absolute top-0 left-0 right-0 z-10 flex justify-between items-center bg-slate-300/40 backdrop-blur-xs">
				<div className="flex items-center">
					<img src={logo} alt="Logo" className="h-12 w-12 ml-1" />
					<div
						className={`ml-2 w-3 h-3 rounded-full ${
							connectionStatus === "connected"
								? "bg-green-500"
								: connectionStatus === "connecting"
									? "bg-yellow-500"
									: "bg-red-500"
						}`}
						title={`WebSocket ${connectionStatus}`}
					/>
				</div>

				<div className="flex items-center gap-4">
					<div className="text-black px-3 py-2 rounded-lg font-mono text-sm">
						<div>
							L: {leftJoystick.x?.toString()}, {leftJoystick.y?.toString()}
						</div>
						<div>
							R: {rightJoystick.x?.toString()}, {rightJoystick.y?.toString()}
						</div>
					</div>

					<Link
						to="/settings"
						className="bg-slate-500/70 text-black p-2 rounded-lg mr-2"
					>
						<Settings size={24} />
					</Link>
				</div>
			</div>

			<div className="absolute bottom-8 left-8 z-10">
				<Joystick
					size={240}
					sticky={false}
					baseColor="rgba(200, 200, 200, 0.2)"
					stickColor="rgba(200, 200, 200, 0.8)"
					baseShape={JoystickShape.AxisX}
					move={handleLeftJoystickMove}
					stop={() => handleStop(true)}
				/>
			</div>

			<div className="absolute bottom-8 right-8 z-10">
				<Joystick
					size={240}
					sticky={false}
					baseColor="rgba(200, 200, 200, 0.2)"
					stickColor="rgba(200, 200, 200, 0.8)"
					baseShape={JoystickShape.AxisY}
					move={handleRightJoystickMove}
					stop={() => handleStop(false)}
				/>
			</div>
		</div>
	);
}
