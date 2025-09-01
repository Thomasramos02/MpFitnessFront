document.addEventListener("DOMContentLoaded", () => {
    // --- Elementos do DOM ---
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mainNav = document.getElementById('main-nav');
    const authLinksContainer = document.getElementById('auth-links-container');
    const userMenu = document.getElementById('user-menu');
    const userAvatarBtn = document.getElementById('user-avatar-btn');
    const logoutLink = document.getElementById('logout-link');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const productsGrid = document.getElementById("productsGrid");
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    const cartNotification = document.getElementById('cart-notification');

    // --- Variáveis de Estado ---
    let allProducts = [];
    let filteredProducts = [];
    let displayedProductsCount = 0;
    const PRODUCTS_PER_LOAD = 8;
    let currentFilter = 'all';

    const IMAGE_BASE_URL = 'https://mpfitnessback.onrender.com';
    const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5TZW0gSW1hZ2VtPC90ZXh0Pjwvc3ZnPg==';

    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (token) {
        localStorage.setItem('jwtToken', token);
        const newUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
    }

    // --- Funções de Autenticação e Header ---
    function checkAdminRole() {
        const token = localStorage.getItem('jwtToken');
        if (!token) return false;
        try {
            const decoded = jwt_decode(token);
            return decoded.role && decoded.role === "ADMIN";
        } catch (e) {
            return false;
        }
    }

    function checkAuthAndHeader() {
        const jwtToken = localStorage.getItem('jwtToken');
        const adminProductsLink = document.querySelector('a[href="./pages/manage-products.html"]');
        const adminOrdersLink = document.querySelector('a[href="./pages/manage_pedidos.html"]');
        const acompanharPedidoLink = document.querySelector('a[href="./pages/acompanharPedido.html"]');

        if (adminProductsLink) adminProductsLink.classList.add('hidden');
        if (adminOrdersLink) adminOrdersLink.classList.add('hidden');

        if (acompanharPedidoLink) {
            if (jwtToken) {
                acompanharPedidoLink.classList.remove('hidden');
            } else {
                acompanharPedidoLink.classList.add('hidden');
            }
        }

        if (jwtToken) {
            authLinksContainer.classList.add('hidden');
            userMenu.classList.remove('hidden');
            if (checkAdminRole()) {
                if (adminProductsLink) adminProductsLink.classList.remove('hidden');
                if (adminOrdersLink) adminOrdersLink.classList.remove('hidden');
            }
        } else {
            authLinksContainer.classList.remove('hidden');
            userMenu.classList.add('hidden');
        }
    }

    function logout() {
        localStorage.removeItem('jwtToken');
        checkAuthAndHeader();
        showNotification('Você foi desconectado com sucesso.', 'info');
        setTimeout(() => window.location.href = '../index.html', 1500);
    }

    // --- Funções de UI Auxiliares ---
    function showNotification(message, type = 'success') {
        cartNotification.textContent = '';
        cartNotification.className = `notification notification-${type}`;
        const iconClass = {
            success: 'fa-check-circle',
            error: 'fa-times-circle',
            info: 'fa-info-circle',
            warning: 'fa-exclamation-triangle'
        }[type] || 'fa-info-circle';
        cartNotification.innerHTML = `<i class="fas ${iconClass}"></i> ${message}`;
        cartNotification.classList.add('show');
        setTimeout(() => {
            cartNotification.classList.remove('show');
            setTimeout(() => cartNotification.innerHTML = '', 300);
        }, 3000);
    }

    function showLoadingSkeleton(count) {
        productsGrid.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const skeleton = document.createElement('div');
            skeleton.className = 'product-card-skeleton';
            productsGrid.appendChild(skeleton);
        }
    }

    function renderProducts(productsToDisplay, append = false) {
        if (!append) productsGrid.innerHTML = '';
        if (productsToDisplay.length === 0 && !append) {
            productsGrid.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-box-open"></i>
                    <p>Nenhum produto disponível nesta categoria no momento.</p>
                </div>`;
            loadMoreBtn.style.display = 'none';
            return;
        }
        productsToDisplay.forEach(produto => {
            const productCard = document.createElement("div");
            productCard.className = "product-card animate__animated animate__fadeInUp";
            const precoExibido = produto.emOferta && produto.valorPromocional ? produto.valorPromocional : produto.valor;
            let imageUrl = produto.img && produto.img.startsWith('http') ? produto.img : (produto.img ? `${IMAGE_BASE_URL}/${produto.img}` : PLACEHOLDER_IMAGE);

            productCard.innerHTML = `
                <div class="product-image-container">
                    <img src="${imageUrl}" alt="${produto.nome}" class="product-image" onerror="this.src='${PLACEHOLDER_IMAGE}'">
                    ${produto.emOferta ? '<span class="product-badge sale">Oferta</span>' : ''}
                </div>
                <div class="product-info">
                    <h3 class="product-title">${produto.nome}</h3>
                    ${produto.descricao ? `<p class="product-description">${produto.descricao}</p>` : ''}
                    <div class="product-price-container">
                        ${produto.emOferta && produto.valorPromocional ? `<span class="product-original-price">R$ ${produto.valor.toFixed(2).replace('.', ',')}</span>` : ''}
                        <span class="product-price">R$ ${precoExibido.toFixed(2).replace('.', ',')}</span>
                    </div>
                    <button class="add-to-cart-btn" data-id="${produto.id}">
                        <i class="fas fa-shopping-cart"></i> Adicionar ao Carrinho
                    </button>
                </div>`;
            productsGrid.appendChild(productCard);
        });
        attachProductButtonListeners();
    }

    function attachProductButtonListeners() {
        productsGrid.querySelectorAll('.add-to-cart-btn').forEach(btn => {
            btn.removeEventListener('click', addToCart);
            btn.addEventListener('click', addToCart);
        });
    }

    function applyFilter(filter) {
        currentFilter = filter;
        filterBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });

        if (filter === 'all') {
            filteredProducts = allProducts;
        } else {
            filteredProducts = allProducts.filter(p => p.categoria && p.categoria.toLowerCase() === filter.toLowerCase());
        }

        displayedProductsCount = Math.min(PRODUCTS_PER_LOAD, filteredProducts.length);
        renderProducts(filteredProducts.slice(0, displayedProductsCount));
        loadMoreBtn.style.display = (filteredProducts.length > displayedProductsCount) ? 'block' : 'none';
        updateProductsCount(filter, filteredProducts.length);
    }

    function updateProductsCount(filter, count) {
        const sectionHeader = document.querySelector('.section-header');
        let countElement = sectionHeader.querySelector('.products-count');

        if (!countElement) {
            countElement = document.createElement('div');
            countElement.className = 'products-count';
            sectionHeader.appendChild(countElement);
        }

        const filterText = filter === 'all' ? '' : ` em ${filter}`;
        countElement.textContent = `${count} produto${count !== 1 ? 's' : ''} encontrado${count !== 1 ? 's' : ''}${filterText}`;
    }

    function getClienteIdFromToken() {
        const token = localStorage.getItem('jwtToken');
        if (!token) return null;
        try {
            const decoded = jwt_decode(token);
            return decoded.id || decoded.userId || decoded.sub || null;
        } catch (e) {
            return null;
        }
    }

    function addToCart(e) {
        if (!e || !e.currentTarget) return;

        const button = e.currentTarget;
        const produtoId = button.dataset.id;
        const token = localStorage.getItem('jwtToken');

        if (!token) {
            showNotification('Você precisa estar logado para comprar.', 'error');
            setTimeout(() => window.location.href = './pages/auth.html', 1500);
            return;
        }

        const clienteId = getClienteIdFromToken();
        if (!clienteId) {
            showNotification('Sessão inválida. Por favor, faça login novamente.', 'error');
            logout(); // Desloga o usuário se o token for inválido
            return;
        }

        const originalButtonHTML = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adicionando...';
        button.disabled = true;

        fetch(`https://mpfitnessback.onrender.com/clientes/${clienteId}/carrinho/adicionar/${produtoId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
            .then(async res => {
                if (!res.ok) {
                    // Tenta extrair a mensagem de erro específica do backend
                    const errorData = await res.json().catch(() => ({}));
                    const errorMessage = errorData.message || `Erro do servidor: ${res.status}`;
                    throw new Error(errorMessage);
                }
                return res.json();
            })
            .then(carrinho => {
                updateCartCount(carrinho.itens ? carrinho.itens.length : 0);
                showNotification('Produto adicionado ao carrinho!', 'success');
            })
            .catch(err => {
                showNotification(err.message, 'error');
            })
            .finally(() => {
                if (document.body.contains(button)) {
                    button.innerHTML = originalButtonHTML;
                    button.disabled = false;
                }
            });
    }

    function updateCartCount(count) {
        const cartIcons = document.querySelectorAll('.nav-link.cart-icon');
        if (cartIcons.length === 0) return;

        cartIcons.forEach(icon => {
            icon.setAttribute('data-count', count);
            icon.classList.add('item-added');
            setTimeout(() => icon.classList.remove('item-added'), 500);
        });
    }

    // --- Event Listeners ---
    mobileMenuToggle.addEventListener('click', () => {
        mainNav.classList.toggle('active');
        document.body.classList.toggle('no-scroll');
    });

    mainNav.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            mainNav.classList.remove('active');
            document.body.classList.remove('no-scroll');
        });
    });

    if (userAvatarBtn) {
        userAvatarBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userMenu.querySelector('.dropdown-menu').classList.toggle('show');
        });
        document.addEventListener('click', (e) => {
            if (userMenu && !userMenu.contains(e.target)) {
                userMenu.querySelector('.dropdown-menu').classList.remove('show');
            }
        });
    }

    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
            userMenu.querySelector('.dropdown-menu').classList.remove('show');
        });
    }

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => applyFilter(btn.dataset.filter));
    });

    loadMoreBtn.addEventListener('click', () => {
        const nextProductsToLoad = filteredProducts.slice(displayedProductsCount, displayedProductsCount + PRODUCTS_PER_LOAD);
        renderProducts(nextProductsToLoad, true);
        displayedProductsCount += nextProductsToLoad.length;
        if (displayedProductsCount >= filteredProducts.length) {
            loadMoreBtn.style.display = 'none';
        }
    });

    // --- Inicialização da Página ---
    function initializePage() {
        showLoadingSkeleton(PRODUCTS_PER_LOAD);
        checkAuthAndHeader();

        fetch("https://mpfitnessback.onrender.com/api/produtos/ativos")
            .then(res => {
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}`);
                }
                return res.json();
            })
            .then(produtos => {
                // Filtra produtos para incluir apenas aqueles com estoque positivo
                const produtosEmEstoque = produtos.filter(p => p.quantidade > 0);

                const enhancedProducts = produtosEmEstoque.map(p => ({
                    ...p,
                    categoria: p.categoria || 'Geral',
                    novo: Math.random() < 0.3,
                    emOferta: Math.random() < 0.5,
                    valorPromocional: p.valor * (0.7 + Math.random() * 0.2),
                    avaliacao: Math.floor(Math.random() * 2) + 4,
                    avaliacoes: Math.floor(Math.random() * 50) + 5,
                }));

                allProducts = enhancedProducts;
                applyFilter('all');
            })
            .catch(err => {
                // Deixa um log de erro no console para o desenvolvedor
                console.error("Falha ao carregar produtos:", err);

                let userMessage = "Não foi possível carregar os produtos. Por favor, tente novamente mais tarde.";
                if (err instanceof TypeError) {
                    userMessage = "Erro de conexão. Verifique sua internet e tente novamente.";
                }

                productsGrid.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>${userMessage}</p>
                        <button class="btn-primary" onclick="window.location.reload()">
                            <i class="fas fa-sync-alt"></i> Tentar Novamente
                        </button>
                    </div>`;
            });
    }

    // Inicia a aplicação
    initializePage();
});