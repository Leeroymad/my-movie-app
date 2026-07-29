export const qualityFromHeight = (h: number) =>
  h >= 2160 ? "4K" : h >= 1440 ? "1440p" : h >= 1080 ? "1080p" : h >= 720 ? "720p" : h >= 480 ? "480p" : "SD";

export const QUALITY_RANK: Record<string, number> = {
  SD: 0, "480p": 480, "720p": 720, "1080p": 1080, "1440p": 1440, "4K": 2160,
};

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 MB";
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export function formatDuration(sec: number): string {
  if (!sec || !isFinite(sec)) return "";
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const sanitizeFilename = (name: string) =>
  name.replace(/[\\/:*?"<>|#%&{}$!'@+`=~^ ]/g, "_").slice(0, 120);

/**
 * Save a file directly to the user's device (Downloads folder on PC/Android,
 * Files/Share sheet on iOS). Same-origin URLs use a native attachment download;
 * remote URLs are fetched as a blob first.
 */
export async function saveToDevice(url: string, filename: string): Promise<boolean> {
  const safe = sanitizeFilename(filename);
  try {
    if (url.startsWith("/")) {
      const a = document.createElement("a");
      a.href = `${url}${url.includes("?") ? "&" : "?"}name=${encodeURIComponent(safe)}`;
      a.download = safe;
      document.body.appendChild(a);
      a.click();
      a.remove();
      return true;
    }
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const obj = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = obj;
    a.download = safe;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(obj), 4000);
    return true;
  } catch {
    window.open(url, "_blank", "noopener");
    return false;
  }
}

/** Probe a local video File: resolution, duration, codec, generated poster frame. */
export function analyzeVideoFile(file: File): Promise<{
  width: number; height: number; durationSec: number; codec: string;
  quality: string; posterBlob: Blob | null;
}> {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    const fail = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 0, height: 0, durationSec: 0, codec: file.type || "video/mp4", quality: "SD", posterBlob: null });
    };

    const timeout = setTimeout(fail, 12000);

    video.onloadedmetadata = () => {
      const seekTo = Math.min(1.2, (video.duration || 2) / 3);
      const tryCapture = () => {
        let posterBlob: Blob | null = null;
        try {
          const canvas = document.createElement("canvas");
          const scale = 640 / (video.videoWidth || 640);
          canvas.width = 640;
          canvas.height = Math.round((video.videoHeight || 360) * scale);
          canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
          if (dataUrl.length > 2000) {
            // dataURL -> Blob via fetch on data URI is sync-safe
            const bin = atob(dataUrl.split(",")[1]);
            const arr = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
            posterBlob = new Blob([arr], { type: "image/jpeg" });
          }
        } catch { posterBlob = null; }
        clearTimeout(timeout);
        URL.revokeObjectURL(url);
        resolve({
          width: video.videoWidth || 0,
          height: video.videoHeight || 0,
          durationSec: video.duration || 0,
          codec: file.type || "video/mp4",
          quality: qualityFromHeight(video.videoHeight || 0),
          posterBlob,
        });
      };
      video.onseeked = tryCapture;
      try { video.currentTime = seekTo; } catch { tryCapture(); }
      setTimeout(() => { if (!video.onseeked) tryCapture(); }, 3000);
    };
    video.onerror = fail;
  });
}
