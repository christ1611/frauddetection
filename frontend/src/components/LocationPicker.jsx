import { useState } from 'react';

export default function LocationPicker({ locationText, latitude, longitude, onChange }) {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const getGPS = () => {
    if (!navigator.geolocation) { setStatus('이 브라우저는 위치 서비스를 지원하지 않습니다.'); return; }
    setLoading(true); setStatus('현재 위치를 감지하는 중...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        setLoading(false); setStatus('위치 감지 완료!');
        onChange(locationText || `GPS: ${lat}, ${lng}`, lat, lng);
      },
      (err) => { setLoading(false); setStatus(`위치 감지 실패: ${err.message}`); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div>
      <div className="form-group">
        <label>주소 또는 장소명</label>
        <input type="text" placeholder="예: 서울시 강남구 테헤란로 152, 강남역 2번 출구"
          value={locationText} onChange={e => onChange(e.target.value, latitude, longitude)} />
      </div>
      <div className="gps-section">
        <button type="button" className={`btn btn-secondary ${loading ? 'loading' : ''}`}
          onClick={getGPS} disabled={loading}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6, verticalAlign: 'middle' }}>
            <circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M1 12h4M19 12h4" />
          </svg>
          {loading ? '위치 감지 중...' : '📍 현재 위치 자동 감지'}
        </button>
        {latitude && longitude && (
          <div className="gps-coords">
            <span>위도: {latitude} &nbsp;|&nbsp; 경도: {longitude}</span>
          </div>
        )}
        {status && <p className={`gps-status ${status.includes('완료') ? 'success' : ''}`}>{status}</p>}
      </div>
    </div>
  );
}
