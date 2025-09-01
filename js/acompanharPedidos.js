document.addEventListener('DOMContentLoaded', () => {
    // ====================== VARIÁVEIS GLOBAIS ======================
    const jwtToken = localStorage.getItem('jwtToken');
    const authLinks = document.getElementById('auth-links-container');
    const userMenu = document.getElementById('user-menu');
    const logoutLink = document.getElementById('logout-link');
    const adminLinks = document.querySelectorAll('.admin-only');
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mainNav = document.getElementById('main-nav');
    const cartCount = document.querySelector('.cart-icon');
    const ordersList = document.getElementById('orders-list');
    const orderDetail = document.getElementById('order-detail');
    const authError = document.getElementById('auth-error');

    // ====================== AUTENTICAÇÃO E HEADER ======================
    function updateHeader() {
        if (jwtToken) {
            const user = decodeToken(jwtToken);
            if (!user) return logout();

            userMenu.classList.remove('hidden');
            authLinks?.classList.add('hidden');
            toggleAdminLinks(user.role === 'ADMIN');
        } else {
            userMenu.classList.add('hidden');
            authLinks?.classList.remove('hidden');
            toggleAdminLinks(false);
        }
    }

    function decodeToken(token) {
        try {
            return jwt_decode(token);
        } catch (e) {
            console.error('Token inválido ou expirado:', e);
            return null;
        }
    }

    function toggleAdminLinks(show) {
        adminLinks.forEach(link => {
            link.style.display = show ? 'flex' : 'none';
        });
    }

    function logout() {
        localStorage.removeItem('jwtToken');
        updateHeader();
        setTimeout(() => window.location.href = 'index.html', 500);
    }

    // ====================== UI AUXILIAR ======================
    function formatDate(dateString) {
        if (!dateString) return 'Aguardando...';
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }

    function formatCurrency(value) {
        return Number(value || 0).toLocaleString('pt-BR', {
            style: 'currency', currency: 'BRL'
        });
    }

    function getStatusClass(status) {
        const map = {
            'AGUARDANDO_PAGAMENTO': 'status-processing',
            'PAGO': 'status-processing',
            'EM_SEPARACAO': 'status-shipped',
            'ENVIADO': 'status-shipped',
            'ENTREGUE': 'status-delivered',
            'CANCELADO': 'status-cancelled'
        };
        return map[status?.toUpperCase()] || '';
    }

    function getStatusText(status) {
        const map = {
            'AGUARDANDO_PAGAMENTO': 'Aguardando Pagamento',
            'PAGO': 'Pago',
            'EM_SEPARACAO': 'Em Separação',
            'ENVIADO': 'Enviado',
            'ENTREGUE': 'Entregue',
            'CANCELADO': 'Cancelado'
        };
        return map[status?.toUpperCase()] || status;
    }

    // ====================== PEDIDOS ======================
    async function loadClientOrders() {
        if (!jwtToken) return showAuthError();
        try {
            // Esconde os detalhes
            orderDetail.classList.remove('active');
            orderDetail.innerHTML = '';

            // Mostra loading
            ordersList.innerHTML = `<div class="loading-message">
                <i class="fas fa-spinner fa-spin"></i> Carregando seus pedidos...
            </div>`;
            ordersList.classList.remove('hidden');

            const user = decodeToken(jwtToken);
            const response = await fetch(`https://mpfitnessback.onrender.com/api/pedidos/clientes/${user.id}/pedidos`, {
                headers: { 'Authorization': `Bearer ${jwtToken}` }
            });
            if (!response.ok) throw await response.json();
            const pedidos = await response.json();
            renderOrdersList(pedidos);
        } catch (err) {
            showError(err.message || 'Erro ao carregar pedidos.');
        }
    }
    window.loadClientOrders = loadClientOrders;


    function renderOrdersList(pedidos) {
        if (!pedidos?.length) {
            ordersList.innerHTML = `
                <div class="order-card">
                    <p>Você ainda não fez nenhum pedido.</p>
                    <a href="../index.html" class="btn btn-primary">
                        <i class="fas fa-shopping-cart"></i> Ir para a loja
                    </a>
                </div>`;
            return;
        }
        ordersList.innerHTML = pedidos.map(p => `
            <div class="order-card">
                <div class="order-card-header">
                    <h2>Pedido #${p.id?.toString().padStart(6, '0')}</h2>
                    <span class="order-status ${getStatusClass(p.statusPedido)}">
                        ${getStatusText(p.statusPedido)}
                    </span>
                </div>
                <div class="order-summary">
                    <p><strong>Data:</strong> ${formatDate(p.dataCompra)}</p>
                    <p><strong>Total:</strong> ${formatCurrency(p.valorTotal)}</p>
                    <p><strong>Entrega:</strong> ${p.formaEntrega === 'ENTREGA' ? 'Envio' : 'Retirada'}</p>
                </div>
                <div class="order-actions">
                    <button class="btn btn-outline" onclick="showOrderDetail(${p.id})">
                        <i class="fas fa-eye"></i> Ver detalhes
                    </button>
                </div>
            </div>`).join('');
    }

    // mostrar detalhes de pedido

    async function showOrderDetail(pedidoId) {
        const jwtToken = localStorage.getItem('jwtToken');
        if (!jwtToken) return;

        try {
            ordersList.innerHTML = `<div class="loading-message">
                <i class="fas fa-spinner fa-spin"></i> Carregando detalhes do pedido...
            </div>`;
            ordersList.classList.add('hidden');

            orderDetail.classList.remove('active');

            const response = await fetch(`https://mpfitnessback.onrender.com/api/pedidos/${pedidoId}`, {
                headers: { 'Authorization': `Bearer ${jwtToken}` }
            });
            if (!response.ok) throw await response.json();

            const pedido = await response.json();
            renderOrderDetail(pedido);

            setTimeout(() => {
                orderDetail.classList.add('active');
            }, 50);
        } catch (err) {
            showError(err.message || 'Erro ao carregar detalhes do pedido.');
        }
    }
    window.showOrderDetail = showOrderDetail;


    function renderOrderDetail(pedido) {
    orderDetail.innerHTML = `
        <div class="order-detail-card">
            <h2>Detalhes do Pedido #${pedido.id.toString().padStart(6, '0')}</h2>
            <p><strong>Status:</strong> ${getStatusText(pedido.status)}</p>
            <p><strong>Data da Compra:</strong> ${formatDate(pedido.dataCompra)}</p>
            <p><strong>Forma de Entrega:</strong> ${pedido.formaEntrega === 'ENTREGA' ? 'Entrega' : 'Retirada'}</p>
            
            ${pedido.formaEntrega === 'ENTREGA' 
                ? `<p><strong>Endereço:</strong> ${pedido.enderecoEntrega?.rua}, ${pedido.enderecoEntrega?.numero} - ${pedido.enderecoEntrega?.bairro}, ${pedido.enderecoEntrega?.cidade} - ${pedido.enderecoEntrega?.estado}</p>` 
                : `<p><strong>Endereço de Retirada:</strong> Rua Alípio Bahia, 7, Bairro Chapadão - Loja 3, Pitangui/MG</p>`}

            <p><strong>Produtos:</strong></p>
            <ul>${pedido.produtos.map(p => `
                <li>${p.quantidade}x ${p.nome} - ${formatCurrency(p.valor)}</li>
            `).join('')}</ul>
            <p><strong>Total:</strong> ${formatCurrency(pedido.valorTotal)}</p>
            ${pedido.codigoRastreamento ? `<p><strong>Rastreamento:</strong> ${pedido.codigoRastreamento}</p>` : ''}
            <p><strong>Observações:</strong> ${pedido.observacoes || 'Nenhuma'}</p>
            <p><strong>Data de Entrega Prevista:</strong> ${pedido.dataEntregaPrevista || ''}</p>

            <button class="btn btn-outline" onclick="loadClientOrders()">
                <i class="fas fa-arrow-left"></i> Voltar para lista
            </button>
        </div>
    `;
}



    function showAuthError() {
        authError?.classList.remove('hidden');
        ordersList?.classList.add('hidden');
    }

    function showError(message) {
        ordersList.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="window.location.reload()">
                    <i class="fas fa-sync-alt"></i> Tentar novamente
                </button>
            </div>`;
    }

    // ====================== EVENTOS ======================
    mobileMenuToggle?.addEventListener('click', () => {
        mainNav.classList.toggle('active');
        document.body.classList.toggle('no-scroll');
    });

    mainNav?.querySelectorAll('.nav-link').forEach(link =>
        link.addEventListener('click', () => {
            mainNav.classList.remove('active');
            document.body.classList.remove('no-scroll');
        })
    );

    logoutLink?.addEventListener('click', e => {
        e.preventDefault();
        logout();
    });

    // ====================== INICIALIZAÇÃO ======================
    updateHeader();
    loadClientOrders();
});