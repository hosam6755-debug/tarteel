import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';
import { concatenateVerseAudios, audioBufferToWav } from './audioHelper';

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

  // Badge background pill
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

  // 5. Quran Verse Arabic Text (Centered)
  if (currentVerse) {
    ctx.save();
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

    // 6. Translation Subtitles
    if (config.showTranslation && currentVerse.translations?.[0]?.text) {
      ctx.save();
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
 * Generate full Quran video in browser using Canvas + WebAudio + MediaRecorder + FFmpeg.wasm
 */
export async function generateQuranVideo({
  config,
  chapter,
  verses,
  audioList,
  onProgress,
}) {
  onProgress({
    step: 'init',
    progress: 5,
    message: 'جاري تهيئة بيئة المعالجة والذكاء القرآني...',
  });

  // Step 1: Concatenate audio files and compute verse timings
  onProgress({
    step: 'audio',
    progress: 15,
    message: 'جاري دمج تلاوة الآيات بصوت القارئ المختار...',
  });

  const { combinedBuffer, totalDuration, verseTimings, audioCtx } = await concatenateVerseAudios(
    audioList,
    onProgress
  );

  onProgress({
    step: 'audio_done',
    progress: 40,
    message: `تم دمج التلاوة بنجاح (المدة الإجمالية: ${Math.ceil(totalDuration)} ثانية)`,
  });

  // Step 2: Set up Canvas for rendering (guaranteed even pixel dimensions for H.264/yuv420p)
  const width = Math.floor((config.aspectRatio === '9:16' ? 1080 : 1920) / 2) * 2;
  const height = Math.floor((config.aspectRatio === '9:16' ? 1920 : 1080) / 2) * 2;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Load background image or video element if applicable
  let bgMediaElement = null;
  if (config.background?.type === 'image') {
    onProgress({
      step: 'bg_load',
      progress: 45,
      message: 'جاري تحميل وتجهيز خلفية الفيديو عالية الدقة...',
    });
    bgMediaElement = await new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null); // Continue gracefully
      img.src = config.background.url;
    });
  } else if (config.background?.type === 'video') {
    bgMediaElement = await new Promise((resolve) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.src = config.background.url;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.onloadeddata = () => {
        video.play().catch(() => {});
        resolve(video);
      };
      video.onerror = () => resolve(null);
    });
  }

  // Ensure Quranic fonts are loaded
  await document.fonts.ready;

  // Preload Watermark Logo Image
  let watermarkImg = null;
  if (config.showWatermark !== false) {
    watermarkImg = await new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = '/tarteel-logo.svg';
    });
  }

  // Step 3: Stream Recording Setup
  onProgress({
    step: 'recording',
    progress: 50,
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

  // Determine supported mimeType
  const mimeTypes = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];
  let chosenMime = mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) || 'video/webm';

  const recorder = new MediaRecorder(combinedStream, {
    mimeType: chosenMime,
    videoBitsPerSecond: 6000000, // 6 Mbps for pristine 1080p quality
  });

  const recordedChunks = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) recordedChunks.push(e.data);
  };

  // Start animation rendering loop & recording
  const startTime = performance.now();
  let animationFrameId = null;

  recorder.start(100);
  audioSource.start(0);

  await new Promise((resolve) => {
    function renderLoop() {
      const elapsed = (performance.now() - startTime) / 1000;

      // Determine active verse according to elapsed audio time
      let activeVerse = verses[0];
      for (let i = 0; i < verseTimings.length; i++) {
        if (elapsed >= verseTimings[i].startTime && elapsed <= verseTimings[i].endTime) {
          activeVerse = verses[i] || verses[0];
          break;
        }
      }
      if (elapsed > totalDuration && verseTimings.length > 0) {
        activeVerse = verses[verses.length - 1];
      }

      // Draw current frame
      drawCanvasFrame({
        ctx,
        width,
        height,
        config,
        chapter,
        currentVerse: activeVerse,
        bgMediaElement,
        watermarkImg,
      });

      // Update progress
      const percent = Math.min(85, 50 + Math.round((elapsed / totalDuration) * 35));
      onProgress({
        step: 'recording_progress',
        progress: percent,
        message: `جاري الرسم والتسجيل: ${Math.round(elapsed)}s / ${Math.ceil(totalDuration)}s...`,
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

  const recordedBlob = new Blob(recordedChunks, { type: chosenMime });

  // Step 4: Transcode to MP4 using ffmpeg.wasm for universal compatibility
  onProgress({
    step: 'ffmpeg_transcode',
    progress: 88,
    message: 'جاري تشغيل ffmpeg.wasm لإنتاج ملف MP4 متوافق مع كافة المنصات...',
  });

  try {
    const ffmpeg = await getFFmpeg((logMsg) => {
      // console.log('[ffmpeg]:', logMsg);
    });

    const inputData = await fetchFile(recordedBlob);
    await ffmpeg.writeFile('input.webm', inputData);

    onProgress({
      step: 'ffmpeg_encoding',
      progress: 92,
      message: 'جاري ضغط وترميز H.264 و AAC داخل المتصفح...',
    });

    // Run FFmpeg: Encode strictly with H.264 (libx264) + AAC with CFR 30fps, even dimensions, and faststart
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

    // Cleanup virtual files
    try {
      await ffmpeg.deleteFile('input.webm');
      await ffmpeg.deleteFile('output.mp4');
    } catch (e) {}

    onProgress({
      step: 'complete',
      progress: 100,
      message: 'تم توليد الفيديو بنجاح! جاهز للتحميل والمشاركة.',
    });

    return {
      videoUrl,
      blob: mp4Blob,
      filename: `quran_${chapter.id}_${verses[0].verse_number}-${verses[verses.length - 1].verse_number}.mp4`,
    };
  } catch (ffmpegErr) {
    console.warn('FFmpeg conversion fallback to WebM/direct MP4:', ffmpegErr);
    // Graceful fallback: return the high quality recorded blob directly
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
      filename: `quran_${chapter.id}_${verses[0].verse_number}-${verses[verses.length - 1].verse_number}.${ext}`,
    };
  }
}
