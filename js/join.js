document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signupForm');

    const requiredFields = ['id', 'pw', 'name', 'birth', 'phone'];
    
    const getUsers = () => {
        const usersJSON = localStorage.getItem('users');
        return usersJSON ? JSON.parse(usersJSON) : [];
    };

    const saveUsers = (users) => {
        localStorage.setItem('users', JSON.stringify(users));
    };

    const isIdDuplicate = (id) => {
        const users = getUsers();
        return users.some(user => user.id === id); 
    };

    const resetError = (inputEl, errorEl) => {
        inputEl.classList.remove('error');
        if (errorEl) errorEl.textContent = '';
    };

    const setError = (inputEl, errorEl, message) => {
        inputEl.classList.add('error');
        if (errorEl) errorEl.textContent = message;
    };

    const inputFields = document.querySelectorAll('.box');
    const xBtns = document.querySelectorAll('.x-btn');

    const toggleClear = (inputElement) => {
        const targetId = inputElement.id;
        const button = document.querySelector(`.x-btn[data-target="${targetId}"]`);
        
        if (button) {
            button.style.display = inputElement.value.length > 0 ? 'block' : 'none';
        }
    };

    inputFields.forEach(input => {
        input.addEventListener('input', () => toggleClear(input));
        toggleClear(input);
    });

    xBtns.forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.getAttribute('data-target');
            const targetInput = document.getElementById(targetId);

            if (targetInput) {
                targetInput.value = '';
                targetInput.focus();
                toggleClear(targetInput);

                const errorEl = document.getElementById(targetId + 'Error');
                resetError(targetInput, errorEl);
            }
        });
    });

    signupForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const idInput = document.getElementById('id');
        const pwInput = document.getElementById('pw');
        const mailInput = document.getElementById('mail');
        const nameInput = document.getElementById('name');
        const birthInput = document.getElementById('birth');
        const phoneInput = document.getElementById('phone');
        
        const idError = document.getElementById('idError');
        const pwError = document.getElementById('pwError');

        const id = idInput.value.trim();
        const pw = pwInput.value.trim();

        requiredFields.forEach(fieldId => {
            const inputEl = document.getElementById(fieldId);
            const errorEl = document.getElementById(fieldId + 'Error');
            resetError(inputEl, errorEl);
        });

        let isValid = true;


        requiredFields.forEach(fieldId => {
            const inputEl = document.getElementById(fieldId);
            if (inputEl.value.trim() === '') {
                const errorEl = document.getElementById(fieldId + 'Error');
                setError(inputEl, errorEl, '⚠ 필수 입력 항목입니다 ⚠');
                isValid = false;
            }
        });

        if (!isValid) {
             const firstEmptyField = requiredFields.find(fieldId => document.getElementById(fieldId).value.trim() === '');
             if (firstEmptyField) {
                document.getElementById(firstEmptyField).focus();
             }
            return;
        }

        if (isIdDuplicate(id)) {
            setError(idInput, idError, '이미 사용 중인 아이디입니다.');
            idInput.focus();
            return;
        }
        
        if (pw.length < 6) { 
            setError(pwInput, pwError, '비밀번호는 최소 6자 이상이어야 합니다.');
            pwInput.focus();
            return;
        } 

        const newUser = {
            id: id,
            pw: pw,
            email: mailInput.value.trim(),
            name: nameInput.value.trim(),
            birth: birthInput.value.trim(),
            phone: phoneInput.value.trim()
        };

        const users = getUsers();
        users.push(newUser);
        saveUsers(users);

        alert('회원가입이 완료되었습니다!');
        
        window.location.href = 'login.html';
    });
});