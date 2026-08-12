/**
 * Shared getUserMedia stream for plant photos (HIL-121).
 *
 * iPad Safari re-prompts camera permission after video tracks are stopped.
 * Keep one live stream while any photo-capture UI is mounted; only stop when
 * the last holder unmounts (leaving photos step / Update plant).
 */

let sharedStream: MediaStream | null = null;
let startPromise: Promise<MediaStream> | null = null;
let holders = 0;

function streamIsLive(stream: MediaStream | null): stream is MediaStream {
  if (!stream) return false;
  return stream.getVideoTracks().some((track) => track.readyState === "live");
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

async function startCameraStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera is not available in this browser. Use Library instead.");
  }

  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1600 },
        height: { ideal: 1200 },
      },
    });
  } catch {
    return navigator.mediaDevices.getUserMedia({
      audio: false,
      video: true,
    });
  }
}

/** Keep the shared stream until the last photo-capture UI unmounts. */
export function retainSharedCameraStream(): void {
  holders += 1;
}

export function releaseSharedCameraStream(): void {
  holders = Math.max(0, holders - 1);
  if (holders > 0) return;
  stopStream(sharedStream);
  sharedStream = null;
  startPromise = null;
}

/**
 * Return a live camera stream, starting getUserMedia only if needed.
 * Must be called from a user gesture the first time (Take photo).
 */
export async function acquireSharedCameraStream(): Promise<MediaStream> {
  if (streamIsLive(sharedStream)) {
    return sharedStream;
  }

  if (!startPromise) {
    startPromise = startCameraStream()
      .then((stream) => {
        sharedStream = stream;
        return stream;
      })
      .finally(() => {
        startPromise = null;
      });
  }

  return startPromise;
}
