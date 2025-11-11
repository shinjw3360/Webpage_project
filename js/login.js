document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    
    const idInput = document.getElementById('id');
    const pwInput = document.getElementById('pw');
    const idError = document.getElementById('idError');
    const pwError = document.getElementById('pwError');

    const resetError = (inputEl, errorEl) => {
        inputEl.classList.remove('error');
        if (errorEl) { 
            errorEl.textContent = '';
        }
    };

    const getUsers = () => {
        const usersJSON = localStorage.getItem('users');
        return usersJSON ? JSON.parse(usersJSON) : [];
    };

    loginForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const inputId = idInput.value.trim();
        const inputPw = pwInput.value.trim();

        resetError(idInput, idError);
        resetError(pwInput, pwError);

        let isValid = true;

        if (!inputId) {
            idInput.classList.add('error');
            idError.textContent = '아이디를 입력해주세요.';
            isValid = false;
        }

        if (!inputPw) {
            pwInput.classList.add('error');
            pwError.textContent = '비밀번호를 입력해주세요.';
            isValid = false;
        }

        if (!isValid) {
            return; 
        }

        const users = getUsers();

        const userById = users.find(user => user.id === inputId);

        const foundUser = users.find(user => user.id === inputId && user.pw === inputPw);

        if (foundUser) {
            alert(`${foundUser.name}님, 환영합니다!`);
            localStorage.setItem('loggedInUser', JSON.stringify({
                id: foundUser.id, 
                name: foundUser.name
            }));
            window.location.href = '../index.html';
            
        } else if (userById) {
            pwInput.classList.add('error');
            if (pwError) pwError.textContent = '⚠ 비밀번호가 올바르지 않습니다!';
            pwInput.focus();
            
        } else {
            idInput.classList.add('error');
            pwInput.classList.add('error');

            if (idError) idError.textContent = '⚠ 일치하는 정보가 없습니다!';
            if (pwError) pwError.textContent = ''; 
            
            idInput.focus();
        }
    });
    
    idInput.addEventListener('input', () => resetError(idInput, idError));
    pwInput.addEventListener('input', () => resetError(pwInput, pwError));
});