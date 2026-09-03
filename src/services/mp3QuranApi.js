// Service for fetching audio and ayat timing from mp3quran.net (API v3)
const MP3QURAN_BASE = 'https://www.mp3quran.net/api/v3';

/**
 * Cache for mp3quran timing data
 */
const timingCache = {};

/**
 * Helper to get audio duration via HTML5 Audio element
 */
function getAudioFileDuration(url) {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && typeof window.Audio !== 'undefined') {
      const audio = new window.Audio();
      audio.preload = 'metadata';
      audio.src = url;
      audio.onloadedmetadata = () => {
        resolve(audio.duration || 60);
      };
      audio.onerror = () => {
        resolve(60); // Default fallback if metadata fails to load
      };
    } else {
      // Fallback for non-browser / Node environments
      resolve(60);
    }
  });
}

/**
 * Fetch surah audio URL and verse timestamps from mp3quran.net
 * @param {Object} reciterConfig - reciter metadata containing server, readId, etc.
 * @param {number} chapterId - Surah number (1-114)
 * @param {number} fromAyah - Start ayah number
 * @param {number} toAyah - End ayah number
 * @param {Array} verses - Verses array with text_uthmani for fallback calculation
 */
export async function getMp3QuranVerseAudioList(
  reciterConfig,
  chapterId,
  fromAyah,
  toAyah,
  verses = []
) {
  const pad3 = String(chapterId).padStart(3, '0');
  const server = reciterConfig.server.endsWith('/')
    ? reciterConfig.server
    : `${reciterConfig.server}/`;
  const audioUrl = `${server}${pad3}.mp3`;

  const cacheKey = `${reciterConfig.readId}_${chapterId}`;
  let timings = timingCache[cacheKey];

  if (!timings) {
    try {
      const timingUrl = `${MP3QURAN_BASE}/ayat_timing?surah=${chapterId}&read=${reciterConfig.readId}`;
      const res = await fetch(timingUrl);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          timings = data;
          timingCache[cacheKey] = timings;
        }
      }
    } catch (err) {
      console.warn('Could not fetch mp3quran ayat_timing:', err);
    }
  }

  // 1. If API returned accurate ayat timing for this surah and reciter (e.g. Al-Zain)
  if (Array.isArray(timings) && timings.length > 0) {
    const result = [];
    for (let ayah = fromAyah; ayah <= toAyah; ayah++) {
      const t = timings.find((item) => Number(item.ayah) === ayah);
      if (t) {
        const startTime = (t.start_time || 0) / 1000;
        const endTime = (t.end_time || t.start_time + 4000) / 1000;
        result.push({
          verse_number: ayah,
          verse_key: `${chapterId}:${ayah}`,
          audio_url: audioUrl,
          startTime,
          endTime,
          duration: Math.max(1, endTime - startTime),
          isSegment: true,
          chapterAudioUrl: audioUrl,
        });
      }
    }

    if (result.length > 0) {
      return result;
    }
  }

  // 2. Fallback: If mp3quran doesn't have pre-indexed timings for this reciter/surah (e.g. Noreen)
  // Calculate proportional timestamps from the actual audio duration & verse text lengths
  const totalAudioDuration = await getAudioFileDuration(audioUrl);
  const relevantVerses =
    verses.length > 0
      ? verses
      : Array.from({ length: toAyah - fromAyah + 1 }, (_, i) => ({
          verse_number: fromAyah + i,
          text_uthmani: 'آية قرآنية كريمة',
        }));

  const totalChars = relevantVerses.reduce(
    (sum, v) => sum + (v.text_uthmani?.length || 20),
    0
  );

  const introOffset = Math.min(2.5, totalAudioDuration * 0.05); // Isti'adha / intro buffer
  const usableDuration = Math.max(5, totalAudioDuration - introOffset);

  let currentPos = introOffset;
  const result = [];

  for (let i = 0; i < relevantVerses.length; i++) {
    const v = relevantVerses[i];
    const verseNum = v.verse_number || fromAyah + i;
    const charLen = v.text_uthmani?.length || 20;
    const ratio = charLen / Math.max(1, totalChars);
    const duration = Math.max(1.5, usableDuration * ratio);

    result.push({
      verse_number: verseNum,
      verse_key: `${chapterId}:${verseNum}`,
      audio_url: audioUrl,
      startTime: Math.round(currentPos * 100) / 100,
      endTime: Math.round((currentPos + duration) * 100) / 100,
      duration: Math.round(duration * 100) / 100,
      isSegment: true,
      chapterAudioUrl: audioUrl,
    });

    currentPos += duration;
  }

  return result;
}
