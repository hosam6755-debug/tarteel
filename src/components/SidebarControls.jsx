import React, { useState } from 'react';
import {
  BookOpen,
  Mic,
  Languages,
  Image as ImageIcon,
  Type,
  Maximize2,
  Sliders,
  Upload,
  Sparkles,
  Layers,
  Square,
  Smartphone,
  Tv,
  ShieldCheck,
} from 'lucide-react';
import {
  PRESET_BACKGROUNDS,
  QURAN_FONTS,
  FRAME_STYLES,
  TEXT_COLOR_PALETTES,
} from '../constants/presets';

export default function SidebarControls({
  chapters,
  reciters,
  translationsList,
  config,
  setConfig,
  onGenerateClick,
  isGenerating,
  isLoadingData,
}) {
  const [activeTab, setActiveTab] = useState('verses'); // 'verses' | 'reciter' | 'bg' | 'text' | 'frame'
  const [bgCategory, setBgCategory] = useState('all'); // 'all' | 'image' | 'video' | 'gradient' | 'color'

  const currentChapter = chapters.find((c) => c.id === Number(config.chapterId)) || chapters[0];
  const maxVerses = currentChapter ? currentChapter.verses_count : 7;

  // Handle chapter change
  const handleChapterChange = (e) => {
    const newId = Number(e.target.value);
    const chap = chapters.find((c) => c.id === newId);
    const count = chap ? chap.verses_count : 7;
    setConfig((prev) => ({
      ...prev,
      chapterId: newId,
      fromAyah: 1,
      toAyah: Math.min(prev.toAyah, count) || 1,
    }));
  };

  // Handle custom image/video upload
  const handleCustomUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const fileUrl = URL.createObjectURL(file);

    setConfig((prev) => ({
      ...prev,
      background: {
        id: 'custom_' + Date.now(),
        type: isVideo ? 'video' : 'image',
        name: file.name,
        url: fileUrl,
        isCustom: true,
      },
    }));
  };

  const filteredBgPresets = PRESET_BACKGROUNDS.filter((bg) => {
    if (bgCategory === 'all') return true;
    return bg.type === bgCategory;
  });

  return (
    <aside className="studio-sidebar">
      {/* Navigation Tabs */}
      <nav className="sidebar-tabs-nav">
        <button
          className={`sidebar-tab-btn ${activeTab === 'verses' ? 'active' : ''}`}
          onClick={() => setActiveTab('verses')}
        >
          <BookOpen size={16} />
          <span>السورة والآيات</span>
        </button>

        <button
          className={`sidebar-tab-btn ${activeTab === 'reciter' ? 'active' : ''}`}
          onClick={() => setActiveTab('reciter')}
        >
          <Mic size={16} />
          <span>القارئ والترجمة</span>
        </button>

        <button
          className={`sidebar-tab-btn ${activeTab === 'bg' ? 'active' : ''}`}
          onClick={() => setActiveTab('bg')}
        >
          <ImageIcon size={16} />
          <span>الخلفية</span>
        </button>

        <button
          className={`sidebar-tab-btn ${activeTab === 'text' ? 'active' : ''}`}
          onClick={() => setActiveTab('text')}
        >
          <Type size={16} />
          <span>الخط والإطار</span>
        </button>

        <button
          className={`sidebar-tab-btn ${activeTab === 'format' ? 'active' : ''}`}
          onClick={() => setActiveTab('format')}
        >
          <Maximize2 size={16} />
          <span>المقاس</span>
        </button>
      </nav>

      {/* Scrollable Configuration Area */}
      <div className="sidebar-content-scroll">
        {/* TAB 1: VERSES SELECTION */}
        {activeTab === 'verses' && (
          <div className="control-card">
            <div className="card-header">
              <h3 className="card-title">
                <BookOpen size={18} className="card-title-icon" />
                تحديد السورة ونطاق الآيات
              </h3>
              {currentChapter && (
                <span className="card-badge">
                  {currentChapter.verses_count} آية
                </span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>اختر السورة الكريمة</span>
                <span className="form-label-desc">من الـ 114 سورة</span>
              </label>
              <select
                className="select-input"
                value={config.chapterId}
                onChange={handleChapterChange}
                disabled={isLoadingData}
              >
                {chapters.map((chap) => (
                  <option key={chap.id} value={chap.id}>
                    {chap.id}. سورة {chap.name_arabic} ({chap.name_simple}) - {chap.verses_count} آية
                  </option>
                ))}
              </select>
            </div>

            <div className="input-row">
              <div className="form-group">
                <label className="form-label">من الآية رقم</label>
                <input
                  type="number"
                  className="text-input"
                  min="1"
                  max={config.toAyah}
                  value={config.fromAyah}
                  onChange={(e) => {
                    const val = Math.max(1, Math.min(Number(e.target.value), config.toAyah));
                    setConfig((prev) => ({ ...prev, fromAyah: val }));
                  }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">إلى الآية رقم</label>
                <input
                  type="number"
                  className="text-input"
                  min={config.fromAyah}
                  max={maxVerses}
                  value={config.toAyah}
                  onChange={(e) => {
                    const val = Math.min(maxVerses, Math.max(config.fromAyah, Number(e.target.value)));
                    setConfig((prev) => ({ ...prev, toAyah: val }));
                  }}
                />
              </div>
            </div>

            <div style={{ fontSize: '0.82rem', color: 'var(--accent-gold)', background: 'rgba(229,184,105,0.08)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
              💡 تلميح: يمكنك اختيار آية واحدة أو مقطع قصير (١ إلى ٥ آيات) للحصول على فيديو ريلز/ستوري سريع التوليد وجذاب.
            </div>
          </div>
        )}

        {/* TAB 2: RECITER & TRANSLATION */}
        {activeTab === 'reciter' && (
          <>
            <div className="control-card">
              <div className="card-header">
                <h3 className="card-title">
                  <Mic size={18} className="card-title-icon" />
                  اختيار القارئ
                </h3>
              </div>

              <div className="form-group">
                <label className="form-label">قائمة القراء والتلاوات</label>
                <select
                  className="select-input"
                  value={config.reciterId}
                  onChange={(e) => {
                    const val = e.target.value;
                    const parsed = isNaN(val) ? val : Number(val);
                    setConfig((prev) => ({ ...prev, reciterId: parsed }));
                  }}
                >
                  <optgroup label="⭐ القراء المختارين و mp3quran">
                    {reciters
                      .filter((r) => r.isPopular || r.source === 'mp3quran' || r.id === 174)
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name_ar} {r.style ? `(${r.style})` : ''} {r.source === 'mp3quran' ? '✨ [mp3quran]' : r.id === 174 ? '⭐ [quran.com]' : ''}
                        </option>
                      ))}
                  </optgroup>
                  {reciters.some((r) => !r.isPopular && r.source !== 'mp3quran' && r.id !== 174) && (
                    <optgroup label="🎙️ باقي قراء المصحف (quran.com)">
                      {reciters
                        .filter((r) => !r.isPopular && r.source !== 'mp3quran' && r.id !== 174)
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name_ar} {r.style ? `(${r.style})` : ''}
                          </option>
                        ))}
                    </optgroup>
                  )}
                </select>
              </div>
            </div>

            <div className="control-card">
              <div className="card-header">
                <h3 className="card-title">
                  <Languages size={18} className="card-title-icon" />
                  الترجمة المصاحبة
                </h3>
                <input
                  type="checkbox"
                  id="toggle-trans"
                  checked={config.showTranslation}
                  onChange={(e) => setConfig((prev) => ({ ...prev, showTranslation: e.target.checked }))}
                  style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                />
              </div>

              {config.showTranslation && (
                <>
                  <div className="form-group">
                    <label className="form-label">لغة ومصدر الترجمة</label>
                    <select
                      className="select-input"
                      value={config.translationId}
                      onChange={(e) => setConfig((prev) => ({ ...prev, translationId: Number(e.target.value) }))}
                    >
                      {translationsList.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.language_name} - {t.name || t.translated_name?.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="slider-container">
                    <div className="slider-header">
                      <span>حجم خط الترجمة</span>
                      <span className="slider-val">{config.translationFontSize}px</span>
                    </div>
                    <input
                      type="range"
                      className="custom-slider"
                      min="12"
                      max="32"
                      value={config.translationFontSize}
                      onChange={(e) => setConfig((prev) => ({ ...prev, translationFontSize: Number(e.target.value) }))}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">لون خط الترجمة</label>
                    <div className="color-chips-row">
                      {TEXT_COLOR_PALETTES.map((p) => (
                        <div
                          key={p.id}
                          className={`color-chip ${config.translationColor === p.color ? 'active' : ''}`}
                          style={{ backgroundColor: p.color }}
                          title={p.name}
                          onClick={() => setConfig((prev) => ({ ...prev, translationColor: p.color }))}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* TAB 3: BACKGROUND CUSTOMIZATION */}
        {activeTab === 'bg' && (
          <div className="control-card">
            <div className="card-header">
              <h3 className="card-title">
                <ImageIcon size={18} className="card-title-icon" />
                خلفية الفيديو والتعتيم
              </h3>
            </div>

            {/* Background Filter Tabs */}
            <div className="segmented-control">
              <button
                className={`segmented-btn ${bgCategory === 'all' ? 'active' : ''}`}
                onClick={() => setBgCategory('all')}
              >
                الكل
              </button>
              <button
                className={`segmented-btn ${bgCategory === 'image' ? 'active' : ''}`}
                onClick={() => setBgCategory('image')}
              >
                صور 4K
              </button>
              <button
                className={`segmented-btn ${bgCategory === 'video' ? 'active' : ''}`}
                onClick={() => setBgCategory('video')}
              >
                فيديوهات
              </button>
              <button
                className={`segmented-btn ${bgCategory === 'gradient' ? 'active' : ''}`}
                onClick={() => setBgCategory('gradient')}
              >
                تدرجات
              </button>
            </div>

            {/* Presets Grid */}
            <div className="backgrounds-grid">
              {filteredBgPresets.map((bg) => (
                <div
                  key={bg.id}
                  className={`bg-thumb-item ${config.background?.id === bg.id ? 'active' : ''}`}
                  onClick={() => setConfig((prev) => ({ ...prev, background: bg }))}
                >
                  {bg.type === 'image' && (
                    <img src={bg.thumb} alt={bg.name} className="bg-thumb-img" loading="lazy" />
                  )}
                  {bg.type === 'video' && (
                    <img src={bg.thumb} alt={bg.name} className="bg-thumb-img" loading="lazy" />
                  )}
                  {bg.type === 'gradient' && (
                    <div style={{ width: '100%', height: '100%', background: bg.value }} />
                  )}
                  {bg.type === 'color' && (
                    <div style={{ width: '100%', height: '100%', background: bg.value }} />
                  )}
                  <span className="bg-type-badge">
                    {bg.type === 'video' ? 'فيديو' : bg.type === 'image' ? 'صورة' : 'لون'}
                  </span>
                  <span className="bg-thumb-label">{bg.name}</span>
                </div>
              ))}
            </div>

            {/* Custom Upload Button */}
            <div className="form-group">
              <label className="form-label">أو ارفع خلفية مخصصة (صورة أو فيديو قصير)</label>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  border: '1px dashed var(--border-gold)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  background: 'rgba(229,184,105,0.05)',
                  color: 'var(--accent-gold-bright)',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                }}
              >
                <Upload size={16} />
                <span>رفع ملف من جهازك</span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleCustomUpload}
                  style={{ display: 'none' }}
                />
              </label>
              {config.background?.isCustom && (
                <div style={{ fontSize: '0.78rem', color: 'var(--accent-emerald)', marginTop: '4px' }}>
                  ✓ تم تفعيل الخلفية المرفوعة: {config.background.name}
                </div>
              )}
            </div>

            {/* Darkness Overlay Opacity */}
            <div className="slider-container">
              <div className="slider-header">
                <span>درجة تعتيم الخلفية (Opacity)</span>
                <span className="slider-val">{Math.round(config.bgOverlayOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                className="custom-slider"
                min="0"
                max="0.9"
                step="0.05"
                value={config.bgOverlayOpacity}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, bgOverlayOpacity: Number(e.target.value) }))
                }
              />
              <span className="form-label-desc">
                زيادة التعتيم تجعل النص القراني يبرز بوضوح فائق فوق الخلفية
              </span>
            </div>
          </div>
        )}

        {/* TAB 4: TYPOGRAPHY & FRAME */}
        {activeTab === 'text' && (
          <>
            <div className="control-card">
              <div className="card-header">
                <h3 className="card-title">
                  <Type size={18} className="card-title-icon" />
                  الخط القراني العثماني
                </h3>
              </div>

              <div className="form-group">
                <label className="form-label">نوع الخط القرآني</label>
                <select
                  className="select-input"
                  value={config.quranFont}
                  onChange={(e) => setConfig((prev) => ({ ...prev, quranFont: e.target.value }))}
                >
                  {QURAN_FONTS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="slider-container">
                <div className="slider-header">
                  <span>حجم خط الآيات</span>
                  <span className="slider-val">{config.quranFontSize}px</span>
                </div>
                <input
                  type="range"
                  className="custom-slider"
                  min="20"
                  max="60"
                  value={config.quranFontSize}
                  onChange={(e) => setConfig((prev) => ({ ...prev, quranFontSize: Number(e.target.value) }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">لون النص القرآني</label>
                <div className="color-chips-row">
                  {TEXT_COLOR_PALETTES.map((p) => (
                    <div
                      key={p.id}
                      className={`color-chip ${config.quranTextColor === p.color ? 'active' : ''}`}
                      style={{ backgroundColor: p.color }}
                      title={p.name}
                      onClick={() => setConfig((prev) => ({ ...prev, quranTextColor: p.color }))}
                    />
                  ))}
                </div>
              </div>

              <div className="card-header" style={{ marginTop: '6px' }}>
                <span className="form-label" style={{ margin: 0 }}>توهج ذهبي خفيف للنص (Glow)</span>
                <input
                  type="checkbox"
                  checked={config.textGlow}
                  onChange={(e) => setConfig((prev) => ({ ...prev, textGlow: e.target.checked }))}
                  style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                />
              </div>
            </div>

            <div className="control-card">
              <div className="card-header">
                <h3 className="card-title">
                  <Square size={18} className="card-title-icon" />
                  إطار وحدود الفيديو
                </h3>
              </div>

              <div className="form-group">
                <label className="form-label">نمط الإطار</label>
                <select
                  className="select-input"
                  value={config.frameStyle}
                  onChange={(e) => setConfig((prev) => ({ ...prev, frameStyle: e.target.value }))}
                >
                  {FRAME_STYLES.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              {config.frameStyle !== 'none' && (
                <>
                  <div className="form-group">
                    <label className="form-label">لون الإطار</label>
                    <div className="color-chips-row">
                      {TEXT_COLOR_PALETTES.map((p) => (
                        <div
                          key={p.id}
                          className={`color-chip ${config.frameColor === p.color ? 'active' : ''}`}
                          style={{ backgroundColor: p.color }}
                          title={p.name}
                          onClick={() => setConfig((prev) => ({ ...prev, frameColor: p.color }))}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="slider-container">
                    <div className="slider-header">
                      <span>عرض حدود الإطار</span>
                      <span className="slider-val">{config.frameBorderWidth}px</span>
                    </div>
                    <input
                      type="range"
                      className="custom-slider"
                      min="1"
                      max="6"
                      value={config.frameBorderWidth}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, frameBorderWidth: Number(e.target.value) }))
                      }
                    />
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* TAB 5: FORMAT & ORIENTATION */}
        {activeTab === 'format' && (
          <>
            <div className="control-card">
            <div className="card-header">
              <h3 className="card-title">
                <Maximize2 size={18} className="card-title-icon" />
                أبعاد ومقاس الفيديو
              </h3>
            </div>

            <div className="segmented-control">
              <button
                className={`segmented-btn ${config.aspectRatio === '9:16' ? 'active' : ''}`}
                onClick={() => setConfig((prev) => ({ ...prev, aspectRatio: '9:16' }))}
              >
                <Smartphone size={16} />
                <span>عمودي (9:16) ستوري/ريلز</span>
              </button>

              <button
                className={`segmented-btn ${config.aspectRatio === '16:9' ? 'active' : ''}`}
                onClick={() => setConfig((prev) => ({ ...prev, aspectRatio: '16:9' }))}
              >
                <Tv size={16} />
                <span>أفقي (16:9) يوتيوب</span>
              </button>
            </div>

            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {config.aspectRatio === '9:16' ? (
                <p>
                  📱 <strong>المقاس الرأسي (1080×1920)</strong>: مثالي لمنصات إنستغرام ريلز، تيك توك، يوتيوب شورتس، وحالات واتساب.
                </p>
              ) : (
                <p>
                  🖥️ <strong>المقاس الأفقي (1920×1080)</strong>: مثالي لفيديوهات قنوات اليوتيوب، وشاشات التلفزيون، والعرض المكتبي.
                </p>
              )}
            </div>
          </div>

          {/* Watermark Settings Card */}
          <div className="control-card">
            <div className="card-header">
              <h3 className="card-title">
                <ShieldCheck size={18} className="card-title-icon" />
                العلامة المائية (شعار ترتيل)
              </h3>
              <input
                type="checkbox"
                checked={config.showWatermark !== false}
                onChange={(e) => setConfig((prev) => ({ ...prev, showWatermark: e.target.checked }))}
                style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                title="تفعيل أو إخفاء العلامة المائية في الفيديو"
              />
            </div>

            {config.showWatermark !== false && (
              <>
                <div className="form-group">
                  <label className="form-label">
                    <span>موضع العلامة المائية</span>
                    <span className="form-label-desc">الافتراضي: أسفل اليمين</span>
                  </label>
                  <div className="segmented-control" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <button
                      type="button"
                      className={`segmented-btn ${config.watermarkPosition === 'bottom-right' ? 'active' : ''}`}
                      onClick={() => setConfig((prev) => ({ ...prev, watermarkPosition: 'bottom-right' }))}
                    >
                      أسفل اليمين ⭐
                    </button>
                    <button
                      type="button"
                      className={`segmented-btn ${config.watermarkPosition === 'bottom-left' ? 'active' : ''}`}
                      onClick={() => setConfig((prev) => ({ ...prev, watermarkPosition: 'bottom-left' }))}
                    >
                      أسفل اليسار
                    </button>
                    <button
                      type="button"
                      className={`segmented-btn ${config.watermarkPosition === 'top-right' ? 'active' : ''}`}
                      onClick={() => setConfig((prev) => ({ ...prev, watermarkPosition: 'top-right' }))}
                    >
                      أعلى اليمين
                    </button>
                    <button
                      type="button"
                      className={`segmented-btn ${config.watermarkPosition === 'top-left' ? 'active' : ''}`}
                      onClick={() => setConfig((prev) => ({ ...prev, watermarkPosition: 'top-left' }))}
                    >
                      أعلى اليسار
                    </button>
                  </div>
                </div>

                <div className="slider-container">
                  <div className="slider-header">
                    <span>درجة شفافية العلامة المائية</span>
                    <span className="slider-val">{Math.round((config.watermarkOpacity || 0.75) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    className="custom-slider"
                    min="0.2"
                    max="1.0"
                    step="0.05"
                    value={config.watermarkOpacity || 0.75}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, watermarkOpacity: Number(e.target.value) }))
                    }
                  />
                  <span className="form-label-desc">
                    علامة مائية خفيفة وأنيقة تحفظ مصدر وحقوق الفيديو عند مشاركته على تيك توك وإنستغرام
                  </span>
                </div>
              </>
            )}
          </div>
        </>
      )}
      </div>

      {/* Persistent Bottom Action Bar */}
      <div className="sidebar-action-bar">
        <button
          className="btn-primary-generate"
          onClick={onGenerateClick}
          disabled={isGenerating || isLoadingData}
        >
          <Sparkles size={20} />
          <span>{isGenerating ? 'جاري التوليد...' : 'توليد وتحميل الفيديو (MP4)'}</span>
        </button>
      </div>
    </aside>
  );
}
