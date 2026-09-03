const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const crypto = require('crypto');

const {
  downloadFile,
  runFFmpeg,
  getAudioDuration,
  renderAyahSlide,
} = require('./videoProcessor');

admin.initializeApp();
const db = admin.firestore();

/**
 * Cloud Function (Gen 2): Automatically triggered upon new videoJob document creation
 */
exports.processVideoJob = onDocumentCreated(
  {
    document: 'videoJobs/{jobId}',
    memory: '2GiB',
    cpu: 2,
    timeoutSeconds: 300,
    region: 'europe-west1',
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data();
    const jobId = event.params.jobId;

    // Avoid reprocessing if already started or completed
    if (data.status && data.status !== 'pending') {
      console.log(`Job ${jobId} already in status: ${data.status}. Skipping.`);
      return;
    }

    const jobRef = snap.ref;
    const tmpDir = os.tmpdir();
    const tempFiles = [];

    const cleanup = () => {
      for (const file of tempFiles) {
        try {
          if (fs.existsSync(file)) {
            fs.unlinkSync(file);
          }
        } catch (e) {
          console.warn(`Failed to remove tmp file: ${file}`, e.message);
        }
      }
    };

    try {
      console.log(`[Job ${jobId}] Started processing...`);

      // 1. Update status to "processing"
      await jobRef.update({
        status: 'processing',
        step: 'fetching_assets',
        progress: 10,
        stepMessage: 'جاري جلب ملفات التلاوة ومواقيت الآيات من السيرفر...',
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const params = data.params || {};
      const chapterId = Number(params.chapterId) || 1;
      const fromAyah = Number(params.fromAyah) || 1;
      const toAyah = Number(params.toAyah) || fromAyah;
      const reciter = params.reciter || {};
      const background = params.background || {};
      const aspectRatio = params.aspectRatio === '16:9' ? '16:9' : '9:16';
      const width = aspectRatio === '16:9' ? 1920 : 1080;
      const height = aspectRatio === '16:9' ? 1080 : 1920;

      // 2. Fetch Audio URL & Ayah Timing from mp3quran.net
      const pad3 = String(chapterId).padStart(3, '0');
      const server = reciter.server
        ? (reciter.server.endsWith('/') ? reciter.server : `${reciter.server}/`)
        : 'https://server8.mp3quran.net/afs/';
      const surahAudioUrl = `${server}${pad3}.mp3`;

      const audioLocalPath = path.join(tmpDir, `${jobId}_surah.mp3`);
      tempFiles.push(audioLocalPath);

      console.log(`[Job ${jobId}] Downloading recitation audio from: ${surahAudioUrl}`);
      try {
        await downloadFile(surahAudioUrl, audioLocalPath);
      } catch (err) {
        throw new Error(`فشل تحميل تلاوة القارئ من السيرفر: ${err.message}`);
      }

      // Fetch timing metadata
      let timingData = [];
      try {
        const timingRes = await axios.get(
          `https://www.mp3quran.net/api/v3/ayat_timing?surah=${chapterId}&read=${reciter.readId || 0}`,
          { timeout: 10000 }
        );
        if (Array.isArray(timingRes.data)) {
          timingData = timingRes.data;
        }
      } catch (e) {
        console.warn(`[Job ${jobId}] Failed to fetch mp3quran timings, using fallback:`, e.message);
      }

      // 3. Fetch Verses Text
      let verses = params.verses || [];
      if (!verses || verses.length === 0) {
        console.log(`[Job ${jobId}] Fetching verses text from Quran API...`);
        const transId = params.translationId || 20;
        const quranApiUrl = `https://api.quran.com/api/v4/verses/by_chapter/${chapterId}?words=false&translations=${transId}&fields=text_uthmani&from=${fromAyah}&to=${toAyah}`;
        const versesRes = await axios.get(quranApiUrl, { timeout: 15000 });
        verses = versesRes.data.verses || [];
      }

      // Calculate timestamps for each ayah
      const totalAudioDuration = await getAudioDuration(audioLocalPath);
      const ayahSegments = [];

      for (let ayah = fromAyah; ayah <= toAyah; ayah++) {
        const t = timingData.find((item) => Number(item.ayah) === ayah);
        const verseObj = verses.find((v) => Number(v.verse_number || v.verse_key?.split(':')[1]) === ayah) || {
          verse_number: ayah,
          text_uthmani: 'آية كريمة',
        };

        if (t) {
          ayahSegments.push({
            ayah,
            verse: verseObj,
            startTime: (t.start_time || 0) / 1000,
            endTime: (t.end_time || t.start_time + 4000) / 1000,
          });
        } else {
          // Fallback proportional estimation
          const count = toAyah - fromAyah + 1;
          const index = ayah - fromAyah;
          const segDuration = totalAudioDuration / Math.max(1, count);
          ayahSegments.push({
            ayah,
            verse: verseObj,
            startTime: index * segDuration,
            endTime: (index + 1) * segDuration,
          });
        }
      }

      const recStart = Math.max(0, ayahSegments[0].startTime - 0.3);
      const recEnd = Math.min(totalAudioDuration, ayahSegments[ayahSegments.length - 1].endTime + 0.5);
      const segmentDuration = Math.max(2, recEnd - recStart);

      // 4. Download Background Media
      let bgLocalPath = null;
      if (background.url && (background.type === 'image' || background.type === 'video')) {
        const ext = background.type === 'video' ? '.mp4' : '.jpg';
        bgLocalPath = path.join(tmpDir, `${jobId}_bg${ext}`);
        tempFiles.push(bgLocalPath);
        console.log(`[Job ${jobId}] Downloading background from: ${background.url}`);
        try {
          await downloadFile(background.url, bgLocalPath);
        } catch (e) {
          console.warn(`[Job ${jobId}] Could not download background, falling back to gradient:`, e.message);
          bgLocalPath = null;
        }
      }

      // 5. Update progress to "rendering"
      await jobRef.update({
        step: 'rendering',
        progress: 40,
        stepMessage: 'جاري رسم شرائح الخط العثماني وتزامن الآيات مع الصوت...',
      });

      // 6. Render Canvas Slide for each Ayah
      const slidePaths = [];
      for (let i = 0; i < ayahSegments.length; i++) {
        const seg = ayahSegments[i];
        const slidePath = path.join(tmpDir, `${jobId}_slide_${i}.png`);
        tempFiles.push(slidePath);

        await renderAyahSlide({
          outputPath: slidePath,
          width,
          height,
          config: params,
          chapterName: params.chapterName || '',
          verse: seg.verse,
          ayahNumber: seg.ayah,
          bgImagePath: background.type === 'image' ? bgLocalPath : null,
        });

        slidePaths.push({
          path: slidePath,
          start: Math.max(0, seg.startTime - recStart),
          end: Math.min(segmentDuration, seg.endTime - recStart),
        });
      }

      // 7. Update progress to "encoding"
      await jobRef.update({
        step: 'encoding',
        progress: 65,
        stepMessage: 'جاري ترميز ودمج الفيديو عالي الدقة (H.264/AAC) بـ FFmpeg...',
      });

      // 8. Cut trimmed audio segment
      const trimmedAudioPath = path.join(tmpDir, `${jobId}_trimmed.mp3`);
      tempFiles.push(trimmedAudioPath);

      await runFFmpeg([
        '-y',
        '-ss',
        String(recStart),
        '-t',
        String(segmentDuration),
        '-i',
        audioLocalPath,
        '-c',
        'copy',
        trimmedAudioPath,
      ]);

      // 9. Composite Video with FFmpeg
      const outputVideoPath = path.join(tmpDir, `${jobId}_output.mp4`);
      tempFiles.push(outputVideoPath);

      const ffmpegArgs = ['-y'];

      // Inputs
      if (slidePaths.length === 1) {
        // Single Ayah: simple high speed render
        ffmpegArgs.push(
          '-loop', '1',
          '-t', String(segmentDuration),
          '-i', slidePaths[0].path,
          '-i', trimmedAudioPath,
          '-c:v', 'libx264',
          '-preset', 'fast',
          '-crf', '22',
          '-pix_fmt', 'yuv420p',
          '-c:a', 'aac',
          '-b:a', '192k',
          '-shortest',
          outputVideoPath
        );
      } else {
        // Multiple Ayat: overlay filter_complex with time brackets
        // Input 0: base black or first slide
        ffmpegArgs.push('-loop', '1', '-t', String(segmentDuration), '-i', slidePaths[0].path);

        // Inputs 1..N: remaining slides
        for (let i = 1; i < slidePaths.length; i++) {
          ffmpegArgs.push('-loop', '1', '-t', String(segmentDuration), '-i', slidePaths[i].path);
        }

        // Input N+1: Audio
        ffmpegArgs.push('-i', trimmedAudioPath);

        // Filter Complex
        let filterStr = '';
        let lastStream = '0:v';

        for (let i = 1; i < slidePaths.length; i++) {
          const s = slidePaths[i];
          const outStream = `v${i}`;
          filterStr += `[${lastStream}][${i}:v]overlay=enable='between(t,${s.start},${s.end})'[${outStream}];`;
          lastStream = outStream;
        }

        // Remove trailing semicolon
        filterStr = filterStr.replace(/;$/, '');

        ffmpegArgs.push(
          '-filter_complex', filterStr,
          '-map', `[${lastStream}]`,
          '-map', `${slidePaths.length}:a`,
          '-c:v', 'libx264',
          '-preset', 'fast',
          '-crf', '22',
          '-pix_fmt', 'yuv420p',
          '-c:a', 'aac',
          '-b:a', '192k',
          '-shortest',
          outputVideoPath
        );
      }

      console.log(`[Job ${jobId}] Running video compositing pass...`);
      await runFFmpeg(ffmpegArgs);

      // 10. Upload to Firebase Storage
      await jobRef.update({
        step: 'uploading',
        progress: 85,
        stepMessage: 'جاري رفع الفيديو إلى التخزين السحابي والحصول على رابط التحميل...',
      });

      const bucket = admin.storage().bucket();
      const userId = data.userId || 'guest';
      const destinationPath = `videos/${userId}/${jobId}.mp4`;
      const downloadToken = crypto.randomUUID();

      console.log(`[Job ${jobId}] Uploading MP4 to: ${destinationPath}`);
      await bucket.upload(outputVideoPath, {
        destination: destinationPath,
        metadata: {
          contentType: 'video/mp4',
          metadata: {
            firebaseStorageDownloadTokens: downloadToken,
            jobId: jobId,
            userId: userId,
          },
        },
      });

      // Construct permanent Firebase Storage download URL
      const publicDownloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(destinationPath)}?alt=media&token=${downloadToken}`;
      const stats = fs.statSync(outputVideoPath);

      // 11. Update document status to "completed"
      await jobRef.update({
        status: 'completed',
        step: 'completed',
        progress: 100,
        stepMessage: 'تم إنشاء الفيديو بنجاح!',
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        result: {
          videoUrl: publicDownloadUrl,
          storagePath: destinationPath,
          fileSizeBytes: stats.size,
          durationSeconds: Math.round(segmentDuration * 10) / 10,
        },
      });

      console.log(`[Job ${jobId}] Successfully completed! URL: ${publicDownloadUrl}`);
    } catch (err) {
      console.error(`[Job ${jobId}] Generation Error:`, err);
      try {
        await jobRef.update({
          status: 'failed',
          step: 'error',
          progress: 0,
          stepMessage: 'فشلت عملية توليد الفيديو',
          error: {
            message: err.message || 'حدث خطأ غير متوقع أثناء معالجة الفيديو في السيرفر',
            code: err.code || 'RENDER_FAILED',
          },
        });
      } catch (writeErr) {
        console.error(`[Job ${jobId}] Could not write failure state:`, writeErr);
      }
    } finally {
      cleanup();
    }
  }
);
