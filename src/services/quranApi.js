// Unified Quran API service managing both quran.com and mp3quran.net sources
import { getMp3QuranVerseAudioList } from './mp3QuranApi.js';

const API_BASE = 'https://api.quran.com/api/v4';
const AUDIO_BASE = 'https://verses.quran.com/';

// In-memory cache
const cache = {
  chapters: null,
  recitations: null,
  translations: null,
};

/**
 * Curated registry of reciters with their underlying source:
 * 'quran.com' or 'mp3quran'
 */
export const POPULAR_RECITERS = [
  // 1. مشاري راشد العفاسي (quran.com)
  {
    id: 7,
    source: 'quran.com',
    name_ar: 'مشاري راشد العفاسي',
    style: 'مرتل',
    isPopular: true,
  },
  // 2. ياسر الدوسري (quran.com - id: 174)
  {
    id: 174,
    source: 'quran.com',
    name_ar: 'ياسر الدوسري',
    style: 'مرتل (المصحف المرتل)',
    isPopular: true,
  },
  // 3. الزين محمد أحمد (mp3quran.net)
  {
    id: 'mp3quran_13',
    source: 'mp3quran',
    reciterId: 13,
    readId: 13, // read id for ayat_timing
    server: 'https://server9.mp3quran.net/alzain/',
    name_ar: 'الزين محمد أحمد',
    style: 'مرتل (mp3quran)',
    isPopular: true,
  },
  // 4. نورين محمد صديق (mp3quran.net)
  {
    id: 'mp3quran_138',
    source: 'mp3quran',
    reciterId: 138,
    readId: 138,
    server: 'https://server16.mp3quran.net/nourin_siddig/Rewayat-Aldori-A-n-Abi-Amr/',
    name_ar: 'نورين محمد صديق',
    style: 'الدوري عن أبي عمرو (mp3quran)',
    isPopular: true,
  },
  // 5. عبد الباسط عبد الصمد - مرتل (quran.com)
  {
    id: 2,
    source: 'quran.com',
    name_ar: 'عبد الباسط عبد الصمد',
    style: 'مرتل',
    isPopular: true,
  },
  // 6. عبد الباسط عبد الصمد - مجود (quran.com)
  {
    id: 1,
    source: 'quran.com',
    name_ar: 'عبد الباسط عبد الصمد',
    style: 'مجود',
    isPopular: true,
  },
  // 7. محمد صديق المنشاوي - مرتل (quran.com)
  {
    id: 9,
    source: 'quran.com',
    name_ar: 'محمد صديق المنشاوي',
    style: 'مرتل',
    isPopular: true,
  },
  // 8. محمد صديق المنشاوي - مجود (quran.com)
  {
    id: 8,
    source: 'quran.com',
    name_ar: 'محمد صديق المنشاوي',
    style: 'مجود',
    isPopular: true,
  },
  // 9. محمود خليل الحصري (quran.com)
  {
    id: 6,
    source: 'quran.com',
    name_ar: 'محمود خليل الحصري',
    style: 'مرتل',
    isPopular: true,
  },
  // 10. ماهر المعيقلي (quran.com)
  {
    id: 12,
    source: 'quran.com',
    name_ar: 'ماهر المعيقلي',
    style: 'حفص',
    isPopular: true,
  },
  // 11. عبد الرحمن السديس (quran.com)
  {
    id: 3,
    source: 'quran.com',
    name_ar: 'عبد الرحمن السديس',
    style: 'مرتل',
    isPopular: true,
  },
  // 12. سعود الشريم (quran.com)
  {
    id: 10,
    source: 'quran.com',
    name_ar: 'سعود الشريم',
    style: 'مرتل',
    isPopular: true,
  },
  // 13. أبو بكر الشاطري (quran.com)
  {
    id: 4,
    source: 'quran.com',
    name_ar: 'أبو بكر الشاطري',
    style: 'مرتل',
    isPopular: true,
  },
  // 14. هاني الرفاعي (quran.com)
  {
    id: 5,
    source: 'quran.com',
    name_ar: 'هاني الرفاعي',
    style: 'مرتل',
    isPopular: true,
  },
  // 15. محمد أيوب (quran.com)
  {
    id: 11,
    source: 'quran.com',
    name_ar: 'محمد أيوب',
    style: 'مرتل',
    isPopular: true,
  },
];

/**
 * Fetch list of all 114 Quran chapters (Surahs) in Arabic
 */
export async function getChapters() {
  if (cache.chapters) return cache.chapters;

  try {
    const res = await fetch(`${API_BASE}/chapters?language=ar`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    cache.chapters = data.chapters || [];
    return cache.chapters;
  } catch (err) {
    console.error('Failed to fetch chapters:', err);
    throw err;
  }
}

/**
 * Fetch available reciters from registry and Quran.com
 */
export async function getReciters() {
  if (cache.recitations) return cache.recitations;

  try {
    const res = await fetch(`${API_BASE}/resources/recitations?language=ar`);
    let apiList = [];
    if (res.ok) {
      const data = await res.json();
      apiList = data.recitations || [];
    }

    // Combine registry with apiList
    const combined = [...POPULAR_RECITERS];

    for (const r of apiList) {
      // Avoid duplicate if already in POPULAR_RECITERS
      if (!combined.some((p) => p.id === r.id)) {
        combined.push({
          id: r.id,
          source: 'quran.com',
          reciter_name: r.reciter_name,
          name_ar: r.translated_name?.name || r.reciter_name,
          style: r.style || 'مرتل',
          isPopular: false,
        });
      }
    }

    cache.recitations = combined;
    return combined;
  } catch (err) {
    console.error('Failed to fetch recitations, using popular registry:', err);
    cache.recitations = POPULAR_RECITERS;
    return POPULAR_RECITERS;
  }
}

/**
 * Curated list of popular translations
 */
export const POPULAR_TRANSLATIONS = [
  { id: 20, language: 'الإنجليزية', name: 'Saheeh International (English)' },
  { id: 131, language: 'الإنجليزية', name: 'The Clear Quran - Dr. Mustafa Khattab' },
  { id: 136, language: 'الفرنسية', name: 'Muhammad Hamidullah (Français)' },
  { id: 234, language: 'الأردية', name: 'Fatah Muhammad Jalandhari (اردو)' },
  { id: 33, language: 'الإندونيسية', name: 'Indonesian Ministry of Religious Affairs' },
  { id: 77, language: 'التركية', name: 'Diyanet Isleri (Türkçe)' },
  { id: 83, language: 'الإسبانية', name: 'Sheikh Isa Garcia (Español)' },
  { id: 140, language: 'الروسية', name: 'Elmir Kuliev (Русский)' },
  { id: 27, language: 'الألمانية', name: 'Frank Bubenheim (Deutsch)' },
];

/**
 * Fetch all available translations
 */
export async function getTranslations() {
  if (cache.translations) return cache.translations;

  try {
    const res = await fetch(`${API_BASE}/resources/translations?language=ar`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    cache.translations = data.translations || [];
    return cache.translations;
  } catch (err) {
    console.error('Failed to fetch translations:', err);
    return POPULAR_TRANSLATIONS.map((t) => ({
      id: t.id,
      language_name: t.language,
      name: t.name,
      translated_name: { name: t.name },
    }));
  }
}

/**
 * Strip HTML tags from translation text
 */
export function cleanTranslationText(text) {
  if (!text) return '';
  return text.replace(/<[^>]*>/g, '').trim();
}

/**
 * Fetch verses with Uthmanic Arabic text and selected translations for a chapter range
 */
export async function getVerses(chapterId, fromAyah = 1, toAyah = 7, translationIds = [20]) {
  try {
    const translationParam = translationIds.length > 0 ? `&translations=${translationIds.join(',')}` : '';
    const url = `${API_BASE}/verses/by_chapter/${chapterId}?language=ar&words=false${translationParam}&fields=text_uthmani,chapter_id,verse_number&per_page=300`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();

    const allVerses = data.verses || [];

    const filtered = allVerses.filter(
      (v) => v.verse_number >= fromAyah && v.verse_number <= toAyah
    );

    return filtered.map((v) => ({
      id: v.id,
      verse_number: v.verse_number,
      verse_key: v.verse_key,
      text_uthmani: v.text_uthmani,
      chapter_id: v.chapter_id,
      translations: (v.translations || []).map((t) => ({
        id: t.id,
        resource_id: t.resource_id,
        text: cleanTranslationText(t.text),
      })),
    }));
  } catch (err) {
    console.error('Failed to fetch verses:', err);
    throw err;
  }
}

/**
 * Unified fetcher for verse audio and timings across quran.com and mp3quran.net
 */
export async function getVerseAudioList(reciterId, chapterId, fromAyah = 1, toAyah = 7, verses = []) {
  // 1. Resolve reciter metadata
  const reciterList = cache.recitations || POPULAR_RECITERS;
  const reciter =
    reciterList.find((r) => String(r.id) === String(reciterId)) ||
    POPULAR_RECITERS.find((r) => String(r.id) === String(reciterId)) ||
    POPULAR_RECITERS[0];

  // 2. If source is mp3quran.net (e.g. Al-Zain Mohammad Ahmad or Noreen Mohammad Siddiq)
  if (reciter.source === 'mp3quran') {
    return await getMp3QuranVerseAudioList(reciter, chapterId, fromAyah, toAyah, verses);
  }

  // 3. Source is quran.com
  const numericId = Number(reciter.id);

  try {
    // 3a. Try by-ayah recitation endpoint first
    const byAyahUrl = `${API_BASE}/quran/recitations/${numericId}?chapter_number=${chapterId}`;
    const res = await fetch(byAyahUrl);

    if (res.ok) {
      const data = await res.json();
      const allAudio = data.audio_files || [];

      if (allAudio.length > 0) {
        const audioMap = {};
        for (const a of allAudio) {
          let fullUrl = a.url;
          if (fullUrl.startsWith('//')) {
            fullUrl = `https:${fullUrl}`;
          } else if (!fullUrl.startsWith('http')) {
            fullUrl = `${AUDIO_BASE}${fullUrl}`;
          }
          audioMap[a.verse_key] = fullUrl;
        }

        const result = [];
        for (let ayah = fromAyah; ayah <= toAyah; ayah++) {
          const key = `${chapterId}:${ayah}`;
          if (audioMap[key]) {
            result.push({
              verse_number: ayah,
              verse_key: key,
              audio_url: audioMap[key],
              startTime: 0,
              endTime: 0,
              isSegment: false,
            });
          }
        }

        if (result.length > 0) {
          return result;
        }
      }
    }

    // 3b. If by-ayah returned empty (e.g. Yasser Al-Dossari 174), use chapter_recitations with timestamps!
    const chapterAudioUrl = `${API_BASE}/chapter_recitations/${numericId}/${chapterId}?segments=true`;
    const chapRes = await fetch(chapterAudioUrl);

    if (chapRes.ok) {
      const chapData = await chapRes.json();
      const file = chapData.audio_file;

      if (file && file.audio_url) {
        const timestamps = file.timestamps || [];
        const result = [];

        for (let ayah = fromAyah; ayah <= toAyah; ayah++) {
          const key = `${chapterId}:${ayah}`;
          const ts = timestamps.find((t) => t.verse_key === key);

          if (ts) {
            const startTime = (ts.timestamp_from || 0) / 1000;
            const endTime = (ts.timestamp_to || 0) / 1000;
            result.push({
              verse_number: ayah,
              verse_key: key,
              audio_url: file.audio_url,
              startTime,
              endTime,
              duration: ts.duration ? ts.duration / 1000 : endTime - startTime,
              isSegment: true,
              chapterAudioUrl: file.audio_url,
            });
          } else {
            // If no timestamp for this specific ayah, fallback
            result.push({
              verse_number: ayah,
              verse_key: key,
              audio_url: file.audio_url,
              startTime: 0,
              endTime: 0,
              isSegment: true,
              chapterAudioUrl: file.audio_url,
            });
          }
        }

        return result;
      }
    }

    throw new Error(`لم يتم العثور على ملفات تلاوة للقارئ ${numericId} في السورة ${chapterId}`);
  } catch (err) {
    console.error('Failed to fetch verse audio from quran.com:', err);
    throw err;
  }
}
