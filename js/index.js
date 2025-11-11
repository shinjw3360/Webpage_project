/* ============================ index.js ============================ */
(function(){
  /* ---------- helpers ---------- */
  const qs  = (s, r=document)=>r.querySelector(s);
  const qsa = (s, r=document)=>Array.from(r.querySelectorAll(s));

  // src를 루트 기준으로 표준화: 'img/...' -> '/img/...'
  const toRootSrc = (src0)=>{
    const s = String(src0||'');
    return s.startsWith('/') ? s : '/' + s.replace(/^\.\//,'');
  };

  /* ---------- 1) 상단 메뉴(.main_bar) 토글 ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    qsa('.main_bar').forEach(li => {
      const top = qs(':scope > a', li);
      const sub = qs(':scope > .sub_on', li);
      if (!top || !sub) return;
      top.addEventListener('click', e => { e.preventDefault(); sub.classList.toggle('off'); });
    });
  });

  /* ---------- 2) 패밀리 롤링(.family dt) ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    let num = 0;
    const dts  = qsa('.family dt');
    const size = dts.length;
    if (!size) return;

    const render = ()=>{ dts.forEach(el=>el.classList.remove('on')); dts[num].classList.add('on'); };
    dts[0].classList.add('on');

    const next = ()=>{ num = (num+1)%size; render(); };
    let auto = setInterval(next, 5000);

    dts.forEach((dt, i)=>dt.addEventListener('click', ()=>{
      clearInterval(auto); num = i; render();
    }));
  });

  /* ---------- 3) 위시리스트(하트) ---------- */
  const HEART_OFF = 'img/heart.svg';
  const HEART_ON  = 'img/heart_on.svg';      // 실제 파일명/경로 확인
  const KEY  = 'wishList_v1';
  const PING = 'wishList_ping';               // 실시간 갱신용 ping

  const wLoad = ()=>{ try{const raw=localStorage.getItem(KEY); const d=raw?JSON.parse(raw):[]; return Array.isArray(d)?d:[];}catch{ return []; } };
  const wSave = (arr)=>localStorage.setItem(KEY, JSON.stringify(arr));
  const wPing = ()=>localStorage.setItem(PING, String(Date.now()));
  const wHas  = (id)=>wLoad().some(x=>x.id===id);
  const wAdd  = (it)=>{ const a=wLoad(); if(!a.some(x=>x.id===it.id)){ a.push(it); wSave(a); wPing(); } };
  const wDel  = (id)=>{ wSave(wLoad().filter(x=>x.id!==id)); wPing(); };

  function setHeart(box, on){
    const img = box?.querySelector('img'); if(!img) return;
    img.src = on ? HEART_ON : HEART_OFF;
    box.dataset.heart = on ? '1' : '0';
    box.classList.toggle('active', on);
  }

  function getCardData(li){
    const img   = qs('img.random', li);
    const title = (qs('.info_recom', li)?.textContent || '').trim();
    const src   = toRootSrc(img?.getAttribute('src'));
    const m     = img?.getAttribute('onclick')?.match(/'(.*?)'/);
    const href  = m ? m[1] : 'pages/pick.html';
    const id    = `${title}|${src}`;  // 고유키
    return { id, title, href, src };
  }

  // UI만 전체 OFF (스토리지는 건드리지 않음)
  function resetHeartUIOnly(){
    qsa('.recom_img .heart_img').forEach(box=>setHeart(box, false));
  }

  // 하트 클릭: UI 우선 토글 + 스토리지 보정
  function toggleHeart(box){
    const li = box.closest('.recom_img'); if(!li) return;
    const item = getCardData(li);

    const uiOn = box.dataset.heart === '1' || box.querySelector('img')?.src.includes('heart_on');
    const next = !uiOn;

    setHeart(box, next);       // UI 먼저 반영

    const exists = wHas(item.id);
    if(next && !exists){       // 켜졌는데 저장에 없으면 추가
      wAdd(item);
      alert('찜목록에 추가되었습니다.');
    }else if(!next && exists){ // 꺼졌고 저장에 있으면 제거
      wDel(item.id);
      alert('찜목록에서 제거되었습니다.');
    }
  }

  // 현재 카드들을 저장값 기준으로 맞추고 싶을 때 사용(필요 시 호출)
  function syncHearts(){
    qsa('.recom_img .heart_img').forEach(box=>{
      const li = box.closest('.recom_img');
      const item = getCardData(li);
      setHeart(box, wHas(item.id));
    });
  }

  // 하트 클릭 위임
  function bindHearts(){
    document.addEventListener('click', e=>{
      const box = e.target.closest('.heart_img');
      if(!box) return;
      e.preventDefault(); e.stopPropagation();
      toggleHeart(box);
    });
  }

  /* ---------- 4) 랜덤 카드 교체 (onclick 동기화 포함) ---------- */
  const TITLES = [
    '청사포 다릿돌전망대','석촌 호수','물미 해안전망대','성당 시장',
    '열쇠 전망대','월미짱 랜드','설악 워터피아','서울 한강',
    '부산 태종대','철원평화전망대','전주 남부시장','이끼 터널', '삼척 환선굴,'
  ];
  const POOL = Array.from({length:12},(_,i)=>({
    src:`img/pick/recommendation${String(i+1).padStart(2,'0')}.jpg`, // 루트 기준
    title:TITLES[i]||`추천지 ${i+1}`
  }));
  function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=(Math.random()*(i+1))|0; [a[i],a[j]]=[a[j],a[i]]; } return a; }
  function setLink(li, href){
    const img = qs('img.random', li); if(!img) return;
    const safe = String(href).replace(/'/g,"\\'");
    img.setAttribute('onclick', `location.href='${safe}'`);
  }
  function applyRandom(){
    const cards = qsa('.gid_recom .recom_img'); if(!cards.length) return;
    const picks = shuffle(POOL.slice()).slice(0, cards.length);
    cards.forEach((li,i)=>{
      const img = qs('img.random', li);
      const txt = qs('.info_recom', li);
      if(img) img.src = picks[i].src;
      if(txt) txt.textContent = picks[i].title;
      const href = `pages/pick.html?title=${encodeURIComponent(picks[i].title)}`;
      setLink(li, href);
    });
    // 랜덤 후에도 UI는 OFF 유지 정책이면 아래만 호출
    resetHeartUIOnly();
    // 저장값 기준으로 켜고 싶다면 대신: syncHearts();
  }

  /* ---------- 5) 로그인 표시/로그아웃 ---------- */
  function bindLogin(){
    const saved = localStorage.getItem('loggedInUser');
    const user  = saved ? JSON.parse(saved) : null;
    const nameEl = qs('.login_box .myname');
    if (user && nameEl) nameEl.textContent = user.id || user.name || '';
    const btnLogout = qs('#btnLogout');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        localStorage.removeItem('loggedInUser');
        document.documentElement.classList.remove('state-logged-in');
        document.documentElement.classList.add('state-logged-out');
        qsa('.login_box').forEach(b => b.style.display = 'none');
        qsa('.login_box_wrap').forEach(w => w.style.display = 'block');
      });
    }
  }

  /* ---------- 6) 초기화 & 복귀 시 UI만 OFF ---------- */
  function init(){
    bindHearts();
    const btn = qs('#btnRecom') || qs('button');
    if(btn) btn.addEventListener('click', applyRandom);

    // 진입 시: UI만 OFF (저장값은 유지)
    resetHeartUIOnly();

    // 뒤로가기/앞으로가기, bfcache 복귀 시에도 UI만 OFF
    window.addEventListener('pageshow', ()=> resetHeartUIOnly());
    // 탭을 다시 볼 때도 UI만 OFF
    document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) resetHeartUIOnly(); });

    bindLogin();
  }

  document.readyState==='loading' ? document.addEventListener('DOMContentLoaded', init) : init();


})();
