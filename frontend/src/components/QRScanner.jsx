import { useEffect, useRef, useState } from 'react';

function calcRisk(url) {
  if (!url) return 45;
  let score = 38;
  const keywords = ['kakao', 'naver', 'bank', 'kbank', 'secure', 'verify', 'account', 'login', 'auth', 'pay', 'transfer', 'update', 'support', 'cs', 'help'];
  keywords.forEach(kw => { if (url.toLowerCase().includes(kw)) score += 8; });
  if (url.startsWith('http://')) score += 22;
  if (url.includes('bit.ly') || url.includes('tinyurl') || url.includes('short')) score += 18;
  if (/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(url)) score += 25;
  return Math.min(score, 99);
}

export default function QRScanner({ onScan }) {
  const [mode, setMode] = useState('idle');
  const [result, setResult] = useState('');
  const [riskData, setRiskData] = useState(null);
  const [dots, setDots] = useState('');
  const scannerRef = useRef(null);

  useEffect(() => {
    if (mode !== 'scanning') return;
    let scanner;
    import('html5-qrcode').then(({ Html5QrcodeScanner }) => {
      scanner = new Html5QrcodeScanner(
        'qr-reader-container',
        { fps: 10, qrbox: { width: 250, height: 250 }, rememberLastUsedCamera: true },
        false
      );
      scanner.render(
        (text) => {
          onScan(text);
          setResult(text);
          scanner.clear().catch(() => {});
          setMode('analyzing');
        },
        () => {}
      );
      scannerRef.current = scanner;
    });
    return () => {
      if (scannerRef.current) { scannerRef.current.clear().catch(() => {}); scannerRef.current = null; }
    };
  }, [mode]);

  useEffect(() => {
    if (mode !== 'analyzing') return;
    const dotTimer = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 400);
    const analyzeTimer = setTimeout(async () => {
      clearInterval(dotTimer);
      try {
        const res = await fetch(`/api/check-url?url=${encodeURIComponent(result)}`);
        const data = await res.json();
        setRiskData(data);
      } catch {
        setRiskData({ count: 0, riskScore: calcRisk(result) });
      }
      setMode('done');
    }, 2200);
    return () => { clearInterval(dotTimer); clearTimeout(analyzeTimer); };
  }, [mode, result]);

  if (mode === 'analyzing') {
    return (
      <div className="qr-analyzing">
        <div className="qr-scan-ring" />
        <p className="qr-analyzing-title">⚠ URL 위험도 분석 중{dots}</p>
        <p className="qr-analyzing-sub">NHATRANG 위협 데이터베이스 조회 중</p>
        <code className="qr-code-preview">{result.length > 55 ? result.slice(0, 55) + '...' : result}</code>
      </div>
    );
  }

  if (mode === 'done') {
    const risk = riskData?.riskScore ?? calcRisk(result);
    const prevCount = riskData?.count ?? 0;
    const level = risk >= 75 ? 'high' : risk >= 50 ? 'mid' : 'low';
    const levelText = { high: '위험', mid: '주의', low: '안전' }[level];
    const levelColor = { high: '#d42b2b', mid: '#c8922a', low: '#158a45' }[level];
    const levelIcon = { high: '🔴', mid: '🟡', low: '🟢' }[level];
    return (
      <div className="qr-result">
        <div className={`qr-danger-badge lvl-${level}`}>
          <div className="qr-danger-header">
            <span className="qr-danger-icon-big">{levelIcon}</span>
            <div>
              <div className="qr-danger-title">위협 탐지 완료</div>
              <div className="qr-danger-level" style={{ color: levelColor }}>위험도: <strong>{levelText}</strong></div>
            </div>
            <div className="qr-risk-num" style={{ color: levelColor }}>{risk}<span>%</span></div>
          </div>
          <div className="qr-score-bar-wrap">
            <div className="qr-score-bar-bg">
              <div className="qr-score-bar-fill" style={{ width: `${risk}%`, background: levelColor }} />
            </div>
          </div>
          {prevCount > 0 && (
            <div className="qr-dup-warn">
              ⚡ 동일 URL — 이미 <strong>{prevCount}건</strong> 신고된 위험 URL입니다!
            </div>
          )}
          {prevCount === 0 && level === 'high' && (
            <div className="qr-dup-warn new-threat">
              🆕 최초 탐지 — 신규 위협 URL로 등록됩니다
            </div>
          )}
        </div>
        <p className="qr-result-label">스캔 완료 — 증거 URL 기록됨</p>
        <code className="qr-code-value">{result}</code>
        <button className="btn btn-ghost" style={{ marginTop: '.75rem', fontSize: '.8rem' }}
          onClick={() => { setResult(''); setRiskData(null); setMode('scanning'); }}>
          다시 스캔하기
        </button>
      </div>
    );
  }

  if (mode === 'scanning') {
    return (
      <div>
        <div id="qr-reader-container" style={{ width: '100%' }} />
        <button className="btn btn-ghost" style={{ marginTop: '.5rem', fontSize: '.8rem' }}
          onClick={() => { if (scannerRef.current) scannerRef.current.clear().catch(() => {}); setMode('idle'); }}>
          스캔 취소
        </button>
      </div>
    );
  }

  return (
    <div className="qr-idle">
      <div className="qr-icon">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="5" y="5" width="3" height="3" fill="currentColor" stroke="none" />
          <rect x="16" y="5" width="3" height="3" fill="currentColor" stroke="none" />
          <rect x="5" y="16" width="3" height="3" fill="currentColor" stroke="none" />
          <path d="M14 14h2v2h-2zM18 14h3v1h-3zM14 18h1v3h-1zM16 16h2v2h-2zM19 17h2v4h-2zM17 20h2v1h-2z" fill="currentColor" stroke="none" />
        </svg>
      </div>
      <button className="btn btn-secondary" onClick={() => setMode('scanning')}>
        📷 카메라로 QR코드 스캔
      </button>
      <p className="qr-hint">의심스러운 QR코드에 카메라를 가져다 대세요</p>
    </div>
  );
}
