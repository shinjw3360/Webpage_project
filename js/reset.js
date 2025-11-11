(() => {
  const DEBUG   = false;
  const USE_DOMAIN = false;                  // 서브도메인 전체에서 쓰려면 true
  const DOMAIN  = 'dothome.co.kr';           // 예: aaaa.dothome.co.kr, bbbb... 모두에서 공유
  const KEY     = 'session_ok';              // 로그인 세션용(예시)
  const PATH_OK = '/';                       // 최상위에서 보이게

  // --- 쿠키 유틸 ---
  function setCookie(name, value, {days, path=PATH_OK, domain, secure}={}) {
    const parts = [
      `${encodeURIComponent(name)}=${encodeURIComponent(value)}`
    ];
    if (days != null) parts.push(`Max-Age=${days*86400}`);
    if (path) parts.push(`Path=${path}`);
    if (domain) parts.push(`Domain=${domain}`);
    parts.push('SameSite=Lax');
    if (secure ?? (location.protocol === 'https:')) parts.push('Secure');
    document.cookie = parts.join('; ');
  }
  function getCookie(name) {
    const k = encodeURIComponent(name) + '=';
    const it = document.cookie.split('; ').find(v=>v.startsWith(k));
    return it ? decodeURIComponent(it.slice(k.length)) : null;
  }
  function delCookie(name, {path='/', domain}={}) {
    document.cookie = `${encodeURIComponent(name)}=; Path=${path}; Max-Age=0; SameSite=Lax${domain?`; Domain=${domain}`:''}`;
  }

  // --- 잘못된 Path(/pages/)로 생성된 쿠키 정리 & 올바른 범위로 승격 ---
  function normalizeCookieScope(name) {
    // 1) /pages 범위로 남아있을 가능성 제거
    try { delCookie(name, {path:'/pages/'}); } catch {}
    try { delCookie(name, {path:'/pages/', domain:USE_DOMAIN?DOMAIN:undefined}); } catch {}

    // 2) 이미 값이 있으면 읽어서 올바른 범위로 재설정
    const v = getCookie(name);
    if (v) {
      setCookie(name, v, {
        days: 7,                              // 원하는 유지기간 (세션쿠키면 days 제거)
        path: PATH_OK,
        domain: USE_DOMAIN ? DOMAIN : undefined
      });
      if (DEBUG) console.log('[scope normalized]', name, v);
    }
  }

  // --- 로그인/검증 헬퍼 (예시) ---
  // 로그인 성공 시 호출 (예: pages/login.html)
  window.markLoggedIn = function() {
    setCookie(KEY, '1', {
      days: 7,                                // 브라우저 닫아도 유지. 세션쿠키 원하면 days 제거
      path: PATH_OK,
      domain: USE_DOMAIN ? DOMAIN : undefined
    });
    if (DEBUG) console.log('[login set]', document.cookie);
  };

  // 로그아웃 시 호출 (어디서든)
  window.markLoggedOut = function() {
    delCookie(KEY, {path: PATH_OK});
    if (USE_DOMAIN) delCookie(KEY, {path: PATH_OK, domain: DOMAIN});
    if (DEBUG) console.log('[logout]', document.cookie);
  };

  // 현재 로그인 여부
  window.isLoggedIn = function() {
    return getCookie(KEY) === '1';
  };

  // 초기 실행: 범위 정리
  normalizeCookieScope(KEY);

  // 선택: 진단 로그
  if (DEBUG) {
    console.log('origin=', location.origin, 'path=', location.pathname);
    console.log('cookie=', document.cookie);
    console.log('isLoggedIn=', isLoggedIn());
  }
})();

async function onLoginSuccess(){
  // 서버 검증 O이라면 여기서 OK 응답 받은 뒤 호출
  markLoggedIn();
  location.href = '/index.html';
}


if (!isLoggedIn()) {
  // 세션 없으면 로그인 페이지로
  location.href = '/pages/login.html';
}
