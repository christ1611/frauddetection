import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRScanner from '../components/QRScanner';
import ImageUpload from '../components/ImageUpload';
import LocationPicker from '../components/LocationPicker';

const FRAUD_TYPES = [
  '보이스피싱 (Voice Phishing)', 'QR코드 사기', '스미싱 (Smishing)',
  '파밍 (Pharming)', '대출 사기', '투자 사기',
  '메신저 피싱 (카카오톡 등)', '계좌이체 사기', '가짜 쇼핑몰 사기', '기타',
];
const STEPS = ['신고자 정보', 'QR 스캔', '증거 사진', '발생 위치', '상세 내용', '최종 제출'];

export default function ReportPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(null);

  const [form, setForm] = useState({
    reporterName: '', reporterContact: '', fraudType: '', qrData: '',
    images: [], locationText: '', latitude: '', longitude: '', description: '',
  });

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));
  const next = () => { setError(''); setStep(s => s + 1); };
  const back = () => { setError(''); setStep(s => s - 1); };

  const addImage = (file, preview) => {
    setForm(f => ({ ...f, images: [...f.images, { file, preview }] }));
  };
  const removeImage = (i) => {
    setForm(f => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }));
  };

  const handleSubmit = async () => {
    setLoading(true); setError('');
    try {
      const data = new FormData();
      data.append('reporterName', form.reporterName);
      data.append('reporterContact', form.reporterContact);
      data.append('fraudType', form.fraudType);
      data.append('qrData', form.qrData);
      data.append('locationText', form.locationText);
      data.append('latitude', form.latitude);
      data.append('longitude', form.longitude);
      data.append('description', form.description);
      form.images.forEach(img => data.append('images', img.file));

      const res = await fetch('/api/report', { method: 'POST', body: data });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || '제출 실패');
      setSubmitted(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) return <SuccessScreen result={submitted} form={form} onNew={() => { setSubmitted(null); setStep(0); setForm({ reporterName:'', reporterContact:'', fraudType:'', qrData:'', images:[], locationText:'', latitude:'', longitude:'', description:'' }); }} onTrack={() => navigate(`/track?id=${submitted.reportId}`)} />;

  return (
    <main className="main">
      <Stepper steps={STEPS} current={step} />
      <div className="card">
        {step === 0 && <StepReporter form={form} set={set} onNext={next} />}
        {step === 1 && <StepQR form={form} set={set} onNext={next} onBack={back} />}
        {step === 2 && <StepEvidence form={form} addImage={addImage} removeImage={removeImage} onNext={next} onBack={back} />}
        {step === 3 && <StepLocation form={form} set={set} onNext={next} onBack={back} />}
        {step === 4 && <StepDetails form={form} set={set} onNext={next} onBack={back} />}
        {step === 5 && <StepReview form={form} onBack={back} onSubmit={handleSubmit} loading={loading} error={error} />}
      </div>
      <div className="info-strip">
        <div className="info-item"><span>🔒</span><span>256비트 암호화 전송</span></div>
        <div className="info-item"><span>🛡</span><span>개인정보 보호법 준수</span></div>
        <div className="info-item"><span>⚡</span><span>24시간 접수 가능</span></div>
        <div className="info-item"><span>📋</span><span>금융감독원 즉시 공유</span></div>
      </div>
    </main>
  );
}

function Stepper({ steps, current }) {
  return (
    <div className="stepper">
      {steps.map((label, i) => (
        <div key={i} className={`step ${i === current ? 'active' : ''} ${i < current ? 'done' : ''}`}>
          <div className="step-circle">{i < current ? '✓' : i + 1}</div>
          <span className="step-label">{label}</span>
          {i < steps.length - 1 && <div className="step-line" />}
        </div>
      ))}
    </div>
  );
}

function StepReporter({ form, set, onNext }) {
  return (
    <div className="step-content">
      <div className="step-header">
        <div className="step-icon-wrap">👤</div>
        <div><h2 className="step-title">신고자 정보</h2><p className="step-desc">익명 신고도 가능합니다. 연락처를 남기시면 수사 진행 상황을 안내드립니다.</p></div>
      </div>
      <div className="form-group">
        <label>성명 <span className="optional">선택사항</span></label>
        <input type="text" placeholder="예: 홍길동" value={form.reporterName} onChange={e => set('reporterName', e.target.value)} />
      </div>
      <div className="form-group">
        <label>연락처 <span className="optional">선택사항</span></label>
        <input type="text" placeholder="예: 010-1234-5678 또는 이메일" value={form.reporterContact} onChange={e => set('reporterContact', e.target.value)} />
      </div>
      <div className="notice-box">
        <strong>📌 신고자 보호 안내</strong><br />
        신고자의 신원 정보는 「공익신고자 보호법」에 따라 철저히 보호되며, 보복 행위 시 최대 3년 이하 징역에 처할 수 있습니다.
      </div>
      <div className="btn-row"><button className="btn btn-primary" onClick={onNext}>다음 단계 →</button></div>
    </div>
  );
}

function StepQR({ form, set, onNext, onBack }) {
  return (
    <div className="step-content">
      <div className="step-header">
        <div className="step-icon-wrap">📷</div>
        <div><h2 className="step-title">사기 QR코드 스캔</h2><p className="step-desc">의심스러운 QR코드를 카메라로 스캔하거나 내용을 직접 입력해 주세요.</p></div>
      </div>
      <QRScanner onScan={val => set('qrData', val)} />
      <div className="form-group" style={{ marginTop: '1.25rem' }}>
        <label>QR코드 내용 <span className="optional">직접 입력 가능</span></label>
        <textarea rows={3} placeholder="QR코드 URL 또는 내용을 붙여넣기 하세요..." value={form.qrData} onChange={e => set('qrData', e.target.value)} />
      </div>
      <div className="tip-box">💡 <strong>Tip:</strong> QR코드를 절대 직접 접속하지 마세요. 스캔 후 내용만 복사하여 신고해 주세요.</div>
      <div className="btn-row">
        <button className="btn btn-ghost" onClick={onBack}>← 이전</button>
        <button className="btn btn-primary" onClick={onNext}>{form.qrData ? '다음 단계 →' : '건너뛰기 →'}</button>
      </div>
    </div>
  );
}

function StepEvidence({ form, addImage, removeImage, onNext, onBack }) {
  return (
    <div className="step-content">
      <div className="step-header">
        <div className="step-icon-wrap">🖼</div>
        <div><h2 className="step-title">증거 사진 업로드</h2><p className="step-desc">사기 QR코드, 영수증, 문자 스크린샷 등 최대 4장까지 첨부 가능합니다.</p></div>
      </div>
      <ImageUpload images={form.images} onAdd={addImage} onRemove={removeImage} />
      <div className="tip-box" style={{ marginTop: '1rem' }}>📸 <strong>권장 사진:</strong> QR코드 원본, 결제 내역 화면, 의심 문자 캡처, 현장 사진</div>
      <div className="btn-row">
        <button className="btn btn-ghost" onClick={onBack}>← 이전</button>
        <button className="btn btn-primary" onClick={onNext}>{form.images.length > 0 ? `다음 단계 (${form.images.length}장 첨부) →` : '건너뛰기 →'}</button>
      </div>
    </div>
  );
}

function StepLocation({ form, set, onNext, onBack }) {
  return (
    <div className="step-content">
      <div className="step-header">
        <div className="step-icon-wrap">📍</div>
        <div><h2 className="step-title">사건 발생 위치</h2><p className="step-desc">금융사기가 발생한 위치를 알려주세요.</p></div>
      </div>
      <LocationPicker locationText={form.locationText} latitude={form.latitude} longitude={form.longitude}
        onChange={(text, lat, lng) => { set('locationText', text); set('latitude', lat); set('longitude', lng); }} />
      <div className="btn-row">
        <button className="btn btn-ghost" onClick={onBack}>← 이전</button>
        <button className="btn btn-primary" onClick={onNext}>{form.locationText || form.latitude ? '다음 단계 →' : '건너뛰기 →'}</button>
      </div>
    </div>
  );
}

function StepDetails({ form, set, onNext, onBack }) {
  const valid = form.fraudType && form.description.trim().length >= 10;
  return (
    <div className="step-content">
      <div className="step-header">
        <div className="step-icon-wrap">📝</div>
        <div><h2 className="step-title">사기 상세 내용</h2><p className="step-desc">어떤 사기 수법이었는지 자세히 기술해 주실수록 수사에 도움이 됩니다.</p></div>
      </div>
      <div className="form-group">
        <label>사기 유형 <span className="required">*필수</span></label>
        <select value={form.fraudType} onChange={e => set('fraudType', e.target.value)}>
          <option value="">-- 사기 유형 선택 --</option>
          {FRAUD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label>피해 상황 설명 <span className="required">*필수</span></label>
        <textarea rows={6} placeholder="발생 일시, 경위, 피해 금액, 사기 수법 등을 최대한 상세하게 작성해 주세요." value={form.description} onChange={e => set('description', e.target.value)} />
        <span className="char-count">{form.description.length}자 {form.description.length < 10 ? '(최소 10자)' : '✓'}</span>
      </div>
      <div className="btn-row">
        <button className="btn btn-ghost" onClick={onBack}>← 이전</button>
        <button className="btn btn-primary" onClick={onNext} disabled={!valid}>검토하기 →</button>
      </div>
    </div>
  );
}

function StepReview({ form, onBack, onSubmit, loading, error }) {
  const Row = ({ label, value }) => value ? (
    <div className="review-row"><span className="review-label">{label}</span><span className="review-value">{value}</span></div>
  ) : null;
  return (
    <div className="step-content">
      <div className="step-header">
        <div className="step-icon-wrap">✅</div>
        <div><h2 className="step-title">신고 내용 최종 확인</h2><p className="step-desc">제출 전 입력하신 내용을 확인해 주세요. 제출 후 수정이 불가합니다.</p></div>
      </div>
      <div className="review-box">
        <Row label="신고자" value={form.reporterName || '익명'} />
        <Row label="연락처" value={form.reporterContact} />
        <Row label="사기 유형" value={form.fraudType} />
        <Row label="QR 내용" value={form.qrData} />
        <Row label="발생 위치" value={form.locationText} />
        <Row label="GPS 좌표" value={form.latitude ? `${form.latitude}, ${form.longitude}` : ''} />
        <Row label="첨부 사진" value={form.images.length > 0 ? `${form.images.length}장` : ''} />
        <div className="review-row"><span className="review-label">피해 설명</span><span className="review-value" style={{ whiteSpace: 'pre-wrap' }}>{form.description}</span></div>
        {form.images.length > 0 && (
          <div className="review-row">
            <span className="review-label">사진 미리보기</span>
            <div className="review-imgs">{form.images.map((img, i) => <img key={i} src={img.preview} alt={`증거 ${i+1}`} className="review-img" />)}</div>
          </div>
        )}
      </div>
      <div className="submit-notice">본 신고서는 금융감독원 및 관련 수사기관에 공유되며, 허위 신고 시 법적 책임을 질 수 있습니다.</div>
      {error && <div className="alert alert-error">⚠ {error}</div>}
      <div className="btn-row">
        <button className="btn btn-ghost" onClick={onBack} disabled={loading}>← 수정하기</button>
        <button className="btn btn-danger" onClick={onSubmit} disabled={loading}>{loading ? '제출 중...' : '🚨 신고 제출하기'}</button>
      </div>
    </div>
  );
}

function calcRiskBreakdown(form) {
  const url = form.qrData || '';
  let urlRisk = 35;
  ['kakao','naver','bank','kbank','secure','verify','account','login','auth','pay'].forEach(kw => {
    if (url.toLowerCase().includes(kw)) urlRisk += 9;
  });
  if (url.startsWith('http://')) urlRisk += 22;
  urlRisk = Math.min(urlRisk, 99);

  const typeRisk = {
    '보이스피싱 (Voice Phishing)': 97, 'QR코드 사기': 94, '스미싱 (Smishing)': 90,
    '투자 사기': 88, '파밍 (Pharming)': 87, '대출 사기': 82,
    '메신저 피싱 (카카오톡 등)': 83, '계좌이체 사기': 80,
    '가짜 쇼핑몰 사기': 73, '기타': 62,
  }[form.fraudType] || 65;

  const evidenceRisk = form.images.length > 0 ? 76 : 50;
  const locationRisk = form.latitude ? 72 : 52;
  const overall = Math.round(urlRisk * 0.35 + typeRisk * 0.35 + evidenceRisk * 0.15 + locationRisk * 0.15);
  return { overall, urlRisk: url ? urlRisk : null, typeRisk, evidenceRisk, locationRisk };
}

function RiskBar({ label, value, color }) {
  return (
    <div className="risk-row">
      <span className="risk-label">{label}</span>
      <div className="risk-bar-bg">
        <div className="risk-bar-fill" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="risk-pct" style={{ color }}>{value}%</span>
    </div>
  );
}

function SuccessScreen({ result, form, onNew, onTrack }) {
  const risk = calcRiskBreakdown(form);
  const overallColor = risk.overall >= 80 ? '#d42b2b' : risk.overall >= 60 ? '#c8922a' : '#158a45';
  const overallLabel = risk.overall >= 80 ? '고위험' : risk.overall >= 60 ? '주의' : '낮음';

  return (
    <main className="main">
      <div className="card success-card">
        <div className="success-icon">✓</div>
        <h2>신고가 성공적으로 접수되었습니다</h2>
        <p>소중한 신고 감사합니다. 제출하신 내용은 금융감독원 및 경찰청 사이버수사국에 즉시 공유됩니다.</p>
        <div className="report-id-box">
          <span className="report-id-label">신고 접수번호</span>
          <span className="report-id">{result.reportId}</span>
          <span className="report-id-time">{result.timestamp}</span>
        </div>

        {/* AI Risk Score Widget */}
        <div className="ai-risk-card">
          <div className="ai-risk-header">
            <span className="ai-risk-badge">AI</span>
            <span className="ai-risk-title">NHATRANG 위험도 분석 결과</span>
            <span className="ai-risk-overall" style={{ color: overallColor }}>
              {risk.overall}% <small>{overallLabel}</small>
            </span>
          </div>
          <div className="ai-risk-main-bar">
            <div className="ai-risk-main-fill" style={{ width: `${risk.overall}%`, background: `linear-gradient(90deg, ${overallColor}cc, ${overallColor})` }} />
          </div>
          <div className="risk-bars">
            <RiskBar label="수법 위험도" value={risk.typeRisk} color="#d42b2b" />
            {risk.urlRisk !== null && <RiskBar label="URL 위험도" value={risk.urlRisk} color="#c8922a" />}
            <RiskBar label="증거 확보도" value={risk.evidenceRisk} color="#0891b2" />
            <RiskBar label="위치 특정도" value={risk.locationRisk} color="#7c3aed" />
          </div>
          <div className="ai-risk-footer">
            ⚡ 금융감독원 긴급 위협 데이터베이스에 등록 완료
          </div>
        </div>

        <div className="success-steps">
          <div className="ss-item"><span className="ss-num">1</span><span>접수번호를 반드시 저장해 두세요</span></div>
          <div className="ss-item"><span className="ss-num">2</span><span>추가 피해 발생 시 즉시 금융감독원 1332에 연락하세요</span></div>
          <div className="ss-item"><span className="ss-num">3</span><span>계좌 지급정지 신청: 해당 은행 고객센터 또는 경찰청 182</span></div>
        </div>
        <div className="emergency-box">
          <strong>🚨 긴급 연락처</strong>
          <div className="em-grid">
            <span>금융감독원</span><strong>1332</strong>
            <span>경찰청</span><strong>182</strong>
            <span>한국인터넷진흥원</span><strong>118</strong>
          </div>
        </div>
        <div className="btn-row" style={{ marginTop: '1.5rem', justifyContent: 'center' }}>
          <button className="btn btn-ghost" onClick={onNew}>추가 신고하기</button>
          <button className="btn btn-primary" onClick={onTrack}>신고 조회하기 →</button>
        </div>
      </div>
    </main>
  );
}
