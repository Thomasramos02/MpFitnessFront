document.addEventListener('DOMContentLoaded', function () {
    const API_BASE_URL = 'http://localhost:8080/api/produtos';
    const IMAGE_BASE_URL = 'http://localhost:8080';
    const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlNlbTwvdGV4dD48L3N2Zz4=';

    const addProductBtn = document.getElementById('addProductBtn');
    const productModal = document.getElementById('productModal');
    const closeModal = document.getElementById('closeModal');
    const productForm = document.getElementById('productForm');
    const productsTableBody = document.getElementById('productsTableBody');
    const saveProductBtn = document.getElementById('saveProductBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const confirmModal = document.getElementById('confirmModal');
    const closeConfirmModal = document.getElementById('closeConfirmModal');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const toast = document.getElementById('toast');
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mainNav = document.getElementById('main-nav');
    const userMenu = document.getElementById('user-menu');
    const userAvatarBtn = document.getElementById('user-avatar-btn');
    const logoutLink = document.getElementById('logout-link');
    const statusFilter = document.getElementById('statusFilter');

    // Variáveis de Estado
    let products = [];
    let currentProductId = null;
    let isEditMode = false;
    let productToDelete = null;
    let currentFilter = 'TODOS';

    init();

    function init() {
        loadProducts();
        setupEventListeners();
    }

    function setupEventListeners() {
        // Modal de produto
        if (addProductBtn) addProductBtn.addEventListener('click', openAddProductModal);
        if (closeModal) closeModal.addEventListener('click', closeProductModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeProductModal);

        // Modal de confirmação
        if (closeConfirmModal) closeConfirmModal.addEventListener('click', closeConfirmDeleteModal);
        if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeConfirmDeleteModal);
        if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', deleteProductConfirmed);

        // Upload de imagem
        const imageUpload = document.getElementById('imageUpload');
        const productImage = document.getElementById('productImage');
        if (imageUpload && productImage) {
            imageUpload.addEventListener('click', () => productImage.click());
            productImage.addEventListener('change', handleImageUpload);
        }

        // Checkbox de oferta
        const onOffer = document.getElementById('onOffer');
        if (onOffer) onOffer.addEventListener('change', togglePromotionalPriceField);

        // Tipo de produto
        const productType = document.getElementById('productType');
        if (productType) productType.addEventListener('change', toggleComboItemsContainer);

        // Botão para adicionar itens de combo
        const addComboItemBtn = document.getElementById('addComboItemBtn');
        if (addComboItemBtn) addComboItemBtn.addEventListener('click', addComboItem);

        // Salvar produto
        if (saveProductBtn) saveProductBtn.addEventListener('click', saveProduct);

        // Menu mobile
        if (mobileMenuToggle && mainNav) {
            mobileMenuToggle.addEventListener('click', () => {
                mainNav.classList.toggle('active');
            });
        }

        // Menu do usuário
        if (userAvatarBtn && userMenu) {
            userAvatarBtn.addEventListener('click', () => {
                userMenu.classList.toggle('active');
            });
        }

        // Logout
        if (logoutLink) logoutLink.addEventListener('click', logout);

        // Filtro por status
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                currentFilter = e.target.value;
                loadProducts();
            });
        }
    }

    // Função para abrir o modal de adicionar produto
    function openAddProductModal() {
        isEditMode = false;
        currentProductId = null;
        document.getElementById('modalTitle').textContent = 'Adicionar Produto';
        resetProductForm();
        openProductModal();
    }


    async function loadProducts() {
        try {
            showLoading(true);
            let endpoint = API_BASE_URL;

            if (currentFilter === 'ATIVO') {
                endpoint = `${API_BASE_URL}/ativos`;
            } else if (currentFilter === 'INATIVO') {
                endpoint = `${API_BASE_URL}/inativos`;
            }

            const response = await fetch(endpoint, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(response.status === 403 ?
                    'Acesso negado. Você não tem permissão para visualizar produtos.' :
                    'Erro ao carregar produtos');
            }

            products = await response.json();
            renderProductsTable();
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
            showToast('Erro ao carregar produtos: ' + error.message, 'error');

            productsTableBody.innerHTML = `
                    <tr>
                        <td colspan="11" class="error-message">
                            Não foi possível carregar os produtos. 
                            <button onclick="location.reload()" class="retry-btn">
                                <i class="fas fa-sync-alt"></i> Tentar novamente
                            </button>
                        </td>
                    </tr>
                `;
        } finally {
            showLoading(false);
        }
    }

    // Mostrar/ocultar estado de carregamento
    function showLoading(show) {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (!loadingOverlay && show) {
            const overlay = document.createElement('div');
            overlay.id = 'loadingOverlay';
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.right = '0';
            overlay.style.bottom = '0';
            overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
            overlay.style.display = 'flex';
            overlay.style.alignItems = 'center';
            overlay.style.justifyContent = 'center';
            overlay.style.zIndex = '2000';

            const spinner = document.createElement('div');
            spinner.className = 'spinner';
            spinner.style.color = 'white';
            spinner.style.fontSize = '3rem';

            overlay.appendChild(spinner);
            document.body.appendChild(overlay);
        } else if (loadingOverlay && !show) {
            loadingOverlay.remove();
        }
    }

    // Renderizar tabela de produtos
    function renderProductsTable() {
        if (!productsTableBody) return;

        productsTableBody.innerHTML = '';

        if (products.length === 0) {
            productsTableBody.innerHTML = `
                    <tr>
                        <td colspan="11" class="empty-message">
                            Nenhum produto encontrado.
                        </td>
                    </tr>
                `;
            return;
        }

        products.forEach(product => {
            const row = document.createElement('tr');

            // acessa imagem via backend
            const imgCell = document.createElement('td');
            if (product.img) {
                const imageUrl = product.img.startsWith('http') ?
                    product.img :
                    `${IMAGE_BASE_URL}/${product.img}`;

                imgCell.innerHTML = `
                        <img src="${imageUrl}" 
                            alt="${product.nome}" 
                            class="product-thumbnail" 
                            onerror="this.src='${PLACEHOLDER_IMAGE}'">
                    `;
            } else {
                imgCell.innerHTML = '<div class="no-image"><i class="fas fa-image"></i></div>';
            }


            const nameCell = document.createElement('td');
            nameCell.textContent = product.nome;

            const categoryCell = document.createElement('td');
            categoryCell.innerHTML = `
                        <span class="category-badge" style="background-color: ${getCategoryColor(product.categoria)}">
                            ${product.categoria || 'N/A'}
                        </span>
                    `;


            const descCell = document.createElement('td');
            descCell.textContent = product.descricao ?
                product.descricao.substring(0, 50) + (product.descricao.length > 50 ? '...' : '') :
                '';


            const priceCell = document.createElement('td');
            if (product.emOferta && product.valorPromocional) {
                priceCell.innerHTML = `
                        <span class="original-price">R$ ${product.valor.toFixed(2)}</span>
                        <span class="promotional-price">R$ ${product.valorPromocional.toFixed(2)}</span>
                    `;
            } else {
                priceCell.textContent = `R$ ${product.valor.toFixed(2)}`;
            }


            const quantCell = document.createElement('td');
            quantCell.textContent = product.quantidade;


            const sizeCell = document.createElement('td');
            sizeCell.textContent = product.tamanho || '-';


            const typeCell = document.createElement('td');
            typeCell.textContent = product.tipoProduto === 'COMBO' ? 'Combo' : 'Único';


            const offerCell = document.createElement('td');
            offerCell.innerHTML = product.emOferta ?
                '<span class="badge badge-success">Sim</span>' :
                '<span class="badge badge-secondary">Não</span>';


            const statusCell = document.createElement('td');
            statusCell.innerHTML = `
                    <span class="status-badge ${product.status === 'ATIVO' ? 'ativo' : 'inativo'}">
                        ${product.status === 'ATIVO' ? 'Ativo' : 'Inativo'}
                    </span>
                `;


            const actionsCell = document.createElement('td');
            actionsCell.className = 'actions-cell';
            actionsCell.innerHTML = `
                    <button class="action-btn edit-btn" data-id="${product.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" data-id="${product.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                `;

            row.append(imgCell, nameCell, categoryCell, descCell, priceCell, quantCell, sizeCell, typeCell, offerCell, statusCell, actionsCell);
            productsTableBody.appendChild(row);
        });


        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => openEditProductModal(btn.dataset.id));
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => confirmDeleteProduct(btn.dataset.id));
        });
    }

    // Abrir modal para editar produto
    async function openEditProductModal(productId) {
        try {
            showLoading(true);
            const response = await fetch(`${API_BASE_URL}/${productId}`);

            if (!response.ok) {
                throw new Error(response.status === 403 ?
                    'Acesso negado. Você não tem permissão para editar produtos.' :
                    'Erro ao carregar produto');
            }

            const product = await response.json();

            isEditMode = true;
            currentProductId = productId;
            document.getElementById('modalTitle').textContent = 'Editar Produto';
            fillProductForm(product);
            openProductModal();
        } catch (error) {
            console.error('Erro ao carregar produto:', error);
            showToast('Erro ao carregar produto. Verifique o console para mais detalhes.', 'error');
        } finally {
            showLoading(false);
        }
    }

    // Preencher formulário com dados do produto
    function fillProductForm(product) {
        if (!productForm) return;

        document.getElementById('productId').value = product.id;
        document.getElementById('productName').value = product.nome;
        document.getElementById('productDescription').value = product.descricao || '';
        document.getElementById('productCategory').value = product.categoria || '';
        document.getElementById('productPrice').value = product.valor;
        document.getElementById('productQuantity').value = product.quantidade;
        document.getElementById('productSize').value = product.tamanho || '';
        document.getElementById('productType').value = product.tipoProduto || 'UNICO';
        document.getElementById('productStatus').value = product.status || 'ATIVO';
        document.getElementById('onOffer').checked = product.emOferta || false;
        document.getElementById('promotionalPrice').value = product.valorPromocional || '';

        // Imagem
        const imagePreview = document.getElementById('imagePreview');
        if (product.img && imagePreview) {
            imagePreview.src = product.img;
            imagePreview.style.display = 'block';
        } else if (imagePreview) {
            imagePreview.style.display = 'none';
        }

        // Atualizar campos dinâmicos
        togglePromotionalPriceField();
        toggleComboItemsContainer();

        // Itens de combo
        const comboItemsList = document.getElementById('comboItemsList');
        if (comboItemsList) {
            comboItemsList.innerHTML = '';

            if (product.tipoProduto === 'COMBO' && product.itensCombo && product.itensCombo.length > 0) {
                loadProductsForCombo().then(() => {
                    product.itensCombo.forEach(item => {
                        addComboItem(item);
                    });
                });
            }
        }
    }

    // Resetar formulário de produto
    function resetProductForm() {
        if (!productForm) return;

        productForm.reset();
        document.getElementById('productStatus').value = 'ATIVO';

        const comboItemsList = document.getElementById('comboItemsList');
        if (comboItemsList) comboItemsList.innerHTML = '';

        const imagePreview = document.getElementById('imagePreview');
        if (imagePreview) {
            imagePreview.style.display = 'none';
            imagePreview.src = '';
        }

        const productImage = document.getElementById('productImage');
        if (productImage) productImage.value = '';

        const promotionalPriceField = document.getElementById('promotionalPriceField');
        if (promotionalPriceField) promotionalPriceField.style.display = 'none';

        const comboItemsContainer = document.getElementById('comboItemsContainer');
        if (comboItemsContainer) comboItemsContainer.style.display = 'none';
    }

    // Abrir modal de produto
    function openProductModal() {
        if (productModal) {
            // Desativa temporariamente o header
            document.body.classList.add('modal-open');
            productModal.classList.add('active');

            // Força redesenho para ativar a transição
            void productModal.offsetWidth;
        }
    }

    function closeProductModal() {
        if (productModal) {
            productModal.classList.remove('active');
            document.body.classList.remove('modal-open');
        }
    }


    // Upload de imagem
   // Upload de imagem
    function handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Verifica o tamanho do arquivo (máximo 5MB)
        const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
        if (file.size > MAX_FILE_SIZE) {
            showToast('A imagem deve ter no máximo 5MB', 'error');
            e.target.value = ''; // Limpa o input
            return;
        }

        // Verifica o tipo do arquivo
        const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!validImageTypes.includes(file.type)) {
            showToast('Por favor, selecione uma imagem JPEG, PNG, GIF ou WebP', 'error');
            e.target.value = ''; // Limpa o input
            return;
        }

        const reader = new FileReader();
        const imagePreview = document.getElementById('imagePreview');
        if (!imagePreview) return;

        reader.onload = function (e) {
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
        };

        reader.readAsDataURL(file);
    }

    // Toggle campo de preço promocional
    function togglePromotionalPriceField() {
        const onOffer = document.getElementById('onOffer');
        const promotionalPriceField = document.getElementById('promotionalPriceField');

        if (onOffer && promotionalPriceField) {
            promotionalPriceField.style.display = onOffer.checked ? 'block' : 'none';
        }
    }

    // Toggle container de itens de combo
    function toggleComboItemsContainer() {
        const productType = document.getElementById('productType');
        const comboItemsContainer = document.getElementById('comboItemsContainer');

        if (productType && comboItemsContainer) {
            comboItemsContainer.style.display = productType.value === 'COMBO' ? 'block' : 'none';
        }
    }

    // Carregar produtos para combo
    async function loadProductsForCombo() {
        try {
            const response = await fetch(API_BASE_URL);

            if (!response.ok) {
                throw new Error('Erro ao carregar produtos para combo');
            }

            const allProducts = await response.json();
            const comboSelects = document.querySelectorAll('.combo-product-select');

            comboSelects.forEach(select => {
                const currentValue = select.value;
                select.innerHTML = '<option value="">Selecione um produto</option>';

                allProducts.forEach(product => {
                    if (product.tipoProduto !== 'COMBO' && product.status === 'ATIVO') {
                        const option = document.createElement('option');
                        option.value = product.id;
                        option.textContent = product.nome;
                        select.appendChild(option);
                    }
                });

                if (currentValue) select.value = currentValue;
            });
        } catch (error) {
            console.error('Erro ao carregar produtos para combo:', error);
            showToast('Erro ao carregar produtos para combo. Verifique o console para mais detalhes.', 'error');
        }
    }

    // Adicionar item de combo
    function addComboItem(comboItemData = null) {
        const comboItemTemplate = document.getElementById('comboItemTemplate');
        const comboItemsList = document.getElementById('comboItemsList');

        if (!comboItemTemplate || !comboItemsList) return;

        const comboItemClone = comboItemTemplate.cloneNode(true);
        comboItemClone.style.display = 'block';
        comboItemClone.classList.add('combo-item-added');

        // Preencher com dados se for edição
        if (comboItemData) {
            loadProductsForCombo().then(() => {
                const select = comboItemClone.querySelector('.combo-product-select');
                if (select) select.value = comboItemData.id;

                const quantityInput = comboItemClone.querySelector('.combo-quantity');
                if (quantityInput && comboItemData.quantidade) {
                    quantityInput.value = comboItemData.quantidade;
                }
            });
        }

        // Botão de remover item de combo
        const removeComboItemBtn = comboItemClone.querySelector('.remove-combo-item-btn');
        if (removeComboItemBtn) {
            removeComboItemBtn.addEventListener('click', function () {
                comboItemsList.removeChild(comboItemClone);
            });
        }

        comboItemsList.appendChild(comboItemClone);
    }

    // Salvar produto (criar ou atualizar)
    async function saveProduct() {
        const productData = getProductFormData();

        if (!validateProductForm(productData)) {
            return;
        }

        try {
            showLoading(true);
            let response;
            const url = isEditMode ? `${API_BASE_URL}/${currentProductId}` : API_BASE_URL;
            const method = isEditMode ? 'PUT' : 'POST';

            response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(productData)
            });

            if (!response.ok) {
                throw new Error(response.status === 403 ?
                    'Acesso negado. Você não tem permissão para realizar esta ação.' :
                    'Erro ao salvar produto');
            }

            const savedProduct = await response.json();

            // Upload de imagem se houver
            const imageFile = document.getElementById('productImage')?.files[0];
            if (imageFile) {
                try {
                    await uploadProductImage(savedProduct.id, imageFile);
                } catch (uploadError) {
                    console.warn('Erro no upload da imagem, mas produto foi salvo:', uploadError);
                    showToast('Produto salvo, mas houve um erro ao enviar a imagem', 'warning');
                }
            }

            showToast('Produto salvo com sucesso!', 'success');
            closeProductModal();
            loadProducts();
        } catch (error) {
            console.error('Erro ao salvar produto:', error);
            showToast('Erro ao salvar produto: ' + error.message, 'error');
        } finally {
            showLoading(false);
        }
    }

    // Obter dados do formulário
    function getProductFormData() {
        const productData = {
            nome: document.getElementById('productName')?.value || '',
            descricao: document.getElementById('productDescription')?.value || '',
            categoria: document.getElementById('productCategory')?.value || '', // Adicionado
            valor: parseFloat(document.getElementById('productPrice')?.value) || 0,
            quantidade: parseInt(document.getElementById('productQuantity')?.value) || 0,
            tamanho: document.getElementById('productSize')?.value || null,
            tipoProduto: document.getElementById('productType')?.value || 'UNICO',
            status: document.getElementById('productStatus')?.value || 'ATIVO',
            emOferta: document.getElementById('onOffer')?.checked || false,
            valorPromocional: document.getElementById('onOffer')?.checked ?
                parseFloat(document.getElementById('promotionalPrice')?.value) : null,
            itensCombo: []
        };

        // Itens de combo (se for um combo)
        if (productData.tipoProduto === 'COMBO') {
            const comboItemElements = document.querySelectorAll('.combo-item-added');
            comboItemElements.forEach(itemEl => {
                const productId = itemEl.querySelector('.combo-product-select')?.value;
                const quantity = parseInt(itemEl.querySelector('.combo-quantity')?.value) || 1;

                if (productId) {
                    productData.itensCombo.push({
                        id: productId,
                        quantidade: quantity
                    });
                }
            });
        }

        return productData;
    }

    // Validar formulário
    function validateProductForm(productData) {
        if (!productData.nome || productData.nome.length > 150) {
            showToast('Nome do produto é obrigatório e deve ter no máximo 150 caracteres', 'error');
            return false;
        }

        if (productData.descricao && productData.descricao.length > 500) {
            showToast('Descrição deve ter no máximo 500 caracteres', 'error');
            return false;
        }

        if (isNaN(productData.valor) || productData.valor <= 0) {
            showToast('Preço deve ser um valor positivo', 'error');
            return false;
        }
        if (!productData.categoria) {
            showToast('Categoria é obrigatória', 'error');
            return false;
        }
        if (isNaN(productData.quantidade) || productData.quantidade < 0) {
            showToast('Quantidade deve ser um número não negativo', 'error');
            return false;
        }

        if (productData.emOferta && (isNaN(productData.valorPromocional) || productData.valorPromocional <= 0)) {
            showToast('Preço promocional deve ser um valor positivo para produtos em oferta', 'error');
            return false;
        }

        if (productData.tipoProduto === 'COMBO' && productData.itensCombo.length === 0) {
            showToast('Combos devem ter pelo menos um item', 'error');
            return false;
        }

        return true;
    }

    // Upload de imagem do produto
    // Upload de imagem do produto - CORRIGIDO com melhor tratamento de erro
    async function uploadProductImage(productId, imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);

        try {
            const token = localStorage.getItem('jwtToken');
            const response = await fetch(`${API_BASE_URL}/${productId}/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            console.log('Resposta do upload:', response.status, response.statusText);

            if (!response.ok) {
                let errorMessage = `Erro ${response.status}: ${response.statusText}`;
                
                try {
                    const errorData = await response.text();
                    console.error('Detalhes do erro:', errorData);
                    
                    // Tenta parsear como JSON
                    try {
                        const jsonError = JSON.parse(errorData);
                        errorMessage = jsonError.message || jsonError.erro || errorMessage;
                    } catch {
                        errorMessage = errorData || errorMessage;
                    }
                } catch (e) {
                    console.error('Erro ao ler resposta:', e);
                }
                
                throw new Error(errorMessage);
            }

            const imageUrl = await response.text();
            console.log('Imagem enviada com sucesso:', imageUrl);
            
            return imageUrl;
        } catch (error) {
            console.error('Erro completo no upload:', error);
            throw new Error('Falha no upload da imagem: ' + error.message);
        }
    }

    // Confirmar exclusão de produto
    function confirmDeleteProduct(productId) {
        productToDelete = productId;
        const confirmMessage = document.getElementById('confirmMessage');
        if (confirmMessage) {
            confirmMessage.textContent = 'Tem certeza que deseja excluir este produto?';
        }
        if (confirmModal) {
            confirmModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    // Fechar modal de confirmação
    function closeConfirmDeleteModal() {
        if (confirmModal) {
            confirmModal.classList.remove('active');
            document.body.style.overflow = '';
        }
        productToDelete = null;
    }

    // Excluir produto confirmado
    async function deleteProductConfirmed() {
        if (!productToDelete) return;

        try {
            showLoading(true);
            const token = localStorage.getItem("jwtToken");

            if (!token) {
                throw new Error('Sessão expirada. Por favor, faça login novamente.');
            }

            const response = await fetch(`${API_BASE_URL}/${productToDelete}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            const responseText = await response.text();
            let errorData = {};

            try {
                errorData = responseText ? JSON.parse(responseText) : {};
            } catch (e) {
                console.warn('Failed to parse error response', e);
            }

            if (!response.ok) {
                throw new Error(response.status === 403 ?
                    (errorData.error === 'EXPIRED_TOKEN' ?
                        'Sessão expirada. Por favor, faça login novamente.' :
                        'Acesso negado. Você não tem permissão para excluir produtos.') :
                    errorData.message || `Erro ao excluir produto (status ${response.status})`);
            }

            showToast('Produto excluído com sucesso!', 'success');
            closeConfirmDeleteModal();
            loadProducts();
        } catch (error) {
            console.error('Erro ao excluir produto:', error);
            showToast(error.message, 'error');

            if (error.message.includes('Sessão expirada')) {
                setTimeout(() => window.location.href = '/login', 2000);
            }
        } finally {
            showLoading(false);
        }
    }

    // Mostrar notificação toast
    function showToast(message, type = 'info') {
        if (!toast) return;

        toast.textContent = message;
        toast.className = 'toast show ' + type;

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // Função de logout
    function logout(e) {
        e.preventDefault();
        localStorage.removeItem('jwtToken');
        showToast('Você foi desconectado.', 'info');
        setTimeout(() => window.location.href = '../index.html', 1000);
    }

    // Função para verificar se uma imagem existe
    async function checkImageExists(url) {
        try {
            const response = await fetch(url, { method: 'HEAD' });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    // Função para obter URL da imagem com fallback
    function getImageUrl(product) {
        if (!product.img) return null;

        const imageUrl = product.img.startsWith('http') ?
            product.img :
            `${IMAGE_BASE_URL}/${product.img}`;

        return imageUrl;
    }

    // ✅ Função para formatar tamanho de forma mais legível
    function formatSize(tamanho) {
        if (!tamanho || tamanho.trim() === '') {
            return '-';
        }

        // Se for número simples (tamanho de calçado), adicionar "Nº"
        if (!isNaN(tamanho) && tamanho.length <= 2 && tamanho.length > 0) {
            return `Nº ${tamanho}`;
        }

        // Se contém "g" ou "kg", formatar como peso
        if (tamanho.toLowerCase().includes('g') || tamanho.toLowerCase().includes('kg')) {
            return tamanho.toUpperCase();
        }

        // Se contém "cápsulas" ou "caps", formatar
        if (tamanho.toLowerCase().includes('cápsula') || tamanho.toLowerCase().includes('caps')) {
            return tamanho;
        }


        return tamanho;
    }

    // ✅ Função para obter cor da categoria
    function getCategoryColor(categoria) {
        const colors = {
            'Equipamentos': '#007bff',
            'Suplementos': '#28a745',
            'Acessórios': '#ffc107',
            'Roupas': '#dc3545',
            'Calçados': '#6f42c1',
            'Bebidas': '#17a2b8',
            'Snacks': '#fd7e14',
            'Geral': '#6c757d'
        };
        return colors[categoria] || '#6c757d';
    }
});
