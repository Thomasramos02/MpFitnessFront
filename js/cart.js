document.addEventListener("DOMContentLoaded", () => {
    const cartItemsList = document.getElementById('cartItemsList');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const addressSelection = document.getElementById('addressSelection');
    const savedAddress = document.getElementById('savedAddress');
    const addressForm = document.getElementById('addressForm');
    const deliveryOptions = document.querySelectorAll('input[name="delivery"]');
    const addressOptions = document.querySelectorAll('input[name="address-option"]');
    const cartNotification = document.getElementById('cart-notification');
    const cartCountElement = document.querySelector('.cart-icon');
    const subtotalElement = document.querySelector('.subtotal');
    const shippingElement = document.querySelector('.shipping-value');
    const totalElement = document.querySelector('.total-price');
    const itemsCountElement = document.querySelector('.items-count');
    const cepInput = document.getElementById('cep');

    let cartItems = [];
    let clienteId = null;
    let clienteEndereco = null;
    let freteCalculado = 0;
    let cliente = null;

    function parseJwt(token) {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c =>
            '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        ).join(''));
        return JSON.parse(jsonPayload);
    }

    // checkAuth() simplificado para apenas retornar clienteId ou false
    function checkAuth() {
        const jwtToken = localStorage.getItem('jwtToken');
        if (jwtToken) {
            try {
                const payload = parseJwt(jwtToken);
                clienteId = payload.id;
                return clienteId;
            } catch (error) {
                return false;
            }
        }
        return false;
    }

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

    async function loadCartItems() {
        try {
            const jwtToken = localStorage.getItem('jwtToken');
            const response = await fetch(`https://mpfitnessback.onrender.com/clientes/${clienteId}/carrinho`, {
                headers: {
                    'Authorization': `Bearer ${jwtToken}`
                }
            });

            if (response.status === 404) {
                // Carrinho não existe ainda → cliente não colocou nada
                cartItems = [];
                renderCartItems();
                updateCartSummary();
                updateCartCount();
                checkoutBtn.disabled = true;
                return;
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Erro ao carregar carrinho');
            }

            const carrinho = await response.json();

            cartItems = carrinho.itens ? carrinho.itens.map(item => ({
                id: item.produto.id,
                nome: item.produto.nome,
                descricao: item.produto.descricao,
                img: item.produto.img,
                valor: item.produto.valor,
                quantidade: item.quantidade
            })) : [];

            renderCartItems();
            updateCartSummary();
            updateCartCount();

            checkoutBtn.disabled = cartItems.length === 0;
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }

    async function loadSavedAddress() {
        try {
            const jwtToken = localStorage.getItem('jwtToken');
            const response = await fetch('https://mpfitnessback.onrender.com/api/clientes/endereco', {
                headers: {
                    'Authorization': `Bearer ${jwtToken}`
                }
            });

            if (!response.ok) {
                throw new Error('Erro ao carregar endereço');
            }

            clienteEndereco = await response.json();

            if (clienteEndereco && clienteEndereco.rua) {
                savedAddress.innerHTML = `
                        <div class="address-info">
                            <p><strong>Endereço:</strong> ${clienteEndereco.rua}, ${clienteEndereco.numero}</p>
                            ${clienteEndereco.complemento ? `<p><strong>Complemento:</strong> ${clienteEndereco.complemento}</p>` : ''}
                            <p><strong>Bairro:</strong> ${clienteEndereco.bairro}</p>
                            <p><strong>Cidade:</strong> ${clienteEndereco.cidade} - ${clienteEndereco.estado}</p>
                            <p><strong>CEP:</strong> ${clienteEndereco.cep}</p>
                        </div>
                    `;
                document.getElementById('use-saved-address').disabled = false;

                if (document.querySelector('input[name="delivery"]:checked').value === 'ENTREGA') {
                    calculateShipping(clienteEndereco.cep);
                }
            } else {
                savedAddress.innerHTML = '<p class="no-address">Nenhum endereço cadastrado</p>';
                document.getElementById('use-new-address').checked = true;
                document.getElementById('use-saved-address').disabled = true;
                toggleAddressForm();
            }
        } catch (error) {
            savedAddress.innerHTML = '<p class="no-address">Erro ao carregar endereço</p>';
            document.getElementById('use-new-address').checked = true;
            document.getElementById('use-saved-address').disabled = true;
            toggleAddressForm();
        }
    }

    function toggleAddressForm() {
        const useSaved = document.getElementById('use-saved-address').checked;
        savedAddress.classList.toggle('hidden', !useSaved);
        addressForm.classList.toggle('hidden', useSaved);

        if (!useSaved) {
            freteCalculado = 0;
            updateCartSummary();
        }
    }

    function renderCartItems() {
        if (cartItems.length === 0) {
            cartItemsList.innerHTML = `
                    <div class="cart-empty">
                        <i class="fas fa-shopping-cart"></i>
                        <p>Seu carrinho está vazio</p>
                        <a href="../index" class="btn-primary">Continuar Comprando</a>
                    </div>`;
            return;
        }

        let html = '';
        cartItems.forEach(item => {
            html += `
                    <div class="cart-item" data-id="${item.id}">
                        <div class="item-image">
                            <img src="${item.img || 'https://via.placeholder.com/150?text=Produto'}" alt="${item.nome}">
                        </div>
                        <div class="item-details">
                            <h3 class="item-title">${item.nome}</h3>
                            <p class="item-description">${item.descricao || 'Sem descrição'}</p>
                            <div class="item-price">R$ ${item.valor.toFixed(2).replace('.', ',')}</div>
                        </div>
                        <div class="item-actions">
                            <div class="quantity-control">
                                <button class="quantity-btn minus" data-id="${item.id}">
                                    <i class="fas fa-minus"></i>
                                </button>
                                <span class="quantity">${item.quantidade}</span>
                                <button class="quantity-btn plus" data-id="${item.id}">
                                    <i class="fas fa-plus"></i>
                                </button>
                            </div>
                            <button class="remove-btn" data-id="${item.id}">
                                <i class="fas fa-trash"></i> Remover
                            </button>
                        </div>
                    </div>`;
        });

        cartItemsList.innerHTML = html;
        attachItemEventListeners();
    }

    async function calculateShipping(cep) {
        if (!cep || cep.length < 8) {
            shippingElement.textContent = 'A calcular';
            freteCalculado = 0;
            updateCartSummary();
            return;
        }

        shippingElement.textContent = 'Calculando...';

        try {
            const primeiroDigito = cep.charAt(0);
            const pesoTotal = cartItems.reduce((sum, item) => sum + (item.quantidade * 0.5), 0);

            const tabelaFrete = {
                '0': { base: 30.00, adicional: 2.50 },
                '1': { base: 25.00, adicional: 2.00 },
                '2': { base: 20.00, adicional: 1.50 },
                '3': { base: 18.00, adicional: 1.20 },
                '4': { base: 12.00, adicional: 1.00 },
                '8': { base: 22.00, adicional: 1.80 },
                '9': { base: 25.00, adicional: 2.00 }
            };

            const configFrete = tabelaFrete[primeiroDigito] || { base: 30.00, adicional: 2.50 };

            freteCalculado = configFrete.base +
                (configFrete.adicional * cartItems.length) +
                (pesoTotal * 0.5);

            freteCalculado = Math.max(freteCalculado, 15.00);

            freteCalculado = parseFloat(freteCalculado.toFixed(2));

            shippingElement.textContent = `R$ ${freteCalculado.toFixed(2).replace('.', ',')}`;

            updateCartSummary();

        } catch (error) {
            shippingElement.textContent = 'Erro ao calcular';
            freteCalculado = 0;
            updateCartSummary();
        }
    }

    function updateCartSummary() {
        const subtotal = cartItems.reduce((sum, item) => sum + (item.valor * item.quantidade), 0);
        const formaEntrega = document.querySelector('input[name="delivery"]:checked').value;

        const frete = formaEntrega === 'RETIRADA' ? 0 : freteCalculado;

        const total = subtotal + frete;

        subtotalElement.textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;

        if (formaEntrega === 'RETIRADA') {
            shippingElement.textContent = 'Grátis';
        } else if (freteCalculado === 0) {
            shippingElement.textContent = 'A calcular';
        }

        totalElement.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;

        const totalItems = cartItems.reduce((sum, item) => sum + item.quantidade, 0);
        itemsCountElement.textContent = `${totalItems} ${totalItems === 1 ? 'item' : 'itens'}`;
    }

    function updateCartCount() {
        const totalItems = cartItems.reduce((sum, item) => sum + item.quantidade, 0);
        cartCountElement.setAttribute('data-count', totalItems);
    }

    async function removeItem(productId) {
        if (!clienteId) return;

        try {
            const jwtToken = localStorage.getItem('jwtToken');
            const response = await fetch(
                `https://mpfitnessback.onrender.com/clientes/${clienteId}/carrinho/remover/${productId}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${jwtToken}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Erro ao remover item');
            }

            const updatedCart = await response.json();
            cartItems = updatedCart.itens.map(item => ({
                id: item.produto.id,
                nome: item.produto.nome,
                descricao: item.produto.descricao,
                img: item.produto.img,
                valor: item.produto.valor,
                quantidade: item.quantidade
            }));

            renderCartItems();
            updateCartSummary();
            updateCartCount();
            showNotification('Item removido do carrinho', 'success');

            checkoutBtn.disabled = cartItems.length === 0;

            if (document.querySelector('input[name="delivery"]:checked').value === 'ENTREGA') {
                const cep = document.getElementById('cep')?.value || (clienteEndereco?.cep || '');
                if (cep) {
                    calculateShipping(cep);
                }
            }
        } catch (error) {
            showNotification('Erro ao remover item', 'error');
        }
    }

    async function updateItemQuantity(productId, newQuantity) {
        if (!clienteId || newQuantity < 1) return;

        try {
            // Primeiro verifica o estoque disponível
            const stockResponse = await fetch(`https://mpfitnessback.onrender.com/api/produtos/${productId}/estoque`);
            if (!stockResponse.ok) {
                throw new Error('Erro ao verificar estoque');
            }

            const stockData = await stockResponse.json();
            const estoqueDisponivel = stockData.quantidade;

            if (newQuantity > estoqueDisponivel) {
                showNotification(`Quantidade solicitada (${newQuantity}) maior que o estoque disponível (${estoqueDisponivel})`, 'error');
                return;
            }

            const jwtToken = localStorage.getItem('jwtToken');
            const response = await fetch(
                `https://mpfitnessback.onrender.com/clientes/${clienteId}/carrinho/atualizar/${productId}?quantidade=${newQuantity}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${jwtToken}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Erro ao atualizar quantidade');
            }

            const updatedCart = await response.json();
            cartItems = updatedCart.itens.map(item => ({
                id: item.produto.id,
                nome: item.produto.nome,
                descricao: item.produto.descricao,
                img: item.produto.img,
                valor: item.produto.valor,
                quantidade: item.quantidade
            }));

            renderCartItems();
            updateCartSummary();
            updateCartCount();

            if (document.querySelector('input[name="delivery"]:checked').value === 'ENTREGA') {
                const cep = document.getElementById('cep')?.value || (clienteEndereco?.cep || '');
                if (cep) {
                    calculateShipping(cep);
                }
            }
        } catch (error) {
            showNotification(error.message || 'Erro ao atualizar quantidade', 'error');
        }
    }

    async function createMercadoPagoPreference(pedidoId) {
        try {
            for (const item of cartItems) {
                if (!item.valor || item.valor <= 0) {
                    throw new Error(`Valor inválido para o produto ${item.nome}`);
                }
                if (!item.quantidade || item.quantidade <= 0) {
                    throw new Error(`Quantidade inválida para o produto ${item.nome}`);
                }
            }

            const jwtToken = localStorage.getItem('jwtToken');
            if (!jwtToken) {
                throw new Error('Usuário não autenticado');
            }

            const formaEntrega = document.querySelector('input[name="delivery"]:checked').value;
            const frete = formaEntrega === 'ENTREGA' ? freteCalculado : 0;

            const produtosFormatados = cartItems.map(item => ({
                id: item.id,
                nome: item.nome,
                descricao: item.descricao || '',
                img: item.img || 'https://via.placeholder.com/150',
                valor: Number(item.valor),
                quantidade: Number(item.quantidade)
            }));

            const response = await fetch(`https://mpfitnessback.onrender.com/api/payments/create-preference/${pedidoId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${jwtToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    produtos: produtosFormatados,
                    formaEntrega: formaEntrega,
                    valorFrete: frete
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erro ao criar preferência');
            }

            return await response.json();

        } catch (error) {
            throw error;
        }
    }

    async function loadClienteData() {
        if (!clienteId) return;
        try {
            const jwtToken = localStorage.getItem('jwtToken');
            const response = await fetch(`https://mpfitnessback.onrender.com/api/clientes/telefone`, {
                headers: {
                    'Authorization': `Bearer ${jwtToken}`
                }
            });
            if (!response.ok) {
                throw new Error('Não foi possível carregar os dados do cliente.');
            }
            cliente = await response.json();
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }

    async function checkout() {
        if (!cliente || !cliente.telefone) {
            showNotification('É necessário ter um telefone cadastrado para finalizar a compra. Por favor, atualize seu perfil.', 'error');
            return;
        }
        if (!clienteId || cartItems.length === 0) return;

        const formaEntrega = document.querySelector('input[name="delivery"]:checked').value;
        let enderecoEntrega = null;

        if (formaEntrega === 'ENTREGA') {
            const useSavedAddress = document.getElementById('use-saved-address').checked;

            if (useSavedAddress) {
                if (!clienteEndereco) {
                    showNotification('Nenhum endereço cadastrado', 'error');
                    return;
                }
                enderecoEntrega = clienteEndereco;
            } else {
                enderecoEntrega = {
                    cep: document.getElementById('cep').value,
                    rua: document.getElementById('street').value,
                    numero: document.getElementById('number').value,
                    complemento: document.getElementById('complement').value,
                    bairro: document.getElementById('neighborhood').value,
                    cidade: document.getElementById('city').value,
                    estado: document.getElementById('state').value
                };

                if (!enderecoEntrega.cep || !enderecoEntrega.rua || !enderecoEntrega.numero ||
                    !enderecoEntrega.bairro || !enderecoEntrega.cidade || !enderecoEntrega.estado) {
                    showNotification('Preencha todos os campos do endereço', 'error');
                    return;
                }
            }
        }

        try {
            const jwtToken = localStorage.getItem('jwtToken');

            const pedidoResponse = await fetch(`https://mpfitnessback.onrender.com/api/pedidos/finalizar/${clienteId}?formaEntrega=${formaEntrega}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${jwtToken}`,
                    'Content-Type': 'application/json'
                },
                body: formaEntrega === 'ENTREGA' ? JSON.stringify(enderecoEntrega) : null
            });

            if (!pedidoResponse.ok) {
                let errorMessage = 'Erro ao criar pedido';
                try {
                    const errorData = await pedidoResponse.json();
                    errorMessage = errorData.message || errorMessage;
                } catch {
                }
                throw new Error(errorMessage);
            }

            const pedido = await pedidoResponse.json();

            const mpPreference = await createMercadoPagoPreference(pedido.id);

            window.location.href = mpPreference.initPoint;

        } catch (error) {
            showNotification(error.message || 'Erro ao finalizar compra', 'error');
        }
    }

    function attachItemEventListeners() {
        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = e.currentTarget.getAttribute('data-id');
                removeItem(productId);
            });
        });

        document.querySelectorAll('.quantity-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = e.currentTarget.getAttribute('data-id');
                const isPlus = e.currentTarget.classList.contains('plus');
                const quantityElement = e.currentTarget.parentElement.querySelector('.quantity');
                let newQuantity = parseInt(quantityElement.textContent);

                newQuantity = isPlus ? newQuantity + 1 : Math.max(1, newQuantity - 1);
                updateItemQuantity(productId, newQuantity);
            });
        });
    }

    function formatCEP(cep) {
        cep = cep.replace(/\D/g, '');
        if (cep.length > 5) {
            cep = cep.substring(0, 5) + '-' + cep.substring(5, 8);
        }
        return cep;
    }

    deliveryOptions.forEach(option => {
        option.addEventListener('change', (e) => {
            if (e.target.value === 'ENTREGA') {
                addressSelection.classList.remove('hidden');
                if (clienteId) {
                    loadSavedAddress();
                }
            } else {
                addressSelection.classList.add('hidden');
                freteCalculado = 0;
                updateCartSummary();
            }
        });
    });

    addressOptions.forEach(option => {
        option.addEventListener('change', toggleAddressForm);
    });

    if (cepInput) {
        cepInput.addEventListener('input', (e) => {
            e.target.value = formatCEP(e.target.value);
        });

        cepInput.addEventListener('blur', (e) => {
            const cep = e.target.value.replace(/\D/g, '');
            if (cep.length === 8) {
                calculateShipping(cep);
            }
        });
    }

    checkoutBtn.addEventListener('click', checkout);

    if (checkAuth()) {
        loadCartItems();
        loadClienteData();
    } else {
        showNotification('Faça login para acessar seu carrinho', 'info');
        checkoutBtn.disabled = true;
    }
});