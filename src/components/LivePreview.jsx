import React, { useRef, useEffect, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Sparkles,
} from 'lucide-react';

export default function LivePreview({
  config,
  chapter,
  verses,
  audioList,
  currentAyahIndex,
  setCurrentAyahIndex,
  isPlaying,
  setIsPlaying,
  onGenerateClick,
  isGenerating,
}) {
  const audioRef = useRef(null);
  const loadedAudioSrcRef = useRef('');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const currentAyah = verses[currentAyahIndex] || verses[0];
  const currentAudio = audioList[currentAyahIndex] || audioList[0];

  // Convert English digits to Arabic numerals for Ayah marks
  const toArabicNumber = (num) => {
    if (!num && num !== 0) return '';
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return String(num).replace(/[0-9]/g, (w) => arabicDigits[+w]);
  };

  // 1. Audio Source Loading: triggers whenever audioList or reciter changes
  useEffect(() => {
    if (!audioRef.current || !currentAudio) return;
    const audioEl = audioRef.current;

    const targetUrl = currentAudio.isSegment
      ? currentAudio.chapterAudioUrl || currentAudio.audio_url
      : currentAudio.audio_url;

    if (!targetUrl) return;

    // Check if the actual audio source changed (different reciter, surah, or file)
    if (loadedAudioSrcRef.current !== targetUrl) {
      audioEl.pause();
      loadedAudioSrcRef.current = targetUrl;
      audioEl.src = targetUrl;
      audioEl.load();

      const startPos = currentAudio.startTime || 0;
      audioEl.onloadedmetadata = () => {
        audioEl.currentTime = startPos;
        if (currentAudio.isSegment) {
          const endPos = currentAudio.endTime || startPos + 5;
          setDuration(Math.max(1, endPos - startPos));
          setCurrentTime(0);
        } else {
          setDuration(audioEl.duration || 0);
          setCurrentTime(0);
        }
        if (isPlaying) {
          audioEl.play().catch((e) => console.log('Autoplay prevented:', e));
        }
      };
    }
  }, [currentAudio?.audio_url, currentAudio?.chapterAudioUrl, currentAudio?.isSegment]);

  // 2. High-Frequency Real-Time Sync Loop (50ms interval = 20 checks/sec)
  // Ensures verse highlighting responds instantaneously to audio progression
  useEffect(() => {
    if (!isPlaying) return;

    const syncInterval = setInterval(() => {
      const audioEl = audioRef.current;
      if (!audioEl || !audioList || audioList.length === 0) return;

      const t = audioEl.currentTime;

      if (audioList[0]?.isSegment) {
        // Segmented chapter audio
        const lastAyah = audioList[audioList.length - 1];
        const rangeEnd = lastAyah.endTime || (lastAyah.startTime + (lastAyah.duration || 4));
        const firstAyah = audioList[0];
        const rangeStart = firstAyah.startTime || 0;

        // Reached end of entire selected range
        if (t >= rangeEnd) {
          audioEl.pause();
          setIsPlaying(false);
          setCurrentAyahIndex(0);
          audioEl.currentTime = rangeStart;
          return;
        }

        // Find active ayah using 70ms anticipatory lookahead for crisp, zero-latency highlight
        const lookahead = 0.07;
        const targetTime = t + lookahead;

        let activeIdx = -1;
        for (let i = 0; i < audioList.length; i++) {
          const item = audioList[i];
          const s = item.startTime;
          const e = item.endTime > s ? item.endTime : s + (item.duration || 4);
          if (targetTime >= s && targetTime < e) {
            activeIdx = i;
            break;
          }
        }

        if (activeIdx !== -1 && activeIdx !== currentAyahIndex) {
          setCurrentAyahIndex(activeIdx);
        }

        // Update slider time & duration for active ayah
        const cur = audioList[currentAyahIndex] || audioList[0];
        const curStart = cur.startTime || 0;
        const curEnd = cur.endTime || curStart + 5;
        setCurrentTime(Math.max(0, t - curStart));
        setDuration(Math.max(1, curEnd - curStart));
      } else {
        // By-ayah separate files
        setCurrentTime(audioEl.currentTime);
        setDuration(audioEl.duration || 0);
      }
    }, 50);

    return () => clearInterval(syncInterval);
  }, [isPlaying, audioList, currentAyahIndex, setCurrentAyahIndex, setIsPlaying]);

  // 3. User seeks manually or clicks Next/Prev Ayah
  const jumpToAyah = (index) => {
    if (index < 0 || index >= audioList.length) return;
    setCurrentAyahIndex(index);

    const targetItem = audioList[index];
    if (audioRef.current && targetItem) {
      if (targetItem.isSegment) {
        audioRef.current.currentTime = targetItem.startTime || 0;
      }
      if (isPlaying && audioRef.current.paused) {
        audioRef.current.play().catch(() => {});
      }
    }
  };

  // Handle audio play/pause
  const togglePlay = () => {
    if (!audioRef.current) return;
    const audioEl = audioRef.current;

    if (isPlaying) {
      audioEl.pause();
      setIsPlaying(false);
    } else {
      if (currentAudio?.isSegment) {
        const curStart = currentAudio.startTime || 0;
        const curEnd = currentAudio.endTime || curStart + 5;
        if (audioEl.currentTime < curStart || audioEl.currentTime >= curEnd) {
          audioEl.currentTime = curStart;
        }
      }
      audioEl
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.error('Audio play error:', err);
        });
    }
  };

  // Handle audio track ended (for by-ayah separate files)
  const handleAudioEnded = () => {
    if (currentAudio?.isSegment) return; // Handled in real-time sync loop

    if (currentAyahIndex < audioList.length - 1) {
      jumpToAyah(currentAyahIndex + 1);
    } else {
      jumpToAyah(0);
      setIsPlaying(false);
    }
  };

  // Format seconds to mm:ss
  const formatTime = (secs) => {
    if (isNaN(secs) || secs === 0) return '00:00';
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleTimeUpdate = () => {
    if (!isPlaying && audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const activeTranslation = currentAyah?.translations?.[0]?.text || '';

  return (
    <section className="studio-preview-area">
      {/* Hidden audio element for preview */}
      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => {
          if (!currentAudio?.isSegment) {
            setDuration(audioRef.current?.duration || 0);
          }
        }}
        onEnded={handleAudioEnded}
      />

      {/* Preview Toolbar */}
      <div className="preview-toolbar">
        <div className="preview-title-group">
          <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>شاشة المعاينة</span>
          <span className="preview-aspect-tag">
            {config.aspectRatio === '9:16' ? '9:16 ستوري' : '16:9 أفقي'}
          </span>
        </div>
        <div className="preview-controls-group">
          <span className="preview-ayah-counter">
            الآية {currentAyah ? `${currentAyah.verse_number}` : '-'} من {chapter?.verses_count || '-'}
          </span>
          {onGenerateClick && (
            <button
              className="btn-preview-quick-generate"
              onClick={onGenerateClick}
              disabled={isGenerating}
              title="توليد وتحميل الفيديو"
            >
              <Sparkles size={14} />
              <span>تصدير</span>
            </button>
          )}
        </div>
      </div>

      {/* The Live Video Viewport Container */}
      <div
        className={`video-stage-viewport ${
          config.aspectRatio === '9:16' ? 'aspect-9-16' : 'aspect-16-9'
        }`}
        style={{
          '--base-width': config.aspectRatio === '9:16' ? 360 : 640,
        }}
      >
        {/* Layer 1: Background */}
        {config.background?.type === 'image' && (
          <img
            src={config.background.url}
            alt="background"
            className="stage-bg-layer"
          />
        )}
        {config.background?.type === 'video' && (
          <video
            src={config.background.url}
            className="stage-bg-layer"
            autoPlay
            loop
            muted
            playsInline
          />
        )}
        {(config.background?.type === 'gradient' || config.background?.type === 'color') && (
          <div
            className="stage-bg-layer"
            style={{
              background: config.background.value,
            }}
          />
        )}

        {/* Layer 2: Darkness Overlay Mask */}
        <div
          className="stage-overlay-mask"
          style={{ opacity: config.bgOverlayOpacity }}
        />

        {/* Layer 3: Frame Border */}
        {config.frameStyle !== 'none' && (
          <div
            className={`stage-frame-border style-${config.frameStyle}`}
            style={{
              borderColor: config.frameColor,
              borderWidth: `${config.frameBorderWidth}px`,
            }}
          />
        )}

        {/* Layer 4: Video Foreground Content */}
        <div className="stage-content-container">
          {/* Top Surah Badge */}
          <div className="video-surah-badge">
            <span>سورة {chapter?.name_arabic || 'القرآن'}</span>
            <span style={{ opacity: 0.6 }}>•</span>
            <span>الآية {toArabicNumber(currentAyah?.verse_number)}</span>
          </div>

          {/* Center Quran Verse Text */}
          <div className="video-verses-wrapper">
            <p
              className="quran-ayah-text"
              style={{
                fontFamily: config.quranFont,
                '--user-font-size': `${config.quranFontSize}px`,
                color: config.quranTextColor,
                textShadow: config.textGlow
                  ? `0 0 20px ${config.quranTextColor}, 0 2px 10px rgba(0,0,0,0.9)`
                  : '0 2px 10px rgba(0,0,0,0.9)',
              }}
            >
              {currentAyah ? currentAyah.text_uthmani : 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ'}
              <span className="ayah-end-symbol">
                ۝{toArabicNumber(currentAyah?.verse_number)}
              </span>
            </p>
          </div>

          {/* Bottom Translation Subtitle */}
          {config.showTranslation && activeTranslation && (
            <div
              className="video-translation-text"
              style={{
                '--user-trans-size': `${config.translationFontSize}px`,
                color: config.translationColor,
              }}
            >
              {activeTranslation}
            </div>
          )}
        </div>

        {/* Layer: Watermark Badge */}
        {config.showWatermark !== false && (
          <div
            className={`stage-watermark-badge pos-${config.watermarkPosition || 'bottom-right'}`}
            style={{ 
              opacity: config.watermarkOpacity || 0.75,
              transform: `scale(${config.watermarkScale || 1.0})`,
              transformOrigin: (config.watermarkPosition || 'bottom-right').includes('bottom') 
                ? ((config.watermarkPosition || 'bottom-right').includes('right') ? 'bottom right' : 'bottom left')
                : ((config.watermarkPosition || 'bottom-right').includes('right') ? 'top right' : 'top left')
            }}
          >
            <img src="/tarteel-logo.png" alt="ترتيل" className="watermark-logo-img" />
            <span className="watermark-brand-name">ترتيل</span>
          </div>
        )}
      </div>

      {/* Audio Player Control Dock */}
      <div className="audio-player-dock">
        <button
          className="btn-play-toggle"
          onClick={togglePlay}
          title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل التلاوة'}
        >
          {isPlaying ? <Pause size={22} /> : <Play size={22} style={{ marginRight: '-2px' }} />}
        </button>

        <div className="audio-progress-wrap">
          <div className="audio-meta-row">
            <div className="audio-reciter-name">
              <Volume2 size={15} style={{ color: 'var(--accent-gold)' }} />
              <span>
                تلاوة الآية {currentAyah?.verse_number || 1} من سورة {chapter?.name_arabic}
              </span>
            </div>
            <div className="audio-time-label">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          {/* Audio seek slider */}
          <input
            type="range"
            className="custom-slider"
            min="0"
            max={duration || 100}
            step="0.1"
            value={currentTime}
            onChange={(e) => {
              const val = Number(e.target.value);
              setCurrentTime(val);
              if (audioRef.current) {
                if (currentAudio?.isSegment) {
                  audioRef.current.currentTime = (currentAudio.startTime || 0) + val;
                } else {
                  audioRef.current.currentTime = val;
                }
              }
            }}
          />
        </div>

        {/* Verse Switcher Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            className="sidebar-tab-btn"
            style={{ padding: '8px' }}
            disabled={currentAyahIndex === 0}
            onClick={() => jumpToAyah(Math.max(0, currentAyahIndex - 1))}
            title="الآية السابقة"
          >
            <SkipForward size={18} />
          </button>

          <span
            style={{
              fontSize: '0.82rem',
              fontFamily: 'var(--font-latin)',
              color: 'var(--accent-gold-bright)',
              minWidth: '40px',
              textAlign: 'center',
            }}
          >
            {currentAyahIndex + 1} / {verses.length || 1}
          </span>

          <button
            className="sidebar-tab-btn"
            style={{ padding: '8px' }}
            disabled={currentAyahIndex >= verses.length - 1}
            onClick={() => jumpToAyah(Math.min(verses.length - 1, currentAyahIndex + 1))}
            title="الآية التالية"
          >
            <SkipBack size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
