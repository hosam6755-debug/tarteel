/**
 * High-performance In-Memory Asset Cache for Tarteel Video Studio
 * Caches decoded AudioBuffers, Images, Videos, and Logos to eliminate redundant network & CPU work
 */

const audioBufferCache = new Map();
const arrayBufferCache = new Map();
const imageCache = new Map();
const videoCache = new Map();
let preloadedWatermark = null;
let fontsReadyPromise = null;

/**
 * Fetch and cache raw ArrayBuffer from URL
 */
export async function getCachedArrayBuffer(url) {
  if (arrayBufferCache.has(url)) {
    return arrayBufferCache.get(url);
  }
  const res = await fetch(url, { mode: 'cors' });
  if (!res.ok) throw new Error(`فشل تحميل الملف الصوتي: ${res.statusText}`);
  const buffer = await res.arrayBuffer();
  arrayBufferCache.set(url, buffer);
  return buffer;
}

/**
 * Decode and cache WebAudio AudioBuffer
 */
export async function getCachedAudioBuffer(url, audioCtx) {
  const cacheKey = `${url}_${audioCtx.sampleRate}`;
  if (audioBufferCache.has(cacheKey)) {
    return audioBufferCache.get(cacheKey);
  }

  const arrayBuffer = await getCachedArrayBuffer(url);
  // Clone ArrayBuffer because decodeAudioData detaches the buffer in some browser engines
  const cloned = arrayBuffer.slice(0);
  const audioBuffer = await audioCtx.decodeAudioData(cloned);
  audioBufferCache.set(cacheKey, audioBuffer);
  return audioBuffer;
}

/**
 * Preload and cache image element
 */
export async function getCachedImage(url) {
  if (!url) return null;
  if (imageCache.has(url)) {
    const existing = imageCache.get(url);
    if (existing.complete && existing.naturalWidth > 0) return existing;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageCache.set(url, img);
      resolve(img);
    };
    img.onerror = () => {
      resolve(null);
    };
    img.src = url;
  });
}

/**
 * Preload and cache video element
 */
export async function getCachedVideo(url) {
  if (!url) return null;
  if (videoCache.has(url)) {
    return videoCache.get(url);
  }

  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.src = url;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.onloadeddata = () => {
      videoCache.set(url, video);
      resolve(video);
    };
    video.onerror = () => resolve(null);
  });
}

/**
 * Preload and cache Tarteel Watermark SVG Logo
 */
export async function getPreloadedWatermark() {
  if (preloadedWatermark && preloadedWatermark.complete && preloadedWatermark.naturalWidth > 0) {
    return preloadedWatermark;
  }
  preloadedWatermark = await getCachedImage('/tarteel-logo.svg');
  return preloadedWatermark;
}

/**
 * Ensure Quranic fonts are loaded and ready
 */
export async function ensureFontsReady() {
  if (!fontsReadyPromise) {
    fontsReadyPromise = document.fonts ? document.fonts.ready : Promise.resolve();
  }
  return fontsReadyPromise;
}
