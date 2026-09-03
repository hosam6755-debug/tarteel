import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import SidebarControls from '../components/SidebarControls';
import LivePreview from '../components/LivePreview';
import VideoExportModal from '../components/VideoExportModal';
import {
  getChapters,
  getReciters,
  getTranslations,
  getVerses,
  getVerseAudioList,
} from '../services/quranApi';
import { PRESET_BACKGROUNDS } from '../constants/presets';
import { createVideoJob } from '../services/videoJobService';

export default function Home({ user, userData }) {
  // App Data State
  const [chapters, setChapters] = useState([]);
  const [reciters, setReciters] = useState([]);
  const [translationsList, setTranslationsList] = useState([]);
  const [verses, setVerses] = useState([]);
  const [audioList, setAudioList] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Configuration State
  const [config, setConfig] = useState({
    chapterId: 1, // Al-Fatihah
    fromAyah: 1,
    toAyah: 7,
    reciterId: 7, // Mishari Rashid Alafasy
    showTranslation: true,
    translationId: 20, // Saheeh International
    translationFontSize: 16,
    translationColor: '#e2e8f0',
    background: PRESET_BACKGROUNDS[0], // Kaaba
    bgOverlayOpacity: 0.45,
    quranFont: 'Amiri Quran',
    quranFontSize: 32,
    quranTextColor: '#ffd166',
    textGlow: true,
    aspectRatio: '9:16', // '9:16' or '16:9'
    frameStyle: 'islamic', // 'islamic' | 'minimal' | 'glow' | 'none'
    frameColor: '#e5b869',
    frameBorderWidth: 2,
    showWatermark: true,
    watermarkPosition: 'bottom-right', // 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
    watermarkOpacity: 0.75,
    watermarkScale: 1.0,
  });

  // Playback & Active Ayah State
  const [currentAyahIndex, setCurrentAyahIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Video Export Modal & Server Job State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeJobId, setActiveJobId] = useState(null);
  const [initialProgressInfo, setInitialProgressInfo] = useState({
    progress: 5,
    message: 'جاري إرسال الطلب إلى السيرفر...',
  });

  // 1. Initial Load: Chapters, Reciters, Translations
  useEffect(() => {
    async function loadInitialData() {
      setIsLoadingData(true);
      try {
        const [chaps, recs, trans] = await Promise.all([
          getChapters(),
          getReciters(),
          getTranslations(),
        ]);
        setChapters(chaps);
        setReciters(recs);
        setTranslationsList(trans);
      } catch (err) {
        console.error('Failed to load Quran resources:', err);
      } finally {
        setIsLoadingData(false);
      }
    }
    loadInitialData();
  }, []);

  // 2. Load Verses when Chapter, Range or Translation changes
  useEffect(() => {
    async function loadVersesData() {
      try {
        const versesData = await getVerses(
          config.chapterId,
          config.fromAyah,
          config.toAyah,
          config.showTranslation ? [config.translationId] : []
        );
        setVerses(versesData);
        setCurrentAyahIndex(0);
      } catch (err) {
        console.error('Error fetching verses:', err);
      }
    }
    loadVersesData();
  }, [config.chapterId, config.fromAyah, config.toAyah, config.showTranslation, config.translationId]);

  // 3. Load Audio URLs when Reciter, Chapter or Range changes
  useEffect(() => {
    async function loadAudioData() {
      setIsPlaying(false);
      setCurrentAyahIndex(0);
      try {
        const audioData = await getVerseAudioList(
          config.reciterId,
          config.chapterId,
          config.fromAyah,
          config.toAyah,
          verses
        );
        setAudioList(audioData);
      } catch (err) {
        console.error('Error fetching verse audio:', err);
      }
    }
    loadAudioData();
  }, [config.reciterId, config.chapterId, config.fromAyah, config.toAyah, verses]);

  // Handle Video Generation Trigger (Dispatches Job to Server via Firestore)
  const handleGenerateVideo = async () => {
    if (verses.length === 0 || audioList.length === 0) {
      alert('يرجى الانتظار حتى اكتمال تحميل الآيات والتلاوة');
      return;
    }

    if (!user) {
      alert('يجب تسجيل الدخول لتتمكن من توليد الفيديو');
      return;
    }

    setIsGenerating(true);
    setInitialProgressInfo({
      progress: 5,
      message: 'جاري إنشاء طلب التوليد على السيرفر...',
    });

    const activeChapter = chapters.find((c) => c.id === config.chapterId) || chapters[0];

    try {
      // Create server job in Firestore "videoJobs"
      const jobId = await createVideoJob({
        user,
        userData,
        config,
        chapter: activeChapter,
        verses,
        audioList,
      });

      setActiveJobId(jobId);
      setIsModalOpen(true);
      setIsGenerating(false);
    } catch (err) {
      console.error('Video generation initiation failed:', err);
      alert(err.message || 'حدث خطأ أثناء إرسال طلب التوليد.');
      setIsGenerating(false);
    }
  };

  const activeChapter = chapters.find((c) => c.id === config.chapterId) || chapters[0];

  return (
    <div className="app-container">
      <Header user={user} userData={userData} />

      <main className="studio-layout">
        <SidebarControls
          chapters={chapters}
          reciters={reciters}
          translationsList={translationsList}
          config={config}
          setConfig={setConfig}
          onGenerateClick={handleGenerateVideo}
          isGenerating={isGenerating}
          isLoadingData={isLoadingData}
        />

        <LivePreview
          config={config}
          chapter={activeChapter}
          verses={verses}
          audioList={audioList}
          currentAyahIndex={currentAyahIndex}
          setCurrentAyahIndex={setCurrentAyahIndex}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          onGenerateClick={handleGenerateVideo}
          isGenerating={isGenerating}
        />
      </main>

      <VideoExportModal
        isOpen={isModalOpen}
        jobId={activeJobId}
        initialProgressInfo={initialProgressInfo}
        onClose={() => {
          setIsModalOpen(false);
        }}
      />
    </div>
  );
}
