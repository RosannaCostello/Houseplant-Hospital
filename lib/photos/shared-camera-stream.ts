/**
 * Shared getUserMedia stream for plant photos (HIL-121 / HIL-124).
 *
 * iPad Safari re-prompts camera permission after video tracks are stopped, and
 * often ends the capture session when no <video> is attached. Keep one live
 * stream + a hidden keep-alive video while any photo-capture UI is mounted;
 * only stop when the last holder unmounts (leaving photos step / Update plant).
 */

let sharedStream: MediaStream | null = null;
let startPromise: Promise<MediaStream> | null = null;
let holders = 0;
let keepAliveVideo: HTMLVideoElement | null = null;

function streamIsLive(stream: MediaStream | null): stream is MediaStream {
  if (!stream) return false;
  return stream.getVideoTracks().some((track) => track.readyState === "live");
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function ensureKeepAliveVideo(stream: MediaStream) {
  if (typeof document === "undefined") return;

  if (!keepAliveVideo) {
    const video = document.createElement("video");
    video.setAttribute("playsinline", "");
    video.setAttribute("muted", "");
    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;
    // Keep off-screen but attached so Safari does not tear down capture.
    video.style.cssText =
      "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:-9999px;top:0;";
    video.setAttribute("aria-hidden", "true");
    document.body.appendChild(video);
    keepAliveVideo = video;
  }

  if (keepAliveVideo.srcObject !== stream) {
    keepAliveVideo.srcObject = stream;
    void keepAliveVideo.play().catch(() => {
      // Autoplay may fail until a gesture; viewfinder play() covers that path.
    });
  }
}

function tearDownKeepAliveVideo() {
  if (!keepAliveVideo) return;
  keepAliveVideo.srcObject = null;
  keepAliveVideo.remove();
  keepAliveVideo = null;
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
  tearDownKeepAliveVideo();
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
    ensureKeepAliveVideo(sharedStream);
    return sharedStream;
  }

  // Previous session ended (Safari often stops tracks with no video attached).
  stopStream(sharedStream);
  sharedStream = null;

  if (!startPromise) {
    startPromise = startCameraStream()
      .then((stream) => {
        sharedStream = stream;
        ensureKeepAliveVideo(stream);
        stream.getVideoTracks().forEach((track) => {
          track.addEventListener("ended", () => {
            if (sharedStream === stream) {
              sharedStream = null;
            }
          });
        });
        return stream;
      })
      .finally(() => {
        startPromise = null;
      });
  }

  return startPromise;
}
