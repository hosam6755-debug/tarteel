import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';
import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { concatenateVerseAudios, audioBufferToWav } from './audioHelper';
import {
  getCachedImage,
  getCachedVideo,
  getPreloadedWatermark,
  ensureFontsReady,
} from './assetCache';

let ffmpegInstance = null;
let isFFmpegLoading = false;

/**
 * Convert numbers to Arabic digits
 */
function toArabicDigits(num) {
  if (!num && num !== 0) return '';
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num).replace(/[0-9]/g, (w) => arabicDigits[+w]);
}

/**
 * Wrap text lines for Canvas rendering
 */
function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + ' ' + word).width;
    if (width < maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}

/**
 * Initialize FFmpeg instance
 */
export async function getFFmpeg(onLog) {
  if (ffmpegInstance && ffmpegInstance.loaded) {
    return ffmpegInstance;
  }

  if (isFFmpegLoading) {
    // Wait until loaded
    while (isFFmpegLoading) {
      await new Promise((r) => setTimeout(r, 200));
    }
    return ffmpegInstance;
  }

  isFFmpegLoading = true;
  const ffmpeg = new FFmpeg();

  ffmpeg.on('log', ({ message }) => {
    if (onLog) onLog(message);
    // console.log('[FFmpeg]', message);
  });

  try {
    // Attempt local public files first, then fallback to CDN
    const coreURL = await toBlobURL('/ffmpeg/ffmpeg-core.js', 'text/javascript').catch(() =>
      toBlobURL('https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js', 'text/javascript')
    );
    const wasmURL = await toBlobURL('/ffmpeg/ffmpeg-core.wasm', 'application/wasm').catch(() =>
      toBlobURL('https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm', 'application/wasm')
    );

    await ffmpeg.load({
      coreURL,
      wasmURL,
    });

    ffmpegInstance = ffmpeg;
    isFFmpegLoading = false;
    return ffmpeg;
  } catch (err) {
    isFFmpegLoading = false;
    console.warn('Failed to load local FFmpeg core, trying CDN...', err);
    throw err;
  }
}

/**
 * Draw a single frame to the canvas
 * textAlpha: 0-1 controls verse text opacity for smooth fade in/out transitions
 */
export function drawCanvasFrame({
  ctx,
  width,
  height,
  config,
  chapter,
  currentVerse,
  bgMediaElement,
  watermarkImg,
  textAlpha = 1,
}) {
  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // 1. Draw Background
  if (config.background?.type === 'image' && bgMediaElement) {
    // Draw image aspect fill
    const hRatio = width / bgMediaElement.width;
    const vRatio = height / bgMediaElement.height;
    const ratio = Math.max(hRatio, vRatio);
    const centerShiftX = (width - bgMediaElement.width * ratio) / 2;
    const centerShiftY = (height - bgMediaElement.height * ratio) / 2;
    ctx.drawImage(
      bgMediaElement,
      0,
      0,
      bgMediaElement.width,
      bgMediaElement.height,
      centerShiftX,
      centerShiftY,
      bgMediaElement.width * ratio,
      bgMediaElement.height * ratio
    );
  } else if (config.background?.type === 'video' && bgMediaElement) {
    // Draw video frame aspect fill
    const vw = bgMediaElement.videoWidth || 1920;
    const vh = bgMediaElement.videoHeight || 1080;
    const hRatio = width / vw;
    const vRatio = height / vh;
    const ratio = Math.max(hRatio, vRatio);
    const centerShiftX = (width - vw * ratio) / 2;
    const centerShiftY = (height - vh * ratio) / 2;
    ctx.drawImage(bgMediaElement, 0, 0, vw, vh, centerShiftX, centerShiftY, vw * ratio, vh * ratio);
  } else if (config.background?.type === 'gradient') {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#091222');
    grad.addColorStop(0.5, '#030712');
    grad.addColorStop(1, '#1b0e2b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.fillStyle = config.background?.value || '#080b11';
    ctx.fillRect(0, 0, width, height);
  }

  // 2. Darkness Overlay
  ctx.fillStyle = `rgba(0, 0, 0, ${config.bgOverlayOpacity})`;
  ctx.fillRect(0, 0, width, height);

  // 3. Decorative Frame Border
  if (config.frameStyle !== 'none') {
    const margin = width > 1200 ? 54 : 36;
    const frameW = width - margin * 2;
    const frameH = height - margin * 2;
    const borderWidth = (config.frameBorderWidth || 2) * (width / 400);

    ctx.save();
    ctx.strokeStyle = config.frameColor || '#e5b869';
    ctx.lineWidth = borderWidth;

    if (config.frameStyle === 'glow') {
      ctx.shadowColor = config.frameColor || '#e5b869';
      ctx.shadowBlur = 24;
    }

    ctx.strokeRect(margin, margin, frameW, frameH);

    // Islamic decorative corners
    if (config.frameStyle === 'islamic') {
      const cornerSize = width > 1200 ? 60 : 40;
      ctx.lineWidth = borderWidth * 1.5;
      ctx.strokeStyle = '#ffd166';

      // Top Right
      ctx.beginPath();
      ctx.moveTo(margin + frameW - cornerSize, margin - 6);
      ctx.lineTo(margin + frameW + 6, margin - 6);
      ctx.lineTo(margin + frameW + 6, margin + cornerSize);
      ctx.stroke();

      // Top Left
      ctx.beginPath();
      ctx.moveTo(margin + cornerSize, margin - 6);
      ctx.lineTo(margin - 6, margin - 6);
      ctx.lineTo(margin - 6, margin + cornerSize);
      ctx.stroke();

      // Bottom Right
      ctx.beginPath();
      ctx.moveTo(margin + frameW - cornerSize, margin + frameH + 6);
      ctx.lineTo(margin + frameW + 6, margin + frameH + 6);
      ctx.lineTo(margin + frameW + 6, margin + frameH - cornerSize);
      ctx.stroke();

      // Bottom Left
      ctx.beginPath();
      ctx.moveTo(margin + cornerSize, margin + frameH + 6);
      ctx.lineTo(margin - 6, margin + frameH + 6);
      ctx.lineTo(margin - 6, margin + frameH - cornerSize);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 4. Surah Header Badge
  ctx.save();
  const badgeText = `سورة ${chapter?.name_arabic || 'القرآن'} • الآية ${toArabicDigits(currentVerse?.verse_number)}`;
  const badgeFontSize = Math.round(width * 0.028);
  ctx.font = `700 ${badgeFontSize}px 'Cairo', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const badgePaddingX = 36;
  const badgePaddingY = 16;
  const textWidth = ctx.measureText(badgeText).width;
  const badgeW = textWidth + badgePaddingX * 2;
  const badgeH = badgeFontSize + badgePaddingY * 2;
  const badgeX = (width - badgeW) / 2;
  const badgeY = height * 0.09;

  // Badge background pill (fades with verse)
  ctx.globalAlpha = textAlpha;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, badgeH / 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(229, 184, 105, 0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Badge Text
  ctx.fillStyle = '#ffd166';
  ctx.fillText(badgeText, width / 2, badgeY + badgeH / 2);
  ctx.restore();

  // 5. Quran Verse Arabic Text (Centered) — with fade alpha
  if (currentVerse) {
    ctx.save();
    ctx.globalAlpha = textAlpha;
    // Scale font size proportionally for high-res output
    const scaleFactor = width / 400;
    const arabicFontSize = Math.round((config.quranFontSize || 30) * scaleFactor);
    ctx.font = `normal ${arabicFontSize}px ${config.quranFont || 'Amiri Quran'}, 'Amiri', serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.direction = 'rtl';

    if (config.textGlow) {
      ctx.shadowColor = config.quranTextColor || '#ffd166';
      ctx.shadowBlur = 30;
    } else {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 14;
    }
    ctx.fillStyle = config.quranTextColor || '#ffffff';

    const fullVerseText = `${currentVerse.text_uthmani} ۝${toArabicDigits(currentVerse.verse_number)}`;
    const maxTextWidth = width * 0.82;
    const lines = wrapText(ctx, fullVerseText, maxTextWidth);

    const lineHeight = arabicFontSize * 2.1;
    const totalBlockHeight = lines.length * lineHeight;
    const startY = (height - totalBlockHeight) / 2 + (config.showTranslation ? -height * 0.05 : 0);

    lines.forEach((line, idx) => {
      ctx.fillText(line, width / 2, startY + idx * lineHeight + lineHeight / 2);
    });
    ctx.restore();

    // 6. Translation Subtitles — with fade alpha
    if (config.showTranslation && currentVerse.translations?.[0]?.text) {
      ctx.save();
      ctx.globalAlpha = textAlpha;
      const transText = currentVerse.translations[0].text;
      const transFontSize = Math.round((config.translationFontSize || 16) * scaleFactor);
      ctx.font = `500 ${transFontSize}px 'Outfit', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.direction = 'ltr';

      const maxTransWidth = width * 0.78;
      const transLines = wrapText(ctx, transText, maxTransWidth);
      const transLineHeight = transFontSize * 1.5;
      const transBlockHeight = transLines.length * transLineHeight;

      const transPadX = 30;
      const transPadY = 16;
      const boxW = maxTransWidth + transPadX * 2;
      const boxH = transBlockHeight + transPadY * 2;
      const boxX = (width - boxW) / 2;
      const boxY = height * 0.82;

      // Translation card background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 16);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Translation text lines
      ctx.fillStyle = config.translationColor || '#e2e8f0';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 8;
      transLines.forEach((tLine, i) => {
        ctx.fillText(tLine, width / 2, boxY + transPadY + i * transLineHeight + transLineHeight / 2);
      });
      ctx.restore();
    }
  }

  // 7. Watermark Badge (Tarteel)
  if (config.showWatermark !== false) {
    ctx.save();
    const opacity = config.watermarkOpacity ?? 0.75;
    ctx.globalAlpha = opacity;

    const watermarkText = 'ترتيل';
    const wmFontSize = Math.max(22, Math.round(width * 0.024));
    ctx.font = `800 ${wmFontSize}px 'Cairo', sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.direction = 'rtl';

    const iconSize = Math.round(wmFontSize * 1.35);
    const textWidth = ctx.measureText(watermarkText).width;

    const padX = Math.round(wmFontSize * 0.85);
    const padY = Math.round(wmFontSize * 0.45);
    const gap = Math.round(wmFontSize * 0.4);

    const badgeW = iconSize + gap + textWidth + padX * 2;
    const badgeH = Math.max(iconSize, wmFontSize) + padY * 2;
    const margin = Math.round(width * 0.04);

    let badgeX = 0;
    let badgeY = 0;
    const pos = config.watermarkPosition || 'bottom-right';

    if (pos === 'bottom-right') {
      badgeX = width - margin - badgeW;
      badgeY = height - margin - badgeH;
    } else if (pos === 'bottom-left') {
      badgeX = margin;
      badgeY = height - margin - badgeH;
    } else if (pos === 'top-right') {
      badgeX = width - margin - badgeW;
      badgeY = margin;
    } else if (pos === 'top-left') {
      badgeX = margin;
      badgeY = margin;
    }

    // Badge Pill Background (Deep Turquoise with gold stroke)
    ctx.fillStyle = 'rgba(4, 47, 46, 0.7)';
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, badgeH / 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(229, 184, 105, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw Watermark Logo (on right in RTL)
    const iconX = badgeX + badgeW - padX - iconSize;
    const iconY = badgeY + (badgeH - iconSize) / 2;

    if (watermarkImg && watermarkImg.complete && watermarkImg.naturalWidth > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(iconX, iconY, iconSize, iconSize, iconSize * 0.22);
      ctx.clip();
      ctx.drawImage(watermarkImg, iconX, iconY, iconSize, iconSize);
      ctx.restore();
    } else {
      ctx.fillStyle = '#0d9488';
      ctx.beginPath();
      ctx.arc(iconX + iconSize / 2, iconY + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw "ترتيل" in Gold
    ctx.fillStyle = '#ffd166';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 6;
    ctx.textAlign = 'right';
    ctx.fillText(watermarkText, iconX - gap, badgeY + badgeH / 2);

    ctx.restore();
  }
}

/**
 * Ultra-fast Hardware-Accelerated Offline Rendering with WebCodecs & mp4-muxer
 */
async function renderWithWebCodecs({
  width,
  height,
  fps = 30,
  config,
  chapter,
  verses,
  combinedBuffer,
  totalDuration,
  verseTimings,
  bgMediaElement,
  watermarkImg,
  onProgress,
}) {
  onProgress({
    step: 'muxer_setup',
    progress: 35,
    message: 'جاري تهيئة مسرّع العتاد (WebCodecs) والترميز المباشر لـ MP4...',
  });

  const audioSampleRate = combinedBuffer.sampleRate || 44100;
  const audioChannels = combinedBuffer.numberOfChannels || 2;

  // 1. Configure Muxer
  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: {
      codec: 'avc',
      width,
      height,
    },
    audio: {
      codec: 'aac',
      numberOfChannels: audioChannels,
      sampleRate: audioSampleRate,
    },
    fastStart: 'in-memory',
  });

  // 2. Select compatible H.264 profile for VideoEncoder
  const candidateCodecs = ['avc1.4d002a', 'avc1.640028', 'avc1.42001f'];
  let chosenVideoCodec = null;
  for (const c of candidateCodecs) {
    const isSupp = await VideoEncoder.isConfigSupported({
      codec: c,
      width,
      height,
      bitrate: 5_000_000,
      framerate: fps,
    });
    if (isSupp.supported) {
      chosenVideoCodec = c;
      break;
    }
  }

  if (!chosenVideoCodec) {
    throw new Error('لم يتم العثور على ترميز H.264 مدعوم في كرت الشاشة على هذا المتصفح.');
  }

  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => console.error('VideoEncoder error:', e),
  });

  videoEncoder.configure({
    codec: chosenVideoCodec,
    width,
    height,
    bitrate: 5_000_000,
    framerate: fps,
  });

  // 3. Configure AudioEncoder for AAC
  const isAudioSupported = await AudioEncoder.isConfigSupported({
    codec: 'mp4a.40.2',
    sampleRate: audioSampleRate,
    numberOfChannels: audioChannels,
    bitrate: 192_000,
  });

  if (!isAudioSupported.supported) {
    throw new Error('ترميز الصوت AAC غير مدعوم بواسطة WebCodecs على هذا المتصفح.');
  }

  const audioEncoder = new AudioEncoder({
    output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
    error: (e) => console.error('AudioEncoder error:', e),
  });

  audioEncoder.configure({
    codec: 'mp4a.40.2',
    sampleRate: audioSampleRate,
    numberOfChannels: audioChannels,
    bitrate: 192_000,
  });

  // 4. Encode audio in chunks of 2048 frames
  const chunkSize = 2048;
  const totalAudioSamples = combinedBuffer.length;
  let audioOffset = 0;

  while (audioOffset < totalAudioSamples) {
    const currentChunkSize = Math.min(chunkSize, totalAudioSamples - audioOffset);
    const planarData = new Float32Array(currentChunkSize * audioChannels);

    for (let ch = 0; ch < audioChannels; ch++) {
      const chData = combinedBuffer.getChannelData(ch);
      const sub = chData.subarray(audioOffset, audioOffset + currentChunkSize);
      planarData.set(sub, ch * currentChunkSize);
    }

    const timestampMicros = Math.round((audioOffset / audioSampleRate) * 1_000_000);
    const audioData = new AudioData({
      format: 'f32-planar',
      sampleRate: audioSampleRate,
      numberOfFrames: currentChunkSize,
      numberOfChannels: audioChannels,
      timestamp: timestampMicros,
      data: planarData,
    });

    audioEncoder.encode(audioData);
    audioData.close();
    audioOffset += currentChunkSize;
  }

  // 5. Offline Frame-by-Frame Rendering on Canvas (Up to 5x-10x faster than real-time)
  console.time('⏱️ Phase 3: WebCodecs Frame Rendering');
  const renderStart = performance.now();

  const FADE_DURATION = 0.35; // seconds for fade in / fade out
  const totalFrames = Math.max(1, Math.ceil(totalDuration * fps));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Build a verse lookup map: verse_number -> verse object (O(1) lookup)
  const verseByNumber = {};
  for (const v of verses) {
    verseByNumber[v.verse_number] = v;
  }

  for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
    const timestampSec = frameIndex / fps;

    // Find the active versetiming whose window covers the current timestamp
    let activeTiming = verseTimings[verseTimings.length - 1];
    for (let i = 0; i < verseTimings.length; i++) {
      if (timestampSec <= verseTimings[i].endTime) {
        activeTiming = verseTimings[i];
        break;
      }
    }

    // Look up the verse object by verse_number (correct matching, not by index)
    const activeVerse =
      verseByNumber[activeTiming.verse_number] ||
      verses.find((v) => v.verse_key === activeTiming.verse_key) ||
      verses[0];

    // Calculate smooth fade alpha:
    // Fade IN during first FADE_DURATION seconds of the verse
    // Fade OUT during last FADE_DURATION seconds of the verse
    const verseElapsed = timestampSec - activeTiming.startTime;
    const verseDuration = activeTiming.endTime - activeTiming.startTime;
    let textAlpha = 1;
    if (verseElapsed < FADE_DURATION) {
      textAlpha = verseElapsed / FADE_DURATION; // 0 → 1 fade in
    } else if (verseDuration > FADE_DURATION * 2 && verseElapsed > verseDuration - FADE_DURATION) {
      textAlpha = (verseDuration - verseElapsed) / FADE_DURATION; // 1 → 0 fade out
    }
    textAlpha = Math.max(0, Math.min(1, textAlpha));

    // Draw frame onto canvas with correct verse and smooth alpha
    drawCanvasFrame({
      ctx,
      width,
      height,
      config,
      chapter,
      currentVerse: activeVerse,
      bgMediaElement,
      watermarkImg,
      textAlpha,
    });

    // Pass frame to GPU Hardware VideoEncoder
    const timestampMicros = Math.round(timestampSec * 1_000_000);
    const videoFrame = new VideoFrame(canvas, { timestamp: timestampMicros });
    videoEncoder.encode(videoFrame, { keyFrame: frameIndex % 60 === 0 });
    videoFrame.close();

    // Yield control periodically to avoid UI blocking and provide precise progress
    if (frameIndex % 12 === 0 || frameIndex === totalFrames - 1) {
      const elapsed = (performance.now() - renderStart) / 1000;
      const currentFps = Math.round((frameIndex + 1) / Math.max(0.1, elapsed));
      const percent = Math.min(94, 38 + Math.round((frameIndex / totalFrames) * 56));

      onProgress({
        step: 'encoding_frames',
        progress: percent,
        message: `جاري الرسم والترميز العتادي: إطار ${frameIndex + 1} من ${totalFrames} (${currentFps} إطار/ث)...`,
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  console.timeEnd('⏱️ Phase 3: WebCodecs Frame Rendering');
  const tRender = performance.now() - renderStart;

  // 6. Finalize Encoders and Multiplex to MP4
  console.time('⏱️ Phase 4: WebCodecs Finalizing & MP4 Muxing');
  const transcodeStart = performance.now();

  onProgress({
    step: 'finalizing',
    progress: 96,
    message: 'جاري تجميع ملف MP4 النهائي وترتيب مسارات الفيديو والصوت...',
  });

  await videoEncoder.flush();
  await audioEncoder.flush();
  videoEncoder.close();
  audioEncoder.close();

  muxer.finalize();
  const buffer = muxer.target.buffer;
  const mp4Blob = new Blob([buffer], { type: 'video/mp4' });
  const videoUrl = URL.createObjectURL(mp4Blob);

  console.timeEnd('⏱️ Phase 4: WebCodecs Finalizing & MP4 Muxing');
  const tTranscode = performance.now() - transcodeStart;

  onProgress({
    step: 'complete',
    progress: 100,
    message: 'تم توليد الفيديو بنجاح فائق السرعة! جاهز للتحميل والمشاركة.',
  });

  return {
    videoUrl,
    blob: mp4Blob,
    filename: `tarteel_${chapter.id}_${verses[0].verse_number}-${verses[verses.length - 1].verse_number}.mp4`,
    timings: {
      engine: 'WebCodecs (Hardware-Accelerated)',
      renderMs: tRender,
      transcodeMs: tTranscode,
    },
  };
}

/**
 * Fallback Engine: Real-time MediaRecorder + FFmpeg.wasm Transcoding
 */
async function renderWithFFmpegFallback({
  width,
  height,
  canvas,
  ctx,
  config,
  chapter,
  verses,
  combinedBuffer,
  totalDuration,
  verseTimings,
  audioCtx,
  bgMediaElement,
  watermarkImg,
  onProgress,
}) {
  onProgress({
    step: 'recording',
    progress: 45,
    message: 'جاري تسجيل ورسم إطارات الفيديو عالية الدقة المتزامنة مع الصوت...',
  });

  // Setup WebAudio stream destination
  const audioDestination = audioCtx.createMediaStreamDestination();
  const audioSource = audioCtx.createBufferSource();
  audioSource.buffer = combinedBuffer;
  audioSource.connect(audioDestination);

  // Combine Canvas stream and WebAudio stream
  const canvasStream = canvas.captureStream(30); // 30 FPS
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...audioDestination.stream.getAudioTracks(),
  ]);

  const mimeTypes = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];
  let chosenMime = mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) || 'video/webm';

  const recorder = new MediaRecorder(combinedStream, {
    mimeType: chosenMime,
    videoBitsPerSecond: 6000000,
  });

  const recordedChunks = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) recordedChunks.push(e.data);
  };

  const startTime = performance.now();
  let animationFrameId = null;
  const FADE_DURATION = 0.35;

  // Build verse lookup map by verse_number
  const verseByNumber = {};
  for (const v of verses) {
    verseByNumber[v.verse_number] = v;
  }

  console.time('⏱️ Phase 3: Realtime Frame Recording (MediaRecorder)');
  recorder.start(100);
  audioSource.start(0);

  await new Promise((resolve) => {
    function renderLoop() {
      const elapsed = (performance.now() - startTime) / 1000;

      // Find active timing by timestamp (not by index)
      let activeTiming = verseTimings[verseTimings.length - 1];
      for (let i = 0; i < verseTimings.length; i++) {
        if (elapsed <= verseTimings[i].endTime) {
          activeTiming = verseTimings[i];
          break;
        }
      }

      // Match verse object by verse_number (correct, not by index)
      const activeVerse =
        verseByNumber[activeTiming.verse_number] ||
        verses.find((v) => v.verse_key === activeTiming.verse_key) ||
        verses[0];

      // Smooth fade alpha
      const verseElapsed = elapsed - activeTiming.startTime;
      const verseDuration = activeTiming.endTime - activeTiming.startTime;
      let textAlpha = 1;
      if (verseElapsed < FADE_DURATION) {
        textAlpha = verseElapsed / FADE_DURATION;
      } else if (verseDuration > FADE_DURATION * 2 && verseElapsed > verseDuration - FADE_DURATION) {
        textAlpha = (verseDuration - verseElapsed) / FADE_DURATION;
      }
      textAlpha = Math.max(0, Math.min(1, textAlpha));

      drawCanvasFrame({
        ctx,
        width,
        height,
        config,
        chapter,
        currentVerse: activeVerse,
        bgMediaElement,
        watermarkImg,
        textAlpha,
      });

      const percent = Math.min(85, 45 + Math.round((elapsed / totalDuration) * 40));
      onProgress({
        step: 'recording_progress',
        progress: percent,
        message: `جاري التسجيل: ${Math.round(elapsed)} ثانية / ${Math.ceil(totalDuration)} ثانية...`,
      });

      if (elapsed < totalDuration + 0.5) {
        animationFrameId = requestAnimationFrame(renderLoop);
      } else {
        cancelAnimationFrame(animationFrameId);
        recorder.onstop = resolve;
        recorder.stop();
        audioSource.stop();
        if (bgMediaElement && bgMediaElement.pause) bgMediaElement.pause();
      }
    }

    animationFrameId = requestAnimationFrame(renderLoop);
  });

  console.timeEnd('⏱️ Phase 3: Realtime Frame Recording (MediaRecorder)');
  const tRender = performance.now() - startTime;

  const recordedBlob = new Blob(recordedChunks, { type: chosenMime });

  console.time('⏱️ Phase 4: FFmpeg.wasm Transcoding to MP4');
  const transcodeStart = performance.now();

  onProgress({
    step: 'ffmpeg_transcode',
    progress: 88,
    message: 'جاري تشغيل ffmpeg.wasm لإنتاج ملف MP4 متوافق مع كافة المنصات...',
  });

  try {
    const ffmpeg = await getFFmpeg((logMsg) => {});
    const inputData = await fetchFile(recordedBlob);
    await ffmpeg.writeFile('input.webm', inputData);

    onProgress({
      step: 'ffmpeg_encoding',
      progress: 92,
      message: 'جاري ضغط وترميز H.264 و AAC داخل المتصفح...',
    });

    await ffmpeg.exec([
      '-i',
      'input.webm',
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-crf',
      '23',
      '-r',
      '30',
      '-vf',
      'scale=trunc(iw/2)*2:trunc(ih/2)*2',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-ar',
      '44100',
      '-movflags',
      '+faststart',
      '-metadata',
      'title=ترتيل | Tarteel - صانع فيديوهات القرآن الكريم',
      '-metadata',
      'artist=ترتيل (Tarteel)',
      '-metadata',
      'comment=تم الإنشاء بواسطة منصة ترتيل Tarteel',
      'output.mp4',
    ]);

    const outputData = await ffmpeg.readFile('output.mp4');
    const mp4Blob = new Blob([outputData.buffer], { type: 'video/mp4' });
    const videoUrl = URL.createObjectURL(mp4Blob);

    try {
      await ffmpeg.deleteFile('input.webm');
      await ffmpeg.deleteFile('output.mp4');
    } catch (e) {}

    console.timeEnd('⏱️ Phase 4: FFmpeg.wasm Transcoding to MP4');
    const tTranscode = performance.now() - transcodeStart;

    onProgress({
      step: 'complete',
      progress: 100,
      message: 'تم توليد الفيديو بنجاح! جاهز للتحميل والمشاركة.',
    });

    return {
      videoUrl,
      blob: mp4Blob,
      filename: `tarteel_${chapter.id}_${verses[0].verse_number}-${verses[verses.length - 1].verse_number}.mp4`,
      timings: {
        engine: 'FFmpeg.wasm (Software Fallback)',
        renderMs: tRender,
        transcodeMs: tTranscode,
      },
    };
  } catch (ffmpegErr) {
    console.warn('FFmpeg conversion fallback to direct blob:', ffmpegErr);
    console.timeEnd('⏱️ Phase 4: FFmpeg.wasm Transcoding to MP4');
    const tTranscode = performance.now() - transcodeStart;
    const fallbackUrl = URL.createObjectURL(recordedBlob);
    const ext = chosenMime.includes('mp4') ? 'mp4' : 'webm';

    onProgress({
      step: 'complete',
      progress: 100,
      message: 'تم إنشاء الفيديو بجودة فائقة! جاهز للتحميل.',
    });

    return {
      videoUrl: fallbackUrl,
      blob: recordedBlob,
      filename: `tarteel_${chapter.id}_${verses[0].verse_number}-${verses[verses.length - 1].verse_number}.${ext}`,
      timings: {
        engine: 'Direct Blob (FFmpeg Skipped)',
        renderMs: tRender,
        transcodeMs: tTranscode,
      },
    };
  }
}

/**
 * Main Entry: Generate Quran Video with Automatic Hardware Acceleration & Caching
 */
export async function generateQuranVideo({
  config,
  chapter,
  verses,
  audioList,
  onProgress,
}) {
  console.log('🚀 [START VIDEO GENERATION PROFILE]');
  const tTotalStart = performance.now();

  onProgress({
    step: 'init',
    progress: 5,
    message: 'جاري تهيئة بيئة المعالجة والذكاء القرآني...',
  });

  // Step 1: Concatenate audio files and compute verse timings (uses memory cache)
  console.time('⏱️ Phase 1: Audio Fetch & Concatenation');
  const tAudioStart = performance.now();
  onProgress({
    step: 'audio',
    progress: 15,
    message: 'جاري استرجاع تلاوة الآيات العطرة ومعالجتها...',
  });

  const { combinedBuffer, totalDuration, verseTimings, audioCtx } = await concatenateVerseAudios(
    audioList,
    onProgress
  );
  console.timeEnd('⏱️ Phase 1: Audio Fetch & Concatenation');
  const tAudio = performance.now() - tAudioStart;

  onProgress({
    step: 'audio_done',
    progress: 25,
    message: `تم تجهيز التلاوة بنجاح (المدة الإجمالية: ${Math.ceil(totalDuration)} ثانية)`,
  });

  // Step 2: Set up Canvas for rendering (guaranteed even pixel dimensions)
  const width = Math.floor((config.aspectRatio === '9:16' ? 1080 : 1920) / 2) * 2;
  const height = Math.floor((config.aspectRatio === '9:16' ? 1920 : 1080) / 2) * 2;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  console.time('⏱️ Phase 2: Assets Preload (Background, Watermark, Fonts)');
  const tAssetsStart = performance.now();

  // Load background using asset cache
  let bgMediaElement = null;
  if (config.background?.type === 'image') {
    onProgress({
      step: 'bg_load',
      progress: 30,
      message: 'جاري استرجاع خلفية الفيديو عالية الدقة من الذاكرة المؤقتة...',
    });
    bgMediaElement = await getCachedImage(config.background.url);
  } else if (config.background?.type === 'video') {
    bgMediaElement = await getCachedVideo(config.background.url);
  }

  // Ensure Quranic fonts are loaded
  await ensureFontsReady();

  // Preload Watermark Logo Image from cache
  let watermarkImg = null;
  if (config.showWatermark !== false) {
    watermarkImg = await getPreloadedWatermark();
  }
  console.timeEnd('⏱️ Phase 2: Assets Preload (Background, Watermark, Fonts)');
  const tAssets = performance.now() - tAssetsStart;

  let result = null;

  // Check if WebCodecs & mp4-muxer are supported for ultra-fast hardware acceleration
  // Note: static image/gradient backgrounds can be rendered offline at 100+ fps!
  const isWebCodecsSupported =
    typeof VideoEncoder !== 'undefined' &&
    typeof AudioEncoder !== 'undefined' &&
    typeof VideoFrame !== 'undefined' &&
    typeof AudioData !== 'undefined' &&
    config.background?.type !== 'video';

  if (isWebCodecsSupported) {
    try {
      result = await renderWithWebCodecs({
        width,
        height,
        fps: 30,
        config,
        chapter,
        verses,
        combinedBuffer,
        totalDuration,
        verseTimings,
        bgMediaElement,
        watermarkImg,
        onProgress,
      });
    } catch (err) {
      console.warn('تعذر استخدام WebCodecs، جاري التحويل التلقائي لمحرك FFmpeg الاحتياطي:', err);
    }
  }

  if (!result) {
    // Fallback to real-time MediaRecorder + FFmpeg.wasm
    result = await renderWithFFmpegFallback({
      width,
      height,
      canvas,
      ctx,
      config,
      chapter,
      verses,
      combinedBuffer,
      totalDuration,
      verseTimings,
      audioCtx,
      bgMediaElement,
      watermarkImg,
      onProgress,
    });
  }

  const tTotal = performance.now() - tTotalStart;
  console.log('🏁 [FINISHED VIDEO GENERATION PROFILE]');
  console.table({
    'المرحلة 1: جلب وفك الصوت (Audio)': `${(tAudio / 1000).toFixed(2)} ثانية (${((tAudio / tTotal) * 100).toFixed(1)}%)`,
    'المرحلة 2: تجهيز الأصول (Assets)': `${(tAssets / 1000).toFixed(2)} ثانية (${((tAssets / tTotal) * 100).toFixed(1)}%)`,
    'المرحلة 3: رسم الإطارات (Frames)': `${((result.timings?.renderMs || 0) / 1000).toFixed(2)} ثانية (${(((result.timings?.renderMs || 0) / tTotal) * 100).toFixed(1)}%)`,
    'المرحلة 4: الترميز النهائي (Transcode)': `${((result.timings?.transcodeMs || 0) / 1000).toFixed(2)} ثانية (${(((result.timings?.transcodeMs || 0) / tTotal) * 100).toFixed(1)}%)`,
    'الإجمالي الكلي (Total)': `${(tTotal / 1000).toFixed(2)} ثانية`,
    'المحرك المنفذ (Engine)': result.timings?.engine || 'Unknown',
  });

  return result;
}
