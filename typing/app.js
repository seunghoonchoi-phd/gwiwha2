/* app.js — 한글 타자 연습 (두벌식)
   모드: 자리연습 / 낱글자 / 단문 / 귀화 작문(장문)
   입력은 hangul.js 오토마타로 처리(OS IME 불필요). 정답은 키스트로크 단위 비교.
   언어: ko/zh/vi/th (귀화앱과 동일). 귀화앱이 고른 언어(nq_lang)를 물려받음. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var LANG_NAME = { ko: '한국어', zh: '中文', vi: 'Tiếng Việt', th: 'ภาษาไทย' };
  var LANG_FLAG = { ko: '🇰🇷', zh: '🇨🇳', vi: '🇻🇳', th: '🇹🇭' };
  var LANG_ORDER = ['ko', 'zh', 'vi', 'th'];
  var LINE_BUDGET = 28; // 장문 줄바꿈 기준(글자 수)

  // ===== I18N (ko / zh / vi / th) =====
  var I18N = {
    ko: {
      'app.title': '한글 타자 연습', 'app.toQuiz': '📚 귀화앱',
      'home.lead': '한글 자판이 손에 익을 때까지, 한 단계씩 천천히 연습해요.',
      'home.imeTip': '💡 컴퓨터 입력기를 한글로 바꾸지 않아도 됩니다. 화면이 알려주는 키를 그대로 누르세요.',
      'home.hint': '개인용 연습 도구 · 점수는 이 기기에만 저장됩니다.',
      'mode.position.t': '자리 연습', 'mode.position.s': 'ㅎ ㅁ ㅂ ㅕ — 자판 위치와 손가락 익히기',
      'mode.syllable.t': '낱글자 연습', 'mode.syllable.s': '자음+모음을 모아 한 글자씩 완성',
      'mode.short.t': '단문 연습', 'mode.short.s': '짧은 문장 따라 치기',
      'mode.long.t': '귀화 작문 연습', 'mode.long.s': '작문 모범답안(200자) 따라 치기',
      'common.home': '홈', 'common.list': '목록', 'common.retry': '다시', 'common.next': '다음 →',
      'stat.time': '시간', 'stat.speed': '타수', 'stat.acc': '정확도', 'stat.miss': '오타',
      'next.this': '이 자리', 'next.char': '다음', 'next.space': '스페이스', 'next.enter': '엔터',
      'next.shift': 'Shift 함께', 'done.title': '잘했어요! 완성 🎉', 'done.best': '최고 기록 경신! ⭐',
      'done.speed': '타/분', 'done.acc': '정확도', 'done.time': '걸린 시간',
      'done.nextHint': 'Enter 로 다음', 'done.listHint': 'Enter 로 목록',
      'list.position': '단계를 골라 시작하세요. 처음에는 ‘기본 자리’부터.',
      'list.syllable': '쉬운 글자부터 한 글자씩 완성해 보세요.',
      'list.short': '짧은 문장을 따라 치며 손을 풀어요.',
      'list.long': '귀화 작문 시험에 나오는 주제의 모범답안입니다. 의미를 보며 따라 치세요.',
      'sec.sec': '초', 'best.label': '최고', 'topic.label': '주제', 'echo.label': '내가 친 것',
      'mode.word.t': '낱말 연습', 'mode.word.s': '비슷한 낱말을 빠르게 구별하며 치기',
      'list.word': '비슷하게 생긴 낱말을 빠르게 알아보고 정확히 치는 연습이에요.',
      'sound.on': '🔊 소리 켜짐', 'sound.off': '🔇 소리 듣기'
    },
    zh: {
      'app.title': '韩文打字练习', 'app.toQuiz': '📚 入籍App',
      'home.lead': '在熟悉韩文键盘之前，一步一步慢慢练习。',
      'home.imeTip': '💡 不需要把电脑输入法切换成韩文。直接按屏幕提示的键即可。',
      'home.hint': '个人练习工具 · 成绩仅保存在本设备。',
      'mode.position.t': '指位练习', 'mode.position.s': 'ㅎ ㅁ ㅂ ㅕ — 熟悉键位与手指',
      'mode.syllable.t': '单字练习', 'mode.syllable.s': '辅音+元音，一个字一个字组合',
      'mode.short.t': '短句练习', 'mode.short.s': '跟着打短句子',
      'mode.long.t': '入籍作文练习', 'mode.long.s': '跟着打作文范文（200字）',
      'common.home': '主页', 'common.list': '列表', 'common.retry': '重来', 'common.next': '下一个 →',
      'stat.time': '时间', 'stat.speed': '速度', 'stat.acc': '准确率', 'stat.miss': '错字',
      'next.this': '此键', 'next.char': '下一个', 'next.space': '空格', 'next.enter': '回车',
      'next.shift': '同时按 Shift', 'done.title': '做得好！完成 🎉', 'done.best': '刷新最佳成绩！⭐',
      'done.speed': '键/分', 'done.acc': '准确率', 'done.time': '用时',
      'done.nextHint': '按 Enter 继续', 'done.listHint': '按 Enter 回列表',
      'list.position': '选择一个阶段开始。第一次请从“基本键位”开始。',
      'list.syllable': '从简单的字开始，一个字一个字完成。',
      'list.short': '跟着打短句子，活动手指。',
      'list.long': '这些是入籍作文考试主题的范文。看着意思跟着打。',
      'sec.sec': '秒', 'best.label': '最佳', 'topic.label': '主题', 'echo.label': '我打的',
      'mode.word.t': '单词练习', 'mode.word.s': '快速辨别相似的词并打出',
      'list.word': '快速识别外形相似的词并准确打出。',
      'sound.on': '🔊 声音开', 'sound.off': '🔇 听发音'
    },
    vi: {
      'app.title': 'Luyện gõ tiếng Hàn', 'app.toQuiz': '📚 App nhập tịch',
      'home.lead': 'Luyện từng bước cho đến khi quen bàn phím tiếng Hàn.',
      'home.imeTip': '💡 Không cần chuyển bộ gõ máy tính sang tiếng Hàn. Chỉ cần bấm đúng phím màn hình chỉ.',
      'home.hint': 'Công cụ luyện tập cá nhân · Điểm chỉ lưu trên thiết bị này.',
      'mode.position.t': 'Luyện vị trí phím', 'mode.position.s': 'ㅎ ㅁ ㅂ ㅕ — làm quen vị trí phím và ngón tay',
      'mode.syllable.t': 'Luyện từng chữ', 'mode.syllable.s': 'Ghép phụ âm + nguyên âm thành từng chữ',
      'mode.short.t': 'Luyện câu ngắn', 'mode.short.s': 'Gõ theo câu ngắn',
      'mode.long.t': 'Luyện viết bài nhập tịch', 'mode.long.s': 'Gõ theo bài văn mẫu (200 chữ)',
      'common.home': 'Trang chủ', 'common.list': 'Danh sách', 'common.retry': 'Làm lại', 'common.next': 'Tiếp →',
      'stat.time': 'Thời gian', 'stat.speed': 'Tốc độ', 'stat.acc': 'Chính xác', 'stat.miss': 'Lỗi',
      'next.this': 'Phím này', 'next.char': 'Tiếp', 'next.space': 'Phím cách', 'next.enter': 'Enter',
      'next.shift': 'Bấm kèm Shift', 'done.title': 'Giỏi lắm! Hoàn thành 🎉', 'done.best': 'Phá kỷ lục! ⭐',
      'done.speed': 'phím/phút', 'done.acc': 'Chính xác', 'done.time': 'Thời gian',
      'done.nextHint': 'Nhấn Enter để tiếp', 'done.listHint': 'Nhấn Enter về danh sách',
      'list.position': 'Chọn một bước để bắt đầu. Lần đầu hãy bắt đầu từ “phím cơ bản”.',
      'list.syllable': 'Bắt đầu từ chữ dễ, hoàn thành từng chữ một.',
      'list.short': 'Gõ theo câu ngắn để làm nóng tay.',
      'list.long': 'Đây là bài văn mẫu cho các chủ đề thi viết nhập tịch. Vừa xem nghĩa vừa gõ theo.',
      'sec.sec': ' giây', 'best.label': 'Tốt nhất', 'topic.label': 'Chủ đề', 'echo.label': 'Tôi đã gõ',
      'mode.word.t': 'Luyện từ', 'mode.word.s': 'Phân biệt nhanh các từ giống nhau và gõ',
      'list.word': 'Nhận diện nhanh các từ trông giống nhau và gõ chính xác.',
      'sound.on': '🔊 Bật âm', 'sound.off': '🔇 Nghe âm'
    },
    th: {
      'app.title': 'ฝึกพิมพ์ภาษาเกาหลี', 'app.toQuiz': '📚 แอปแปลงสัญชาติ',
      'home.lead': 'ฝึกทีละขั้นจนกว่าจะคุ้นกับแป้นพิมพ์ภาษาเกาหลี',
      'home.imeTip': '💡 ไม่ต้องเปลี่ยนตัวพิมพ์ในเครื่องเป็นภาษาเกาหลี แค่กดปุ่มตามที่หน้าจอบอก',
      'home.hint': 'เครื่องมือฝึกส่วนตัว · คะแนนบันทึกเฉพาะในเครื่องนี้',
      'mode.position.t': 'ฝึกตำแหน่งแป้น', 'mode.position.s': 'ㅎ ㅁ ㅂ ㅕ — คุ้นเคยกับตำแหน่งแป้นและนิ้ว',
      'mode.syllable.t': 'ฝึกตัวอักษร', 'mode.syllable.s': 'รวมพยัญชนะ+สระให้เป็นตัวอักษรทีละตัว',
      'mode.short.t': 'ฝึกประโยคสั้น', 'mode.short.s': 'พิมพ์ตามประโยคสั้น',
      'mode.long.t': 'ฝึกเขียนเรียงความแปลงสัญชาติ', 'mode.long.s': 'พิมพ์ตามเรียงความตัวอย่าง (200 ตัว)',
      'common.home': 'หน้าหลัก', 'common.list': 'รายการ', 'common.retry': 'เริ่มใหม่', 'common.next': 'ถัดไป →',
      'stat.time': 'เวลา', 'stat.speed': 'ความเร็ว', 'stat.acc': 'ความแม่นยำ', 'stat.miss': 'พิมพ์ผิด',
      'next.this': 'ปุ่มนี้', 'next.char': 'ถัดไป', 'next.space': 'เว้นวรรค', 'next.enter': 'Enter',
      'next.shift': 'กด Shift ด้วย', 'done.title': 'เยี่ยมมาก! เสร็จแล้ว 🎉', 'done.best': 'ทำลายสถิติ! ⭐',
      'done.speed': 'ปุ่ม/นาที', 'done.acc': 'ความแม่นยำ', 'done.time': 'เวลาที่ใช้',
      'done.nextHint': 'กด Enter เพื่อไปต่อ', 'done.listHint': 'กด Enter กลับรายการ',
      'list.position': 'เลือกขั้นเพื่อเริ่ม ครั้งแรกเริ่มจาก “แป้นพื้นฐาน”',
      'list.syllable': 'เริ่มจากตัวอักษรง่าย ๆ ทำให้เสร็จทีละตัว',
      'list.short': 'พิมพ์ตามประโยคสั้นเพื่ออุ่นเครื่องนิ้ว',
      'list.long': 'นี่คือเรียงความตัวอย่างของหัวข้อสอบเขียนแปลงสัญชาติ ดูความหมายแล้วพิมพ์ตาม',
      'sec.sec': ' วิ', 'best.label': 'ดีที่สุด', 'topic.label': 'หัวข้อ', 'echo.label': 'ที่ฉันพิมพ์',
      'mode.word.t': 'ฝึกคำศัพท์', 'mode.word.s': 'แยกแยะคำที่คล้ายกันอย่างรวดเร็วแล้วพิมพ์',
      'list.word': 'ฝึกจำคำที่หน้าตาคล้ายกันอย่างรวดเร็วและพิมพ์ให้ถูก',
      'sound.on': '🔊 เปิดเสียง', 'sound.off': '🔇 ฟังเสียง'
    }
  };
  function readInheritedLang() {
    var own = localStorage.getItem('typing_lang');
    if (own && LANG_NAME[own]) return own;
    try { var p = JSON.parse(localStorage.getItem('nq_lang') || 'null'); if (p && LANG_NAME[p]) return p; } catch (e) {}
    return 'ko';
  }
  var lang = readInheritedLang();
  function t(k) { return (I18N[lang] && I18N[lang][k]) || I18N.ko[k] || k; }
  function L(o) { return (o && (o[lang] || o.ko)) || ''; }

  // ===== 콘텐츠 =====
  var POSITION_STEPS = [
    { title: { ko: '기본 자리 (가운뎃줄)', zh: '基本键位（中排）', vi: 'Phím cơ bản (hàng giữa)', th: 'แป้นพื้นฐาน (แถวกลาง)' }, set: ['ㅁ', 'ㄴ', 'ㅇ', 'ㄹ', 'ㅎ', 'ㅗ', 'ㅓ', 'ㅏ', 'ㅣ'] },
    { title: { ko: '윗줄', zh: '上排', vi: 'Hàng trên', th: 'แถวบน' }, set: ['ㅂ', 'ㅈ', 'ㄷ', 'ㄱ', 'ㅅ', 'ㅛ', 'ㅕ', 'ㅑ', 'ㅐ', 'ㅔ'] },
    { title: { ko: '아랫줄', zh: '下排', vi: 'Hàng dưới', th: 'แถวล่าง' }, set: ['ㅋ', 'ㅌ', 'ㅊ', 'ㅍ', 'ㅠ', 'ㅜ', 'ㅡ'] },
    { title: { ko: '쌍자음·이중모음 (Shift)', zh: '双辅音·复元音（Shift）', vi: 'Phụ âm đôi · nguyên âm đôi (Shift)', th: 'พยัญชนะคู่·สระประสม (Shift)' }, set: ['ㅃ', 'ㅉ', 'ㄸ', 'ㄲ', 'ㅆ', 'ㅒ', 'ㅖ'] },
    { title: { ko: '전체 섞어서', zh: '全部混合', vi: 'Trộn tất cả', th: 'รวมทั้งหมด' }, set: ['ㅁ', 'ㄴ', 'ㅇ', 'ㄹ', 'ㅎ', 'ㅗ', 'ㅓ', 'ㅏ', 'ㅣ', 'ㅂ', 'ㅈ', 'ㄷ', 'ㄱ', 'ㅅ', 'ㅕ', 'ㅐ', 'ㅋ', 'ㅌ', 'ㅊ', 'ㅍ', 'ㅜ', 'ㅡ'] }
  ];
  var SYLLABLE_STEPS = [
    { title: { ko: '기본 글자 (자음 + ㅏ)', zh: '基本字（辅音+ㅏ）', vi: 'Chữ cơ bản (phụ âm + ㅏ)', th: 'ตัวอักษรพื้นฐาน (พยัญชนะ + ㅏ)' }, text: '가 나 다 라 마 바 사 아 자 차 카 타 파 하' },
    { title: { ko: 'ㄱ + 모든 모음', zh: 'ㄱ + 所有元音', vi: 'ㄱ + tất cả nguyên âm', th: 'ㄱ + สระทั้งหมด' }, text: '가 갸 거 겨 고 교 구 규 그 기' },
    { title: { ko: 'ㅇ + 모든 모음', zh: 'ㅇ + 所有元音', vi: 'ㅇ + tất cả nguyên âm', th: 'ㅇ + สระทั้งหมด' }, text: '아 야 어 여 오 요 우 유 으 이' },
    { title: { ko: '받침이 있는 글자', zh: '带收音的字', vi: 'Chữ có patchim', th: 'ตัวอักษรที่มีตัวสะกด' }, text: '강 산 물 밤 곰 집 발 손 눈 별 꽃 옷' },
    { title: { ko: '쉬운 낱말', zh: '简单词语', vi: 'Từ đơn giản', th: 'คำง่าย ๆ' }, text: '한국 사랑 가족 친구 학교 감사 행복 우리 사람 음식 한글 나라' }
  ];
  // 비슷하게 생긴 낱말 변별 — 전부 실재 한국어 낱말
  var WORD_STEPS = [
    { title: { ko: '비슷한 모음 (머·마·미)', zh: '相似元音（머·마·미）', vi: 'Nguyên âm giống nhau (머·마·미)', th: 'สระคล้ายกัน (머·마·미)' }, text: '마리 머리 미리 모래 무리 아마 어머니 이미 머루 마루 미로' },
    { title: { ko: '받침 ㄹ 낱말', zh: '收音ㄹ的词', vi: 'Từ có patchim ㄹ', th: 'คำที่มีตัวสะกด ㄹ' }, text: '물 불 풀 굴 술 줄 글 길 김 들 달 별' },
    { title: { ko: '된소리 변별', zh: '紧音辨别', vi: 'Phân biệt âm căng', th: 'แยกเสียงหนัก' }, text: '자다 짜다 차다 사다 싸다 타다 따다 가다 까다 하다 파다' },
    { title: { ko: '비슷한 두 글자', zh: '相似的两字词', vi: 'Từ hai chữ giống nhau', th: 'คำสองพยางค์ที่คล้ายกัน' }, text: '나무 너무 노래 누나 나비 너비 모자 모기 바다 바지 가방 가족' },
    { title: { ko: '받침 변별 (ㄴ·ㅇ·ㅁ)', zh: '收音辨别（ㄴ·ㅇ·ㅁ）', vi: 'Phân biệt patchim (ㄴ·ㅇ·ㅁ)', th: 'แยกตัวสะกด (ㄴ·ㅇ·ㅁ)' }, text: '간 강 감 산 상 삼 반 방 밤 손 솔 솜' },
    { title: { ko: '헷갈리는 낱말', zh: '容易混淆的词', vi: 'Từ dễ nhầm lẫn', th: 'คำที่สับสนง่าย' }, text: '의사 이사 시계 세계 사람 사랑 친구 친척 학교 학생 가게 가계' }
  ];
  var CURATED_SHORT = [
    { text: '안녕하세요.', trans: { zh: '你好。', vi: 'Xin chào.', th: 'สวัสดีค่ะ' } },
    { text: '만나서 반갑습니다.', trans: { zh: '很高兴见到你。', vi: 'Rất vui được gặp bạn.', th: 'ยินดีที่ได้รู้จัก' } },
    { text: '저는 외국에서 왔어요.', trans: { zh: '我来自外国。', vi: 'Tôi đến từ nước ngoài.', th: 'ฉันมาจากต่างประเทศ' } },
    { text: '한국 생활이 즐거워요.', trans: { zh: '韩国生活很愉快。', vi: 'Cuộc sống ở Hàn Quốc rất vui.', th: 'ชีวิตในเกาหลีสนุกดี' } },
    { text: '한국어를 열심히 배워요.', trans: { zh: '我努力学习韩语。', vi: 'Tôi chăm chỉ học tiếng Hàn.', th: 'ฉันตั้งใจเรียนภาษาเกาหลี' } },
    { text: '오늘도 좋은 하루 보내세요.', trans: { zh: '今天也祝你过得愉快。', vi: 'Chúc bạn một ngày tốt lành.', th: 'ขอให้วันนี้เป็นวันที่ดี' } }
  ];

  function topicOf(q) {
    if (!q) return '';
    var s = q.replace(/^다음 주제로[^:：]*[:：]\s*/, '').trim();
    s = s.replace(/<br\s*\/?>/gi, ' ').replace(/^["“”']|["“”'.]$/g, '').trim();
    return s;
  }
  function cleanPrompt(q) { return (q || '').replace(/<br\s*\/?>/gi, ' / '); }
  function transOf(d) { return { zh: d.model_zh || '', vi: d.model_vi || '', th: d.model_th || '' }; }

  var DATA = window.TYPING_WRITING || [];
  var NAT = DATA.filter(function (d) { return (d.exam || 'nat') === 'nat'; });
  var PRE = DATA.filter(function (d) { return d.exam === 'pre'; });

  var SHORT_ITEMS = CURATED_SHORT.map(function (c) { return { text: c.text, trans: c.trans, kind: 'text' }; })
    .concat(PRE.map(function (d) {
      return { text: (d.model || '').trim(), trans: transOf(d), topic: cleanPrompt(d.q), kind: 'text' };
    }).filter(function (x) { return x.text; }));

  var LONG_ITEMS = NAT.map(function (d) {
    return { text: (d.model || '').trim(), trans: transOf(d), topic: topicOf(d.q), kind: 'text', id: d.id };
  }).filter(function (x) { return x.text; });

  var MODES = {
    position: { kind: 'position', title: { ko: '자리 연습', zh: '指位练习', vi: 'Luyện vị trí phím', th: 'ฝึกตำแหน่งแป้น' }, desc: 'list.position', items: POSITION_STEPS },
    syllable: { kind: 'text', title: { ko: '낱글자 연습', zh: '单字练习', vi: 'Luyện từng chữ', th: 'ฝึกตัวอักษร' }, desc: 'list.syllable', items: SYLLABLE_STEPS },
    word: { kind: 'text', title: { ko: '낱말 연습', zh: '单词练习', vi: 'Luyện từ', th: 'ฝึกคำศัพท์' }, desc: 'list.word', items: WORD_STEPS },
    short: { kind: 'text', title: { ko: '단문 연습', zh: '短句练习', vi: 'Luyện câu ngắn', th: 'ฝึกประโยคสั้น' }, desc: 'list.short', items: SHORT_ITEMS },
    long: { kind: 'text', title: { ko: '귀화 작문 연습', zh: '入籍作文练习', vi: 'Luyện viết bài nhập tịch', th: 'ฝึกเขียนเรียงความแปลงสัญชาติ' }, desc: 'list.long', items: LONG_ITEMS }
  };

  // ===== 가상 키보드 레이아웃 =====
  var PUNCT = {
    Backquote: ['`', '~'], Digit1: ['1', '!'], Digit2: ['2', '@'], Digit3: ['3', '#'], Digit4: ['4', '$'],
    Digit5: ['5', '%'], Digit6: ['6', '^'], Digit7: ['7', '&'], Digit8: ['8', '*'], Digit9: ['9', '('],
    Digit0: ['0', ')'], Minus: ['-', '_'], Equal: ['=', '+'], BracketLeft: ['[', '{'], BracketRight: [']', '}'],
    Backslash: ['\\', '|'], Semicolon: [';', ':'], Quote: ["'", '"'], Comma: [',', '<'], Period: ['.', '>'], Slash: ['/', '?']
  };
  var KB_ROWS = [
    ['Backquote', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal', { code: 'Backspace', label: '⌫', cls: 'special wide' }],
    [{ code: 'Tab', label: 'Tab', cls: 'special wide' }, 'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight', 'Backslash'],
    [{ code: 'CapsLock', label: 'Caps', cls: 'special wider' }, 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote', { code: 'Enter', label: '↵', cls: 'special wider' }],
    [{ code: 'ShiftLeft', label: 'Shift', cls: 'special widest' }, 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash', { code: 'ShiftRight', label: 'Shift', cls: 'special widest' }],
    [{ code: 'Space', label: '', cls: 'spacekey' }]
  ];
  var keyEls = {};

  function buildKeyboard() {
    var kb = $('#keyboard');
    kb.innerHTML = '';
    keyEls = {};
    KB_ROWS.forEach(function (row) {
      var r = document.createElement('div');
      r.className = 'kbd-row';
      row.forEach(function (cell) {
        var code = typeof cell === 'string' ? cell : cell.code;
        var el = document.createElement('button');
        el.type = 'button';
        el.className = 'key';
        el.dataset.code = code;
        if (typeof cell === 'object') {
          el.className += ' ' + (cell.cls || '');
          var m = document.createElement('span'); m.className = 'key__main'; m.textContent = cell.label; el.appendChild(m);
        } else if (HG.DUBEOL[code]) {
          var f = HG.FINGER[code]; if (f) el.className += ' f-' + f.finger;
          if (code === 'KeyF' || code === 'KeyJ') el.className += ' homedot';
          var main = document.createElement('span'); main.className = 'key__main'; main.textContent = HG.DUBEOL[code].base; el.appendChild(main);
          if (HG.DUBEOL[code].shift) { var sh = document.createElement('span'); sh.className = 'key__shift'; sh.textContent = HG.DUBEOL[code].shift; el.appendChild(sh); }
          var lat = document.createElement('span'); lat.className = 'key__lat'; lat.textContent = code.replace('Key', '').toLowerCase(); el.appendChild(lat);
        } else if (PUNCT[code]) {
          var f2 = HG.FINGER[code]; if (f2) el.className += ' f-' + f2.finger;
          var m2 = document.createElement('span'); m2.className = 'key__main'; m2.textContent = PUNCT[code][0]; el.appendChild(m2);
          var s2 = document.createElement('span'); s2.className = 'key__shift'; s2.textContent = PUNCT[code][1]; el.appendChild(s2);
        }
        el.addEventListener('click', function () { onVirtualKey(code); });
        keyEls[code] = el;
        r.appendChild(el);
      });
      kb.appendChild(r);
    });
  }

  // ===== 상태 =====
  var state = null;
  var timerId = null;
  var soundOn = (localStorage.getItem('typing_sound') !== '0'); // 기본 켜짐 — 사용자가 끈 적 있을 때만 꺼짐

  // ===== 발음(소리) — 자음은 +ㅡ(므·느), 모음은 ㅇ+(아·어). 검증된 조합 오토마타 재사용 =====
  function jamoToSyllable(j) {
    if (HG.isCons(j)) return HG.compose([{ type: 'jamo', jamo: j }, { type: 'jamo', jamo: 'ㅡ' }]);
    if (HG.isVowel(j)) return HG.compose([{ type: 'jamo', jamo: 'ㅇ' }, { type: 'jamo', jamo: j }]);
    return '';
  }
  // 가장 또렷한 한국어 음성 고르기 — 신경망/네트워크 음성(특히 Chrome의 Google 음성) 우선
  var koVoice = null;
  function pickKoVoice() {
    if (!('speechSynthesis' in window)) return;
    var vs = window.speechSynthesis.getVoices() || [];
    var ko = vs.filter(function (v) { return /^ko/i.test(v.lang || ''); });
    if (!ko.length) { koVoice = null; return; }
    var PREF = ['google', 'sunhi', 'sun-hi', 'seoyeon', 'yuna', 'injoon', 'jimin', 'heami', 'natural', 'neural', 'wavenet'];
    function score(v) {
      var n = (v.name || '').toLowerCase(), s = 0;
      if (n.indexOf('google') > -1) s += 100;       // Chrome의 Google 한국어(신경망) = 가장 또렷
      for (var i = 0; i < PREF.length; i++) { if (n.indexOf(PREF[i]) > -1) { s += 50; break; } }
      if (!v.localService) s += 40;                  // 네트워크 음성이 대체로 더 명확
      if (v.default) s += 5;
      return s;
    }
    ko.sort(function (a, b) { return score(b) - score(a); });
    koVoice = ko[0];
  }
  if ('speechSynthesis' in window) {
    pickKoVoice();
    try { window.speechSynthesis.addEventListener('voiceschanged', pickKoVoice); } catch (e) {}
  }
  function speakJamo(j) {
    if (!soundOn || !j) return;
    if (!('speechSynthesis' in window)) return;
    var syl = jamoToSyllable(j); if (!syl) return;
    try {
      window.speechSynthesis.cancel();
      if (!koVoice) pickKoVoice();
      var u = new SpeechSynthesisUtterance(syl);
      u.lang = 'ko-KR'; u.rate = 0.72; u.pitch = 1.0;
      if (koVoice) u.voice = koVoice;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }
  function updateSoundToggle() {
    var b = $('#soundToggle'); if (!b) return;
    b.textContent = soundOn ? t('sound.on') : t('sound.off');
    b.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
  }
  function toggleSound() {
    soundOn = !soundOn;
    try { localStorage.setItem('typing_sound', soundOn ? '1' : '0'); } catch (e) {}
    updateSoundToggle();
    if (soundOn) { var exp = currentExpected(); if (exp && exp.jamo) speakJamo(exp.jamo); }
  }

  function newState(mode, idx) {
    var cfg = MODES[mode];
    var item = cfg.items[idx];
    var s = { mode: mode, kind: cfg.kind, idx: idx, item: item, correct: 0, errors: 0, startTime: 0, running: false, finished: false };
    if (cfg.kind === 'position') {
      s.seq = buildDrill(item.set);
      s.posIdx = 0;
      s.total = s.seq.length;
    } else {
      var txt;
      if (mode === 'short') {
        // 같은 문장 반복 대신 연속된 4문장을 이어붙여 분량을 늘림(끝에서는 앞으로 순환)
        var items = cfg.items, n = items.length, parts = [];
        for (var k = 0; k < 4 && k < n; k++) parts.push(items[(idx + k) % n].text);
        txt = parts.join(' ');
      } else {
        txt = expandText(item.text, mode);
      }
      s.target = txt;
      s.tokens = HG.textToKeystrokes(txt);
      s.chars = HG.sanitize(txt).split('');
      s.lines = wrapLines(s.chars);
      s.pos = 0;
      s.total = s.tokens.length;
    }
    return s;
  }

  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  // 자리연습: 한 세션을 충분히 길게(~180회) — 세트 단위로 섞어 이어붙임
  function buildDrill(set) { var out = set.slice(); while (out.length < 175) out = out.concat(shuffle(set)); return out; }
  // 텍스트 모드: 음절 최소치까지 통째로 반복 (낱글자·낱말). 단문은 newState에서 여러 문장 이어붙임. 귀화작문(long)은 제외.
  var MIN_SYL = { syllable: 330, word: 300 };
  function sylCount(text) { return (String(text).match(/[가-힣ㄱ-ㅎㅏ-ㅣ]/g) || []).length; }
  function expandText(text, mode) {
    var min = MIN_SYL[mode] || 0; if (!min) return text;
    var base = String(text).trim(), out = base, g = 0;
    while (sylCount(out) < min && g++ < 80) out += ' ' + base;
    return out;
  }

  // 단어(공백) 단위로 줄 분할 → 각 줄 = [start,end) 글자 인덱스(끝의 공백 제외)
  function wrapLines(chars) {
    var lines = [], n = chars.length, i = 0;
    var lineStart = -1, lineEnd = -1, lineLen = 0;
    while (i < n) {
      var j = i; while (j < n && chars[j] !== ' ') j++; // [i,j) = 한 단어
      var wlen = j - i;
      if (lineStart < 0) { lineStart = i; lineEnd = j; lineLen = wlen; }
      else if (lineLen + 1 + wlen <= LINE_BUDGET) { lineEnd = j; lineLen += 1 + wlen; }
      else { lines.push({ start: lineStart, end: lineEnd }); lineStart = i; lineEnd = j; lineLen = wlen; }
      i = (j < n) ? j + 1 : j; // 공백 건너뜀(줄바꿈)
    }
    if (lineStart >= 0) lines.push({ start: lineStart, end: lineEnd });
    return lines.length ? lines : [{ start: 0, end: n }];
  }

  // ===== 화면 전환 =====
  function show(view) { $$('.view').forEach(function (v) { v.classList.add('hidden'); }); $('#view-' + view).classList.remove('hidden'); window.scrollTo(0, 0); }

  function goHome() { stopTimer(); show('home'); }

  function goList(mode) {
    var cfg = MODES[mode];
    $('#listTitle').textContent = L(cfg.title);
    $('#listDesc').textContent = t(cfg.desc);
    var box = $('#listItems'); box.innerHTML = '';
    cfg.items.forEach(function (item, i) {
      var b = document.createElement('button');
      b.className = 'select-item';
      var title, sub = '';
      if (cfg.kind === 'position') { title = L(item.title); sub = item.set.join(' '); }
      else if (mode === 'syllable' || mode === 'word') { title = L(item.title); sub = item.text; }
      else if (mode === 'long') { title = item.topic; sub = (lang === 'ko') ? item.text : ((item.trans && item.trans[lang]) || item.text); }
      else { title = item.text; sub = (lang === 'ko') ? '' : ((item.trans && item.trans[lang]) || ''); }
      var best = getBest(mode, i);
      b.innerHTML = '<span class="select-item__main"><span class="select-item__title">' + esc(title) + '</span>' +
        (sub ? '<span class="select-item__sub">' + esc(clip(sub, 70)) + '</span>' : '') + '</span>' +
        (best ? '<span class="select-item__best">' + t('best.label') + ' ' + best + '</span>' : '');
      b.addEventListener('click', function () { startPractice(mode, i); });
      box.appendChild(b);
    });
    state = { mode: mode };
    show('list');
  }

  // ===== 연습 시작 =====
  function startPractice(mode, idx) {
    state = newState(mode, idx);
    var cfg = MODES[mode];
    var perItemTitle = (mode === 'position' || mode === 'syllable' || mode === 'word');
    $('#pracTitle').textContent = (perItemTitle && state.item.title) ? L(state.item.title) : L(cfg.title);
    // 발음 듣기 토글: 글자 단위 연습(자리·낱글자)에서만 — 문장·장문엔 불필요
    var soundModes = (mode === 'position' || mode === 'syllable');
    var stog = $('#soundToggle');
    if (stog) { stog.classList.toggle('hidden', !soundModes); updateSoundToggle(); }
    var meta = $('#pracMeta');
    var tr = state.item.trans && state.item.trans[lang];
    if (state.kind === 'text' && (state.item.topic || (tr && lang !== 'ko'))) {
      var html = '';
      if (state.item.topic) html += '<div class="prac-meta__topic">' + (mode === 'long' ? (t('topic.label') + ': ') : '') + esc(state.item.topic) + '</div>';
      if (tr && lang !== 'ko') html += '<div class="prac-meta__trans">' + esc(tr) + '</div>';
      meta.innerHTML = html; meta.classList.remove('hidden');
    } else { meta.classList.add('hidden'); }
    $('#pracDone').classList.add('hidden');
    show('practice');
    render();
    updateStats();
  }

  function stopTimer() { if (timerId) { clearInterval(timerId); timerId = null; } if (state) state.running = false; }
  function startTimerIfNeeded() {
    if (state.running || state.finished) return;
    state.running = true; state.startTime = Date.now();
    timerId = setInterval(function () { updateStats(); }, 200);
  }

  // ===== 입력 처리 =====
  function currentExpected() {
    if (!state) return null;
    if (state.kind === 'position') {
      if (state.posIdx >= state.seq.length) return null;
      var jamo = state.seq[state.posIdx];
      return { type: 'jamo', jamo: jamo, key: HG.JAMO_TO_KEY[jamo] };
    } else {
      if (state.pos >= state.tokens.length) return null;
      var tok = state.tokens[state.pos];
      return { type: tok.type, jamo: tok.jamo, ch: tok.ch, key: HG.tokenKey(tok), tok: tok };
    }
  }

  function handleInput(code, shift) {
    if (!state || state.finished || ($('#view-practice').classList.contains('hidden'))) return false;
    var exp = currentExpected();
    if (!exp) return false;
    startTimerIfNeeded();
    var ok = state.kind === 'position' ? (HG.producedJamo(code, shift) === exp.jamo) : HG.matches(exp.tok, code, shift);
    if (ok) {
      if (state.kind === 'position') state.posIdx++; else state.pos++;
      state.correct++;
      if (soundOn && (state.mode === 'position' || state.mode === 'syllable') && exp.jamo) speakJamo(exp.jamo);
      flashKey(code, 'pressed');
      render();
      updateStats();
      if (progressCount() >= state.total) finish();
    } else {
      state.errors++;
      flashKey(code, 'miss');
      var ek = exp.key; if (ek && keyEls[ek.code]) { keyEls[ek.code].classList.add('miss'); setTimeout(function (e) { e.classList.remove('miss'); }, 300, keyEls[ek.code]); }
      updateStats();
    }
    return true;
  }

  function progressCount() { return state.kind === 'position' ? state.posIdx : state.pos; }

  function backspace() {
    if (!state || state.finished) return;
    if (state.kind === 'position') { if (state.posIdx > 0) state.posIdx--; }
    else { if (state.pos > 0) state.pos--; }
    render(); updateStats();
  }

  function flashKey(code, cls) {
    var el = keyEls[code]; if (!el) return;
    el.classList.add(cls); setTimeout(function () { el.classList.remove(cls); }, 120);
  }

  function onVirtualKey(code) {
    if (state && state.finished) { if (code === 'Enter') goNext(); return; }
    var exp = currentExpected();
    var shift = (exp && exp.key && exp.key.code === code) ? !!exp.key.shift : false;
    if (code === 'Backspace') { backspace(); return; }
    if (code === 'ShiftLeft' || code === 'ShiftRight' || code === 'CapsLock' || code === 'Tab') return;
    handleInput(code, shift);
  }

  // 물리 키보드
  document.addEventListener('keydown', function (e) {
    if ($('#view-practice').classList.contains('hidden')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var code = e.code;
    // 완료 후 Enter = 다음
    if (state && state.finished) {
      if (code === 'Enter') { e.preventDefault(); goNext(); }
      return;
    }
    if (code === 'Backspace') { e.preventDefault(); backspace(); return; }
    if (code === 'Enter') {
      var exp = currentExpected();
      e.preventDefault();
      if (exp && exp.type === 'enter') handleInput(code, e.shiftKey);
      // 그 외 잘못 누른 Enter는 무시(오타 아님)
      return;
    }
    var typingKey = HG.DUBEOL[code] || PUNCT[code] || code === 'Space';
    if (!typingKey) return;
    e.preventDefault();
    handleInput(code, e.shiftKey);
  });

  function goNext() {
    if (!state) return;
    var hasNext = state.idx + 1 < MODES[state.mode].items.length;
    if (hasNext) startPractice(state.mode, state.idx + 1);
    else goList(state.mode);
  }

  // ===== 렌더 =====
  function render() {
    var box = $('#targetBox');
    highlightKeyboard();
    if (state.kind === 'position') renderPosition(box);
    else renderText(box);
    renderNextKey();
    var pct = state.total ? Math.round(progressCount() / state.total * 100) : 0;
    $('#pracProgress').style.width = pct + '%';
  }

  function renderPosition(box) {
    var seq = state.seq, i = state.posIdx;
    var html = '<div class="pos-stage"><div class="pos-queue">';
    for (var k = i - 2; k <= i + 4; k++) {
      if (k < 0 || k >= seq.length) { html += '<div class="pos-cell"></div>'; continue; }
      var cls = 'pos-cell' + (k === i ? ' is-current' : k < i ? ' is-done' : '');
      html += '<div class="' + cls + '">' + (k < i ? '✓' : esc(seq[k])) + '</div>';
    }
    html += '</div><div class="pos-progress">' + Math.min(i + 1, seq.length) + ' / ' + seq.length + '</div></div>';
    box.innerHTML = html;
  }

  function renderText(box) {
    var chars = state.chars, toks = state.tokens, pos = state.pos, lines = state.lines;
    var currentCi = pos < toks.length ? toks[pos].ci : chars.length;
    var typedToks = toks.slice(0, pos);
    var html = '<div class="txt-lines">';
    for (var li = 0; li < lines.length; li++) {
      var ln = lines[li];
      // 원문 줄
      var tHtml = '';
      for (var c = ln.start; c < ln.end; c++) {
        var ch = chars[c];
        var st = c < currentCi ? 'done' : c === currentCi ? 'current' : 'pending';
        if (ch === ' ') tHtml += (c === currentCi) ? '<span class="ch current sp"> </span>' : '<span class="ch sp"> </span>';
        else tHtml += '<span class="ch ' + st + '">' + esc(ch) + '</span>';
      }
      // 입력 줄(이 줄에 속한, 이미 친 토큰만 조합)
      var lineToks = typedToks.filter(function (tk) { return tk.ci >= ln.start && tk.ci < ln.end; });
      var typed = HG.compose(lineToks);
      var isCurrentLine = currentCi >= ln.start && currentCi <= ln.end;
      html += '<div class="tline' + (isCurrentLine ? ' is-current' : '') + '">' +
        '<div class="tline-target">' + tHtml + '</div>' +
        '<div class="tline-echo">' + esc(typed) + (isCurrentLine ? '<span class="caret"></span>' : '') + '</div>' +
        '</div>';
    }
    html += '</div>';
    box.innerHTML = html;
  }

  function renderNextKey() {
    var exp = currentExpected();
    var nk = $('#nextKey');
    if (!exp) { nk.innerHTML = ''; return; }
    var label, big = '';
    if (state.kind === 'position') { label = t('next.this'); big = exp.jamo; }
    else if (exp.type === 'space') { label = t('next.char'); big = t('next.space'); }
    else if (exp.type === 'enter') { label = t('next.char'); big = t('next.enter'); }
    else if (exp.type === 'jamo') { label = t('next.char'); big = exp.jamo; }
    else { label = t('next.char'); big = exp.ch; }
    var html = '<b>' + esc(label) + '</b> <span class="nk-jamo">' + esc(big) + '</span>';
    var key = exp.key;
    if (key && HG.FINGER[key.code]) {
      var f = HG.FINGER[key.code];
      html += '<span class="nk-finger">' + esc(HG.HAND_LABEL[lang][f.hand] + ' ' + HG.FINGER_LABEL[lang][f.finger]) + '</span>';
    }
    if (key && key.shift) html += '<span class="nk-shift">⇧ ' + esc(t('next.shift')) + '</span>';
    nk.innerHTML = html;
  }

  function highlightKeyboard() {
    $$('.key.next, .key.next-shift').forEach(function (el) { el.classList.remove('next', 'next-shift'); });
    var exp = currentExpected();
    if (!exp || !exp.key) return;
    var key = exp.key;
    if (keyEls[key.code]) keyEls[key.code].classList.add('next');
    if (key.shift) {
      var f = HG.FINGER[key.code];
      var shiftCode = (f && f.hand === 'L') ? 'ShiftRight' : 'ShiftLeft';
      if (keyEls[shiftCode]) keyEls[shiftCode].classList.add('next-shift');
    }
  }

  // ===== 통계 =====
  function updateStats() {
    if (!state || state.kind === undefined) return;
    var elapsed = state.startTime ? (Date.now() - state.startTime) / 1000 : 0;
    var speed = elapsed >= 0.5 ? Math.min(9999, Math.round(state.correct / (elapsed / 60))) : 0;
    var attempts = state.correct + state.errors;
    var acc = attempts > 0 ? Math.round(state.correct / attempts * 100) : 100;
    $('#statTime').textContent = Math.floor(elapsed) + t('sec.sec');
    $('#statSpeed').textContent = speed;
    $('#statAcc').textContent = acc + '%';
    $('#statMiss').textContent = state.errors;
  }

  // ===== 완료 =====
  function finish() {
    stopTimer();
    state.finished = true;
    var elapsed = (Date.now() - state.startTime) / 1000;
    var speed = elapsed >= 0.5 ? Math.min(9999, Math.round(state.correct / (elapsed / 60))) : 0;
    var attempts = state.correct + state.errors;
    var acc = attempts > 0 ? Math.round(state.correct / attempts * 100) : 100;
    var prevBest = getBest(state.mode, state.idx);
    var isBest = speed > prevBest;
    if (isBest) setBest(state.mode, state.idx, speed);
    var d = $('#pracDone');
    var hasNext = state.idx + 1 < MODES[state.mode].items.length;
    d.innerHTML =
      '<div class="prac-done__title">' + t('done.title') + '</div>' +
      (isBest ? '<div class="prac-done__best">' + t('done.best') + '</div>' : '') +
      '<div class="prac-done__stats">' +
      '<div class="prac-done__stat"><b>' + speed + '</b><span>' + t('done.speed') + '</span></div>' +
      '<div class="prac-done__stat"><b>' + acc + '%</b><span>' + t('done.acc') + '</span></div>' +
      '<div class="prac-done__stat"><b>' + Math.floor(elapsed) + t('sec.sec') + '</b><span>' + t('done.time') + '</span></div>' +
      '</div><div class="prac-done__actions">' +
      '<button class="btn btn--ghost" id="doneRetry">↻ ' + t('common.retry') + '</button>' +
      '<button class="btn btn--primary" id="doneNext">' + (hasNext ? t('common.next') : t('common.list')) + '</button>' +
      '</div><div class="prac-done__hint">⏎ ' + (hasNext ? t('done.nextHint') : t('done.listHint')) + '</div>';
    d.classList.remove('hidden');
    $('#doneRetry').addEventListener('click', function () { startPractice(state.mode, state.idx); });
    $('#doneNext').addEventListener('click', goNext);
    d.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // ===== 저장 =====
  function bestStore() { try { return JSON.parse(localStorage.getItem('typing_best_v1') || '{}'); } catch (e) { return {}; } }
  function getBest(mode, idx) { return Math.min(9999, bestStore()[mode + ':' + idx] || 0); }
  function setBest(mode, idx, v) { var s = bestStore(); s[mode + ':' + idx] = v; localStorage.setItem('typing_best_v1', JSON.stringify(s)); }

  // ===== 유틸 =====
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function clip(s, n) { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

  // ===== 언어 =====
  function setLang(l) {
    if (!LANG_NAME[l]) return;
    lang = l;
    localStorage.setItem('typing_lang', l);
    try { localStorage.setItem('nq_lang', JSON.stringify(l)); } catch (e) {} // 귀화앱과 동기화
    applyI18n();
    if (!$('#view-list').classList.contains('hidden')) goList(state.mode);
    else if (!$('#view-practice').classList.contains('hidden')) startPractice(state.mode, state.idx);
  }

  function applyI18n() {
    document.documentElement.lang = lang;
    $$('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
    $('#langBtn').textContent = '🌐 ' + LANG_NAME[lang];
    updateSoundToggle();
  }

  // 언어 선택 picker (귀화앱 방식)
  function buildPicker() {
    var box = $('#langOpts'); box.innerHTML = '';
    LANG_ORDER.forEach(function (l) {
      var b = document.createElement('button');
      b.className = 'lang-opt' + (l === lang ? ' is-active' : '');
      b.type = 'button';
      b.innerHTML = '<span class="lang-opt__flag">' + LANG_FLAG[l] + '</span><span class="lang-opt__name">' + esc(LANG_NAME[l]) + '</span>';
      b.addEventListener('click', function () { closePicker(); setLang(l); });
      box.appendChild(b);
    });
  }
  function openPicker() { buildPicker(); $('#langPicker').classList.remove('hidden'); }
  function closePicker() { $('#langPicker').classList.add('hidden'); }

  // ===== 딥링크 (#모드/번호) =====
  function routeFromHash() {
    var m = (location.hash || '').replace(/^#/, '').split('/');
    var mode = m[0], idx = parseInt(m[1], 10);
    if (MODES[mode] && idx >= 0 && idx < MODES[mode].items.length) { startPractice(mode, idx); return true; }
    return false;
  }

  // ===== 이벤트 =====
  function bind() {
    $('#homeBtn').addEventListener('click', goHome);
    $('#langBtn').addEventListener('click', openPicker);
    $('#langPicker').addEventListener('click', function (e) { if (e.target === this) closePicker(); });
    $$('.mode-card').forEach(function (c) { c.addEventListener('click', function () { goList(c.dataset.mode); }); });
    $$('[data-go]').forEach(function (b) { b.addEventListener('click', function () { if (b.dataset.go === 'home') goHome(); }); });
    $('#pracBack').addEventListener('click', function () { stopTimer(); goList(state.mode); });
    var stog = $('#soundToggle'); if (stog) stog.addEventListener('click', toggleSound);
  }

  // ===== 초기화 =====
  function init() {
    buildKeyboard();
    applyI18n();
    bind();
    show('home');
    if (location.hash) routeFromHash();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
