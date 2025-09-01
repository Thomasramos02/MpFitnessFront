document.addEventListener('DOMContentLoaded', () => {
    if (typeof jwt_decode === 'undefined') {
        console.error('Biblioteca jwt-decode não foi encontrada. Algumas funcionalidades de autenticação podem não funcionar.');
    }
    initHeader();
});

function initHeader() {
    const userAvatarBtn = document.getElementById('user-avatar-btn');
    const userMenu = document.getElementById('user-menu');
    const logoutLink = document.getElementById('logout-link');

    if (userAvatarBtn && userMenu) {
        const dropdownMenu = userMenu.querySelector('.dropdown-menu');
        if (dropdownMenu) {
            userAvatarBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                dropdownMenu.classList.toggle('show');
            });
        }
    }

    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }

    document.addEventListener('click', (event) => {
        if (userMenu && !userMenu.contains(event.target)) {
            userMenu.querySelector('.dropdown-menu')?.classList.remove('show');
        }
    });

    checkAuthAndHeader();
}

function checkAuthAndHeader() {
    const token = localStorage.getItem('jwtToken');
    const userMenu = document.getElementById('user-menu');
    const authLinksContainer = document.getElementById('auth-links-container');
    const adminLinks = document.querySelectorAll('.admin-only');
    const deliveryLink = document.querySelector('a[href="acompanharPedido.html"]');

    let isLoggedIn = false;
    let isAdmin = false;

    if (token) {
        try {
            const decoded = jwt_decode(token);

            if (decoded.exp * 1000 < Date.now()) {
                logout();
                return;
            }

            isLoggedIn = true;

            if (Array.isArray(decoded.role)) {
                isAdmin = decoded.role.includes('ADMIN');
            } else if (typeof decoded.role === 'string') {
                isAdmin = decoded.role.toUpperCase() === 'ADMIN';
            }

        } catch (e) {
            logout();
            return;
        }
    }

    if (userMenu) userMenu.classList.toggle('hidden', !isLoggedIn);
    if (authLinksContainer) authLinksContainer.classList.toggle('hidden', isLoggedIn);
    if (deliveryLink) deliveryLink.classList.toggle('hidden', !isLoggedIn);

    adminLinks.forEach(link => {
        link.classList.toggle('hidden', !isAdmin);
    });
}

function logout() {
    localStorage.removeItem('jwtToken');
    window.location.href = '../index.html';
}

window.checkAuthAndHeader = checkAuthAndHeader;