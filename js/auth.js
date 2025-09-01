// Toast Notification System
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast show';
    toast.style.backgroundColor = type === 'success' ? 'var(--success)' : 'var(--error)';

    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

// Função universal de redirecionamento
function redirectToIndex() {
    // Verifica se já está na página index
    if (window.location.pathname.endsWith('index.html')) return;
    
    // Monta a URL correta para todos os cenários:
    let path = '/index.html';
    
    // Se estiver numa subpasta (como /pages/)
    if (window.location.pathname.includes('/pages/')) {
        path = '../index.html';
    }
    // Se estiver no GitHub Pages
    else if (window.location.host.includes('github.io')) {
        path = '/MpFitnessFront/index.html';
    }
    
    // Força o redirecionamento
    window.location.href = path;
}

// Mostrar formulário de login por padrão
document.addEventListener('DOMContentLoaded', function () {
    showLoginForm();

    // Verifica token na URL (Google Login)
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get("token");
    if (tokenFromUrl) {
        localStorage.setItem("jwtToken", tokenFromUrl);
        showToast('Login realizado com sucesso!');
        redirectToIndex();
    }

    // Verificar se já está logado
    const token = localStorage.getItem('jwtToken');
    if (token) {
        redirectToIndex();
    }
});

// Alternar entre formulários
function showLoginForm() {
    document.getElementById('form-title').textContent = 'Acesse sua conta';
    document.getElementById('form-subtitle').textContent = 'Informe seus dados para entrar';
    document.getElementById('progress-steps').style.display = 'none';

    document.getElementById('register-form-1').classList.remove('active');
    document.getElementById('register-form-2').classList.remove('active');
    document.getElementById('login-form').classList.add('active');

    document.getElementById('login-email').focus();
}

function showRegisterForm() {
    document.getElementById('form-title').textContent = 'Crie sua conta';
    document.getElementById('form-subtitle').textContent = 'Preencha seus dados para continuar';
    document.getElementById('progress-steps').style.display = 'flex';

    document.getElementById('login-form').classList.remove('active');
    document.getElementById('register-form-2').classList.remove('active');
    document.getElementById('register-form-1').classList.add('active');

    // Resetar progresso
    document.getElementById('step-1').classList.add('active');
    document.getElementById('step-1').classList.remove('completed');
    document.getElementById('step-2').classList.remove('active');
    document.getElementById('progress-fill').style.width = '0%';

    document.getElementById('register-name').focus();
}

// Mostrar/ocultar campos de endereço
document.getElementById('address-toggle').addEventListener('click', function () {
    this.classList.toggle('active');
    document.getElementById('address-fields').classList.toggle('active');
});

// Alternar visibilidade da senha
function togglePassword(id, icon) {
    const input = document.getElementById(id);
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Máscara para celular
document.getElementById('register-phone').addEventListener('input', function (e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.substring(0, 11);

    if (value.length > 0) {
        value = value.replace(/^(\d{0,2})(\d{0,5})(\d{0,4})/, function (match, g1, g2, g3) {
            let result = '';
            if (g1) result = `(${g1}`;
            if (g2) result += `) ${g2}`;
            if (g3) result += `-${g3}`;
            return result;
        });
    }

    e.target.value = value;
});

// Máscara para CEP
document.getElementById('register-cep').addEventListener('input', function (e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 8) value = value.substring(0, 8);

    if (value.length > 5) {
        value = value.replace(/^(\d{5})(\d{0,3})/, '$1-$2');
    }

    e.target.value = value;
});

// Buscar CEP via API
function searchCEP() {
    const cep = document.getElementById('register-cep').value.replace(/\D/g, '');

    if (cep.length !== 8) {
        showToast('Digite um CEP válido com 8 dígitos', 'error');
        return;
    }

    const cepSearchBtn = document.querySelector('.cep-search');
    cepSearchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Buscando';
    cepSearchBtn.disabled = true;

    fetch(`https://viacep.com.br/ws/${cep}/json/`)
        .then(response => response.json())
        .then(data => {
            if (data.erro) {
                showToast('CEP não encontrado', 'error');
                return;
            }

            document.getElementById('register-street').value = data.logradouro || '';
            document.getElementById('register-neighborhood').value = data.bairro || '';
            document.getElementById('register-city').value = data.localidade || '';
            document.getElementById('register-state').value = data.uf || '';

            document.getElementById('register-number').focus();
            showToast('Endereço preenchido automaticamente');
        })
        .catch(() => {
            showToast('Erro ao buscar CEP. Preencha manualmente.', 'error');
        })
        .finally(() => {
            cepSearchBtn.innerHTML = '<i class="fas fa-search"></i> Buscar';
            cepSearchBtn.disabled = false;
        });
}

// Validação do passo 1 do cadastro
function validateStep1() {
    let isValid = true;

    // Validar nome
    const name = document.getElementById('register-name');
    if (!name.value || name.value.trim().split(' ').length < 2) {
        name.classList.add('error', 'shake');
        showToast('Digite seu nome completo', 'error');
        isValid = false;
        setTimeout(() => name.classList.remove('shake'), 400);
    } else {
        name.classList.remove('error');
    }

    // Validar email
    const email = document.getElementById('register-email');
    if (!email.value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
        email.classList.add('error', 'shake');
        showToast('Digite um e-mail válido', 'error');
        isValid = false;
        setTimeout(() => email.classList.remove('shake'), 400);
    } else {
        email.classList.remove('error');
    }

    // Validar celular
    const phone = document.getElementById('register-phone');
    const phoneDigits = phone.value.replace(/\D/g, '');
    if (!phoneDigits || phoneDigits.length < 11) {
        phone.classList.add('error', 'shake');
        showToast('Digite um celular válido com DDD', 'error');
        isValid = false;
        setTimeout(() => phone.classList.remove('shake'), 400);
    } else {
        phone.classList.remove('error');
    }

    // Validar senha
    const password = document.getElementById('register-password');
    if (!password.value || password.value.length < 6) {
        password.classList.add('error', 'shake');
        showToast('A senha deve ter 6+ caracteres', 'error');
        isValid = false;
        setTimeout(() => password.classList.remove('shake'), 400);
    } else {
        password.classList.remove('error');
    }

    // Validar confirmação de senha
    const confirm = document.getElementById('register-confirm');
    if (!confirm.value || confirm.value !== password.value) {
        confirm.classList.add('error', 'shake');
        showToast('As senhas não coincidem', 'error');
        isValid = false;
        setTimeout(() => confirm.classList.remove('shake'), 400);
    } else {
        confirm.classList.remove('error');
    }

    if (isValid) {
        goToStep2();
    }
}

// Navegação entre passos do cadastro
function goToStep2() {
    document.getElementById('register-form-1').classList.remove('active');
    document.getElementById('register-form-2').classList.add('active');

    document.getElementById('step-1').classList.remove('active');
    document.getElementById('step-1').classList.add('completed');
    document.getElementById('step-2').classList.add('active');

    document.getElementById('progress-fill').style.width = '100%';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function backToStep1() {
    document.getElementById('register-form-2').classList.remove('active');
    document.getElementById('register-form-1').classList.add('active');

    document.getElementById('step-1').classList.add('active');
    document.getElementById('step-1').classList.remove('completed');
    document.getElementById('step-2').classList.remove('active');

    document.getElementById('progress-fill').style.width = '0%';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Controle de loading nos botões
function showLoading(buttonId) {
    const btn = document.getElementById(buttonId);
    btn.classList.add('loading');
    btn.disabled = true;
}

function hideLoading(buttonId) {
    const btn = document.getElementById(buttonId);
    btn.classList.remove('loading');
    btn.disabled = false;
}

// Enviar formulário de login
async function submitLogin() {
    const email = document.getElementById('login-email');
    const password = document.getElementById('login-password');

    // Validações básicas
    if (!validateEmail(email.value)) {
        showToast('Digite um e-mail válido', 'error');
        email.classList.add('error', 'shake');
        setTimeout(() => email.classList.remove('shake'), 400);
        return;
    }

    if (!password.value) {
        showToast('Digite sua senha', 'error');
        password.classList.add('error', 'shake');
        setTimeout(() => password.classList.remove('shake'), 400);
        return;
    }

    showLoading('login-btn');

    try {
        const response = await fetch('https://mpfitnessback.onrender.com/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email.value,
                senha: password.value
            })
        });

        const result = await response.json();

        if (!response.ok) {
            // Mensagem de erro específica do backend
            const errorMsg = result.error || 'Erro no login';
            showToast(errorMsg, 'error');
            return;
        }

        // Login bem-sucedido
        localStorage.setItem('jwtToken', result.token);
        showToast('Login realizado com sucesso!', 'success');
        setTimeout(redirectToIndex, 1500);

    } catch (error) {
        // Verifica se é realmente um erro de conexão
        if (error instanceof TypeError || error.message.includes('Failed to fetch')) {
            showToast('Erro de conexão com o servidor', 'error');
        } else {
            showToast('Ocorreu um erro inesperado', 'error');
        }
    } finally {
        hideLoading('login-btn');
    }
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Enviar formulário de cadastro
async function submitForm() {
    showLoading('register-btn');

    // Preparar dados do usuário
    const userData = {
        nome: document.getElementById('register-name').value,
        email: document.getElementById('register-email').value,
        telefone: document.getElementById('register-phone').value.replace(/\D/g, ''),
        senha: document.getElementById('register-password').value
    };

    // Adicionar endereço se preenchido
    const cep = document.getElementById('register-cep').value.replace(/\D/g, '');
    const rua = document.getElementById('register-street').value;
    if (cep || rua) {
        userData.endereco = {
            cep: cep,
            rua: rua,
            numero: document.getElementById('register-number').value,
            complemento: document.getElementById('register-complement').value,
            bairro: document.getElementById('register-neighborhood').value,
            cidade: document.getElementById('register-city').value,
            estado: document.getElementById('register-state').value
        };
    }

    try {
        const response = await fetch('https://mpfitnessback.onrender.com/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });

        if (!response.ok) {
            const errorData = await response.json();

            if (response.status === 409) {
                showToast('E-mail já cadastrado', 'error');
            } else if (response.status === 400) {
                showToast('Dados inválidos: ' + (errorData.message || ''), 'error');
            } else {
                showToast('Erro no cadastro: ' + (errorData.message || ''), 'error');
            }
            return;
        }

        showToast('Cadastro realizado! Redirecionando para login...');
        setTimeout(showLoginForm, 2000);

    } catch (error) {
        showToast('Erro de conexão com o servidor', 'error');
    } finally {
        hideLoading('register-btn');
    }
}

// Funções para login Google
function loginWithGoogle() {
    window.location.href = "https://mpfitnessback.onrender.com/oauth2/authorization/google";
}

// Esqueci minha senha
// 1. ADICIONE ESTA NOVA FUNÇÃO PARA MOSTRAR O FORMULÁRIO CORRETO
function showForgotPasswordForm() {
    document.getElementById('form-title').textContent = 'Recuperar Senha';
    document.getElementById('form-subtitle').textContent = 'Digite seu e-mail para continuar';
    document.getElementById('progress-steps').style.display = 'none';

    // Esconde os outros formulários
    document.getElementById('login-form').classList.remove('active');
    document.getElementById('register-form-1').classList.remove('active');
    document.getElementById('register-form-2').classList.remove('active');
    
    // Mostra o formulário de recuperação
    document.getElementById('forgot-password-form').classList.add('active');

    document.getElementById('forgot-email').focus();
}

// 2. ADICIONE ESTA NOVA FUNÇÃO PARA ENVIAR OS DADOS AO BACKEND
async function submitForgotPassword() {
    const emailInput = document.getElementById('forgot-email');
    const email = emailInput.value;

    if (!validateEmail(email)) {
        showToast('Por favor, insira um e-mail válido', 'error');
        emailInput.classList.add('error', 'shake');
        setTimeout(() => emailInput.classList.remove('shake'), 400);
        return;
    }
    
    // ATENÇÃO: Pedindo a nova senha diretamente. Isso NÃO é seguro para produção!
    const novaSenha = prompt("Para fins de teste, digite a NOVA senha:");

    if (!novaSenha || novaSenha.length < 6) {
        showToast('A nova senha deve ter pelo menos 6 caracteres.', 'error');
        return;
    }
    
    showLoading('forgot-btn'); // Supondo que o botão tenha o id 'forgot-btn'

    try {
        const response = await fetch('https://mpfitnessback.onrender.com/api/auth/forgot-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: email, novaSenha: novaSenha })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'E-mail não encontrado');
        }

        showToast('Senha alterada com sucesso! Faça o login.', 'success');
        setTimeout(showLoginForm, 2000);

    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideLoading('forgot-btn');
    }
}


// 3. ALTERE O EVENT LISTENER ORIGINAL PARA CHAMAR A FUNÇÃO showForgotPasswordForm
document.getElementById('forgot-password').addEventListener('click', function (e) {
    e.preventDefault();
    showForgotPasswordForm(); // Apenas mostra o formulário
});

// Função de validação de e-mail (se ainda não tiver)
function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
