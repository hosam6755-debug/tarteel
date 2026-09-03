const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const axios = require('axios');
const ffmpegPath = require('ffmpeg-static');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');

/**
 * Format Arabic Numbers
 */
function toArabicDigits(num) {
  if (!num && num !== 0) return '';
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num).replace(/[0-9]/g, (w) => arabicDigits[+w]);
}

/**
 * Download a remote file to a local destination
 */
async function downloadFile(url, destPath) {
  const writer = fs.createWriteStream(destPath);
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
    timeout: 30000,
    headers: {
      'User-Agent': 'TarteelVideoEngine/1.0',
    },
  });

  return new Promise((resolve, reject) => {
    response.data.pipe(writer);
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

/**
 * Word wrap for Canvas text
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
 * Execute FFmpeg process with promise
 */
function runFFmpeg(args) {
  return new Promise((resolve, reject) => {
    console.log('[FFmpeg] Executing:', ffmpegPath, args.join(' '));
    const proc = spawn(ffmpegPath, args);
    let stderr = '';

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        console.error('[FFmpeg Error Log]:', stderr);
        reject(new Error(`FFmpeg exited with code ${code}: ${stderr.slice(-400)}`));
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Get Audio file duration using FFmpeg
 */
async function getAudioDuration(audioPath) {
  return new Promise((resolve) => {
    const proc = spawn(ffmpegPath, ['-i', audioPath]);
    let output = '';

    proc.stderr.on('data', (data) => {
      output += data.toString();
    });

    proc.on('close', () => {
      const match = output.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
      if (match) {
        const hours = parseFloat(match[1]);
        const minutes = parseFloat(match[2]);
        const seconds = parseFloat(match[3]);
        resolve(hours * 3600 + minutes * 60 + seconds);
      } else {
        resolve(60); // Default fallback
      }
    });
  });
}

/**
 * Draw a single Ayah slide on canvas and save to disk
 */
async function renderAyahSlide({
  outputPath,
  width,
  height,
  config,
  chapterName,
  verse,
  ayahNumber,
  bgImagePath,
}) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 1. Draw Background Image or Gradient
  if (bgImagePath && fs.existsSync(bgImagePath)) {
    try {
      const bgImg = await loadImage(bgImagePath);
      const hRatio = width / bgImg.width;
      const vRatio = height / bgImg.height;
      const ratio = Math.max(hRatio, vRatio);
      const shiftX = (width - bgImg.width * ratio) / 2;
      const shiftY = (height - bgImg.height * ratio) / 2;
      ctx.drawImage(bgImg, 0, 0, bgImg.width, bgImg.height, shiftX, shiftY, bgImg.width * ratio, bgImg.height * ratio);
    } catch (e) {
      console.warn('Failed to draw bg image, using fallback:', e.message);
      ctx.fillStyle = '#080b11';
      ctx.fillRect(0, 0, width, height);
    }
  } else {
    // Elegant deep Islamic gradient
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#091222');
    grad.addColorStop(0.5, '#030712');
    grad.addColorStop(1, '#1b0e2b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  // 2. Dark Overlay for readability
  const overlayOpacity = Math.max(0.2, Math.min(0.85, config.bgOverlayOpacity ?? 0.45));
  ctx.fillStyle = `rgba(3, 7, 18, ${overlayOpacity})`;
  ctx.fillRect(0, 0, width, height);

  // 3. Decorative Frame (Islamic Borders)
  if (config.frameStyle !== 'none') {
    const frameInset = width > height ? 40 : 36;
    const frameW = width - frameInset * 2;
    const frameH = height - frameInset * 2;

    ctx.save();
    ctx.strokeStyle = config.frameColor || '#e5b869';
    ctx.lineWidth = config.frameBorderWidth || 2;
    ctx.globalAlpha = 0.55;
    ctx.strokeRect(frameInset, frameInset, frameW, frameH);

    // Corner Ornaments
    const cornerSize = 28;
    ctx.lineWidth = (config.frameBorderWidth || 2) + 1.5;
    ctx.globalAlpha = 0.9;

    // Top-left
    ctx.beginPath();
    ctx.moveTo(frameInset - 5, frameInset + cornerSize);
    ctx.lineTo(frameInset - 5, frameInset - 5);
    ctx.lineTo(frameInset + cornerSize, frameInset - 5);
    ctx.stroke();

    // Top-right
    ctx.beginPath();
    ctx.moveTo(width - frameInset + 5 - cornerSize, frameInset - 5);
    ctx.lineTo(width - frameInset + 5, frameInset - 5);
    ctx.lineTo(width - frameInset + 5, frameInset + cornerSize);
    ctx.stroke();

    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(frameInset - 5, height - frameInset - cornerSize);
    ctx.lineTo(frameInset - 5, height - frameInset + 5);
    ctx.lineTo(frameInset + cornerSize, height - frameInset + 5);
    ctx.stroke();

    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(width - frameInset + 5 - cornerSize, height - frameInset + 5);
    ctx.lineTo(width - frameInset + 5, height - frameInset + 5);
    ctx.lineTo(width - frameInset + 5, height - frameInset + 5);
    ctx.stroke();
    ctx.restore();
  }

  // 4. Surah Badge / Header
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const badgeY = height * 0.16;

  // Header Title
  ctx.font = '700 24px "Cairo", sans-serif';
  ctx.fillStyle = '#e5b869';
  ctx.shadowColor = 'rgba(229, 184, 105, 0.4)';
  ctx.shadowBlur = 10;
  const headerText = `سورة ${chapterName || ''} - الآية (${toArabicDigits(ayahNumber)})`;
  ctx.fillText(headerText, width / 2, badgeY);
  ctx.restore();

  // 5. Quran Verse Text (Uthmani)
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.direction = 'rtl';

  const quranFontSize = Math.round((config.quranFontSize || 36) * (width / 400));
  ctx.font = `600 ${Math.min(64, Math.max(34, quranFontSize))}px "Amiri", "Scheherazade New", serif`;
  ctx.fillStyle = config.quranTextColor || '#ffd166';

  if (config.textGlow) {
    ctx.shadowColor = 'rgba(255, 209, 102, 0.6)';
    ctx.shadowBlur = 18;
  }

  const maxWidth = width * 0.82;
  const rawText = verse.text_uthmani || verse.text || '';
  const verseWithEndTag = `${rawText} ۝${toArabicDigits(ayahNumber)}`;
  const quranLines = wrapText(ctx, verseWithEndTag, maxWidth);

  const lineHeight = Math.min(64, Math.max(34, quranFontSize)) * 1.6;
  const totalQuranHeight = quranLines.length * lineHeight;
  let startY = (height / 2) - (totalQuranHeight / 2) - (config.showTranslation ? 35 : 0);

  for (let l = 0; l < quranLines.length; l++) {
    ctx.fillText(quranLines[l], width / 2, startY + l * lineHeight);
  }
  ctx.restore();

  // 6. English Translation (if enabled)
  if (config.showTranslation && (verse.translation || (verse.translations && verse.translations[0]?.text))) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.direction = 'ltr';

    const transText = (verse.translation || verse.translations[0]?.text || '').replace(/<[^>]*>/g, '');
    const transFontSize = Math.round((config.translationFontSize || 16) * (width / 450));
    ctx.font = `400 ${Math.min(26, Math.max(16, transFontSize))}px "Outfit", sans-serif`;
    ctx.fillStyle = config.translationColor || '#e2e8f0';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 6;

    const transLines = wrapText(ctx, transText, width * 0.78);
    const transLineHeight = transFontSize * 1.5;
    const transStartY = startY + totalQuranHeight + 45;

    for (let t = 0; t < transLines.length; t++) {
      ctx.fillText(transLines[t], width / 2, transStartY + t * transLineHeight);
    }
    ctx.restore();
  }

  // 7. Tarteel Watermark Branding
  if (config.showWatermark !== false) {
    ctx.save();
    const watermarkScale = config.watermarkScale || 1.0;
    const watermarkOpacity = config.watermarkOpacity || 0.75;
    ctx.globalAlpha = watermarkOpacity;

    let wx = width - 180;
    let wy = height - 70;
    if (config.watermarkPosition === 'bottom-left') {
      wx = 100;
      wy = height - 70;
    } else if (config.watermarkPosition === 'top-right') {
      wx = width - 180;
      wy = 80;
    } else if (config.watermarkPosition === 'top-left') {
      wx = 100;
      wy = 80;
    }

    ctx.fillStyle = '#e5b869';
    ctx.font = `700 ${Math.round(18 * watermarkScale)}px "Cairo", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ترتيل | Tarteel', wx, wy);
    ctx.restore();
  }

  // Save buffer to file
  const buffer = canvas.toBuffer('image/png');
  await fs.promises.writeFile(outputPath, buffer);
}

module.exports = {
  downloadFile,
  runFFmpeg,
  getAudioDuration,
  renderAyahSlide,
};
