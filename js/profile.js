// Utility functions
function formatPhone(phone) {
    if (!phone) return '';
    const cleaned = ('' + phone).replace(/\D/g, '');
    const match = cleaned.match(/^(\d{2})(\d{5})(\d{4})$/);
    return match ? `(${match[1]}) ${match[2]}-${match[3]}` : phone;
}

function formatCEP(cep) {
    if (!cep) return '';
    const cleaned = ('' + cep).replace(/\D/g, '');
    const match = cleaned.match(/^(\d{5})(\d{3})$/);
    return match ? `${match[1]}-${match[2]}` : cep;
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${message}`;
    toast.className = `toast ${type} show`;

    setTimeout(() => toast.classList.remove('show'), 3000);
}

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

function togglePassword(id, icon) {
    const input = document.getElementById(id);
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

function toggleSection(sectionId) {
    const sectionTitle = document.querySelector(`.section-title[onclick="toggleSection('${sectionId}')"]`);
    const content = document.getElementById(`${sectionId}-content`);

    sectionTitle.classList.toggle('collapsed');
    content.style.maxHeight = sectionTitle.classList.contains('collapsed') ? '0' : `${content.scrollHeight}px`;
}

// Initialize collapsible sections
function initCollapsibleSections() {
    document.querySelectorAll('.section-title').forEach(section => {
        const contentId = section.getAttribute('onclick').match(/'([^']+)'/)[1];
        const content = document.getElementById(`${contentId}-content`);

        content.style.maxHeight = content.scrollHeight + 'px';

        if (contentId === 'change-password' || contentId === 'address-info') {
            section.classList.add('collapsed');
            content.style.maxHeight = '0';
        }
    });
}

// Profile photo handling
function setupProfilePhoto() {
    document.getElementById('change-photo-btn').addEventListener('click', () => {
        document.getElementById('photo-upload').click();
    });

    document.getElementById('photo-upload').addEventListener('change', (e) => {
        if (e.target.files?.[0]) {
            const reader = new FileReader();
            reader.onload = (event) => {
                document.querySelector('.avatar').innerHTML =
                    `<img src="${event.target.result}" alt="Foto do usuário">`;
                showToast('Foto alterada com sucesso!', 'success');
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    });
}

// Input masks
function setupInputMasks() {
    // Phone mask
    document.getElementById('profile-phone').addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 11) value = value.substring(0, 11);

        if (value.length > 0) {
            value = value.replace(/^(\d{0,2})(\d{0,5})(\d{0,4})/, (_, g1, g2, g3) => {
                let result = '';
                if (g1) result = `(${g1}`;
                if (g2) result += `) ${g2}`;
                if (g3) result += `-${g3}`;
                return result;
            });
        }

        e.target.value = value;
    });

    // CEP mask
    document.getElementById('profile-cep').addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 8) value = value.substring(0, 8);
        if (value.length > 5) value = value.replace(/^(\d{5})(\d{0,3})/, '$1-$2');
        e.target.value = value;
    });
}

// CEP search
async function searchCEP() {
    const cep = document.getElementById('profile-cep').value.replace(/\D/g, '');

    if (cep.length !== 8) {
        showToast('Digite um CEP válido com 8 dígitos', 'error');
        return;
    }

    const cepSearchBtn = document.querySelector('.cep-search');
    cepSearchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Buscando';
    cepSearchBtn.disabled = true;

    try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();

        if (data.erro) {
            showToast('CEP não encontrado', 'error');
            return;
        }

        document.getElementById('profile-street').value = data.logradouro || '';
        document.getElementById('profile-neighborhood').value = data.bairro || '';
        document.getElementById('profile-city').value = data.localidade || '';
        document.getElementById('profile-state').value = data.uf || '';
        document.getElementById('profile-number').focus();

        showToast('Endereço preenchido automaticamente', 'success');
    } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        showToast('Erro ao buscar CEP. Preencha manualmente.', 'error');
    } finally {
        cepSearchBtn.innerHTML = '<i class="fas fa-search"></i> Buscar';
        cepSearchBtn.disabled = false;
    }
}

// Load user data
async function loadUserData() {
    try {
        const token = localStorage.getItem('jwtToken');
        if (!token) {
            showToast('Sessão expirada. Faça login novamente.', 'error');
            setTimeout(() => redirectToAuth(), 1500);
            return;
        }

        const response = await fetch('https://mpfitnessback.onrender.com/api/clientes/me', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 403) {
            localStorage.removeItem('jwtToken');
            showToast('Acesso negado. Faça login novamente.', 'error');
            setTimeout(() => redirectToAuth(), 1500);
            return;
        }

        if (!response.ok) {
            throw new Error(await response.text() || 'Erro ao carregar dados');
        }

        const userData = await response.json();

        // Fill form fields
        document.getElementById('profile-name').value = userData.nome || '';
        document.getElementById('profile-email').value = userData.email || '';
        document.getElementById('profile-phone').value = formatPhone(userData.telefone) || '';

        if (userData.endereco) {
            document.getElementById('profile-cep').value = formatCEP(userData.endereco.cep) || '';
            document.getElementById('profile-street').value = userData.endereco.rua || '';
            document.getElementById('profile-number').value = userData.endereco.numero || '';
            document.getElementById('profile-complement').value = userData.endereco.complemento || '';
            document.getElementById('profile-neighborhood').value = userData.endereco.bairro || '';
            document.getElementById('profile-city').value = userData.endereco.cidade || '';
            document.getElementById('profile-state').value = userData.endereco.estado || '';
            document.getElementById('profile-country').value = userData.endereco.pais || 'Brasil';
        }
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        showToast('Erro ao carregar dados do perfil', 'error');
        setTimeout(() => redirectToAuth(), 2000);
    }
}

// Save profile
async function saveProfile() {
    showLoading('save-btn');

    try {
        const token = localStorage.getItem('jwtToken');
        if (!token) {
            redirectToAuth();
            return;
        }

        // Campos de senha
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        // Validação de senha
        if (newPassword || confirmPassword) {
            if (!newPassword || !confirmPassword) {
                throw new Error('Preencha ambos os campos de senha');
            }
            if (newPassword.length < 6) {
                throw new Error('A nova senha deve ter pelo menos 6 caracteres');
            }
            if (newPassword !== confirmPassword) {
                throw new Error('As senhas não coincidem');
            }
        }

        // Dados do perfil
        const userData = {
            nome: document.getElementById('profile-name').value,
            email: document.getElementById('profile-email').value,
            telefone: document.getElementById('profile-phone').value.replace(/\D/g, ''),
            endereco: {
                rua: document.getElementById('profile-street').value,
                numero: document.getElementById('profile-number').value,
                complemento: document.getElementById('profile-complement').value,
                bairro: document.getElementById('profile-neighborhood').value,
                cidade: document.getElementById('profile-city').value,
                estado: document.getElementById('profile-state').value,
                cep: document.getElementById('profile-cep').value.replace(/\D/g, ''),
                pais: "Brasil"
            }
        };

        // Atualizar perfil
        const updateResponse = await fetch('https://mpfitnessback.onrender.com/api/clientes/atualizar', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });

        if (updateResponse.status === 401) {
            redirectToAuth();
            return;
        }
        if (!updateResponse.ok) {
            throw new Error(await updateResponse.text() || 'Erro ao atualizar perfil');
        }

        // Atualizar senha (se necessário)
        if (newPassword) {
            const passwordResponse = await fetch('https://mpfitnessback.onrender.com/api/clientes/atualizar-senha', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ novaSenha: newPassword })
            });

            if (passwordResponse.status === 401) {
                redirectToAuth();
                return;
            }
            if (!passwordResponse.ok) {
                throw new Error(await passwordResponse.text() || 'Erro ao atualizar senha');
            }

            // Limpar campos
            document.getElementById('new-password').value = '';
            document.getElementById('confirm-password').value = '';
        }

        showToast('Perfil atualizado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao salvar perfil:', error);
        showToast(error.message, 'error');
    } finally {
        hideLoading('save-btn');
    }
}


// Delete account
async function deleteAccount() {
    showLoading('delete-btn');

    try {
        const token = localStorage.getItem('jwtToken');
        if (!token) {
            redirectToAuth();
            return;
        }

        const response = await fetch('https://mpfitnessback.onrender.com/api/clientes/remover', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(await response.text() || 'Erro ao excluir conta');
        }

        showToast('Conta excluída com sucesso', 'success');
        setTimeout(() => redirectToIndex(), 1500);
    } catch (error) {
        console.error('Erro ao excluir conta:', error);
        showToast(error.message, 'error');
    } finally {
        hideLoading('delete-btn');
        hideDeleteModal();
    }
}

// Modal functions
function showDeleteModal() {
    document.getElementById('delete-modal').style.display = 'flex';
}

function hideDeleteModal() {
    document.getElementById('delete-modal').style.display = 'none';
}

// Cancel changes
function cancelChanges() {
    if (confirm('Descartar todas as alterações não salvas?')) {
        loadUserData();
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-password').value = '';
    }
}

// Logout
function logout() {
    if (confirm('Deseja realmente sair da sua conta?')) {
        localStorage.removeItem('jwtToken');
        showToast('Você foi desconectado', 'success');
        setTimeout(() => redirectToIndex(), 1000);
    }
}

// Redirection functions
function redirectToIndex() {
    const basePath = window.location.hostname === 'localhost' 
        ? '/index.html' 
        : '/MpFitnessFront/index.html';
    
    window.location.href = window.location.origin + basePath;
}

function redirectToAuth() {
    const basePath = window.location.hostname === 'localhost' 
        ? '/auth.html' 
        : '/MpFitnessFront/auth.html';
    
    window.location.href = window.location.origin + basePath;
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    setupProfilePhoto();
    setupInputMasks();
    initCollapsibleSections();
    loadUserData();
});