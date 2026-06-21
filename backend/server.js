const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3001;

const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DATA_DIR = path.join(__dirname, 'data');
const REPORTS_TXT = path.join(DATA_DIR, 'reports.txt');
const REPORTS_JSON = path.join(DATA_DIR, 'reports.json');

[UPLOADS_DIR, DATA_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

if (!fs.existsSync(REPORTS_JSON)) fs.writeFileSync(REPORTS_JSON, '[]', 'utf8');

const readReports = () => {
  try { return JSON.parse(fs.readFileSync(REPORTS_JSON, 'utf8')); }
  catch { return []; }
};
const writeReports = (reports) => fs.writeFileSync(REPORTS_JSON, JSON.stringify(reports, null, 2), 'utf8');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${uuidv4().slice(0, 8)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('이미지 파일만 업로드 가능합니다'));
  },
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/test-qr', express.static(path.join(__dirname, 'test-qr-codes')));

// ── Submit report ──
app.post('/api/report', upload.array('images', 4), (req, res) => {
  try {
    const { reporterName, reporterContact, fraudType, qrData, locationText, latitude, longitude, description } = req.body;

    const reportId = uuidv4().slice(0, 8).toUpperCase();
    const now = new Date();
    const timestamp = now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false });
    const imageFiles = req.files ? req.files.map(f => f.filename) : [];

    const report = {
      reportId,
      timestamp,
      timestampIso: now.toISOString(),
      reporterName: reporterName || '익명',
      reporterContact: reporterContact || '',
      fraudType: fraudType || '미지정',
      qrData: qrData || '',
      locationText: locationText || '',
      latitude: latitude || '',
      longitude: longitude || '',
      images: imageFiles,
      description: description || '',
      status: 'submitted',
    };

    // Save to JSON
    const reports = readReports();
    reports.unshift(report);
    writeReports(reports);

    // Save to TXT
    const imgLine = imageFiles.length ? imageFiles.map(f => `uploads/${f}`).join(', ') : '첨부 없음';
    const entry = [
      ``,
      `${'━'.repeat(60)}`,
      `  〰〰  NHATRANG System  〰〰`,
      `  National High-Alert Anti-fraud Tracking, Reporting,`,
      `  Analysis, Notification & Guardianship`,
      `  📋 금융사기 신고서`,
      `${'━'.repeat(60)}`,
      `  접수번호  : ${reportId}`,
      `  접수일시  : ${timestamp} (KST)`,
      `${'─'.repeat(52)}`,
      `  신고자    : ${report.reporterName}`,
      `  연락처    : ${report.reporterContact || '미제공'}`,
      `${'─'.repeat(52)}`,
      `  사기유형  : ${report.fraudType}`,
      `  QR내용    : ${report.qrData || '없음'}`,
      `  발생위치  : ${report.locationText || '미제공'}`,
      `  GPS좌표   : ${latitude && longitude ? `${latitude}, ${longitude}` : '미제공'}`,
      `  증거사진  : ${imgLine}`,
      `${'─'.repeat(52)}`,
      `  [ 피해 상황 설명 ]`,
      `  ${(description || '내용 없음').split('\n').join('\n  ')}`,
      `${'━'.repeat(60)}`,
      `  ※ 본 신고는 금융감독원 및 경찰청에 공유됩니다.`,
      `  ※ Powered by NHATRANG System — Team NhaTrang`,
      `${'━'.repeat(60)}`,
      ``,
    ].join('\n');

    fs.appendFileSync(REPORTS_TXT, entry, 'utf8');

    res.json({ success: true, reportId, timestamp });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Get all reports ──
app.get('/api/reports/all', (req, res) => {
  const reports = readReports();
  const { type, q, limit = 50, offset = 0 } = req.query;
  let filtered = reports;
  if (type) filtered = filtered.filter(r => r.fraudType === type);
  if (q) {
    const lq = q.toLowerCase();
    filtered = filtered.filter(r =>
      r.reportId.toLowerCase().includes(lq) ||
      r.reporterName.toLowerCase().includes(lq) ||
      r.fraudType.toLowerCase().includes(lq) ||
      r.locationText.toLowerCase().includes(lq) ||
      r.description.toLowerCase().includes(lq)
    );
  }
  const total = filtered.length;
  const page = filtered.slice(Number(offset), Number(offset) + Number(limit));
  res.json({ total, reports: page });
});

// ── Get single report ──
app.get('/api/report/:id', (req, res) => {
  const reports = readReports();
  const report = reports.find(r => r.reportId === req.params.id.toUpperCase());
  if (!report) return res.status(404).json({ success: false, error: '신고 접수번호를 찾을 수 없습니다.' });

  // Compute status based on time elapsed
  const elapsed = Date.now() - new Date(report.timestampIso).getTime();
  const hours = elapsed / 1000 / 60 / 60;
  let status = '접수 완료';
  let statusCode = 'submitted';
  if (hours >= 1) { status = '검토 중'; statusCode = 'reviewing'; }
  if (hours >= 24) { status = '수사 의뢰'; statusCode = 'investigating'; }
  if (hours >= 72) { status = '처리 완료'; statusCode = 'closed'; }

  res.json({ success: true, report: { ...report, status, statusCode } });
});

// ── Check URL (duplicate + risk) ──
app.get('/api/check-url', (req, res) => {
  const { url } = req.query;
  if (!url) return res.json({ count: 0, riskScore: 45 });
  const data = readReports();
  const needle = url.toLowerCase().slice(0, 60);
  const matches = data.filter(r => r.qrData && r.qrData.toLowerCase().includes(needle));
  let score = 38;
  ['kakao','naver','bank','kbank','secure','verify','account','login','auth','pay','transfer','support']
    .forEach(kw => { if (url.toLowerCase().includes(kw)) score += 8; });
  if (url.startsWith('http://')) score += 22;
  if (url.includes('bit.ly') || url.includes('tinyurl')) score += 18;
  if (/\d{1,3}\.\d{1,3}\.\d{1,3}/.test(url)) score += 25;
  if (matches.length > 0) score += 15;
  res.json({ count: matches.length, riskScore: Math.min(score, 99) });
});

// ── Stats ──
app.get('/api/stats', (req, res) => {
  const reports = readReports();
  const today = new Date().toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' });
  const todayCount = reports.filter(r => {
    const d = new Date(r.timestampIso).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' });
    return d === today;
  }).length;

  const byType = {};
  reports.forEach(r => { byType[r.fraudType] = (byType[r.fraudType] || 0) + 1; });
  const topType = Object.entries(byType).sort((a, b) => b[1] - a[1])[0]?.[0] || '없음';

  const thisMonth = reports.filter(r => {
    const d = new Date(r.timestampIso);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  res.json({ total: reports.length, todayCount, thisMonth, topType, byType });
});

// ── CSV Export ──
app.get('/api/reports/csv', (req, res) => {
  const reports = readReports();
  const header = '접수번호,접수일시,신고자,연락처,사기유형,발생위치,QR내용,설명\n';
  const rows = reports.map(r =>
    [r.reportId, r.timestamp, r.reporterName, r.reporterContact, r.fraudType,
     r.locationText, r.qrData, r.description.replace(/,/g, '，').replace(/\n/g, ' ')
    ].map(v => `"${v}"`).join(',')
  ).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="fraud-reports.csv"');
  res.send('﻿' + header + rows); // BOM for Korean Excel compatibility
});

// ── Scenario page ──
app.use('/test-qr', express.static(path.join(__dirname, 'test-qr-codes')));

app.get('/scenario', (req, res) => {
  const qrDir = path.join(__dirname, 'test-qr-codes');
  const qrFiles = fs.existsSync(qrDir) ? fs.readdirSync(qrDir).filter(f => f.endsWith('.png')) : [];
  const cases = [
    { file:'LEE_JAEMAN_KAKAOBANK.png', caseNum:'2024-사이버-0471', villain:'이재만 (李在萬)', age:'47세', role:'전직 은행원 출신 피싱 전문가', emoji:'🎭', wanted:'보이스피싱 / QR코드 피싱', damage:'추정 피해액 4억 3천만원 (피해자 38명)', story:'前 신한은행 IT부서 출신. 카카오뱅크 로그인 페이지를 픽셀 단위로 복제한 피싱 사이트를 운영하며, ATM 앞에 가짜 QR 스티커를 부착해 고객 계좌정보를 탈취해왔다.', location:'서울 강남구 테헤란로 152, KB국민은행 ATM 앞', gps:'37.500600, 127.036700', fraudType:'보이스피싱 (Voice Phishing)', detail:'강남역 KB국민은행 ATM 로비에서 공식 QR코드 위에 가짜 스티커가 부착된 것을 발견하였습니다. 스티커 질감이 달랐고 QR 접속 시 카카오뱅크 피싱 페이지로 연결되었습니다. 현장에서 동일 수법의 피해자 2명을 목격하였습니다.' },
    { file:'PARK_DOHYUN_GS25.png', caseNum:'2024-사이버-0528', villain:'박도현 (朴道賢)', age:'29세', role:'편의점 아르바이트생', emoji:'🏪', wanted:'결제 QR코드 교체 사기', damage:'추정 피해액 870만원 (피해자 124명)', story:'홍대 GS25 야간 아르바이트생. 점장이 없는 심야에 공식 카카오페이 QR을 자신의 개인 QR로 교체한다. 수백 명이 실제 결제가 된 줄 알고 지나쳤다.', location:'서울 마포구 어울마당로 31, GS25 홍대입구점', gps:'37.557200, 126.926100', fraudType:'QR코드 사기', detail:'GS25 홍대입구점 카운터의 카카오페이 QR이 교체되어 있음을 발견. 가맹점명이 "박도현페이"로 연결되었고, 10,500원 결제 시 매장 매출에는 기록되지 않았습니다.' },
    { file:'KANG_SYNDICATE_INVESTMENT.png', caseNum:'2024-사이버-0614', villain:'강민서 조직', age:'조직원 11명', role:'불법 유사수신 투자 사기단', emoji:'💰', wanted:'유사수신행위 / 투자 사기', damage:'추정 피해액 23억원 (피해자 1,200명)', story:'"90일 내 원금 500% 수익 보장"을 내세우며 아파트 단지와 지하철역에 전단지를 살포한다. 초기 투자자에게는 실제 수익을 지급해 신뢰를 쌓은 뒤 잠적하는 폰지 사기.', location:'서울 송파구 올림픽로 240, 송파구청 앞 게시판', gps:'37.514800, 127.105900', fraudType:'투자 사기', detail:'송파구청 앞 게시판에 "황금 재테크 — 90일 500% 수익" 전단지 7장을 발견. QR 접속 시 도메인 등록 18일짜리 피싱 사이트로 연결. 고객센터 번호 국가코드 +62(인도네시아).' },
  ];
  const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NHATRANG System — 작전명: 교훈을 주마</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Apple SD Gothic Neo','Noto Sans KR',system-ui,sans-serif;background:#060d1a;color:#e2e8f0}.hero{background:linear-gradient(160deg,#060d1a,#0d1f35,#060d1a);padding:3rem 1.5rem 2rem;text-align:center;border-bottom:2px solid #c8922a}.cls{display:inline-flex;align-items:center;gap:.5rem;background:rgba(212,43,43,.15);border:1px solid rgba(212,43,43,.4);color:#ff8888;font-size:.72rem;font-weight:700;letter-spacing:.15em;padding:.3rem .8rem;border-radius:4px;margin-bottom:1rem}@keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}.cls::before{content:'●';font-size:.5rem;animation:blink 1.2s infinite}.hero h1{font-size:2.2rem;font-weight:900;margin-bottom:.4rem}.hero h1 span{color:#c8922a}.hero p{color:#64748b;font-size:.9rem;max-width:540px;margin:.4rem auto;line-height:1.6}.meta{display:flex;justify-content:center;gap:2rem;margin-top:1.5rem;flex-wrap:wrap}.mi{text-align:center}.mn{font-size:1.7rem;font-weight:900;color:#c8922a}.ml{font-size:.68rem;color:#475569;margin-top:.15rem}.wrap{max-width:880px;margin:0 auto;padding:1.5rem 1rem 3rem}.mbox{background:#0d1f35;border:1px solid #1e3a5f;border-left:4px solid #c8922a;border-radius:10px;padding:1.1rem 1.3rem;display:flex;gap:1rem;margin-bottom:1.75rem}.mbox p{color:#94a3b8;font-size:.85rem;line-height:1.7}.mbox code{background:#060d1a;color:#60a5fa;padding:.1rem .35rem;border-radius:4px;font-size:.8rem}.case{background:#0d1f35;border:1px solid #1e3a5f;border-radius:14px;overflow:hidden;margin-bottom:1.5rem}.ch{background:#0a1628;padding:1.1rem 1.4rem;border-bottom:1px solid #1e3a5f;display:flex;align-items:center;gap:.9rem;flex-wrap:wrap}.cn{background:#d42b2b;color:#fff;font-size:.63rem;font-weight:800;padding:.18rem .5rem;border-radius:4px;text-transform:uppercase}.ci{font-size:.63rem;color:#475569;font-family:monospace;margin-top:.15rem}.cv{font-size:1.05rem;font-weight:800;color:#f1f5f9}.ct{font-size:.7rem;background:#0a1628;border:1px solid #1e3a5f;color:#94a3b8;padding:.13rem .45rem;border-radius:4px}.ctr{font-size:.7rem;background:rgba(212,43,43,.1);border:1px solid rgba(212,43,43,.35);color:#ff8080;padding:.13rem .45rem;border-radius:4px}.db{background:rgba(200,146,42,.1);border:1px solid rgba(200,146,42,.3);color:#f5cc7a;font-size:.68rem;padding:.18rem .55rem;border-radius:4px;margin-left:auto;font-weight:700}.cb{display:grid;grid-template-columns:1fr 170px}.cl{padding:1.3rem}.cs{color:#94a3b8;font-size:.84rem;line-height:1.7;border-left:3px solid rgba(200,146,42,.35);padding-left:.8rem;margin-bottom:1.1rem;font-style:italic}.st{font-size:.67rem;color:#c8922a;letter-spacing:.1em;text-transform:uppercase;margin-bottom:.6rem;font-weight:700}.sl{list-style:none;display:flex;flex-direction:column;gap:.5rem}.sl li{display:flex;gap:.6rem;font-size:.81rem;color:#94a3b8;align-items:flex-start}.sn{background:#0a1628;color:#60a5fa;font-size:.63rem;font-weight:800;padding:.15rem .44rem;border-radius:4px;flex-shrink:0;margin-top:.18rem;border:1px solid #1e3a5f}.dbox{background:#060d1a;border:1px solid #1e3a5f;border-radius:7px;padding:.9rem 1rem;margin-top:1rem}.dt{font-size:.63rem;color:#c8922a;letter-spacing:.1em;text-transform:uppercase;margin-bottom:.6rem;font-weight:700}.dr{display:flex;gap:.6rem;margin-bottom:.35rem;font-size:.77rem}.dk{color:#475569;min-width:72px;flex-shrink:0}.dv{color:#94a3b8;word-break:break-all}.cr{padding:1.1rem 1.1rem 1.1rem .4rem;display:flex;flex-direction:column;align-items:center;gap:.65rem;border-left:1px solid #1e3a5f}.qw{background:#fff;padding:7px;border-radius:9px;border:2px solid rgba(200,146,42,.3)}.qw img{display:block;width:132px;height:132px}.qnote{font-size:.63rem;color:#475569;text-align:center;max-width:130px;line-height:1.4}.cta{background:#0d1f35;border:1px solid #1e3a5f;border-radius:12px;padding:1.5rem;text-align:center;margin-top:.5rem}.cta h3{color:#f1f5f9;font-size:.95rem;font-weight:800;margin-bottom:.4rem}.cta p{color:#64748b;font-size:.8rem;margin-bottom:1.1rem}.btn{display:inline-block;background:linear-gradient(135deg,#1a6fc4,#1560a8);color:#fff;font-weight:800;font-size:.95rem;padding:.8rem 2.2rem;border-radius:9px;text-decoration:none;box-shadow:0 4px 18px rgba(26,111,196,.35)}.hl{display:flex;justify-content:center;gap:1.5rem;margin-top:1.1rem;flex-wrap:wrap}.hli{text-align:center}.hln{font-size:1.1rem;font-weight:900;color:#c8922a}.hll{font-size:.66rem;color:#475569;margin-top:.1rem}a.al{color:#60a5fa;text-decoration:none;font-weight:700}.join{margin-top:2rem;display:inline-flex;flex-direction:column;align-items:center;gap:.55rem;background:rgba(8,145,178,.08);border:1.5px solid rgba(8,145,178,.3);border-radius:14px;padding:1.1rem 1.6rem}.join-title{font-size:.72rem;font-weight:800;color:#67e8f9;letter-spacing:.14em;text-transform:uppercase}.join-box{background:#fff;padding:8px;border-radius:9px}.join-url{font-size:.63rem;color:#475569;font-family:monospace;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.join-hint{font-size:.7rem;color:#0891b2;font-weight:600}@media(max-width:600px){.cb{grid-template-columns:1fr}.cr{border-left:none;border-top:1px solid #1e3a5f;flex-direction:row;justify-content:center;padding:1rem}}</style></head><body>
<div class="hero"><div style="font-size:.72rem;font-weight:700;letter-spacing:.18em;color:#67e8f9;margin-bottom:.6rem;text-transform:uppercase">〰 NHATRANG System 〰</div><div class="cls">⬛ 기밀 — NHATRANG 전용 브리핑</div><h1>작전명: <span>교훈을 주마</span></h1><p style="font-size:.72rem;color:#0e7490;letter-spacing:.08em;margin-bottom:.35rem">National High-Alert Anti-fraud Tracking, Reporting, Analysis, Notification &amp; Guardianship</p><p>금융감독원 × 경찰청 사이버수사국 합동 작전<br>피의자 3명, 피해 규모 27억원 이상. 오늘 밤 증거를 확보한다.</p><div class="meta"><div class="mi"><div class="mn">3</div><div class="ml">수배 피의자</div></div><div class="mi"><div class="mn">27억+</div><div class="ml">추정 피해액</div></div><div class="mi"><div class="mn">1,362</div><div class="ml">피해자 수</div></div><div class="mi"><div class="mn">D-1</div><div class="ml">검거 작전 시한</div></div></div><div class="join"><div class="join-title">📱 신고 앱 참여하기</div><div class="join-box"><div id="join-qr" style="width:160px;height:160px"></div></div><div class="join-url" id="join-url"></div><div class="join-hint">카메라로 스캔 → 신고 앱 오픈</div></div></div>
<div class="wrap"><div class="mbox"><span style="font-size:1.8rem">📋</span><div><strong style="color:#c8922a;font-size:.72rem;letter-spacing:.1em;text-transform:uppercase">수사관 임무 지시</strong><p style="margin-top:.4rem">아래 3개 사건 각각에 대해 <strong style="color:#e2e8f0">금융사기 신고 앱</strong>을 이용하여 신고서를 제출하라. 각 QR코드를 스캔하고 증거를 첨부하라. 제출된 신고서는 <code>backend/data/reports.txt</code> 및 <code>reports.json</code>에 저장된다. 관리자 대시보드: <code><a href="/admin" style="color:#60a5fa">/admin</a></code></p></div></div>
${cases.map((c,i)=>`<div class="case"><div class="ch"><div><div class="cn">사건 ${String(i+1).padStart(2,'0')}</div><div class="ci">${c.caseNum}</div></div><div><div class="cv">${c.emoji} ${c.villain} · ${c.age}</div><div style="display:flex;gap:.5rem;margin-top:.3rem;flex-wrap:wrap"><span class="ct">${c.role}</span><span class="ctr">⚠ ${c.wanted}</span></div></div><div class="db">💸 ${c.damage}</div></div><div class="cb"><div class="cl"><p class="cs">"${c.story}"</p><div class="st">▸ 신고 절차</div><ul class="sl"><li><span class="sn">1</span><span><a href="/" target="_blank" class="al">신고 앱</a> 에서 신고자: <strong>이름 홍수사, 연락처 010-0000-0000</strong></span></li><li><span class="sn">2</span><span>QR 스캔 단계 → 우측 QR을 카메라로 스캔</span></li><li><span class="sn">3</span><span>증거 사진 최대 4장 첨부</span></li><li><span class="sn">4</span><span>위치 자동 감지 또는 아래 주소 입력</span></li><li><span class="sn">5</span><span>사기 유형 <strong>${c.fraudType}</strong> 선택 후 설명 붙여넣기</span></li><li><span class="sn">6</span><span>제출 후 접수번호 저장 → <a href="/track" class="al">/track</a>에서 조회 가능</span></li></ul><div class="dbox"><div class="dt">테스트 데이터 (복사해서 붙여넣기)</div><div class="dr"><span class="dk">발생 위치</span><span class="dv">${c.location}</span></div><div class="dr"><span class="dk">GPS</span><span class="dv">${c.gps}</span></div><div class="dr"><span class="dk">사기 유형</span><span class="dv">${c.fraudType}</span></div><div class="dr"><span class="dk">피해 설명</span><span class="dv">${c.detail}</span></div></div></div><div class="cr">${qrFiles.includes(c.file)?`<div class="qw"><img src="/test-qr/${c.file}" alt="QR"></div>`:'<div style="width:132px;height:132px;background:#0a1628;border:2px dashed #1e3a5f;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:.7rem;color:#475569;text-align:center;padding:.5rem">generate-test-qr.js<br>실행 후 새로고침</div>'}<div class="qnote">앱 QR 스캐너로 이 코드를 스캔하세요</div></div></div></div>`).join('')}
<div class="cta"><h3>수사관님, 준비되셨습니까?</h3><p>3건 제출 후 <strong>/admin</strong> 에서 모든 신고서를 확인하세요</p><a href="/" target="_blank" class="btn">🚨 금융사기 신고 앱 열기</a><div class="hl"><div class="hli"><div class="hln">1332</div><div class="hll">금융감독원</div></div><div class="hli"><div class="hln">182</div><div class="hll">경찰청</div></div><div class="hli"><div class="hln">118</div><div class="hll">KISA</div></div></div></div></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script><script>var u=window.location.origin;document.getElementById('join-url').textContent=u;new QRCode(document.getElementById('join-qr'),{text:u,width:160,height:160,colorDark:'#000000',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});</script></body></html>`;
  res.send(html);
});

app.listen(PORT, () => {
  console.log(`\n  〰〰 NHATRANG System 〰〰`);
  console.log(`  National High-Alert Anti-fraud Tracking,`);
  console.log(`  Reporting, Analysis, Notification & Guardianship\n`);
  console.log(`  Backend  : http://localhost:${PORT}`);
  console.log(`  Reports  : ${REPORTS_TXT}`);
  console.log(`  Scenario : http://localhost:${PORT}/scenario\n`);
});
