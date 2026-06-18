const TEMPLATE_DOC_ID = '1eIir-6VyLoqltTTUSHW3WJRVStCXTWsJS6lS9-vwI7o';

function doGet() {
    // 1. 사용자 정보 가져오기
    var userData = getUserInfo();

    // ✅ [추가] 멤버 시트에서 Lv별 C열 정보 모으기 (모달 리본용)
    var levelInfo = { "Lv1": [], "Lv2": [], "Lv3": [], "Lv4": [], "Lv5": [] };

    try {
        var SPREADSHEET_ID = "1z29-kPqwNgFiee5gI9t3_iUO8yG0-CzmKizf1FcA35Q";
        var memberSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('멤버');
        if (memberSheet) {
            var values = memberSheet.getDataRange().getValues();
            // 0행은 헤더라고 가정하고 1행부터
            for (var i = 1; i < values.length; i++) {
                var lv = values[i][1];    // B열: Lv
                var info = values[i][2];  // C열
                if (levelInfo[lv] && info) {
                    // ✅ 셀 안의 줄바꿈/연속 공백 제거 (1명마다 줄바꿈 되는 현상 방지)
                    var cleaned = String(info).replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim();
                    if (cleaned) levelInfo[lv].push(cleaned);
                }
            }
        }
    } catch (e) {
        Logger.log("멤버 시트 읽기 오류: " + e.message);
    }

    var lv1Text = levelInfo["Lv1"].join(" • ");
    var lv2Text = levelInfo["Lv2"].join(" • ");
    var lv3Text = levelInfo["Lv3"].join(" • ");
    var lv4Text = levelInfo["Lv4"].join(" • ");
    var lv5Text = levelInfo["Lv5"].join(" • ");

    // 2. 변수 초기화
    var userImgTag = '<img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png">';
    var userLv = "Guest";
    var userRole = "방문자";
    var userName = "로그인 필요";
    var userDesc1 = "로그인이 필요합니다.";
    var userDesc2 = "활동 내역이 없습니다.";

    if (userData) {
        userLv = userData.lv;
        userRole = userData.role;
        userName = userData.name;

        if (userData.desc1) userDesc1 = userData.desc1;
        if (userData.desc2) userDesc2 = userData.desc2;

        if (userData.img) {
            var tempMatch = userData.img.match(/src='([^']*)'/);
            if (tempMatch) {
                userImgTag = '<img src="' + tempMatch[1] + '">';
            }
        }
    }

    // 3. HTML 생성
    var html = `
   <!DOCTYPE html>
   <html lang="ko">
   <head>
   <base target="_top">
   <script type="text/javascript" src="https://www.gstatic.com/charts/loader.js"></script>
   <style>
     @import url('https://fonts.googleapis.com/css2?family=Pretendard:wght@300;500;700&display=swap');

     body {
        margin: 0;
        font-family: 'Pretendard', sans-serif;
        background-color: #f3f3f3;
        user-select: none;
        overflow-y: auto;
        overflow-x: hidden;
      }

     /* =========================================
        [1] 메인 명찰 및 우측 펼침 띠 스타일
     ========================================= */
     .badge-wrapper {
       position: fixed; top: 40px; left: 50px;
       display: flex;
       align-items: flex-start;
       z-index: 10;
     }

     .profile-badge {
       display: flex; flex-direction: column; justify-content: center; align-items: center;
       text-decoration: none;
       background: rgba(255, 255, 255, 0.75);
       backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
       border: 1px solid rgba(255, 255, 255, 0.6);
       border-radius: 20px;
       min-width: 180px; padding: 25px 30px;
       box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
       transition: all 0.3s ease;
       cursor: pointer;
       z-index: 20;
     }

     .profile-badge:hover {
        transform: translateY(-5px);
        background: rgba(255, 255, 255, 0.85);
        box-shadow: 0 12px 40px 0 rgba(31, 38, 135, 0.25);
      }

     .profile-img-wrapper {
       width: 60px; height: 60px; border-radius: 50%; overflow: hidden;
       border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.1);
       margin-bottom: 12px; background-color: #eee;
       display: flex; justify-content: center; align-items: center;
     }
     .profile-img-wrapper img { width: 100%; height: 100%; object-fit: cover; }

     .badge-info { display: flex; gap: 8px; margin-bottom: 8px; }
     .tag { font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 12px; letter-spacing: 0.5px; }
     .tag-lv { background-color: #e3f2fd; color: #1565c0; }
     .tag-role { background-color: #fff3e0; color: #e65100; }
     .user-name { font-size: 20px; font-weight: 700; color: #333; letter-spacing: -0.5px; }
     .click-hint { font-size: 11px; color: #888; margin-top: 15px; font-weight: 400; }

     .ribbon-container {
       display: flex;
       flex-direction: column;
       gap: 8px;
       margin-left: -25px;
       padding-top: 5px;
       z-index: 10;
     }

     .side-ribbon {
       height: 36px;
       display: flex; align-items: center;
       padding-left: 35px; padding-right: 25px;
       clip-path: polygon(0% 0%, 100% 0%, calc(100% - 15px) 50%, 100% 100%, 0% 100%);
       font-weight: bold; color: #555; white-space: nowrap;
       filter: drop-shadow(3px 3px 5px rgba(0,0,0,0.15));
       width: fit-content; max-width: 0; opacity: 0;
       transition: all 0.5s cubic-bezier(0.25, 1, 0.5, 1);
     }

     .profile-badge:hover + .ribbon-container .side-ribbon.sr-1 {
        max-width: 500px;
        height: 40px;
        opacity: 1;
      }
      .profile-badge:hover + .ribbon-container .side-ribbon.sr-2 {
        max-width: 500px;
        height: 40px;
        opacity: 1;
      }
      .profile-badge:hover + .ribbon-container .side-ribbon.sr-3 {
        max-width: 800px;
        height: 110px;
        opacity: 1;
      }

     .side-ribbon:nth-child(1) { transition-delay: 0s; }
     .side-ribbon:nth-child(2) { transition-delay: 0.1s; }
     .side-ribbon:nth-child(3) { transition-delay: 0.2s; }

     .sr-1 { background: #ffebee; font-size: 15px; }
     .sr-2 { background: #e0f7fa; font-size: 15px; }
     .sr-3 { background: #fffde7; font-size: 15px; white-space: pre-line; line-height: 1.4; }

     /* =========================================
        [2] 우측 아이콘 버튼
     ========================================= */
     .button-container {
       position: absolute;
       top: 40px;
       right: 20px;
       display: grid;
       grid-template-columns: repeat(auto-fill, 95px);
       grid-auto-rows: auto;
       grid-column-gap: 20px;
       grid-row-gap: 20px;
       justify-content: center;
       z-index: 5;
       padding: 20px;
       width: 900px;
       border-radius: 20px;
       background-color: rgba(35, 15, 15, 0.2);
     }

     .menu-item {
       background-color: #fff;
       border-radius: 16px;
       height: 95px;
       width: 95px;
       box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
       position: relative;
       transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
       cursor: pointer;
       display: block;
       text-decoration: none;
     }

     .menu-item:hover {
       transform: scale(1.05);
       z-index: 10;
     }

     .menu-item img {
       position: absolute;
       top: 50%;
       left: 50%;
       transform: translate(-50%, -50%);
       width: 55px;
       height: 55px;
       pointer-events: none;
     }

     /* =========================================
        [3] 모달 및 피라미드 스타일
     ========================================= */
     #modal-overlay {
       display: none; position: fixed; top: 0; left: 0;
       width: 100%; height: 100%;
       background-color: rgba(0, 0, 0, 0.85); backdrop-filter: blur(5px);
       z-index: 10000; justify-content: center; align-items: center;
       opacity: 0; transition: opacity 0.3s ease;
     }
     #modal-overlay.active { display: flex; opacity: 1; }

     .pyramid-scale-wrapper { transform: scale(1.1); pointer-events: auto; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; }
     .pyramid-row { position: relative; display: flex; justify-content: center; align-items: center; width: 100%; margin-bottom: 2px; }

     .ribbon {
       position: absolute;
       top: 50%;
       transform: translateY(-50%);

       /* ✅ 핵심: width를 0으로 두지 말 것 */
       width: auto;              /* 또는 fit-content */
       max-width: 0;             /* 여기로 접었다가 */
       opacity: 0;

       overflow: hidden;
       border-radius: 0 20px 20px 0;
       display: flex;
       align-items: center;

       padding-left: 40px;
       padding-right: 0;

       font-size: 13px;
       font-weight: 700;
       color: #444;

       box-shadow: 3px 3px 10px rgba(0,0,0,0.2);
       z-index: 1;               /* ✅ -1이면 환경에 따라 이상해질 때가 있어서 1로 권장 */

       min-height: 36px;
       height: auto;

       transition: max-width 0.4s cubic-bezier(0.25, 1, 0.5, 1),
                   opacity 0.2s ease,
                   padding-right 0.2s ease;
     }

     .ribbon span {
       white-space: nowrap !important;  /* ✅ 자동 줄바꿈 금지 */
       display: inline-block;
       line-height: 1.35;
       padding: 8px 0;
     }

     .sun:hover + .ribbon,
     .sun + .ribbon:hover,

     /* 피라미드 각 층: layer 다음 형제 리본 */
     .layer:hover + .ribbon,
     .layer + .ribbon:hover {
       max-width: 90vw;     /* 원하는 만큼(예: 800px)으로 바꿔도 됨 */
       opacity: 1;
       padding-right: 15px;
       overflow-x: auto;
       overflow-y: hidden;
     }

     .sun, .layer { cursor: pointer; transition: transform 0.2s; position: relative; z-index: 2; }
     .sun:hover,
     .layer:hover {
       transform: scale(1.05);
     }
     .ribbon-sun { left: 50%; margin-left: 35px; background: #e1f5fe; border: 1px solid #b3e5fc; }
     .ribbon-1 { left: 50%; margin-left: 10px; background: #ffebee; border: 1px solid #ffcdd2; }
     .ribbon-2 { left: 50%; margin-left: 60px; background: #e0f7fa; border: 1px solid #b2ebf2; }
     .ribbon-3 { left: 50%; margin-left: 97px; background: #fffde7; border: 1px solid #fff9c4; }
     .ribbon-4 { left: 50%; margin-left: 135px; background: #f5f5f5; border: 1px solid #e0e0e0; }
     .sun { width: 100px; height: 100px; border-radius: 50%; margin-bottom: 10px; background: radial-gradient(circle, #ffffff 50%, #26c6ff 100%); border: 2px solid #ffea8c; box-shadow: 0 0 15px rgba(255, 215, 0, 0.5); display: flex; justify-content: center; align-items: center; color: #333; font-weight: bold; font-size: 14px; }
     .pyramid-container { display: flex; flex-direction: column; align-items: center; filter: drop-shadow(0px 0px 2px #000000) drop-shadow(0 10px 10px rgba(0,0,0,0.3)); }
     .layer { height: 50px; display: flex; justify-content: center; align-items: center; color: white; font-weight: bold; font-size: 14px; text-shadow: 0 1px 2px rgba(0,0,0,0.6); white-space: nowrap; }
     .layer-1 { width: 105px; height: 70px; background: linear-gradient(135deg, #f8c6c9 0%, #ffb3b3 40%, #ff0000 100%); clip-path: polygon(50% 0%, 99% 100%, 1% 100%); align-items: flex-end; padding-bottom: 12px; font-size: 12px; }
     .layer-2 { width: 175px; background: radial-gradient(circle, #bdf2ff 0%, #00f2fe 100%); clip-path: polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%); }
     .layer-3 { width: 280px; background: radial-gradient(circle, #f9d423 0%, #b8860b 100%); clip-path: polygon(18% 0%, 82% 0%, 95% 100%, 5% 100%); }
     .layer-4 { width: 335px; background: radial-gradient(circle, #e7e6e5, #aca9a6); clip-path: polygon(12% 0%, 88% 0%, 100% 100%, 0% 100%); }

     /* =========================================
        [4] 레퍼런스 카드 영역
     ========================================= */
     #tool-wrapper {
       width: 900px;
       max-width: 1000px;
       position: absolute;
       top: 300px;
       right: 50px;
       display: flex;
       flex-direction: column;
       gap: 20px;
       justify-content: flex-start;
       align-items: center;
       z-index: 2;
     }

     .hidden { display: none; }

     #toggleFormBtn {
       position: fixed;
       bottom: 20px;
       right: 20px;
       border-radius: 30px;
       padding: 16px 20px;
       background-color: #ffffff;
       color: #333;
       border: 1px solid #ccc;
       box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
       font-size: 16px;
       font-weight: bold;
       cursor: pointer;
       z-index: 1000;
       transition: all 0.3s ease;
     }

     #toggleFormBtn:hover {
       background-color: #f1f1f1;
       border-color: #bbb;
       transform: scale(1.05);
     }

     #postForm {
       position: fixed;
       text-align: center;
       bottom: 80px;
       right: 30px;
       width: 300px;
       max-height: 80vh;
       overflow-y: auto;
       background-color: #fff;
       border-radius: 20px;
       padding: 20px;
       box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
       z-index: 999;
     }

     #postForm select,
     #postForm input {
       width: 280px;
       padding: 10px;
       margin-bottom: 15px;
       border: 1px solid #ddd;
       border-radius: 10px;
       font-size: 16px;
       z-index: 999;
     }

     #postForm button {
       width: 100%;
       padding: 12px;
       background-color: #00a6ff;
       color: white;
       border: none;
       border-radius: 5px;
       cursor: pointer;
       font-weight: bold;
     }

     #postForm button:hover { background-color: #444; }

     #cards {
       width: 100%;
       display: grid;
       grid-template-columns: repeat(2, minmax(0, 1fr));
       grid-auto-rows: auto;
       column-gap: 20px;
       row-gap: 20px;
       align-items: stretch;
     }

     .card {
       width: 100%;
       background: #fff;
       padding: 20px;
       border-radius: 20px;
       box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
       word-wrap: break-word;
       overflow-wrap: break-word;
       display: flex;
       align-items: center;
       justify-content: space-between;
       position: relative;
       box-sizing: border-box;
     }

     .card-actions {
       position: absolute;
       top: 10px;
       right: 10px;
       z-index: 10;
     }

     .card-actions button {
       background: #f0f0f0;
       border: none;
       border-radius: 5px;
       padding: 5px 10px;
       cursor: pointer;
       font-size: 14px;
       color: #555;
       font-weight: 500;
       transition: background 0.2s;
     }

     .card-actions button:hover { background: #e0e0e0; }

     .card-content {
       flex-grow: 1;
       padding-right: 70px;
     }

     .card-content h3 {
       margin: 0;
       font-size: 20px;
       font-weight: bold;
       white-space: nowrap;
       overflow: hidden;
       text-overflow: ellipsis;
     }

     .card-content p {
       margin-top: 8px;
       font-size: 15px;
       color: #555;
       line-height: 1.5;
     }

     .card p {
       white-space: pre-wrap;
       line-height: 1.6;
       font-size: 18px;
       color: #444;
     }

     .progress-wrapper {
       position: absolute;
       right: 20px;
       bottom: 16px;
       display: flex;
       align-items: center;
       gap: 8px;
     }

     .progress-bar-container {
       width: 100px;
       height: 10px;
       background-color: #eee;
       border-radius: 5px;
       overflow: hidden;
       min-width: 100px;
       display: flex;
       align-items: center;
     }

     .progress-bar {
       height: 100%;
       background-color: #4CAF50;
       transition: width 0.5s ease-in-out;
       border-radius: 5px;
     }

     .progress-text {
       font-size: 14px;
       color: #444;
       font-weight: 500;
     }

     #searchInput {
       width: 60%;
       max-width: 500px;
       margin: 0 auto 0px auto;
       padding: 12px 18px;
       border-radius: 12px;
       border: 1px solid #ccc;
       font-size: 16px;
       display: block;
       background-color: rgba(255,255,255,0.95);
     }

     #formOverlay {
       position: fixed;
       inset: 0;
       background: rgba(0, 0, 0, 0.25);
       z-index: 998;
     }

     /* =========================================
        [5] Docs 템플릿 사본 카드 (고정)
     ========================================= */
     .template-copy-wrapper {
       width: 800px;
       max-width: 1000px;
       position: fixed;
       top: 300px;
       left: -510px;
       display: flex;
       justify-content: flex-end;
       z-index: 20;
     }

     .template-card {
       background: #ffffff;
       border-radius: 18px;
       box-shadow: 0 10px 30px rgba(15, 30, 60, 0.12);
       max-width: 240px;
       width: 100%;
       padding: 20px 22px;
       box-sizing: border-box;
       text-align: left;
       display: flex;
       flex-direction: column;
       gap: 5px;
     }

     .template-header { display: flex; align-items: center; gap: 10px; }

     .template-icon {
       width: 40px;
       height: 40px;
       border-radius: 14px;
       background: linear-gradient(135deg, #4285f4, #7ba5ff);
       display: flex;
       align-items: center;
       justify-content: center;
       color: white;
       font-size: 20px;
     }

     .template-title {
       font-size: 16px;
       font-weight: 700;
       color: #111827;
     }

     .template-subtitle {
       font-size: 13px;
       color: #6b7280;
       line-height: 1.4;
     }

     .template-meta {
       font-size: 12px;
       color: #9ca3af;
     }

     .btn-copy-doc {
       display: inline-flex;
       align-items: center;
       justify-content: center;
       gap: 6px;
       padding: 8px 14px;
       border-radius: 999px;
       border: none;
       font-size: 13px;
       font-weight: 600;
       background: #2563eb;
       color: white;
       cursor: pointer;
       box-shadow: 0 6px 15px rgba(37, 99, 235, 0.35);
       transition: transform 0.08s ease, box-shadow 0.08s ease, background 0.15s ease;
       margin-top: 18px;
       align-self: flex-start;
       width: 100%;
     }

     .btn-copy-doc:hover:not(:disabled) {
       transform: translateY(-1px);
       box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4);
       background: #1d4ed8;
     }

     .btn-copy-doc:disabled {
       opacity: 0.7;
       cursor: default;
       box-shadow: none;
     }

     .copy-status {
       font-size: 12px;
       color: #4b5563;
       margin-top: 6px;
       min-height: 5px;
     }

     .copy-status a {
       color: #2563eb;
       text-decoration: none;
       font-weight: 600;
     }

     .copy-status a:hover { text-decoration: underline; }
   </style>
   </head>
   <body>
     <img src="https://raw.githubusercontent.com/minseo6008/dokdo-game/refs/heads/main/images/main/%E1%84%89%E1%85%A2%E1%84%85%E1%85%A9%E1%86%B7%E1%84%80%E1%85%A9.webp"
          style="position:fixed; top:50%; left:50%; transform:translate(-50%, -40%); width:300px; height:300px; filter: blur(2px); z-index: -1;">

     <!-- 명찰 -->
     <div class="badge-wrapper">
       <div class="profile-badge" onclick="openModal()">
          <div class="profile-img-wrapper">${userImgTag}</div>
          <div class="badge-info">
             <span class="tag tag-lv">${userLv}</span>
             <span class="tag tag-role">${userRole}</span>
          </div>
          <div class="user-name">${userName}</div>
          <div class="click-hint">클릭 시 계급도 보기</div>
       </div>

       <div class="ribbon-container">
         <div class="side-ribbon sr-1">${userLv} ${userRole}</div>
         <div class="side-ribbon sr-2">${userDesc1}</div>
         <div class="side-ribbon sr-3">${userDesc2}</div>
       </div>
     </div>

     <!-- 아이콘 그리드 -->
     <div class="button-container">
         <a class="menu-item" href="https://docs.google.com" target="_blank">
             <img src="https://lh3.googleusercontent.com/d/1xzm6Jq7zHyTUXG434rcFIb7JSuRMNSS2" alt="Docs">
         </a>
         <a class="menu-item" href="https://docs.google.com/spreadsheets" target="_blank">
             <img src="https://lh3.googleusercontent.com/d/1Oh6sjOZA8rSRwOamcVbuNlZwdiqN-vGG" alt="Sheets">
         </a>
         <a class="menu-item" href="https://sites.google.com" target="_blank">
             <img src="https://lh3.googleusercontent.com/d/10rU4MP8qMAvTkdaFcye6bMbDyJamoyMd" alt="Sites">
         </a>
         <a class="menu-item" href="https://docs.google.com/forms" target="_blank">
             <img src="https://lh3.googleusercontent.com/d/11S9beVFHKJQbJYHMFwd7L4QkA5dmh-Vn" alt="Forms">
         </a>
         <a class="menu-item" href="https://drive.google.com" target="_blank">
             <img src="https://lh3.googleusercontent.com/d/19ANNncEO3D0a88PfMe-4PpV_RIcgv-1v" alt="Drive">
         </a>
         <a class="menu-item" href="https://script.google.com" target="_blank">
             <img src="https://lh3.googleusercontent.com/d/1Y9VUZGfFPO7FRbgJAKLMLyc9ZhENp8ro" alt="Apps script">
         </a>
         <a class="menu-item" href="https://www.appsheet.com" target="_blank">
             <img src="https://lh3.googleusercontent.com/d/1tMjl5P1JF9DVg6vn27fi4jc3pFsy4ijL" alt="App Sheet" style="width:60px; height:60px;">
         </a>
         <a class="menu-item" href="https://colab.research.google.com/" target="_blank">
             <img src="https://lh3.googleusercontent.com/d/1qzilfLqsXROS8MvIsB8ha85it7RAXQhe" alt="Colab" style="width:60px; height:40px;">
         </a>
         <a class="menu-item" href="https://chatgpt.com" target="_blank">
             <img src="https://lh3.googleusercontent.com/d/1rh9cHvTuwzU2woygZxH_xnURejRsOiP7" alt="ChatGPT" style="width:60px;">
         </a>
         <a class="menu-item" href="https://gemini.google.com/" target="_blank">
             <img src="https://lh3.googleusercontent.com/d/1O6omXawEGdnSK64PbICZCbj03j3GcHBQ" alt="Gemini" style="width:60px;">
         </a>
     </div>

     <!-- ✅ 모달 (Lv별 C열 정보 자동 표시) -->
     <div id="modal-overlay" onclick="closeModal(event)">
         <div class="pyramid-scale-wrapper">
             <div class="pyramid-row">
                 <div class="sun">Lv5 총괄</div>
                 <div class="ribbon ribbon-sun"><span>${lv5Text || "등록된 정보가 없습니다."}</span></div>
             </div>
             <div class="pyramid-container">
                 <div class="pyramid-row">
                     <div class="layer layer-1">Lv4 리더</div>
                     <div class="ribbon ribbon-1"><span>${lv4Text || "등록된 정보가 없습니다."}</span></div>
                 </div>
                 <div class="pyramid-row">
                     <div class="layer layer-2">Lv3 세미리더</div>
                     <div class="ribbon ribbon-2"><span>${lv3Text || "등록된 정보가 없습니다."}</span></div>
                 </div>
                 <div class="pyramid-row">
                     <div class="layer layer-3">Lv2 멤버</div>
                     <div class="ribbon ribbon-3"><span>${lv2Text || "등록된 정보가 없습니다."}</span></div>
                 </div>
                 <div class="pyramid-row">
                     <div class="layer layer-4">Lv1 뽀시래기</div>
                     <div class="ribbon ribbon-4"><span>${lv1Text || "등록된 정보가 없습니다."}</span></div>
                 </div>
             </div>
         </div>
     </div>

     <!-- Docs 템플릿 사본 만들기 카드 -->
     <div class="template-copy-wrapper">
       <div class="template-card">
         <div class="template-header">
           <div class="template-icon">📄</div>
           <div>
             <div class="template-title">프로젝트 문서 만들기</div>
             <div class="template-meta">Google Docs 템플릿</div>
           </div>
         </div>
         <button id="copyBtn" class="btn-copy-doc" onclick="handleMakeCopy()">
           <span>사본 만들기</span>
         </button>
         <div id="copyStatus" class="copy-status"></div>
       </div>
     </div>

     <!-- 레퍼런스 관리 툴 -->
     <div id="tool-wrapper">
       <input type="text" id="searchInput" placeholder="검색어를 입력하세요">
       <div id="cards"></div>
     </div>

     <button id="toggleFormBtn">+</button>
     <div id="formOverlay" class="hidden"></div>

     <div id="postForm" class="post-form hidden">
       <h3 id="formTitle">레퍼런스 추가</h3>
       <form name="post-form">
         <input type="hidden" name="id" id="hidden-index" value="">
         <select name="platform" required>
           <option>google sites</option>
           <option>google apps script</option>
           <option>google appsheet</option>
           <option>google drive</option>
           <option>google sheets</option>
           <option>google docs</option>
         </select>
         <input type="text" name="location" placeholder="위치" autocomplete="off">
         <input type="text" name="program" placeholder="프로그램명" autocomplete="off">
         <input type="text" name="code" placeholder="문서" autocomplete="off">
         <input type="text" name="link" placeholder="링크" autocomplete="off">
         <input type="number" name="progress" placeholder="진행도" autocomplete="off" min="0" max="100">
         <button type="submit" id="submitPost">작성 완료</button>
       </form>
     </div>

     <script>
      // Docs 템플릿 사본 만들기 버튼
      function handleMakeCopy() {
        var btn = document.getElementById('copyBtn');
        var status = document.getElementById('copyStatus');
        if (!btn || !status) return;

        btn.disabled = true;
        status.textContent = '사본을 만드는 중입니다...';

        google.script.run
          .withSuccessHandler(function (result) {
            if (result && result.result === 'success' && result.url) {
              status.innerHTML = '사본이 생성되었습니다! <a href="' + result.url + '" target="_blank">여기</a>를 눌러 열기';
            } else {
              status.textContent = '오류가 발생했습니다: ' + (result && result.error ? result.error : '알 수 없는 오류');
            }
            btn.disabled = false;
          })
          .withFailureHandler(function (err) {
            status.textContent = '서버 오류가 발생했습니다: ' + err.message;
            btn.disabled = false;
          })
          .createDocCopy();
      }

      function openModal() {
        var modal = document.getElementById('modal-overlay');
        modal.style.display = 'flex';
        setTimeout(function() { modal.classList.add('active'); }, 10);
      }

      function closeModal(event) {
        var modal = document.getElementById('modal-overlay');
        if (event.target === modal || event.target.classList.contains('pyramid-scale-wrapper')) {
          modal.classList.remove('active');
          setTimeout(function() { modal.style.display = 'none'; }, 300);
        }
      }

      var posts = [];
      var isEditMode = false;

      // 레퍼런스 시트 ID
      var SHEET_ID = '1z29-kPqwNgFiee5gI9t3_iUO8yG0-CzmKizf1FcA35Q';

      google.charts.load('current', { packages: ['corechart'] });
      google.charts.setOnLoadCallback(fetchData);

      function fetchData() {
        var query = new google.visualization.Query(
          'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/gviz/tq?sheet=' + encodeURIComponent('레퍼런스') + '&headers=1'
        );

        query.send(function (response) {
          if (response.isError()) {
            document.getElementById('cards').innerHTML =
              '오류: ' + response.getMessage() + ' ' + response.getDetailedMessage();
            return;
          }

          var data = response.getDataTable();
          var container = document.getElementById('cards');
          container.innerHTML = '';
          posts = [];

          for (var i = 0; i < data.getNumberOfRows(); i++) {
            var id = i + 2;
            var location = data.getValue(i, 0) || '';
            var program = data.getValue(i, 1) || '';
            var platform = data.getValue(i, 2) || '';
            var code = data.getValue(i, 3) || '';
            var link = data.getValue(i, 4) || '';
            var progress = data.getValue(i, 5) || 0;
            var percentage = Math.min(100, Math.max(0, Number(progress)));

            posts.push({ id, location, program, platform, code, link, progress });

            var img = '';
            if (platform === 'google sites') img = "<img src='https://lh3.googleusercontent.com/d/10rU4MP8qMAvTkdaFcye6bMbDyJamoyMd' width='15'>";
            else if (platform === 'google appsheet') img = "<img src='https://lh3.googleusercontent.com/d/1tMjl5P1JF9DVg6vn27fi4jc3pFsy4ijL' width='20'>";
            else if (platform === 'google apps script') img = "<img src='https://lh3.googleusercontent.com/d/1Y9VUZGfFPO7FRbgJAKLMLyc9ZhENp8ro' width='20'>";
            else if (platform === 'google sheets') img = "<img src='https://lh3.googleusercontent.com/d/1Oh6sjOZA8rSRwOamcVbuNlZwdiqN-vGG' width='15'>";
            else if (platform === 'google docs') img = "<img src='https://lh3.googleusercontent.com/d/1xzm6Jq7zHyTUXG434rcFIb7JSuRMNSS2' width='15'>";

            var progressBarHTML =
              '<div class="progress-wrapper">' +
              '  <div class="progress-bar-container">' +
              '    <div class="progress-bar" style="width: ' + percentage + '%;"></div>' +
              '  </div>' +
              '  <span class="progress-text">' + percentage + '%</span>' +
              '</div>';

            var cardHTML =
              '<div class="card">' +
              '<div class="card-content">' +
              '  <h3>' + (program || '(제목 없음)') + '</h3>' +
              '  <p>' + img + ' ' + platform + '</p>' +
              '  <a href="' + link + '" target="_blank">링크</a>ㅤㅤ' +
              '  <a href="' + code + '" target="_blank">문서</a>' +
              '</div>' +
              '<div class="card-actions">' +
              '  <button onclick="editCard(' + id + ')">수정</button>' +
              '</div>' +
              progressBarHTML +
              '</div>';

            container.innerHTML = cardHTML + container.innerHTML;
          }
        });
      }

      setInterval(fetchData, 10000);

      function editCard(cardId) {
        var cardData = null;
        for (var i = 0; i < posts.length; i++) {
          if (posts[i].id === cardId) { cardData = posts[i]; break; }
        }
        if (!cardData) { alert('카드를 찾을 수 없습니다.'); return; }

        var postForm = document.getElementById('postForm');
        var formTitle = document.getElementById('formTitle');
        var submitButton = document.getElementById('submitPost');
        var hiddenIndex = document.getElementById('hidden-index');
        var form = document.forms['post-form'];
        var formOverlay = document.getElementById('formOverlay');

        isEditMode = true;
        formTitle.textContent = '레퍼런스 수정';
        submitButton.textContent = '수정 완료';
        submitButton.style.backgroundColor = '#00a6ff';

        hiddenIndex.value = cardId;
        form.platform.value = cardData.platform;
        form.location.value = cardData.location;
        form.program.value = cardData.program;
        form.code.value = cardData.code;
        form.link.value = cardData.link;
        form.progress.value = cardData.progress;

        postForm.classList.remove('hidden');
        formOverlay.classList.remove('hidden');
      }

      document.addEventListener('DOMContentLoaded', function () {
        var form = document.forms['post-form'];
        var submitButton = document.getElementById('submitPost');
        var toggleFormBtn = document.getElementById('toggleFormBtn');
        var postForm = document.getElementById('postForm');
        var formTitle = document.getElementById('formTitle');
        var searchInput = document.getElementById('searchInput');
        var formOverlay = document.getElementById('formOverlay');

        function resetFormToCreateMode() {
          isEditMode = false;
          formTitle.textContent = '레퍼런스 추가';
          submitButton.textContent = '작성 완료';
          submitButton.style.backgroundColor = '#00a6ff';
          document.getElementById('hidden-index').value = '';
          form.reset();
        }

        toggleFormBtn.addEventListener('click', function () {
          var isHidden = postForm.classList.contains('hidden');
          if (isHidden) {
            resetFormToCreateMode();
            postForm.classList.remove('hidden');
            formOverlay.classList.remove('hidden');
          } else {
            postForm.classList.add('hidden');
            formOverlay.classList.add('hidden');
          }
        });

        searchInput.addEventListener('input', function () {
          var keyword = (this.value || '').toLowerCase();
          var cards = document.querySelectorAll('.card');
          for (var i = 0; i < cards.length; i++) {
            var card = cards[i];
            var text = card.innerText.toLowerCase();
            card.style.display = text.indexOf(keyword) !== -1 ? 'flex' : 'none';
          }
        });

        form.addEventListener('submit', function (e) {
          e.preventDefault();
          submitButton.disabled = true;

          var location = (form.location.value || '').trim();
          var program  = (form.program.value  || '').trim();
          var platform = (form.platform.value || '').trim();
          var code     = (form.code.value     || '').trim();
          var link     = (form.link.value     || '').trim();
          var progress = (form.progress.value || '').trim();

          var mode = isEditMode ? 'edit' : 'create';
          var id   = document.getElementById('hidden-index').value;

          if (!isEditMode) {
            var isDuplicate = false;
            for (var i = 0; i < posts.length; i++) {
              var p = posts[i];
              if (p.platform === platform && p.program === program && p.location === location) {
                isDuplicate = true; break;
              }
            }
            if (isDuplicate) {
              alert('동일한 게시물이 이미 존재합니다.');
              submitButton.disabled = false;
              return;
            }
          }

          var payload = { id, mode, location, program, platform, code, link, progress };

          google.script.run
            .withSuccessHandler(function (result) {
              if (result && result.result === 'success') {
                alert('저장되었습니다.');
                resetFormToCreateMode();
                postForm.classList.add('hidden');
                formOverlay.classList.add('hidden');
                fetchData();
              } else {
                alert('오류가 발생했습니다: ' + (result && result.error ? result.error : '알 수 없는 오류'));
              }
              submitButton.disabled = false;
            })
            .withFailureHandler(function (err) {
              alert('서버 호출 중 오류가 발생했습니다: ' + err.message);
              submitButton.disabled = false;
            })
            .saveReference(payload);
        });

        formOverlay.addEventListener('click', function () {
          postForm.classList.add('hidden');
          formOverlay.classList.add('hidden');
          resetFormToCreateMode();
        });

      });
    </script>
   </body>
   </html>
  `;

    return HtmlService.createHtmlOutput(html)
        .setTitle("내 프로필 배지")
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// 사용자 정보 함수 ('멤버' 시트 사용)
function getUserInfo() {
    try {
        const SPREADSHEET_ID = "1z29-kPqwNgFiee5gI9t3_iUO8yG0-CzmKizf1FcA35Q";
        const roleMap = { "Lv1": "뽀시래기", "Lv2": "멤버", "Lv3": "세미리더", "Lv4": "리더", "Lv5": "총괄" };

        const descMap = {
            "Lv1": { desc1: "승급 조건:이수 점수 4~6", desc2: "처음 동아리에 들어온 신입 부원입니다.\n --권한--\n 너희에게 주어진 권한따윈 없다.승급 조건을 통해 위로 올라가라." },
            "Lv2": { desc1: "승급 조건:이수 점수 7~9", desc2: "코드를 어느정도 다룰 수 있는 부원입니다.\n --권한--\n 아직 부족하다." },
            "Lv3": { desc1: "승급 조건:이수 점수 10~12 및 프로젝트 평가", desc2: "코드를 능숙하게 다룰 수 있는 부원입니다.\n --권한--\n 세미리더가 2명 이상 일 경우 프로젝트 진행 권한을 가집니다." },
            "Lv4": { desc1: "승급 조건:'리더' 단계에 있는 인원 중 가장 유능한 인원이 승급", desc2: "코드를 잘 다루며 동아리 관리권한을 가진 부원입니다.\n --권한-- \n 팀 프로젝트를 진행할 권한을 가집니다. 테크웍스 문서들의 수정 권한을 가집니다. \n 프로그램의 배포를 검토합니다. 세미리더들의 승급여부를 결정합니다." },
            "Lv5": { desc1: "더 이상 승급할 단계가 존재하지 않습니다", desc2: "전체적인 운영과 관리를 책임지는 부원입니다.\n --권한--\n 전체 프로젝트를 총괄하며 동아리 담당 선생님께 보고합니다." }
        };

        const imgMap = {
            "Lv1": "<img src='https://lh3.googleusercontent.com/d/1NHHQvEhZUcqOJ3c48SQFP2RfpLoXf04w' width='30'>",
            "Lv2": "<img src='https://lh3.googleusercontent.com/d/1VR_NU5NGV87fgMvyFu5ODgXWIZVX9VWh' width='30'>",
            "Lv3": "<img src='https://lh3.googleusercontent.com/d/1xW2BGAPcNgQuRRFNRegUzzEfwx1GLM8J' width='30'>",
            "Lv4": "<img src='https://lh3.googleusercontent.com/d/1OsnY2Z1PnINWIEr9i-HagvMg1z04jMKL' width='30'>",
            "Lv5": "<img src='https://lh3.googleusercontent.com/d/1XvFeSvKLQZfanIuSlDLbUE4W1czHirkV' width='30'>"
        };

        const response = People.People.get('people/me', { personFields: 'names,emailAddresses' });
        let myEmail = "";
        if (response.emailAddresses && response.emailAddresses.length > 0) myEmail = response.emailAddresses[0].value;
        else return null;

        let processedName = "이름없음";
        if (response.names && response.names.length > 0) {
            const rawName = response.names[0].displayName;
            processedName = rawName.length > 5 ? rawName.substring(0, 5) + " " + rawName.substring(5) : rawName;
        }

        const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('멤버');
        if (!sheet) return null;

        const data = sheet.getDataRange().getValues();
        for (let i = 0; i < data.length; i++) {
            let sheetEmail = data[i][0];
            let sheetLv = data[i][1];
            if (!sheetEmail) continue;

            if (String(sheetEmail).trim().toLowerCase() === myEmail.trim().toLowerCase()) {
                return {
                    lv: sheetLv,
                    role: roleMap[sheetLv] || "Unknown",
                    name: processedName,
                    img: imgMap[sheetLv] || imgMap["Lv1"],
                    desc1: descMap[sheetLv] ? descMap[sheetLv].desc1 : "설명 없음",
                    desc2: descMap[sheetLv] ? descMap[sheetLv].desc2 : "설명 없음"
                };
            }
        }
        return null;
    } catch (e) {
        console.error("오류 발생: " + e.message);
        return null;
    }
}

// Docs 템플릿 사본 생성
function createDocCopy() {
    try {
        var templateFile = DriveApp.getFileById(TEMPLATE_DOC_ID);
        var timeZone = Session.getScriptTimeZone();
        var dateStr = Utilities.formatDate(new Date(), timeZone, 'yyyyMMdd_HHmm');

        var newName = templateFile.getName() + ' - 사본 (' + dateStr + ')';
        var copyFile = templateFile.makeCopy(newName);

        return {
            result: 'success',
            id: copyFile.getId(),
            name: copyFile.getName(),
            url: 'https://docs.google.com/document/d/' + copyFile.getId() + '/edit'
        };
    } catch (e) {
        return { result: 'error', error: e.message };
    }
}

/**
 * 레퍼런스 시트에 카드 생성/수정 처리 (POST)
 */
function doPost(e) {
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) {
        return ContentService.createTextOutput(JSON.stringify({ result: 'error', error: '서버 혼잡' }))
            .setMimeType(ContentService.MimeType.JSON);
    }

    try {
        const TARGET_SPREADSHEET_ID = '1z29-kPqwNgFiee5gI9t3_iUO8yG0-CzmKizf1FcA35Q';
        const TARGET_SHEET_NAME = '레퍼런스';

        const doc = SpreadsheetApp.openById(TARGET_SPREADSHEET_ID);
        const sheet = doc.getSheetByName(TARGET_SHEET_NAME);
        if (!sheet) throw new Error("'" + TARGET_SHEET_NAME + "' 시트를 찾을 수 없습니다.");

        const p = e.parameter;
        const mode = p.mode;

        const rowData = [p.location || '', p.program || '', p.platform || '', p.code || '', p.link || '', p.progress || 0];

        if (mode === 'create') {
            sheet.appendRow(rowData);
        } else if (mode === 'edit') {
            const rowIndex = parseInt(p.id);
            if (rowIndex && rowIndex > 1 && rowIndex <= sheet.getLastRow()) {
                sheet.getRange(rowIndex, 1, 1, 6).setValues([rowData]);
            } else {
                throw new Error("수정할 행(ID)을 찾을 수 없습니다.");
            }
        }

        return ContentService.createTextOutput(JSON.stringify({ result: 'success' }))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ result: 'error', error: err.message }))
            .setMimeType(ContentService.MimeType.JSON);
    } finally {
        lock.releaseLock();
    }
}

// 레퍼런스 저장(웹앱 내부 호출)
function saveReference(data) {
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return { result: 'error', error: '서버 혼잡' };

    try {
        const TARGET_SPREADSHEET_ID = '1z29-kPqwNgFiee5gI9t3_iUO8yG0-CzmKizf1FcA35Q';
        const TARGET_SHEET_NAME = '레퍼런스';

        const doc = SpreadsheetApp.openById(TARGET_SPREADSHEET_ID);
        const sheet = doc.getSheetByName(TARGET_SHEET_NAME);
        if (!sheet) return { result: 'error', error: "'" + TARGET_SHEET_NAME + "' 시트를 찾을 수 없습니다." };

        const mode = data.mode;
        const rowData = [data.location || '', data.program || '', data.platform || '', data.code || '', data.link || '', data.progress || 0];

        if (mode === 'create') {
            sheet.appendRow(rowData);
        } else if (mode === 'edit') {
            const rowIndex = parseInt(data.id, 10);
            if (rowIndex && rowIndex > 1 && rowIndex <= sheet.getLastRow()) {
                sheet.getRange(rowIndex, 1, 1, 6).setValues([rowData]);
            } else {
                return { result: 'error', error: '수정할 행(ID)을 찾을 수 없습니다.' };
            }
        } else {
            return { result: 'error', error: '알 수 없는 mode 값입니다.' };
        }

        return { result: 'success' };
    } catch (err) {
        return { result: 'error', error: err.message };
    } finally {
        lock.releaseLock();
    }
}