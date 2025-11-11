(() => {
  /* ============================ 설정 & 공통 ============================ */
  const TRAVEL_JSON_URL = 'js/travel.json';
  const SAVE_SELECTED   = 'travel_picks_v1';
  const WKEY            = 'wishList_v1';
  const WPING           = 'wishList_ping';

  const HEART_OFF = 'img/heart.svg';
  const HEART_ON  = 'img/heart_on.svg';

  const norm = (s) => String(s ?? '')
    .normalize('NFC')
    .replace(/\u200B/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const toRootSrc = (src0)=>{
    const s = String(src0||'').trim();
    return s.startsWith('/') ? s : '/' + s.replace(/^\.\//,'');
  };

  /* ============================ 랜덤 카드 풀(타이틀은 name과 동일) ============================ */
  const TITLES = [
    '청사포 다릿돌전망대','석촌 호수','물미 해안전망대','성당 시장',
    '열쇠 전망대','월미짱 랜드','설악 워터피아','서울 한강',
    '부산 태종대','철원평화전망대','전주 남부시장','이끼 터널','삼척 환선굴'
  ];
  const POOL = Array.from({length:12},(_,i)=>({
    src:`img/pick/recommendation${String(i+1).padStart(2,'0')}.jpg`,
    title:TITLES[i] || `추천지 ${i+1}`
  }));
  const shuffle = (a)=>{ for(let i=a.length-1;i>0;i--){ const j=(Math.random()*(i+1))|0; [a[i],a[j]]=[a[j],a[i]]; } return a; };

  /* ============================ travel.json 로드/인덱스 ============================ */
  let TRAVEL_DAYS = [];       // 통합 스키마: [{day,region,city,items,locals,images,order}]
  let TRAVEL_INDEX = {};      // key = norm(name) → { day, region, city, item, local, image, name }

  // 스키마 자동 감지/평탄화
  function parseTravel(raw){
    // 형태 A: 최상위가 배열
    if (Array.isArray(raw)) {
      return raw.map(d=>({
        day: d?.day, region: d?.region, city: d?.city,
        items: d?.items||[], locals: d?.locals||{}, images: d?.images||{}, order: d?.order||[]
      }));
    }
    // 형태 B: { trips: [ { days:[...], region?, city? } ] }
    if (raw && Array.isArray(raw.trips)) {
      const out = [];
      for (const trip of raw.trips) {
        const tripRegion = trip?.region || trip?.title || '';
        const tripCity   = trip?.city   || '';
        for (const day of (trip.days||[])) {
          out.push({
            day   : day?.day,
            region: day?.region || tripRegion,
            city  : day?.city   || tripCity,
            items : day?.items  || [],
            locals: day?.locals || trip?.locals || {},
            images: day?.images || trip?.images || {},
            order : day?.order  || []
          });
        }
      }
      return out;
    }
    return [];
  }

  async function ensureTravel(){
    if (TRAVEL_DAYS.length) return;
    const res  = await fetch(TRAVEL_JSON_URL, {cache:'no-store'});
    const raw  = await res.json();
    TRAVEL_DAYS = parseTravel(raw);

    TRAVEL_INDEX = {};
    TRAVEL_DAYS.forEach(d=>{
      const {day,region,city,items=[],locals={},images={}} = d||{};
      items.forEach(it=>{
        const displayName = String(it?.name || '').trim();
        const key = norm(displayName);
        if(!key) return;
        // day.locals/images 또는 trip.locals/images를 displayName/정규화 키 양쪽으로 조회
        const localVal = locals[displayName] ?? locals[key] ?? null;
        const imageVal = images[displayName] ?? images[key] ?? null;

        TRAVEL_INDEX[key] = {
          day, region, city,
          item: it,
          local: localVal,
          image: imageVal,
          name: displayName
        };
      });
    });
  }

  function buildSelectedSchema(selectedTitles){
    const set = new Set((selectedTitles||[]).map(norm));
    const out = [];
    TRAVEL_DAYS.forEach(d=>{
      const { day, region, city, items=[], locals={}, images={}, order=[] } = d||{};
      const selItems = items.filter(it=> set.has(norm(it.name)));
      if(!selItems.length) return;
      const selLocals = {}, selImages = {};
      selItems.forEach(it=>{
        const n = it.name;
        if(locals[n])  selLocals[n]  = locals[n];
        if(images[n])  selImages[n]  = images[n];
      });
      const selOrder = (order&&order.length) ? order.filter(n=>set.has(norm(n))) : selItems.map(it=>it.name);
      out.push({ day, region, city, items: selItems, locals: selLocals, images: selImages, order: selOrder });
    });
    return out;
  }

  /* ============================ 위시리스트(하트) — 스키마 저장 ============================ */
  const wLoad = ()=>{ try { return JSON.parse(localStorage.getItem(WKEY)||'[]')||[]; } catch { return []; } };
  const wSave = (days)=>{ localStorage.setItem(WKEY, JSON.stringify(days)); localStorage.setItem(WPING, String(Date.now())); };

  const wschemaHas = (titleRaw)=>{
    const key = norm(titleRaw);
    return wLoad().some(d => (d?.items||[]).some(it => norm(it?.name) === key));
  };

  function wschemaAddByTitle(titleRaw){
    const key = norm(titleRaw);
    const t = TRAVEL_INDEX[key];
    if(!t || !t.item) return false;

    const days = wLoad();
    let d = days.find(x => x?.day===t.day && x?.region===t.region && x?.city===t.city);
    if(!d){
      d = { day: t.day, region: t.region, city: t.city, items: [], locals: {}, images: {}, order: [] };
      days.push(d);
    }
    if(d.items.some(it => norm(it?.name) === key)) return false;

    d.items.push(t.item);
    if(t.local)  d.locals[t.name] = t.local;
    if(t.image)  d.images[t.name] = t.image;
    if(!Array.isArray(d.order)) d.order = [];
    if(!d.order.includes(t.name)) d.order.push(t.name);

    wSave(days);
    return true;
  }

  function wschemaRemoveByTitle(titleRaw){
    const key = norm(titleRaw);
    let days = wLoad();
    let changed = false;

    for(const d of days){
      const before = (d.items||[]).length;
      d.items  = (d.items||[]).filter(it => norm(it?.name) !== key);
      if(before !== d.items.length) changed = true;

      if(d.locals){
        Object.keys(d.locals).forEach(k=>{ if(norm(k)===key){ delete d.locals[k]; changed=true; } });
      }
      if(d.images){
        Object.keys(d.images).forEach(k=>{ if(norm(k)===key){ delete d.images[k]; changed=true; } });
      }
      if(Array.isArray(d.order)){
        const b = d.order.length;
        d.order = d.order.filter(n => norm(n) !== key);
        if(b !== d.order.length) changed = true;
      }
    }
    days = days.filter(d => (d.items||[]).length);
    if(changed) wSave(days);
    return changed;
  }

  function setHeart(box, on){
    const img = box?.querySelector('img'); if(!img) return;
    img.src = on ? HEART_ON : HEART_OFF;
    box.dataset.heart = on ? '1' : '0';
    box.classList.toggle('active', on);
  }

  /* ============================ 카드 데이터 ============================ */
  function getCardData(li){
    const img = li.querySelector('.recom_img_view img, img.random');
    const rawTitle =
      (li.getAttribute('data-title') || '') ||
      (li.querySelector('.info_recom, .name')?.textContent || img?.alt || '');
    const title = rawTitle.trim() || '제목없음';
    const srcAttr = img?.getAttribute('src') || '';
    const src = toRootSrc(srcAttr);
    const href = `pages/pick.html?title=${encodeURIComponent(title)}`;
    return { title, src, href };
  }

  function resetHeartUIOnly(){
    document.querySelectorAll('.recom_img .heart_img').forEach(box=>setHeart(box, false));
  }

  /* ============================ 하트 토글 ============================ */
  async function toggleHeart(box){
    const li = box.closest('.recom_img'); if(!li) return;
    const { title } = getCardData(li);
    await ensureTravel();

    const currentlyOn = box.dataset.heart === '1' || box.querySelector('img')?.src.includes('heart_on');
    const inStore = wschemaHas(title);

    if(!currentlyOn){
      if(inStore){ setHeart(box, true); return; }
      const ok = wschemaAddByTitle(title);
      if(ok){ setHeart(box, true); alert('찜목록에 추가되었습니다.'); }
      else { setHeart(box, false); alert('원본 travel.json에 없는 제목입니다.'); }
    }else{
      if(!inStore){ setHeart(box, false); return; }
      const ok = wschemaRemoveByTitle(title);
      if(ok){ setHeart(box, false); alert('찜목록에서 제거되었습니다.'); }
      else { setHeart(box, true); }
    }
  }

  async function syncHearts(){
    await ensureTravel();
    document.querySelectorAll('.recom_img .heart_img').forEach(box=>{
      const li = box.closest('.recom_img');
      const { title } = getCardData(li);
      setHeart(box, !!title && wschemaHas(title));
    });
  }

  function bindHearts(){
    document.addEventListener('click', e=>{
      const box = e.target.closest('.heart_img');
      if(!box) return;
      e.preventDefault(); e.stopPropagation();
      toggleHeart(box);
    });
  }

  /* ============================ 카드 클릭(검증 후 이동) ============================ */
  async function bindCardClicks(){
    await ensureTravel();
    document.querySelectorAll('.recom_img .recom_img_view img, .recom_img img.random').forEach(img=>{
      img.style.cursor = 'pointer';
      if (img.__boundClick) img.removeEventListener('click', img.__boundClick);

      const onClick = (e)=>{
        if (e.target.closest('.heart_img')) return; // 하트 클릭이면 이동 금지
        const li = img.closest('.recom_img');
        const { title, href } = getCardData(li);
        const t = TRAVEL_INDEX[norm(title)];
        if(!t || !t.item){
          alert('원본 travel.json에 없는 제목입니다.');
          return;
        }
        location.href = href;
      };
      img.addEventListener('click', onClick);
      img.__boundClick = onClick;
    });
  }

  /* ============================ 랜덤 카드 교체(선택 스키마 저장) ============================ */
  async function applyRandom(){
    await ensureTravel();

    const cards = Array.from(document.querySelectorAll('.gid_recom .recom_img'));
    if(!cards.length) return;

    const picks = shuffle(POOL.slice()).slice(0, cards.length);
    const pickedTitles = picks.map(p=>p.title);

    cards.forEach((li,i)=>{
      const pick = picks[i];
      const t    = TRAVEL_INDEX[norm(pick.title)] || null;
      const img  = li.querySelector('img.random') || li.querySelector('.recom_img_view img');
      const txt  = li.querySelector('.info_recom, .name');
      const best = t?.image || pick.src;
      if(img){ img.src = best; img.alt = pick.title; }
      if(txt) txt.textContent = pick.title;
      li.setAttribute('data-title', pick.title);
      li.dataset.href = `pages/pick.html?title=${encodeURIComponent(pick.title)}`;
    });

    resetHeartUIOnly();
    await syncHearts();

    const selectedSchema = buildSelectedSchema(pickedTitles);
    try { localStorage.setItem(SAVE_SELECTED, JSON.stringify(selectedSchema)); }
    catch(e){ console.warn('선택 스키마 저장 실패:', e); }
  }

  /* ============================ 로그인 박스 ============================ */
  function bindLogin(){
    const safeUser = () => { try { return JSON.parse(localStorage.getItem('loggedInUser')||'null'); } catch { return null; } };
    const render = ()=>{
      const user = safeUser();
      const on = !!user;
      document.querySelectorAll('.login_box').forEach(b => b.style.display = on ? 'block' : 'none');
      document.querySelectorAll('.login_box_wrap').forEach(w => w.style.display = on ? 'none'  : 'block');
      const nameEl = document.querySelector('.login_box .myname');
      if (nameEl) nameEl.textContent = user?.id || user?.name || '';
      document.documentElement.classList.toggle('state-logged-in',  on);
      document.documentElement.classList.toggle('state-logged-out', !on);
    };
    const btn = document.getElementById('logoutBtn') || document.getElementById('btnLogout');
    if (btn) btn.onclick = () => { localStorage.removeItem('loggedInUser'); render(); };
    window.addEventListener('storage', (e)=>{ if (e.key === 'loggedInUser') render(); });
    document.addEventListener('visibilitychange', ()=>{ if (!document.hidden) render(); });
    window.addEventListener('pageshow', render);
    render();
  }

  /* ============================ 상단 메뉴 / 패밀리 롤링 ============================ */
  document.addEventListener('DOMContentLoaded', () => {
    // 상단 메뉴 토글
    document.querySelectorAll('.main_bar').forEach(li => {
      const top = li.querySelector(':scope > a');
      const sub = li.querySelector(':scope > .sub_on');
      if (!top || !sub) return;
      top.addEventListener('click', e => { e.preventDefault(); sub.classList.toggle('off'); });
    });

    // 패밀리 롤링
    let num = 0;
    const dts  = Array.from(document.querySelectorAll('.family dt'));
    const size = dts.length;
    if (size) {
      const render = ()=>{ dts.forEach(el=>el.classList.remove('on')); dts[num].classList.add('on'); };
      dts[0].classList.add('on');
      const next = ()=>{ num = (num+1)%size; render(); };
      let auto = setInterval(next, 5000);
      dts.forEach((dt, i)=>dt.addEventListener('click', ()=>{ clearInterval(auto); num = i; render(); }));
    }
  });

  /* ============================ 초기화 ============================ */
  async function init(){
    bindLogin();
    bindHearts();
    await ensureTravel();
    await bindCardClicks();

    const btn = document.querySelector('#btnRecom') || document.querySelector('button#btnRecom');
    if(btn) btn.addEventListener('click', applyRandom);

    resetHeartUIOnly();
    await syncHearts();

    window.addEventListener('pageshow', async ()=>{ resetHeartUIOnly(); await syncHearts(); });
    document.addEventListener('visibilitychange', async ()=>{ if(!document.hidden){ resetHeartUIOnly(); await syncHearts(); } });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();

/* ============================ 선택 타이틀 전달(goPick) ============================ */
async function goPick(selectedTitles){
  try{
    const res = await fetch('js/travel.json', {cache:'no-store'});
    const raw = await res.json();
    const SRC = (()=>{ // 동일 파서 재사용
      // 간단중복: 위의 parseTravel를 외부로 빼기 싫어서 인라인
      if (Array.isArray(raw)) return raw;
      if (raw && Array.isArray(raw.trips)) {
        const out=[]; for(const trip of raw.trips){ for(const day of (trip.days||[])){
          out.push({ day:day?.day, region:day?.region||trip?.region||trip?.title||'', city:day?.city||trip?.city||'', items:day?.items||[], locals:day?.locals||trip?.locals||{}, images:day?.images||trip?.images||{}, order:day?.order||[] });
        }} return out;
      }
      return [];
    })();

    const set = new Set((selectedTitles||[]).map(s=>norm(s)));
    const out = [];
    SRC.forEach(d=>{
      const { day, region, city, items=[], locals={}, images={}, order=[] } = d||{};
      const selItems = items.filter(it=> set.has(norm(it.name)));
      if(!selItems.length) return;
      const selLocals = {}, selImages = {};
      selItems.forEach(it=>{
        const n = it.name;
        if(locals[n]) selLocals[n] = locals[n];
        if(images[n]) selImages[n] = images[n];
      });
      const selOrder = (order&&order.length) ? order.filter(n=>set.has(norm(n))) : selItems.map(it=>it.name);
      out.push({ day, region, city, items: selItems, locals: selLocals, images: selImages, order: selOrder });
    });

    localStorage.setItem('travel_picks_v1', JSON.stringify(out));
  }catch(e){
    console.warn('goPick 저장 실패:', e);
  }
  location.href = 'pages/pick.html';
}
