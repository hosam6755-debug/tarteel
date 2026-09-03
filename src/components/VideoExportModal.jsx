import React, { useEffect } from 'react';
import {
  Sparkles,
  Download,
  CheckCircle2,
  X,
  AlertCircle,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function VideoExportModal({
  isOpen,
  onClose,
  progressInfo,
  resultVideo,
}) {
  useEffect(() => {
    if (resultVideo && isOpen) {
      // Trigger golden confetti celebration on completion
      try {
        confetti({
          particleCount: 80,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#e5b869', '#ffd166', '#10b981', '#ffffff'],
        });
      } catch (e) {}
    }
  }, [resultVideo, isOpen]);

  if (!isOpen) return null;

  const isDone = !!resultVideo;
  const isError = progressInfo?.step === 'error';

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog">
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '18px',
            left: '18px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
          title="إغلاق النافذة"
        >
          <X size={22} />
        </button>

        {/* Modal Icon */}
        <div className="modal-icon-wrap">
          {isDone ? (
            <CheckCircle2 size={32} style={{ color: 'var(--accent-emerald)' }} />
          ) : isError ? (
            <AlertCircle size={32} style={{ color: 'var(--accent-rose)' }} />
          ) : (
            <Sparkles size={32} style={{ animation: 'spin 3s linear infinite' }} />
          )}
        </div>

        {/* Title and description */}
        <div>
          <h2 className="modal-title">
            {isDone
              ? 'تم إنشاء الفيديو بنجاح!'
              : isError
              ? 'حدث خطأ أثناء التوليد'
              : 'جاري توليد الفيديو القرآني...'}
          </h2>
          <p className="modal-subtitle">
            {isDone
              ? 'الفيديو جاهز الآن للمعاينة والتحميل بصيغة MP4 بجودة عالية.'
              : isError
              ? progressInfo.message
              : 'يتم الآن معالجة وترميز الإطارات بتسريع العتاد المحلي بدون أي خوادم خارجية.'}
          </p>
        </div>

        {/* Progress Bar (when generating) */}
        {!isDone && !isError && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="progress-bar-track">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${Math.max(5, progressInfo.progress || 5)}%`,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.84rem',
                color: 'var(--text-muted)',
              }}
            >
              <span className="step-indicator-text">{progressInfo.message}</span>
              <span style={{ fontFamily: 'var(--font-latin)', fontWeight: 700 }}>
                {progressInfo.progress || 5}%
              </span>
            </div>
          </div>
        )}

        {/* Video Preview when complete */}
        {isDone && resultVideo && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                background: '#000',
                border: '1px solid var(--border-gold)',
                maxHeight: '320px',
                display: 'flex',
                justifyContent: 'center',
                boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
              }}
            >
              <video
                src={resultVideo.videoUrl}
                controls
                autoPlay
                playsInline
                style={{ maxHeight: '320px', width: 'auto', maxWidth: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <a
                href={resultVideo.videoUrl}
                download={resultVideo.filename || 'quran_video.mp4'}
                className="btn-modal-action primary"
                style={{ textDecoration: 'none', flex: 1 }}
              >
                <Download size={20} />
                <span>تحميل الفيديو (MP4)</span>
              </a>

              <button className="btn-modal-action secondary" onClick={onClose}>
                إغلاق
              </button>
            </div>
          </div>
        )}

        {/* Footer info tip */}
        <div
          style={{
            fontSize: '0.78rem',
            color: 'var(--text-dim)',
            marginTop: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <Zap size={14} style={{ color: 'var(--accent-gold)' }} />
          <span>
            {isDone
              ? '⚡ تم إنتاج الفيديو مباشرة داخل جهازك بدون استهلاك إنترنت إضافي'
              : '🔒 معالجة عتادية فائقة السرعة على جهازك لحماية خصوصيتك وبياناتك'}
          </span>
        </div>
      </div>
    </div>
  );
}
