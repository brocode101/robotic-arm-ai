import { FilesetResolver, HandLandmarker, HandLandmarkerResult } from '@mediapipe/tasks-vision';

let handLandmarker: HandLandmarker | null = null;

export const initializeHandLandmarker = async () => {
  if (handLandmarker) return handLandmarker;

  try {
    // Use the specific version 0.10.14 to match package.json
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
    );
    
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
        delegate: "GPU"
      },
      runningMode: "VIDEO",
      numHands: 1,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    
    return handLandmarker;
  } catch (error) {
    console.error("Failed to initialize hand landmarker:", error);
    throw error;
  }
};

export const detectHands = (video: HTMLVideoElement, timestamp: number): HandLandmarkerResult | null => {
  if (!handLandmarker) return null;
  try {
    return handLandmarker.detectForVideo(video, timestamp);
  } catch (e) {
    console.warn("Detection error:", e);
    return null;
  }
};
