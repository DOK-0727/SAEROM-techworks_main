const SHEET_NAME = 'Sheet1';

/** 현재 접속 사용자 이메일 */
function getMyEmail_() {
    const a = (Session.getActiveUser() && Session.getActiveUser().getEmail()) || '';
    const e = (Session.getEffectiveUser() && Session.getEffectiveUser().getEmail()) || '';
    return (a || e || '').trim();
}

function normalizeStage_(s) {
    return String(s || '').trim();
}

/**
 * (계정 + 단계)로 기존 제출 행 찾기
 * 컬럼: A계정 B제출일시 C학번 D이름 E제출링크 F체크 G단계 (H퀘스트 optional)
 * 데이터는 2행부터(1행 헤더)
 */
function findRowByAccountAndStage_(sheet, accountEmail, stageCode) {
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return -1;

    const width = Math.min(sheet.getLastColumn(), 8);
    const values = sheet.getRange(2, 1, lastRow - 1, width).getValues();
    const accTarget = String(accountEmail || '').trim();
    const stageTarget = normalizeStage_(stageCode);

    for (let i = 0; i < values.length; i++) {
        const acc = String(values[i][0] || '').trim(); // A
        const stg = String(values[i][6] || '').trim(); // G
        if (acc === accTarget && stg === stageTarget) return 2 + i;
    }
    return -1;
}

/**
 * ✅ 새로고침 유지 핵심:
 * "내 계정" 제출 데이터를 전부 읽어서 stage별로 반환
 * + 관리자 체크 상태(완료/미완료)도 같이 포함
 */
function getUserSubmissionsMap_() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    const email = getMyEmail_();

    const out = { email, map: {} };
    if (!sheet || !email) return out;

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return out;

    const lastCol = sheet.getLastColumn();
    const hasQuestCol = lastCol >= 8; // H열이 있으면 퀘스트 저장까지 지원

    const width = hasQuestCol ? 8 : 7;
    const values = sheet.getRange(2, 1, lastRow - 1, width).getValues();

    for (const r of values) {
        const acc = String(r[0] || '').trim();
        if (acc !== email) continue;

        const timestamp = r[1];                 // B
        const studentId = String(r[2] || '');   // C
        const studentName = String(r[3] || ''); // D
        const docLink = String(r[4] || '');     // E
        const checked = r[5] === true;          // F
        const stage = String(r[6] || '').trim();// G
        const questTitle = hasQuestCol ? String(r[7] || '') : ''; // H optional

        if (!stage) continue;

        out.map[stage] = {
            submitted_at: timestamp ? String(timestamp) : '',
            student_id: studentId,
            student_name: studentName,
            doc_link: docLink,
            quest_title: questTitle,
            checked: checked
        };
    }

    return out;
}

/** (선택) 모달 열 때 서버에서 최신값 다시 가져오기 */
function getSubmissionForStage(stageCode) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) return { ok: false, message: 'Sheet not found' };

    const email = getMyEmail_();
    if (!email) return { ok: false, message: 'Email unavailable' };

    const row = findRowByAccountAndStage_(sheet, email, normalizeStage_(stageCode));
    if (row === -1) return { ok: true, found: false, email };

    const lastCol = sheet.getLastColumn();
    const hasQuestCol = lastCol >= 8;

    return {
        ok: true,
        found: true,
        email,
        data: {
            student_id: String(sheet.getRange(row, 3).getValue() || ''),
            student_name: String(sheet.getRange(row, 4).getValue() || ''),
            doc_link: String(sheet.getRange(row, 5).getValue() || ''),
            checked: sheet.getRange(row, 6).getValue() === true,
            stage: String(sheet.getRange(row, 7).getValue() || '').trim(),
            quest_title: hasQuestCol ? String(sheet.getRange(row, 8).getValue() || '') : ''
        }
    };
}

function doGet() {
    const WEB_APP_URL = ScriptApp.getService().getUrl();
    const userData = getUserSubmissionsMap_();

    const html = `<!DOCTYPE html>
<html lang="ko">

<head>
  <meta charset="UTF-8" />
  <title>테크웍스 스킬트리</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    :root {
      --bg: #f7f7f7;
      --text: #333;
      --muted: #666;
      --card: #fff;
      --border: #e0e0e0;
      --brand: #3498db;
      --brand-dark: #2980b9;
      --ok: #2ecc71;
      --ok-dark: #27ae60;
      --radius: 14px;
      --shadow-sm: 0 4px 12px rgba(0, 0, 0, .08);
      --shadow-md: 0 8px 18px rgba(0, 0, 0, .15);
      --shadow-lg: 0 15px 40px rgba(0, 0, 0, .35);
    }

    * { box-sizing: border-box; }
    html, body { height: 100%; }

    body {
      font-family: 'Malgun Gothic', '맑은 고딕', system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      padding: 20px;
      line-height: 1.5;
    }

    .body--locked { overflow: hidden; }

    h1 {
      color: #2c3e50;
      border-bottom: 3px solid #2c3e50;
      padding-bottom: 10px;
      margin: 10px 0 20px;
    }

    h2 { color: #34495e; margin: 40px 0 15px; font-size: 1.6em; }

    .quest-container {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      margin-bottom: 40px;
      position: relative;
    }

    .quest-card {
      flex: 1 1 300px;
      min-width: 300px;
      height: 140px;
      max-height: 140px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 10px;
      box-shadow: var(--shadow-sm);
      color: var(--text);
      display: flex;
      align-items: flex-start;
      padding: 15px;
      cursor: pointer;
      transition: transform .25s ease, box-shadow .25s ease;
      position: relative;
      overflow: hidden;
      z-index: 1;
      outline: none;
    }

    .quest-card:hover {
      transform: translateY(-5px);
      box-shadow: var(--shadow-md);
    }

    .quest-card:focus-visible {
      box-shadow: 0 0 0 3px rgba(52, 152, 219, .35), var(--shadow-sm);
    }

    .card-content { flex: 1; padding-left: 8px; width: 100%; position: relative; }

    .card-content h3 { margin: 0 0 6px; font-size: 1.05em; color: var(--brand-dark); }
    .card-content h2 { margin: 0 0 8px; font-size: 1.25em; color: #222; }
    .card-content p { margin: 0; font-size: .95em; color: var(--muted); line-height: 1.45; }

    .hidden-details { display: none; }

    .apps-script-theme { border-left: 6px solid var(--brand); }
    .apps-script-theme h3 { color: var(--brand-dark); }

    .appsheet-theme { border-left: 6px solid var(--ok); }
    .appsheet-theme h3 { color: var(--ok-dark); }

    /* ✅ 메인 카드 상태 배지 */
    .quest-badge {
      position: absolute;
      top: 10px;
      right: 12px;
      padding: 4px 8px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 800;
      border: 1px solid #d1d5db;
      background: #f3f4f6;
      color: #111;
      z-index: 2;
      user-select: none;
    }
    .quest-badge.done { background: #f0fff4; border-color: #86efac; color: #166534; }
    .quest-badge.wait { background: #fff7ed; border-color: #fdba74; color: #9a3412; }
    .quest-badge.none {background: #fff1f2; border-color: #fecdd3; color: #9f1239; }

    /* ===== 모달 ===== */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, .45);
      backdrop-filter: blur(2px);
      z-index: 1000;
      opacity: 0;
      pointer-events: none;
      transition: opacity .15s ease-out;
    }
    .modal-backdrop.open { opacity: 1; pointer-events: auto; }

    .modal {
      position: fixed;
      inset: 50% auto auto 50%;
      transform: translate(-50%, -50%) scale(.98);
      width: min(880px, 90vw);
      max-height: min(95vh, 1000px);
      background: var(--card);
      border-radius: var(--radius);
      border: 3px solid var(--brand);
      box-shadow: var(--shadow-lg);
      z-index: 1001;
      opacity: 0;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transition: opacity .15s ease-out, transform .18s ease-out;
    }
    .modal.open {
      opacity: 1;
      pointer-events: auto;
      transform: translate(-50%, -50%) scale(1);
    }

    .modal-header {
      padding: 14px 20px;
      border-bottom: 1px solid #eee;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .modal-title { font-size: 1.1em; font-weight: 600; color: #222; margin: 0; }
    .modal-step { font-size: .9em; color: var(--brand-dark); font-weight: 600; }
    .modal-body { padding: 18px 22px 24px; overflow-y: auto; }

    .modal-close {
      background: transparent;
      border: none;
      font-size: 22px;
      line-height: 1;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 10px;
      color: #555;
    }
    .modal-close:hover { background: #f2f2f2; }
    .modal-close:focus-visible { outline: 3px solid rgba(52, 152, 219, .35); }

    .modal-body .hidden-details {
      display: block;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #ccc;
    }

    .modal-body .hidden-details strong {
      display: block;
      margin-bottom: 8px;
      font-size: 1.05em;
      color: #e74c3c;
    }

    .modal-body .hidden-details a {
      display: inline-block;
      color: var(--brand);
      margin-top: 6px;
      text-decoration: underline;
    }

    .deployment-info-section {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #ccc;
    }

    nav.toc { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px }
    .toc p {
      background: #e5e7eb;
      padding: 6px 10px;
      border-radius: 8px;
      color: #111;
      text-decoration: none;
      font-size: 13px;
      border: 1px solid #d1d5db;
      transition: 0.2s;
    }
    .toc p:hover { background: #d1d5db; }

    @media (max-width:480px) {
      .quest-card { min-width: 100%; height: auto; max-height: none; }
      .card-content h2 { font-size: 1.15em; }
      .modal { width: 94vw; }
      .modal-body { padding: 16px 16px 22px; }
    }

    .quest-card apps-script-theme {

    }
  </style>
</head>

<body>
  <h1>TechWorks 스킬트리</h1>

  <h2>Google Sites & Apps Script 퀘스트</h2>
  <div class="quest-container">

    <div class="quest-card apps-script-theme" data-quest-id="as-1" role="button" tabindex="0">
      <div class="card-content">
        <h3>1단계</h3>
        <h2>웹 초급</h2>
        <p>Google Sites로 <strong>자기소개, 개발 아이디어 </strong>웹 사이트 만들기</p>
        <div class="hidden-details">
          <strong>이 퀘스트를 클리어하려면:</strong>
          1) 자기소개, 개발 아이디어<br>
          2) 최소 2개 이상의 타입이 다른 삽입 요소<br>
          3) 최소 2개 이상의 타입이 다른 페이지<br>
          4) 사이트 테마 변경<br>
          5) 사이트 로고, 파비콘 설정
          <br><br>
          <a href="https://sites.google.com/saerom.hs.kr/tech-works1-1" target="_blank" rel="noopener">
            예시 사이트 보기
          </a>
          <div class="deployment-info-section">
            <strong>참고)</strong>
            <a href="https://sites.google.com/saerom.hs.kr/techworks/%ED%8A%9C%ED%86%A0%EB%A6%AC%EC%96%BC/google_sites">Google Sites 튜토리얼</a>
            <nav class="toc" aria-label="quick links">
              <p>삽입</p>
              <p>페이지</p>
              <p>테마</p>
              <p>미리보기</p>
              <p>링크</p>
              <p>설정</p>
              <p>게시</p>
            </nav>
            <a href="https://sites.google.com/saerom.hs.kr/techworks/%ED%8A%9C%ED%86%A0%EB%A6%AC%EC%96%BC/google_docs">Google Docs 튜토리얼</a>
            <nav class="toc" aria-label="quick links">
              <p>프로젝트 문서</p>
            </nav>
          </div>
        </div>
      </div>
    </div>

    <div class="quest-card apps-script-theme" data-quest-id="as-2" role="button" tabindex="0">
      <div class="card-content">
        <h3>2단계</h3>
        <h2>웹 중급</h2>
        <p>Google Apps Script로 <strong>메일 알림 기능 </strong>만들기</p>
        <div class="hidden-details">
          <strong>이 퀘스트를 클리어하려면:</strong>
          1) 사용자 gmail<br>
          2) 읽지 않은 메일 수<br>
          3) 최근 메일 제목
          <br><br>
          <a href="https://script.google.com/macros/s/AKfycbyq37k80LC2tByk-GlUD4T6LsI0a3nhOTTHwgmMuWppy0ThiNPRqVA-0LqcN_-6WF9z/exec"
            target="_blank" rel="noopener">
            예시 메일 알림 기능 보기
          </a>
          <div class="deployment-info-section">
            <strong>참고)</strong>
            <a href="https://sites.google.com/saerom.hs.kr/techworks/%ED%8A%9C%ED%86%A0%EB%A6%AC%EC%96%BC/google_apps_script">Google Apps Script 튜토리얼</a>
            <nav class="toc" aria-label="quick links">
              <p>파일</p>
              <p>서비스</p>
              <p>배포</p>
            </nav>
            <a href="https://sites.google.com/saerom.hs.kr/techworks/%ED%8A%9C%ED%86%A0%EB%A6%AC%EC%96%BC/google_docs">Google Docs 튜토리얼</a>
            <nav class="toc" aria-label="quick links">
              <p>프로젝트 문서</p>
            </nav>
          </div>
        </div>
      </div>
    </div>

    <div class="quest-card apps-script-theme" data-quest-id="as-3" role="button" tabindex="0">
      <div class="card-content">
        <h3>3단계</h3>
        <h2>웹 고급</h2>
        <p>Google Sites, Google Apps Script로 <strong>메모 기능 </strong>만들기</p>
        <div class="hidden-details">
          <strong>이 퀘스트를 클리어하려면:</strong>
          1) Google Sites, Google Apps Scirpt 모두 사용<br>
          2) Google sheets 또는 Google Docs, Local Storage 모두 사용
          <br><br>
          <a href="https://script.google.com/macros/s/AKfycbxBxDX-yksJoxQXboJMF0d_Bv4GC76q-XyLbI9UBCTZ0UxBYBfgA6Hoo1TXeWStYn0xrg/exec"
            target="_blank" rel="noopener">
            예시 Local Storage 기반 메모 기능 보기
          </a>
          <br>
          <a href="https://script.google.com/macros/s/AKfycbzjyYDQD_rX035i0WBsBBkj0srT48Ud1GTyphf__VJw-JSM9Eq3bogTycRkMgShgoKN/exec"
            target="_blank" rel="noopener">
            예시 Google Sheets 기반 메모 기능 보기
          </a>
          <div class="deployment-info-section">
            <strong>참고)</strong>
            <a href="https://sites.google.com/saerom.hs.kr/techworks/%ED%8A%9C%ED%86%A0%EB%A6%AC%EC%96%BC/google_sheets">Google Sheets 튜토리얼</a> 또는 <a href="https://sites.google.com/saerom.hs.kr/techworks/%ED%8A%9C%ED%86%A0%EB%A6%AC%EC%96%BC/google_docs">Google Docs 튜토리얼</a>
            <nav class="toc" aria-label="quick links">
              <p>데이터 베이스</p>
            </nav>
            <a href="https://sites.google.com/saerom.hs.kr/techworks/%ED%8A%9C%ED%86%A0%EB%A6%AC%EC%96%BC/google_docs">Google Docs 튜토리얼</a>
            <nav class="toc" aria-label="quick links">
              <p>프로젝트 문서</p>
            </nav>
          </div>
        </div>
      </div>
    </div>

  </div>

  <h2>AppSheet 퀘스트</h2>
  <div class="quest-container">

    <div class="quest-card appsheet-theme" data-quest-id="ap-1" role="button" tabindex="0">
      <div class="card-content">
        <h3>1단계</h3>
        <h2>앱 초급</h2>
        <p>Google AppSheet로 <strong>게시판 </strong>앱 만들기</p>
        <div class="hidden-details">
          <strong>이 퀘스트를 클리어하려면:</strong>
          1) 사용자, 제목, 내용 작성
          <br><br>
          <a href="https://www.appsheet.com/start/fd946269-fd6f-4c92-9c3d-79d7c1218742" target="_blank" rel="noopener">
            예시 게시판 앱 보기
          </a>
          <div class="deployment-info-section">
            <strong>참고)</strong>
            <a href="https://sites.google.com/saerom.hs.kr/techworks/%ED%8A%9C%ED%86%A0%EB%A6%AC%EC%96%BC/google_appsheet">Google AppSheet 튜토리얼</a>
            <nav class="toc" aria-label="quick links">
              <p>Data</p>
              <p>Views</p>
            </nav>
            <a href="https://sites.google.com/saerom.hs.kr/techworks/%ED%8A%9C%ED%86%A0%EB%A6%AC%EC%96%BC/google_docs">Google Docs 튜토리얼</a>
            <nav class="toc" aria-label="quick links">
              <p>프로젝트 문서</p>
            </nav>
          </div>
        </div>
      </div>
    </div>

    <div class="quest-card appsheet-theme" data-quest-id="ap-2" role="button" tabindex="0">
      <div class="card-content">
        <h3>2단계</h3>
        <h2>앱 중급</h2>
        <p>Google AppSheet에 <strong>함수 </strong>추가하기</p>
        <div class="hidden-details">
          <strong>이 퀘스트를 클리어하려면:</strong>
          1)최소 2개 이상의 타입이 다른 Views<br>
          2)mail 자동 작성<br>
          3)Show if 사용<br>
          4)Action 사용<br>
          5)Security 사용
          <br><br>
          <a href="https://www.appsheet.com/start/f4595b40-2701-4c5a-998e-5af4193d9ea9" target="_blank" rel="noopener">
            예시 함수 적용 앱 보기
          </a>
          <div class="deployment-info-section">
            <strong>참고)</strong>
            <a href="https://sites.google.com/saerom.hs.kr/techworks/%ED%8A%9C%ED%86%A0%EB%A6%AC%EC%96%BC/google_appsheet">Google AppSheet 튜토리얼</a>
            <nav class="toc" aria-label="quick links">
              <p>Data</p>
              <p>Views</p>
              <p>Actions</p>
              <p>Security</p>
            </nav>
            <a href="https://sites.google.com/saerom.hs.kr/techworks/%ED%8A%9C%ED%86%A0%EB%A6%AC%EC%96%BC/google_docs">Google Docs 튜토리얼</a>
            <nav class="toc" aria-label="quick links">
              <p>프로젝트 문서</p>
            </nav>
          </div>
        </div>
      </div>
    </div>

    <div class="quest-card appsheet-theme" data-quest-id="ap-3" role="button" tabindex="0">
      <div class="card-content">
        <h3>3단계</h3>
        <h2>앱 고급</h2>
        <p><strong>여러 플랫폼</strong>으로 나만의 서비스 만들기</p>
        <div class="hidden-details">
          <strong>이 퀘스트를 클리어하려면:</strong>
          1) Google Sites 또는 Google Apps Script, Google AppSheet 사용<br>
          2) Google Sheets 또는 Google Docs 사용
          <br><br>
          <a href="https://www.appsheet.com/start/3fa70c06-fbc2-4590-b5df-7a0d484189f8" target="_blank" rel="noopener">
            예시 앱 보기
          </a>
          <br>
          <a href="https://script.google.com/macros/s/AKfycbyNgkLrk2Mq4UgAsZrJL_n5mxfppJ-tBDZUsUP5W4x3O5zQgpKbfct9gGy0WPuJecLcGQ/exec"
            target="_blank" rel="noopener">
            예시 웹 보기
          </a>
          <div class="deployment-info-section">
            <strong>참고)</strong>
            <a href="https://sites.google.com/saerom.hs.kr/techworks/%ED%8A%9C%ED%86%A0%EB%A6%AC%EC%96%BC/google_docs">Google Docs 튜토리얼</a>
            <nav class="toc" aria-label="quick links">
              <p>프로젝트 문서</p>
            </nav>
          </div>
        </div>
      </div>
    </div>

  </div>

  <div class="modal-backdrop" id="modal-backdrop" aria-hidden="true"></div>
  <div class="modal" id="quest-modal" role="dialog" aria-modal="true" aria-hidden="true">
    <div class="modal-header">
      <div>
        <div class="modal-step" id="modal-step"></div>
        <h3 class="modal-title" id="modal-title"></h3>
        <div id="modal-check-status" style="margin-top:6px; font-weight:700;"></div>
      </div>
      <button class="modal-close" type="button" id="modal-close" aria-label="닫기">×</button>
    </div>
    <div class="modal-body" id="modal-body"></div>
  </div>

  <div class="submission-form" id="submission-form"
    style="display:none; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ccc;">
    <h4>퀘스트 제출하기</h4>

    <div id="check-line"
      style="display:none; margin-bottom: 10px; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-weight: 700;">
    </div>

    <form id="quest-submission-form" method="POST" action="${WEB_APP_URL}" target="submit_iframe">
      <input type="hidden" id="stage_code" name="stage_code" value="">
      <input type="hidden" id="quest_title" name="quest_title" value="">

      <div style="margin-bottom: 10px;">
        <label for="student_id" style="display: block; font-weight: 600; margin-bottom: 5px;">학번 (필수):</label>
        <input type="text" id="student_id" name="student_id" required
          style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
      </div>
      <div style="margin-bottom: 10px;">
        <label for="student_name" style="display: block; font-weight: 600; margin-bottom: 5px;">이름 (필수):</label>
        <input type="text" id="student_name" name="student_name" required
          style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
      </div>
      <div style="margin-bottom: 15px;">
        <label for="doc_link" style="display: block; font-weight: 600; margin-bottom: 5px;">제출 문서 링크 (필수):</label>
        <input type="url" id="doc_link" name="doc_link" required placeholder="https://docs.google.com/document/d/..."
          style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
      </div>

      <button type="submit" id="submitBtn"
        style="width: 100%; padding: 10px; background-color: var(--brand); color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; transition: background-color .2s;">
        제출 완료
      </button>
    </form>

    <iframe name="submit_iframe" id="submit_iframe" style="display:none;"></iframe>
  </div>

  <script>
    const USER_DB_MAP = ${JSON.stringify(userData.map || {})};
    const draftsByStage = Object.assign({}, USER_DB_MAP);
    let currentStage = null;

    function computeStageCodeFromQuestId(questId) {
      const parts = (questId || '').split('-');
      const type = parts[0];
      const num = parts[1] || '';
      if (type === 'as') return '1~' + num;
      if (type === 'ap') return '2~' + num;
      return '0~0';
    }

    function setFormValues(data) {
      document.getElementById('student_id').value = data?.student_id || '';
      document.getElementById('student_name').value = data?.student_name || '';
      document.getElementById('doc_link').value = data?.doc_link || '';
    }

    function readFormValues() {
      return {
        student_id: document.getElementById('student_id')?.value || '',
        student_name: document.getElementById('student_name')?.value || '',
        doc_link: document.getElementById('doc_link')?.value || ''
      };
    }

    function resetSubmitButton() {
      const submitBtn = document.getElementById('submitBtn');
      submitBtn.disabled = false;
      submitBtn.textContent = '제출 완료';
      submitBtn.style.backgroundColor = 'var(--brand)';
    }

    function setCheckUI(stageCode) {
      const checkLine = document.getElementById('check-line');
      const modalCheck = document.getElementById('modal-check-status');

      if (!checkLine || !modalCheck) return;

      const mine = draftsByStage[stageCode];

      if (!mine) {
        checkLine.style.display = 'block';
        checkLine.textContent = '아직 제출 기록이 없습니다. 작성 후 제출해 주세요.';
        checkLine.style.background = '#f3f4f6';
        checkLine.style.color = '#9f1239';

        modalCheck.textContent = '❌미제출';
        modalCheck.style.color = '#9f1239';
        return;
      }

      const checked = (mine.checked === true);

      checkLine.style.display = 'block';
      if (checked) {
        checkLine.textContent = '관리자 확인 완료: 이 과제는 완료 처리되었습니다.';
        checkLine.style.background = '#f8fffb';
        checkLine.style.color = '#1f7a3b';

        modalCheck.textContent = '✅ 완료(관리자 체크됨)';
        modalCheck.style.color = '#1f7a3b';
      } else {
        checkLine.textContent = '관리자 확인 대기: 제출은 저장되었고, 체크되면 완료로 표시됩니다.';
        checkLine.style.background = '#fffaf0';
        checkLine.style.color = '#8a5a00';

        modalCheck.textContent = '⏳ 대기(관리자 체크 전)';
        modalCheck.style.color = '#8a5a00';
      }
    }

    // ✅ 메인 배지: 완료/대기/미제출 다 표시
    function applyBadgesAndTitles() {
      document.querySelectorAll('.quest-card').forEach(card => {
        const questId = card.dataset.questId || '';
        const stage = computeStageCodeFromQuestId(questId);

        const oldBadge = card.querySelector('.quest-badge');
        if (oldBadge) oldBadge.remove();

        const mine = draftsByStage[stage];

        let status = 'none';
        let badgeText = '❌ 미제출';

        if (mine) {
          const checked = (mine.checked === true);
          status = checked ? 'done' : 'wait';
          badgeText = checked ? '✅ 완료' : '⏳ 대기';
        }

        // 제목 옆 (완료된 과제)는 완료일 때만
        const titleEl = card.querySelector('.card-content h2');
        if (titleEl) {
          const base = titleEl.textContent.replace(' (완료된 과제)', '');
          if (mine && mine.checked === true) titleEl.textContent = base + ' (완료된 과제)';
          else titleEl.textContent = base;
        }

        const badge = document.createElement('div');
        badge.className = 'quest-badge ' + status;
        badge.textContent = badgeText;
        card.appendChild(badge);
      });
    }

    function refreshStageFromServer(stageCode) {
      if (!window.google || !google.script || !google.script.run) return;

      google.script.run
        .withSuccessHandler((res) => {
          if (!res || !res.ok) return;

          if (res.found && res.data) {
            draftsByStage[stageCode] = {
              student_id: res.data.student_id || '',
              student_name: res.data.student_name || '',
              doc_link: res.data.doc_link || '',
              checked: res.data.checked === true
            };

            if (currentStage === stageCode) {
              setFormValues(draftsByStage[stageCode]);
              setCheckUI(stageCode);
            }
          }

          applyBadgesAndTitles();
        })
        .getSubmissionForStage(stageCode);
    }

    document.addEventListener('DOMContentLoaded', () => {
      const cards = [...document.querySelectorAll('.quest-card')];
      const backdrop = document.getElementById('modal-backdrop');
      const modal = document.getElementById('quest-modal');
      const modalStep = document.getElementById('modal-step');
      const modalTitle = document.getElementById('modal-title');
      const modalBody = document.getElementById('modal-body');
      const modalClose = document.getElementById('modal-close');

      const submissionFormContainer = document.getElementById('submission-form');
      const form = document.getElementById('quest-submission-form');
      const submitBtn = document.getElementById('submitBtn');
      const iframe = document.getElementById('submit_iframe');

      const stageInput = document.getElementById('stage_code');
      const titleInput = document.getElementById('quest_title');

      let lastFocused = null;
      let submitting = false;
      let iframeReady = false;
      let submitTimeoutId = null;

      ['student_id', 'student_name', 'doc_link'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', () => {
          if (!currentStage) return;
          const prevChecked = !!(draftsByStage[currentStage] && draftsByStage[currentStage].checked === true);
          draftsByStage[currentStage] = Object.assign(readFormValues(), { checked: prevChecked });
        });
      });

      function openModalFromCard(card) {
        lastFocused = document.activeElement;

        const questId = card.dataset.questId || '';
        currentStage = computeStageCodeFromQuestId(questId);

        const content = card.querySelector('.card-content');
        const stepText = content.querySelector('h3')?.textContent || '';
        const titleText = content.querySelector('h2')?.textContent || '';

        modalStep.textContent = stepText;
        modalTitle.textContent = titleText;

        stageInput.value = currentStage;
        titleInput.value = titleText;

        const cloned = content.cloneNode(true);
        const cH3 = cloned.querySelector('h3'); if (cH3) cH3.remove();
        const cH2 = cloned.querySelector('h2'); if (cH2) cH2.remove();

        modalBody.innerHTML = '';
        modalBody.appendChild(cloned);

        submissionFormContainer.style.display = 'block';
        modalBody.appendChild(submissionFormContainer);

        setFormValues(draftsByStage[currentStage] || null);
        setCheckUI(currentStage);

        refreshStageFromServer(currentStage);

        resetSubmitButton();

        backdrop.classList.add('open');
        modal.classList.add('open');
        backdrop.setAttribute('aria-hidden', 'false');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('body--locked');

        modalClose.focus();
      }

      function closeModal() {
        backdrop.classList.remove('open');
        modal.classList.remove('open');
        backdrop.setAttribute('aria-hidden', 'true');
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('body--locked');

        if (submissionFormContainer && modalBody.contains(submissionFormContainer)) {
          document.body.appendChild(submissionFormContainer);
          submissionFormContainer.style.display = 'none';
        }

        if (lastFocused && typeof lastFocused.focus === 'function') {
          lastFocused.focus();
        }
      }

      form.addEventListener('submit', () => {
        submitting = true;

        if (currentStage) {
          const prevChecked = !!(draftsByStage[currentStage] && draftsByStage[currentStage].checked === true);
          draftsByStage[currentStage] = Object.assign(readFormValues(), { checked: prevChecked });
        }

        submitBtn.disabled = true;
        submitBtn.textContent = '제출 중...';
        submitBtn.style.backgroundColor = '#f39c12';

        clearTimeout(submitTimeoutId);
        submitTimeoutId = setTimeout(() => {
          if (!submitting) return;
          submitting = false;
          alert('제출 응답이 없습니다. 배포 권한/네트워크를 확인해 주세요.');
          resetSubmitButton();
        }, 8000);
      });

      iframe.addEventListener('load', () => {
        if (!iframeReady) { iframeReady = true; return; }
        if (!submitting) return;

        submitting = false;
        clearTimeout(submitTimeoutId);

        const msg = document.createElement('div');
        msg.innerHTML = '제출이 성공적으로 완료되었습니다! 확인해 주셔서 감사합니다.';
        msg.style.marginTop = '14px';
        msg.style.padding = '10px';
        msg.style.border = '1px solid #ddd';
        msg.style.borderRadius = '8px';
        msg.style.background = '#f8fffb';
        msg.style.color = '#1f7a3b';
        msg.style.fontWeight = '600';
        submissionFormContainer.appendChild(msg);

        resetSubmitButton();

        if (currentStage) refreshStageFromServer(currentStage);

        setTimeout(() => {
          if (msg && msg.parentNode) msg.parentNode.removeChild(msg);
        }, 1500);
      });

      cards.forEach(card => {
        card.addEventListener('click', (e) => {
          const link = e.target.closest('a');
          if (link) return;
          openModalFromCard(card);
        });

        card.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openModalFromCard(card);
          }
        });
      });

      modalClose.addEventListener('click', closeModal);
      backdrop.addEventListener('click', closeModal);

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('open')) {
          e.preventDefault();
          closeModal();
        }
      });

      // ✅ 최초 로드시 메인 배지 표시(미제출 포함)
      applyBadgesAndTitles();
    });
  </script>
</body>

</html>`;

    return HtmlService.createHtmlOutput(html)
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) return HtmlService.createHtmlOutput('<html><body>OK</body></html>');

    const email = getMyEmail_();
    const timestamp = new Date();

    const studentId = String((e.parameter.student_id || '')).trim();
    const studentName = String((e.parameter.student_name || '')).trim();
    const docLink = String((e.parameter.doc_link || '')).trim();
    const stageCode = normalizeStage_(e.parameter.stage_code);
    const questTitle = String((e.parameter.quest_title || '')).trim();

    if (!email || !studentId || !studentName || !docLink || !stageCode) {
        return HtmlService.createHtmlOutput('<html><body>OK</body></html>');
    }

    const lastCol = sheet.getLastColumn();
    const hasQuestCol = lastCol >= 8;

    const targetRow = findRowByAccountAndStage_(sheet, email, stageCode);

    if (targetRow !== -1) {
        // ✅ 수정: 체크(F)는 절대 변경하지 않음
        sheet.getRange(targetRow, 1).setValue(email);
        sheet.getRange(targetRow, 2).setValue(timestamp);
        sheet.getRange(targetRow, 3).setValue(studentId);
        sheet.getRange(targetRow, 4).setValue(studentName);
        sheet.getRange(targetRow, 5).setValue(docLink);

        sheet.getRange(targetRow, 7).setNumberFormat('@').setValue(stageCode);
        if (hasQuestCol) sheet.getRange(targetRow, 8).setValue(questTitle);

        const fCell = sheet.getRange(targetRow, 6);
        const fVal = fCell.getValue();
        fCell.insertCheckboxes();
        if (fVal === '' || fVal === null) fCell.setValue(false);

    } else {
        const nextRow = Math.max(sheet.getLastRow() + 1, 2);

        sheet.getRange(nextRow, 1).setValue(email);
        sheet.getRange(nextRow, 2).setValue(timestamp);
        sheet.getRange(nextRow, 3).setValue(studentId);
        sheet.getRange(nextRow, 4).setValue(studentName);
        sheet.getRange(nextRow, 5).setValue(docLink);

        sheet.getRange(nextRow, 6).insertCheckboxes().setValue(false);
        sheet.getRange(nextRow, 7).setNumberFormat('@').setValue(stageCode);
        if (hasQuestCol) sheet.getRange(nextRow, 8).setValue(questTitle);
    }

    return HtmlService.createHtmlOutput('<html><body>OK</body></html>');
}
