import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Download,
  CheckCircle2,
  X,
  AlertCircle,
  CloudLightning,
  RefreshCw,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { subscribeToVideoJob } from '../services/videoJobService';

export default function VideoExportModal({
  isOpen,
  onClose,
  jobId,
  initialProgressInfo,
}) {
  const [jobData, setJobData] = useState(null);
  const [subscriptionError, setSubscriptionError] = useState(null);

  useEffect(() => {
    if (!isOpen || !jobId) {
      setJobData(null);
      setSubscriptionError(null);
      return;
    }

    // Subscribe to Firestore videoJobs updates
    const unsubscribe = subscribeToVideoJob(
      jobId,
      (data) => {
        setJobData(data);
      },
      (err) => {
        console.error('Failed to subscribe to job:', err);
        setSubscriptionError(err.message || 'فشل الاتصال بتحديثات المعالجة');
      }
    );

    return () => {
      unsubscribe();
    };
  }, [isOpen, jobId]);

  // Trigger celebration confetti when video completes
  useEffect(() => {
    if (jobData?.status === 'completed' && isOpen) {
      try {
        confetti({
          particleCount: 80,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#e5b869', '#ffd166', '#10b981', '#ffffff'],
        });
      } catch (e) {}
    }
  }, [jobData?.status, isOpen]);

  if (!isOpen) return null;

  const isDone = jobData?.status === 'completed';
  const isError = jobData?.status === 'failed' || !!subscriptionError;
  const progress = jobData?.progress ?? initialProgressInfo?.progress ?? 5;
  const message =
    subscriptionError ||
    jobData?.error?.message ||
    jobData?.stepMessage ||
    initialProgressInfo?.message ||
    'جاري إرسال الطلب إلى السيرفر...';

  const videoUrl = jobData?.result?.videoUrl;

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
              : 'جاري توليد الفيديو على السيرفر...'}
          </h2>
          <p className="modal-subtitle">
            {isDone
              ? 'الفيديو جاهز الآن للمعاينة والتحميل بجودة عالية (MP4) من الخادم السحابي.'
              : isError
              ? message
              : 'يتم الآن معالجة الإطارات والصوت بـ FFmpeg على خوادم سحابية فائقة السرعة.'}
          </p>
        </div>

        {/* Progress Bar (when generating) */}
        {!isDone && !isError && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="progress-bar-track">
              <div
                className="progress-bar-fill"
                style={{ width: `${Math.max(5, progress)}%`, transition: 'width 0.4s ease' }}
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
              <span className="step-indicator-text">{message}</span>
              <span style={{ fontFamily: 'var(--font-latin)', fontWeight: 700 }}>
                {progress}%
              </span>
            </div>
          </div>
        )}

        {/* Error message detail box */}
        {isError && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              fontSize: '0.86rem',
              textAlign: 'right',
            }}
          >
            {message}
          </div>
        )}

        {/* Video Preview when complete */}
        {isDone && videoUrl && (
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
                src={videoUrl}
                controls
                autoPlay
                playsInline
                style={{ maxHeight: '320px', width: 'auto', maxWidth: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <a
                href={videoUrl}
                target="_blank"
                rel="noreferrer"
                download={`quran_video_${jobId || Date.now()}.mp4`}
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

        {/* Footer info tip for mobile performance */}
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
          <CloudLightning size={14} style={{ color: 'var(--accent-gold)' }} />
          <span>
            {isDone
              ? 'تمت المعالجة على السيرفر السحابي دون استهلاك لموارد هاتفك'
              : 'معالجة سحابية: يمكنك التنقل في هاتفك بحرية وستستمر المعالجة بالسيرفر'}
          </span>
        </div>
      </div>
    </div>
  );
}
