import { useEffect, useRef, useState } from 'react';

function useCountUp(target, duration = 1100) {
  const [value, setValue] = useState(0);
  const n = typeof target === 'number' ? target : parseInt(target) || 0;
  useEffect(() => {
    if (!n) { setValue(0); return; }
    let cur = 0;
    const step = n / (duration / 16);
    const t = setInterval(() => {
      cur += step;
      if (cur >= n) { setValue(n); clearInterval(t); }
      else setValue(Math.floor(cur));
    }, 16);
    return () => clearInterval(t);
  }, [n]);
  return value;
}

const TYPE_COLORS = {
  '보이스피싱 (Voice Phishing)': '#d42b2b',
  'QR코드 사기': '#c8922a',
  '스미싱 (Smishing)': '#7c3aed',
  '파밍 (Pharming)': '#1a6fc4',
  '대출 사기': '#e67e22',
  '투자 사기': '#158a45',
  '메신저 피싱 (카카오톡 등)': '#0891b2',
  '계좌이체 사기': '#be185d',
  '가짜 쇼핑몰 사기': '#64748b',
  '기타': '#94a3b8',
};

export default function AdminPage() {
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [toast, setToast] = useState(null);
  const prevTotal = useRef(null);
  const LIMIT = 10;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sRes, rRes] = await Promise.all([
        fetch('/api/stats'),
        fetch(`/api/reports/all?q=${encodeURIComponent(q)}&type=${encodeURIComponent(typeFilter)}&limit=${LIMIT}&offset=${offset}`)
      ]);
      const sJson = await sRes.json();
      const rJson = await rRes.json();
      setStats(sJson);
      setReports(rJson.reports || []);
      setTotal(rJson.total || 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [q, typeFilter, offset]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        if (prevTotal.current !== null && data.total > prevTotal.current) {
          setToast(`🚨 새 신고 접수! 총 ${data.total}건 — 목록을 새로고침하세요`);
          setTimeout(() => setToast(null), 5000);
          fetchData();
        }
        prevTotal.current = data.total;
      } catch {}
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e) => { setQ(e.target.value); setOffset(0); };
  const handleType = (e) => { setTypeFilter(e.target.value); setOffset(0); };

  const maxBar = stats ? Math.max(...Object.values(stats.byType || {}), 1) : 1;

  return (
    <main className="main admin-main">

      {toast && (
        <div className="admin-toast">
          <span>{toast}</span>
          <button onClick={() => setToast(null)}>✕</button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid">
        <StatCard icon="📋" label="총 신고 건수" value={stats?.total} color="var(--teal)" />
        <StatCard icon="📅" label="오늘 접수" value={stats?.todayCount} color="var(--green)" />
        <StatCard icon="📆" label="이번 달" value={stats?.thisMonth} color="var(--gold)" />
        <StatCard icon="⚠" label="최다 사기 유형" value={stats?.topType ?? '—'} color="var(--red)" small noAnim />
      </div>

      {/* Fraud Type Chart */}
      {stats?.byType && Object.keys(stats.byType).length > 0 && (
        <div className="card chart-card">
          <div className="card-header">
            <h3 className="card-title">사기 유형별 신고 현황</h3>
          </div>
          <div className="chart-wrap">
            {Object.entries(stats.byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
              <div key={type} className="chart-row">
                <div className="chart-label" title={type}>{type}</div>
                <div className="chart-bar-wrap">
                  <div className="chart-bar" style={{ width: `${(count / maxBar) * 100}%`, background: TYPE_COLORS[type] || '#94a3b8' }} />
                </div>
                <div className="chart-count">{count}건</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Report List */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">신고 목록 <span className="count-badge">{total}건</span></h3>
          <div className="admin-toolbar">
            <input className="admin-search" type="text" placeholder="접수번호·신고자·유형·위치 검색..." value={q} onChange={handleSearch} />
            <select className="admin-filter" value={typeFilter} onChange={handleType}>
              <option value="">전체 유형</option>
              {Object.keys(TYPE_COLORS).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <a href="/api/reports/csv" className="btn btn-ghost btn-sm" download>CSV 내보내기</a>
          </div>
        </div>

        {loading ? (
          <div className="admin-loading">불러오는 중...</div>
        ) : reports.length === 0 ? (
          <div className="admin-empty">
            <div style={{ fontSize: '2.5rem', marginBottom: '.75rem' }}>📭</div>
            <p>접수된 신고가 없습니다</p>
            {(q || typeFilter) && <p style={{ fontSize: '.8rem', color: 'var(--gray-400)', marginTop: '.3rem' }}>검색 조건을 변경해 보세요</p>}
          </div>
        ) : (
          <div className="report-list">
            {reports.map(r => (
              <div key={r.reportId} className="report-item">
                <div className="report-row" onClick={() => setExpanded(expanded === r.reportId ? null : r.reportId)}>
                  <div className="report-id-cell">
                    <span className="r-id">#{r.reportId}</span>
                    {r.images?.length > 0 && <span className="r-img-badge">📷 {r.images.length}</span>}
                  </div>
                  <div className="report-type-cell">
                    <span className="type-dot" style={{ background: TYPE_COLORS[r.fraudType] || '#94a3b8' }} />
                    <span className="r-type">{r.fraudType}</span>
                  </div>
                  <div className="r-location">{r.locationText || '—'}</div>
                  <div className="r-reporter">{r.reporterName}</div>
                  <div className="r-time">{r.timestamp?.slice(0, 16)}</div>
                  <div className="r-chevron">{expanded === r.reportId ? '▲' : '▼'}</div>
                </div>

                {expanded === r.reportId && (
                  <div className="report-detail">
                    <div className="detail-grid">
                      <DetailField label="QR 내용" value={r.qrData} code />
                      <DetailField label="GPS 좌표" value={r.latitude ? `${r.latitude}, ${r.longitude}` : ''} />
                      <DetailField label="연락처" value={r.reporterContact} />
                    </div>
                    <div className="detail-desc">
                      <div className="detail-label">피해 상황 설명</div>
                      <div className="detail-text">{r.description}</div>
                    </div>
                    {r.images?.length > 0 && (
                      <div className="detail-images">
                        <div className="detail-label">첨부 사진 ({r.images.length}장)</div>
                        <div className="detail-img-row">
                          {r.images.map((img, i) => (
                            <a key={i} href={`/uploads/${img}`} target="_blank" rel="noreferrer">
                              <img src={`/uploads/${img}`} alt={`증거 ${i+1}`} className="detail-img" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '.5rem', marginTop: '1rem' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>🖨 인쇄</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard?.writeText(r.reportId)}>📋 접수번호 복사</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {total > LIMIT && (
          <div className="pagination">
            <button className="btn btn-ghost btn-sm" disabled={offset === 0} onClick={() => setOffset(o => Math.max(0, o - LIMIT))}>← 이전</button>
            <span className="page-info">{Math.floor(offset / LIMIT) + 1} / {Math.ceil(total / LIMIT)} 페이지</span>
            <button className="btn btn-ghost btn-sm" disabled={offset + LIMIT >= total} onClick={() => setOffset(o => o + LIMIT)}>다음 →</button>
          </div>
        )}
      </div>
    </main>
  );
}

function StatCard({ icon, label, value, color, small, noAnim }) {
  const animated = useCountUp(noAnim ? 0 : value);
  const display = noAnim ? (value ?? '—') : (value != null ? animated : '—');
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: color + '18', color }}>{icon}</div>
      <div className="stat-body">
        <div className="stat-label">{label}</div>
        <div className={`stat-value ${small ? 'small' : ''}`} style={{ color }}>{display}</div>
      </div>
    </div>
  );
}

function DetailField({ label, value, code }) {
  if (!value) return null;
  return (
    <div className="detail-field">
      <div className="detail-label">{label}</div>
      <div className={`detail-val ${code ? 'code' : ''}`}>{value}</div>
    </div>
  );
}
