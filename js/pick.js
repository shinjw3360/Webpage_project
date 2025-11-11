const qs  = (s, r=document)=>r.querySelector(s);
const qsa = (s, r=document)=>Array.from(r.querySelectorAll(s));


(function () {
  const KEY  = 'wishList_v1';
  const PING = 'wishList_ping';

  // const qs  = (s, r=document)=>r.querySelector(s);
  // console.log(qs);
  // const qsa = (s, r=document)=>Array.from(r.querySelectorAll(s));
  // console.log(qsa);
  const esc = (s)=>String(s ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  const load = ()=>{ try{ const raw=localStorage.getItem(KEY); const d=raw?JSON.parse(raw):[]; return Array.isArray(d)?d:[]; }catch{ return []; } };
  const save = (arr)=>localStorage.setItem(KEY, JSON.stringify(arr));
  const ping = ()=>localStorage.setItem(PING, String(Date.now()));

  const clean = (arr)=>{
    const map = new Map();
    for(const it of arr||[]){
      const id=it?.id?.trim?.(), title=it?.title?.trim?.(), href=it?.href?.trim?.(), src=it?.src?.trim?.();
      if(!id || !title || !href || !src) continue;
      if(!map.has(id)) map.set(id, {id,title,href,src});
    }
    return [...map.values()];
  };

  function removeItem(id){
    const next = load().filter(x=>x.id!==id);
    save(next); ping();
  }

  function bindDeleteButtons($ul){
    qsa('.btn_del', $ul).forEach(btn=>{
      btn.addEventListener('click', (e)=>{
        e.preventDefault(); e.stopPropagation();
        const id = btn.closest('li[data-id]')?.dataset.id;
        if(!id) return;
        removeItem(id);
        render();
      });
    });
  }

  function bindImgGuards($ul){
    qsa('img', $ul).forEach(img=>{
      img.addEventListener('error', ()=>{
        const id = img.closest('li[data-id]')?.dataset.id;
        if(!id) return;
        removeItem(id);
        render();
      }, { once:true });
    });
  }

  function render(){
    console.log("render")
    const $ul = qs('.gid_recom');
    const $empty = qs('.grid_not');
    if(!$ul || !$empty) return;

    const list = clean(load());

    if(!list.length){
      $ul.innerHTML = '';
      $empty.innerHTML = `
        <div class="not_wrap">
          <p class="not_pick">찜한 장소가 없습니다.</p>
        </div>`;
      return;
    }

    $empty.innerHTML = '';
    let html = '';
    for(const it of list){
      const id    = esc(it.id);
      const href  = esc(it.href || '#');
      const src   = esc(it.src);           // index에서 루트(/img/...)로 저장됨
      const title = esc(it.title || '');
      html += `
        <li data-id="${id}">
          <div class="recom_img_view">
            <img src="${src}" alt="${title}">
          </div>
          <span class="info_recom">${title}</span>
          <div class="btn_delbox">
            <button class="btn_del" type="button" aria-label="찜 삭제">삭제</button>
            <button class="btn_modi" type="button" aria-label="찜 수정">수정</button>
            <button class="btn_share" type="button" aria-label="찜 공유">공유</button>
          </div>
        </li>`;
    }
    $ul.innerHTML = html;
    bindDeleteButtons($ul);
    bindImgGuards($ul);
  }

  // boot
  document.readyState!=='loading' ? render() : document.addEventListener('DOMContentLoaded', render);

  // 메인에서 변경되면 즉시 갱신
  window.addEventListener('storage', (e)=>{
    if(e.key===KEY || e.key===PING) render();
  });

  document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) render(); });
})();

  document.addEventListener("DOMContentLoaded",()=>{
    console.log('renderloginUI');
    bindLogin();
  });

function bindLogin(){
  const safeUser = () => {
    try { return JSON.parse(localStorage.getItem('loggedInUser') || 'null'); }
    catch { return null; }
  };

  function renderLoginUI(){
    const user = safeUser();
    console.log(user);
    console.log(qsa('.login_box_wrap'));

    if(user){
      const isLoggedIn = !!user;
      qsa('.login_box').forEach(b => b.style.display = isLoggedIn ? 'block' : 'none');
      qsa('.login_box_wrap').forEach(w => w.style.display = isLoggedIn ? 'none'  : 'block');
    }
    else {
      qsa('.login_box').forEach(b => b.style.display = isLoggedIn ? 'none' : 'block');
      qsa('.login_box_wrap').forEach(w => w.style.display = isLoggedIn ? 'block'  : 'none');
    }

    const nameEl = qs('.login_box .myname');
    if (nameEl) nameEl.textContent = user?.id || user?.name || '';

    document.documentElement.classList.toggle('state-logged-in',  isLoggedIn);
    document.documentElement.classList.toggle('state-logged-out', !isLoggedIn);

  }

  console.log('123');
  // 최초 렌더
  // document.addEventListener("DOMContentLoaded",()=>{
  //   console.log('renderloginUI');
  //   renderLoginUI();
  // });

  try {
  // 로그아웃 버튼
  const btnLogout = qs('#btnLogout');
  if (btnLogout) {
    btnLogout.onclick = () => {
      localStorage.removeItem('loggedInUser');
      renderLoginUI();
    };
  }  
  }catch(e){
    console.log(e)
  }

  // 다른 탭에서 로그인/로그아웃 변경 시 반영
  window.addEventListener('storage', (e)=>{
    console.log('11')
    if (e.key === 'loggedInUser') renderLoginUI();
  });

  // 탭 복귀/BFCache 복귀 시 반영
  document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) renderLoginUI(); });
  window.addEventListener('pageshow', renderLoginUI);
}

function init(){
  bindHearts();
  const btn = qs('#btnRecom') || qs('button');
  if(btn) btn.addEventListener('click', applyRandom);

  // index로 돌아왔을 때 하트 UI만 OFF
  resetHeartUIOnly();
  window.addEventListener('pageshow', ()=> resetHeartUIOnly());
  document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) resetHeartUIOnly(); });

  bindLogin();
}