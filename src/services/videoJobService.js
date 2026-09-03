import {
  collection,
  addDoc,
  doc,
  onSnapshot,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * Check if the user has reached their daily (1) or monthly (30) video generation quota.
 */
export async function checkUserQuota(user, userData) {
  if (!user) {
    throw new Error('يجب تسجيل الدخول لتتمكن من توليد الفيديو.');
  }

  // Admin bypass
  if (userData?.role === 'admin') {
    return { allowed: true };
  }

  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.slice(0, 7);

  // 1. Daily Limit Check (Default: 1 video per day)
  const dailyLimit = userData?.daily_limit !== undefined ? userData.daily_limit : 1;
  const dailyQuery = query(
    collection(db, 'videoJobs'),
    where('userId', '==', user.uid),
    where('dateStr', '==', today),
    where('status', 'in', ['pending', 'processing', 'completed'])
  );

  const dailySnap = await getDocs(dailyQuery);
  if (dailySnap.size >= dailyLimit) {
    throw new Error(
      `لقد استنفدت الحد اليومي المسموح به (${dailyLimit} فيديو في اليوم). يرجى المحاولة غداً.`
    );
  }

  // 2. Monthly Limit Check (Default: 30 videos per month)
  const monthlyLimit = userData?.monthly_limit !== undefined ? userData.monthly_limit : 30;
  const monthlyQuery = query(
    collection(db, 'videoJobs'),
    where('userId', '==', user.uid),
    where('monthStr', '==', thisMonth),
    where('status', 'in', ['pending', 'processing', 'completed'])
  );

  const monthlySnap = await getDocs(monthlyQuery);
  if (monthlySnap.size >= monthlyLimit) {
    throw new Error(
      `لقد استنفدت الحد الشهري المسموح به (${monthlyLimit} فيديو في الشهر). يرجى المحاولة الشهر القادم.`
    );
  }

  return {
    allowed: true,
    dailyUsed: dailySnap.size,
    dailyLimit,
    monthlyUsed: monthlySnap.size,
    monthlyLimit,
  };
}

/**
 * Submit a new video generation job directly to Firestore "videoJobs"
 */
export async function createVideoJob({ user, userData, config, chapter, verses, audioList }) {
  // Validate Quota first
  await checkUserQuota(user, userData);

  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.slice(0, 7);

  const jobPayload = {
    userId: user.uid,
    userEmail: user.email || '',
    params: {
      chapterId: config.chapterId,
      chapterName: chapter?.name_arabic || 'سورة',
      fromAyah: config.fromAyah,
      toAyah: config.toAyah,
      reciter: {
        id: config.reciterId,
        name: audioList[0]?.reciterName || 'القارئ',
        server: audioList[0]?.chapterAudioUrl ? audioList[0].chapterAudioUrl.substring(0, audioList[0].chapterAudioUrl.lastIndexOf('/') + 1) : '',
        readId: audioList[0]?.readId || 0,
      },
      background: config.background || {},
      bgOverlayOpacity: config.bgOverlayOpacity ?? 0.45,
      aspectRatio: config.aspectRatio || '9:16',
      quranFont: config.quranFont || 'Amiri Quran',
      quranFontSize: config.quranFontSize || 32,
      quranTextColor: config.quranTextColor || '#ffd166',
      textGlow: config.textGlow ?? true,
      showTranslation: config.showTranslation ?? true,
      translationId: config.translationId || 20,
      translationFontSize: config.translationFontSize || 16,
      translationColor: config.translationColor || '#e2e8f0',
      frameStyle: config.frameStyle || 'islamic',
      frameColor: config.frameColor || '#e5b869',
      frameBorderWidth: config.frameBorderWidth || 2,
      showWatermark: config.showWatermark ?? true,
      watermarkPosition: config.watermarkPosition || 'bottom-right',
      watermarkOpacity: config.watermarkOpacity ?? 0.75,
      watermarkScale: config.watermarkScale ?? 1.0,
      // Include verses metadata for instant server pick-up
      verses: verses.map((v) => ({
        verse_number: v.verse_number,
        verse_key: v.verse_key,
        text_uthmani: v.text_uthmani,
        translation: v.translations?.[0]?.text || '',
      })),
    },
    status: 'pending',
    progress: 0,
    step: 'queued',
    stepMessage: 'تم إرسال الطلب، بانتظار بدء المعالجة على السيرفر...',
    result: {
      videoUrl: null,
      storagePath: null,
      fileSizeBytes: null,
      durationSeconds: null,
    },
    error: {
      code: null,
      message: null,
    },
    dateStr: today,
    monthStr: thisMonth,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, 'videoJobs'), jobPayload);
  return docRef.id;
}

/**
 * Real-time subscription to a videoJob document
 */
export function subscribeToVideoJob(jobId, onUpdate, onError) {
  if (!jobId) return () => {};

  const unsubscribe = onSnapshot(
    doc(db, 'videoJobs', jobId),
    (docSnap) => {
      if (docSnap.exists()) {
        onUpdate({ id: docSnap.id, ...docSnap.data() });
      } else {
        if (onError) onError(new Error('المهمة غير موجودة.'));
      }
    },
    (err) => {
      console.error('Snapshot subscription error:', err);
      if (onError) onError(err);
    }
  );

  return unsubscribe;
}
