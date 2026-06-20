import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const STATUS_INFO = {
  submitted:     { label: '접수 완료',  color: '#1a6fc4', bg: '#e8f1fb', icon: '📥', desc: '신고서가 성공적으로 접수되었습니다.' },
  reviewing:     { label: '검토 중',    color: '#c8922a', bg: '#fdf3e0', icon: '🔍', desc: '담당자가 신고 내용을 검토하고 있습니다.' },
  investigating: { label: '수사 의뢰', color: '#7c3aed', bg: '#f3f0ff', icon: '🕵️', desc: '관련 기관에 수사가 의뢰되었습니다.' },
  closed:        { label: '처리 완료',  color: '#158a45', bg: '#e6f5ec', icon: '✅', desc: '처리가 완료되었습니다. 추가 문의는 1332로 연락하세요.' },
};

const TIMELINE = [
  { key: 'submitted',     label: '신고 접수', icon: '📥' },
  { key: 'reviewing',     label: '내용 검토', icon: '🔍' },
  { key: 'investigating', label: '수사 의뢰', icon: '🕵️' },
  { key: 'closed',        label: '처리 완료', icon: '✅' },
];
const STATUS_ORDER = ['submitted', 'reviewing', 'investigating', 'closed'];

export default function TrackPage() {
  const [searchParams] = useSearchParams();
  const [inputId, setInputId] = useState(searchParams.get('id') || '');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) { setInputId(id); search(id); }
  }, []);

  const search = async (id = inputId) => {
    if (!id.trim()) { setError('접수번호를 입력해 주세요.'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(`/api/report/${id.trim().toUpperCase()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setResult(json.report);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const statusIdx = result ? STATUS_ORDER.indexOf(result.statusCode) : -1;
  const info = result ? STATUS_INFO[result.statusCode] : null;

  return (
    <main className="main">
      <div className="card">
        <div className="step-content">
          <div className="step-header">
            <div className="step-icon-wrap">🔍</div>
            <div><h2 className="step-title">신고 접수 조회</h2><p className="step-desc">신고 시 발급된 접수번호로 처리 현황을 확인할 수 있습니다.</p></div>
          </div>

          <div className="track-search">
            <div className="track-input-wrap">
              <input
                type="text"
                className="track-input"
                placeholder="접수번호 8자리 입력 (예: A1B2C3D4)"
                value={inputId}
                onChange={e => setInputId(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && search()}
                maxLength={8}
              />
              <button className="btn btn-primary" onClick={() => search()} disabled={loading}>
                {loading ? '조회 중...' : '조회하기'}
              </button>
            </div>
            {error && <div className="alert alert-error" style={{ marginTop: '.75rem' }}>⚠ {error}</div>}
          </div>

          {result && (
            <div className="track-result">
              {/* Status Banner */}
              <div className="status-banner" style={{ background: info.bg, borderColor: info.color }}>
                <span className="status-icon">{info.icon}</span>
                <div>
                  <div className="status-label" style={{ color: info.color }}>{info.label}</div>
                  <div className="status-desc">{info.desc}</div>
                </div>
                <div className="status-id">#{result.reportId}</div>
              </div>

              {/* Timeline */}
              <div className="timeline">
                {TIMELINE.map((t, i) => {
                  const done = i <= statusIdx;
                  const active = i === statusIdx;
                  return (
                    <div key={t.key} className={`tl-item ${done ? 'done' : ''} ${active ? 'active' : ''}`}>
                      <div className="tl-dot">{done ? (active ? t.icon : '✓') : ''}</div>
                      {i < TIMELINE.length - 1 && <div className="tl-line" />}
                      <div className="tl-label">{t.label}</div>
                    </div>
                  );
                })}
              </div>

              {/* Report Details */}
              <div className="track-details">
                <div className="track-details-title">신고 내용 요약</div>
                <div className="review-box">
                  <DetailRow label="접수번호" value={result.reportId} mono />
                  <DetailRow label="접수일시" value={result.timestamp} />
                  <DetailRow label="신고자" value={result.reporterName} />
                  <DetailRow label="사기 유형" value={result.fraudType} highlight />
                  {result.locationText && <DetailRow label="발생 위치" value={result.locationText} />}
                  {result.qrData && <DetailRow label="QR 내용" value={result.qrData} />}
                  <div className="review-row">
                    <span className="review-label">피해 설명</span>
                    <span className="review-value" style={{ whiteSpace: 'pre-wrap' }}>{result.description}</span>
                  </div>
                  {result.images && result.images.length > 0 && (
                    <div className="review-row">
                      <span className="review-label">첨부 사진</span>
                      <div className="review-imgs">
                        {result.images.map((img, i) => (
                          <img key={i} src={`/uploads/${img}`} alt={`증거 ${i+1}`} className="review-img" />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="track-help">
                <strong>📞 추가 문의</strong> — 처리 현황 문의 시 접수번호 <strong>{result.reportId}</strong>를 알려주세요<br />
                금융감독원 <strong>1332</strong> · 경찰청 사이버수사국 <strong>182</strong>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function DetailRow({ label, value, mono, highlight }) {
  return (
    <div className="review-row">
      <span className="review-label">{label}</span>
      <span className="review-value" style={{ fontFamily: mono ? 'monospace' : undefined, color: highlight ? 'var(--red)' : undefined, fontWeight: highlight ? 700 : undefined }}>{value}</span>
    </div>
  );
}
