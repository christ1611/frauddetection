const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const fraudCases = [
  {
    name: 'LEE_JAEMAN_KAKAOBANK',
    url: 'http://www.kakaobank-secure-login.fake-kr.xyz/auth?ref=ATM_VERIFY&token=abc123',
    label: '이재만 - 카카오뱅크 피싱 QR'
  },
  {
    name: 'PARK_DOHYUN_GS25',
    url: 'http://pay.kakaopay-merchant-gs25-82933.scam.net/checkout?store=GS25홍대점&redir=attacker',
    label: '박도현 - GS25 결제 QR 교체 사기'
  },
  {
    name: 'KANG_SYNDICATE_INVESTMENT',
    url: 'http://korea-gold-invest-500percent.xyz/join?ref=VICTIM-001&bonus=500만원&limit=오늘까지',
    label: '강민서 조직 - 불법 투자 사기 QR'
  }
];

const outDir = path.join(__dirname, 'test-qr-codes');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

(async () => {
  console.log('\n🎬  한국 금융사기 테스트 QR코드 생성 중...\n');
  for (const c of fraudCases) {
    const file = path.join(outDir, `${c.name}.png`);
    await QRCode.toFile(file, c.url, { width: 300, margin: 2, errorCorrectionLevel: 'H' });
    console.log(`✅  ${c.label}`);
    console.log(`    파일: test-qr-codes/${c.name}.png`);
    console.log(`    URL : ${c.url}\n`);
  }
  console.log('📁  PNG 파일을 화면에 띄워서 앱의 QR 스캐너로 스캔하세요.\n');
})();
