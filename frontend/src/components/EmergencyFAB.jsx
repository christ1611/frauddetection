import { useState } from 'react';

const CONTACTS = [
  { label: '금융감독원', number: '1332', color: '#1a6fc4', desc: '금융사기 피해 신고' },
  { label: '경찰청 사이버수사국', number: '182', color: '#d42b2b', desc: '사이버 범죄 신고' },
  { label: '한국인터넷진흥원', number: '118', color: '#158a45', desc: '인터넷 사기 신고' },
  { label: '금융결제원', number: '1577-5500', color: '#c8922a', desc: '계좌이체 지급정지' },
];

export default function EmergencyFAB() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fab-wrap">
      {open && (
        <div className="fab-menu">
          <div className="fab-menu-title">🚨 긴급 연락처</div>
          {CONTACTS.map(c => (
            <a key={c.number} href={`tel:${c.number}`} className="fab-contact" style={{ borderLeftColor: c.color }}>
              <div>
                <div className="fab-contact-label">{c.label}</div>
                <div className="fab-contact-desc">{c.desc}</div>
              </div>
              <div className="fab-contact-num" style={{ color: c.color }}>{c.number}</div>
            </a>
          ))}
          <div className="fab-menu-note">탭하여 바로 전화 연결</div>
        </div>
      )}
      <button className={`fab-btn ${open ? 'open' : ''}`} onClick={() => setOpen(o => !o)} aria-label="긴급 연락처">
        {open ? '✕' : '🆘'}
      </button>
    </div>
  );
}
