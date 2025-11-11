
document.addEventListener('DOMContentLoaded', () => {
  const LOGIN_PATH = './login.html'; // 로그인 페이지 경로(같은 /pages 폴더라 가정)

  // 1) 로그인 사용자 확인
  const saved = localStorage.getItem('loggedInUser');
  if (!saved) return location.href = LOGIN_PATH;
  const sessionUser = JSON.parse(saved); // {id, name}

  // 2) 전체 회원 목록에서 현재 사용자 찾기
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  const meIdx = users.findIndex(u => u.id === sessionUser.id);
  const me = meIdx >= 0 ? users[meIdx] : sessionUser;

  // 3) 폼 요소 참조
  const $ = (id) => document.getElementById(id);
  const idEl    = $('id');
  const pwEl    = $('pw');
  const mailEl  = $('mail');
  const nameEl  = $('name');
  const birthEl = $('birth');
  const phoneEl = $('phone');
  const btnSave = document.getElementById('createId');

  // 4) 화면에 값 바인딩(비밀번호는 보안상 미표시)
  idEl.value    = me.id || '';
  nameEl.value  = me.name || '';
  mailEl.value  = me.email || me.mail || '';
  birthEl.value = me.birth || '';
  phoneEl.value = me.phone || '';

  // 5) X 버튼(지우기)
  document.querySelectorAll('.x-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = $(btn.dataset.target);
      if (target && !target.readOnly) {
        target.value = '';
        target.focus();
      }
    });
  });

  // 6) 저장(변경) 처리
  btnSave.closest('form').addEventListener('submit', (e) => {
    e.preventDefault();

    // 간단 검증
    const errs = {
      name:  !nameEl.value.trim(),
      pw:    pwEl.value && pwEl.value.length < 4, // 비번 변경 시 4자 이상 권장
      phone: phoneEl.value && !/^01[016789]-?\d{3,4}-?\d{4}$/.test(phoneEl.value),
      mail:  mailEl.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mailEl.value)
    };
    $('nameError').textContent  = errs.name  ? '이름을 입력하세요.' : '';
    $('pwError').textContent    = errs.pw    ? '비밀번호는 4자 이상.' : '';
    $('phoneError').textContent = errs.phone ? '휴대전화 형식을 확인하세요.' : '';
    // birthError는 readonly라 생략

    if (errs.name || errs.pw || errs.phone || errs.mail) return;

    // 업데이트할 객체 생성(기존 값 보존 + 변경분 반영)
    const next = {
      ...me,
      id: idEl.value,                          // readonly
      name: nameEl.value.trim(),
      email: mailEl.value.trim(),
      birth: birthEl.value,                    // readonly
      phone: phoneEl.value.trim()
    };
    // 비번 입력이 있으면 변경
    if (pwEl.value.trim()) next.pw = pwEl.value.trim();

    // users 배열 업데이트
    if (meIdx >= 0) {
      users[meIdx] = next;
    } else {
      users.push(next);
    }
    localStorage.setItem('users', JSON.stringify(users));

    // 헤더/환영문구 등에 쓰는 loggedInUser.name도 갱신
    localStorage.setItem('loggedInUser', JSON.stringify({ id: next.id, name: next.name }));

    alert('변경되었습니다. 다시 로그인 해주세요.');
    location.href = LOGIN_PATH; // 로그인 페이지로 이동
  });
});