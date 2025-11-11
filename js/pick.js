(() => {
  // ---------------- 설정 ----------------
  const SAVE_KEY_SELECTED = 'travel_picks_v1';      // 선택(랜덤/선택) 스키마
  const W_KEY             = 'wishList_v1';          // 위시리스트 스키마
  const W_PING            = 'wishList_ping';
  const TRAVEL_JSON_URL   = '../js/travel.json';
  const JSON_SPACE        = 2; // 개발 중 보기 좋게 저장(배포 시 0 권장)

  // ---------------- 공통 유틸 ----------------
  const esc = (s) => String(s ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  const getParam = (k) => {
    try { return new URL(location.href).searchParams.get(k) || ''; }
    catch { return ''; }
  };

  const prettySet = (key, value) =>
    localStorage.setItem(key, JSON.stringify(value, null, JSON_SPACE));

  const prettyGet = (key, fallback = []) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const v = JSON.parse(raw);
      return (v === null || v === undefined) ? fallback : v;
    } catch {
      return fallback;
    }
  };

  // ---------------- travel.json 로드/인덱스 ----------------
  let TRAVEL_DAYS = [];
  let TRAVEL_INDEX = {}; // name => { day, region, city, item, local, image }

  const fetchTravel = async () => {
    const res = await fetch(TRAVEL_JSON_URL, { cache: 'no-store' });
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  };

  async function ensureTravel(){
    if (TRAVEL_DAYS.length) return;
    TRAVEL_DAYS = await fetchTravel();
    TRAVEL_INDEX = {};
    TRAVEL_DAYS.forEach(d=>{
      const {day, region, city, items=[], locals={}, images={}} = d||{};
      items.forEach(it=>{
        const name = it?.name; if(!name) return;
        TRAVEL_INDEX[name] = {
          day, region, city,
          item: it,
          local: locals[name] || null,
          image: images[name] || null
        };
      });
    });
  }

  // ---------------- 로그인 박스 ----------------
  function bindLogin() {
    if (bindLogin.__bound) return; // 중복 방지
    bindLogin.__bound = true;

    const safeUser = () => {
      try { return JSON.parse(localStorage.getItem('loggedInUser') || 'null'); }
      catch { return null; }
    };

    const render = () => {
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

  // ---------------- WishList (스키마 기반) ----------------
  // 스키마: [{day,region,city, items:[{name,type,desc,...}], locals:{name:{...}}, images:{name:url}, order:[name,...]}]

  // 0) 레거시(flat) -> 스키마 업그레이드 (title로 travel.json 매핑)
  async function upgradeLegacyIfNeeded(){
    const cur = prettyGet(W_KEY, []);
    const isSchema = Array.isArray(cur) && cur.every(d => d && Array.isArray(d.items));
    if (isSchema) return;

    // 레거시 형태 예: [{id,title,href,src}, ...]
    if (!Array.isArray(cur) || !cur.length) return;

    await ensureTravel();
    const names = cur.map(x => x?.title).filter(Boolean);
    const set = new Set(names);
    const out = [];

    TRAVEL_DAYS.forEach(d=>{
      const { day, region, city, items=[], locals={}, images={}, order=[] } = d||{};
      const selItems = items.filter(it=>set.has(it.name));
      if(!selItems.length) return;
      const selLocals = {}, selImages = {};
      selItems.forEach(it=>{
        const n = it.name;
        if(locals[n]) selLocals[n] = locals[n];
        if(images[n]) selImages[n] = images[n];
      });
      const selOrder = (order&&order.length) ? order.filter(n=>set.has(n)) : selItems.map(it=>it.name);
      out.push({ day, region, city, items: selItems, locals: selLocals, images: selImages, order: selOrder });
    });

    prettySet(W_KEY, out);
    localStorage.setItem(W_PING, String(Date.now()));
  }

  // 1) 로드 & 플랫 리스트로 변환 (렌더용)
  function wschemaLoad(){
    const days = prettyGet(W_KEY, []);
    return Array.isArray(days) ? days : [];
  }

  function wschemaFlatList(days){
    // order 우선, 없으면 items 순서
    const flat = [];
    for (const d of days){
      const order = Array.isArray(d.order) && d.order.length
        ? d.order
        : (d.items||[]).map(it=>it.name);

      for (const name of order){
        const it = (d.items||[]).find(x=>x.name===name);
        if(!it) continue;
        const title = it.name;
        const href  = `./pick.html?title=${encodeURIComponent(title)}`;
        const src   = (d.images && d.images[title]) ? d.images[title] : '';
        const id    = `${title}|${(src.split('/').pop()||'')}`;
        flat.push({ id, title, href, src });
      }
    }
    return flat;
  }

  // 2) 항목 제거 (title 기준)
  function wschemaRemoveByTitle(title){
    let days = wschemaLoad();
    for(const d of days){
      d.items  = (d.items||[]).filter(it => it?.name !== title);
      if(d.locals) delete d.locals[title];
      if(d.images) delete d.images[title];
      d.order  = (d.order||[]).filter(n => n !== title);
    }
    days = days.filter(d => (d.items||[]).length);
    prettySet(W_KEY, days);
    localStorage.setItem(W_PING, String(Date.now()));
  }

  // 3) 렌더
  const renderWish = async () => {
    const ul    = document.querySelector('.gid_recom');
    const empty = document.querySelector('.grid_not');
    if (!ul || !empty) return;

    await upgradeLegacyIfNeeded(); // 필요 시 1회 변환

    const list = wschemaFlatList(wschemaLoad());

    if (!list.length) {
      ul.innerHTML = '';
      empty.innerHTML = `
        <div class="not_wrap">
          <p class="not_pick">찜한 장소가 없습니다.</p>
        </div>`;
      return;
    }
    empty.innerHTML = '';

    ul.innerHTML = list.map(it => {
      const id    = esc(it.id);
      const href  = esc(it.href || '#');
      const src   = esc(it.src || '');
      const title = esc(it.title || '');
      return `
        <li data-id="${id}" data-title="${title}">
          <a href="${href}" class="recom_img_view" aria-label="${title}">
            <img src="${src}" alt="${title}">
          </a>
          <span class="info_recom">${title}</span>
          <div class="btn_delbox">
            <button class="btn_del"  type="button" aria-label="찜 삭제">삭제</button>
            <button class="btn_modi" type="button" aria-label="찜 수정">수정</button>
            <button class="btn_share"type="button" aria-label="찜 공유">공유</button>
          </div>
        </li>`;
    }).join('');

    // 삭제 버튼
    ul.querySelectorAll('.btn_del').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault(); e.stopPropagation();
        const li = btn.closest('li[data-title]');
        const title = li?.dataset.title;
        if (!title) return;
        wschemaRemoveByTitle(title);
        renderWish();
      };
    });

    // 이미지 로드 실패 시 해당 타이틀 제거
    ul.querySelectorAll('img').forEach(img => {
      img.addEventListener('error', () => {
        const li = img.closest('li[data-title]');
        const title = li?.dataset.title;
        if (!title) return;
        wschemaRemoveByTitle(title);
        renderWish();
      }, { once: true });
    });
  };

  // 저장 변경/탭 복귀 동기화
  window.addEventListener('storage', (e)=>{ if (e.key === W_KEY || e.key === W_PING) renderWish(); });
  document.addEventListener('visibilitychange', ()=>{ if (!document.hidden) renderWish(); });
  window.addEventListener('pageshow', renderWish);

  // ---------------- 선택/원본에서 상세 조회 ----------------
  const findInSelected = (title) => {
    const days = prettyGet(SAVE_KEY_SELECTED, []);
    if (!Array.isArray(days)) return null;
    for (const d of days) {
      const { day, region, city, items = [], locals = {}, images = {} } = d || {};
      for (const it of items) {
        if (it?.name === title) {
          return { day, region, city, item: it, local: locals[title] || null, image: images[title] || null };
        }
      }
    }
    return null;
  };

  const findInJson = async (title) => {
    try {
      const days = await fetchTravel();
      for (const d of (days || [])) {
        const { day, region, city, items = [], locals = {}, images = {} } = d || {};
        for (const it of items) {
          if (it?.name === title) {
            return { day, region, city, item: it, local: locals[title] || null, image: images[title] || null };
          }
        }
      }
    } catch (e) {
      console.warn('travel.json 로드 실패:', e);
    }
    return null;
  };

  // ---------------- 상세 렌더 (pick.html 내 .detail 존재 시) ----------------
  const renderDetailIfAny = async () => {
    const box = document.querySelector('.detail');
    if (!box) return;

    const title = getParam('title');
    if (!title) return;

    let data = findInSelected(title);
    if (!data) data = await findInJson(title);
    if (!data) return;

    const imgEl  = box.querySelector('img');
    const nameEl = box.querySelector('.name');
    const metaEl = box.querySelector('.meta');
    const descEl = box.querySelector('.desc');
    const linkEl = box.querySelector('.link');

    if (nameEl) nameEl.textContent = title;
    if (metaEl) metaEl.textContent = [data.region, data.city, data.item?.type].filter(Boolean).join(' · ');
    if (descEl) descEl.textContent = data.item?.desc || '';
    if (imgEl && data.image) imgEl.src = data.image;

    if (linkEl) {
      const href = data.local?.link || '';
      linkEl.style.display = href ? 'inline-block' : 'none';
      if (href) linkEl.href = href;
    }
  };

  // ---------------- 초기화 ----------------
  const init = () => {
    bindLogin();
    renderWish();        // 목록(.gid_recom/.grid_not)이 있으면 렌더
    renderDetailIfAny(); // 상세(.detail)이 있으면 렌더
  };

  document.readyState !== 'loading'
    ? init()
    : document.addEventListener('DOMContentLoaded', init);
})();
