import { NavLink, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function NavBar() {
  const [stats, setStats] = useState(null);
  const location = useLocation();

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(setStats).catch(() => {});
  }, [location.pathname]);

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div className="navbar-brand">
          <div className="brand-emblem">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
              <path d="M2 12 Q6 6 12 12 Q18 6 22 12" strokeLinecap="round"/>
              <path d="M2 17 Q6 11 12 17 Q18 11 22 17" strokeLinecap="round" opacity=".6"/>
            </svg>
          </div>
          <div>
            <div className="brand-title">
              <span className="brand-nt">NHATRANG</span>
              <span className="brand-system">System</span>
            </div>
            <div className="brand-sub">
              National High-Alert Anti-fraud Tracking, Reporting, Analysis, Notification &amp; Guardianship
            </div>
          </div>
        </div>

        <nav className="navbar-nav">
          <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            🚨 신고하기
          </NavLink>
          <NavLink to="/track" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            🔍 신고 조회
          </NavLink>
          <NavLink to="/admin" className={({ isActive }) => `nav-link nav-link-admin ${isActive ? 'active' : ''}`}>
            📊 관리자
          </NavLink>
        </nav>
      </div>

      <div className="navbar-alert">
        <div className="navbar-alert-inner">
          <span className="live-dot" />
          <span>실시간 접수 현황</span>
          {stats && (
            <>
              <span className="stat-pill">총 <strong>{stats.total}</strong>건</span>
              <span className="stat-pill">오늘 <strong>{stats.todayCount}</strong>건</span>
              <span className="stat-pill">최다 유형: <strong>{stats.topType}</strong></span>
            </>
          )}
          <span style={{ marginLeft: 'auto', fontSize: '.72rem', color: 'rgba(255,255,255,.5)' }}>
            긴급: 금융감독원 1332 · 경찰청 182
          </span>
        </div>
      </div>
    </header>
  );
}
