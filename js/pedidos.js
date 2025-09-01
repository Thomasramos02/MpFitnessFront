/**
 * Módulo principal de gerenciamento de pedidos
 */
class PedidosManager {
  constructor() {
    this.currentPage = 1;
    this.itemsPerPage = 10;
    this.allPedidos = [];
    this.filteredPedidos = [];
    this.currentPedidoId = null;
    this.BASE_URL = 'https://mpfitnessback.onrender.com';

    // Verifica autenticação antes de inicializar
    this.initElements();
    this.initEventListeners();
    this.setDefaultDates();
    this.loadPedidos();
  }


  // ================= INICIALIZAÇÃO =================

  initElements() {
    this.elements = {
      pedidosTableBody: document.getElementById('pedidos-table-body'),
      pagination: document.getElementById('pagination'),
      filterForm: document.getElementById('filter-form'),
      statusFilter: document.getElementById('status-filter'),
      startDate: document.getElementById('start-date'),
      endDate: document.getElementById('end-date'),
      editPedidoModal: document.getElementById('editOrderModal') ? new bootstrap.Modal(document.getElementById('editOrderModal')) : null,
      confirmModal: document.getElementById('confirmCancelModal') ? new bootstrap.Modal(document.getElementById('confirmCancelModal')) : null,
      statsCards: {
        total: document.getElementById('total-pedidos'),
        aguardando: document.getElementById('aguardando-pedidos'),
        pago: document.getElementById('pago-pedidos'),
        separacao: document.getElementById('separacao-pedidos'),
        enviado: document.getElementById('enviado-pedidos'),
        cancelado: document.getElementById('cancelado-pedidos')
      }
    };
  }

  initEventListeners() {
    if (this.elements.filterForm) {
      this.elements.filterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.currentPage = 1;
        this.applyFilters();
      });
    }

    document.addEventListener('click', (e) => {
      if (e.target.closest('.view-btn')) {
        const btn = e.target.closest('.view-btn');
        this.viewPedido(btn.dataset.id);
      }

      if (e.target.closest('.edit-btn')) {
        const btn = e.target.closest('.edit-btn');
        this.openEditModal(btn.dataset.id);
      }

      if (e.target.closest('.delete-btn')) {
        const btn = e.target.closest('.delete-btn');
        this.confirmDelete(btn.dataset.id);
      }
    });

    const saveBtn = document.getElementById('save-pedido-btn');
    if (saveBtn) saveBtn.addEventListener('click', () => this.savePedidoChanges());

    const confirmBtn = document.getElementById('confirmActionBtn');
    if (confirmBtn) confirmBtn.addEventListener('click', (e) => this.executeConfirmedAction(e));
  }

  // ================= FUNÇÕES PRINCIPAIS =================

  async loadPedidos() {
    try {
      const token = this.getToken();
      if (!token) throw new Error('Usuário não autenticado');

      const userRole = this.getCurrentUserRole();
      if (!userRole) throw new Error('Perfil do usuário não encontrado');

      const url = userRole === 'ADMIN'
        ? `${this.BASE_URL}/api/pedidos`
        : `${this.BASE_URL}/api/pedidos/clientes/${this.getCurrentUserId()}/pedidos`;

      const response = await this.fetchWithAuth(url, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.status === 401) {
        this.handleUnauthorized();
        return;
      }

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      this.allPedidos = await response.json();
      this.updateStatsCards(this.allPedidos);
      this.applyFilters();
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
      this.showError('Erro ao carregar pedidos:', error.message);
    }
  }

  applyFilters() {
    const status = this.elements.statusFilter?.value || '';
    const start = this.elements.startDate?.value ? new Date(this.elements.startDate.value) : null;
    const end = this.elements.endDate?.value ? new Date(this.elements.endDate.value) : null;

    this.filteredPedidos = this.allPedidos.filter((pedido) => {
      const pedidoDate = new Date(pedido.dataCompra);
      const isWithinRange = (!start || pedidoDate >= start) && (!end || pedidoDate <= end);
      const statusMatches = !status || pedido.statusPedido === status;
      return isWithinRange && statusMatches;
    });

    this.currentPage = 1;
    this.renderPedidosTable();
    this.renderPagination();
  }

  renderPedidosTable() {
    if (!this.elements.pedidosTableBody) return;

    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const pedidosToShow = this.filteredPedidos.slice(startIndex, endIndex);

    this.elements.pedidosTableBody.innerHTML = '';

    if (pedidosToShow.length === 0) {
      this.elements.pedidosTableBody.innerHTML = `
        <tr>
          <td colspan="10" class="text-center py-4">Nenhum pedido encontrado</td>
        </tr>`;
      return;
    }

    pedidosToShow.forEach((pedido) => {
      const cliente = pedido.cliente || {};
      const row = this.createPedidoRow(pedido, cliente);
      this.elements.pedidosTableBody.appendChild(row);
    });
  }

  createPedidoRow(pedido, cliente) {
    const row = document.createElement('tr');
    const enderecoCliente = this.formatEndereco(cliente.endereco);

    row.innerHTML = `
      <td>${pedido.id}</td>
      <td>${cliente.nome || 'Cliente não informado'}</td>
      <td>${cliente.email || '-'}</td>
      <td>${cliente.telefone || '-'}</td>
      <td title="${enderecoCliente}">${this.truncateText(enderecoCliente, 40)}</td>
      <td>${this.formatDate(pedido.dataCompra)}</td>
      <td><span class="${this.getStatusBadgeClass(pedido.statusPedido)}">${this.formatStatus(pedido.statusPedido)}</span></td>
      <td>R$ ${pedido.valorTotal?.toFixed(2) || '0.00'}</td>
      <td>${this.formatEntrega(pedido.formaEntrega)}</td>
      <td>${pedido.observacoes || 'nenhuma observação  '}
      <td>
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-outline-primary view-btn" data-id="${pedido.id}" title="Visualizar">
            <i class="bi bi-eye"></i>
          </button>
          ${this.getCurrentUserRole() === 'ADMIN' ? `
            <button class="btn btn-sm btn-outline-secondary edit-btn" data-id="${pedido.id}" title="Editar">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${pedido.id}" title="Cancelar">
              <i class="bi bi-trash"></i>
            </button>` : ''}
        </div>
      </td>`;

    return row;
  }

  renderPagination() {
    if (!this.elements.pagination) return;

    const totalPages = Math.ceil(this.filteredPedidos.length / this.itemsPerPage);
    this.elements.pagination.innerHTML = '';

    if (totalPages <= 1) return;

    // Botão Anterior
    const prevLi = this.createPaginationItem(
      'Anterior',
      this.currentPage === 1,
      () => this.changePage(this.currentPage - 1)
    );
    this.elements.pagination.appendChild(prevLi);

    // Números das páginas
    for (let i = 1; i <= totalPages; i++) {
      const pageLi = this.createPaginationItem(
        i,
        i === this.currentPage,
        () => this.changePage(i)
      );
      this.elements.pagination.appendChild(pageLi);
    }

    // Botão Próximo
    const nextLi = this.createPaginationItem(
      'Próximo',
      this.currentPage === totalPages,
      () => this.changePage(this.currentPage + 1)
    );
    this.elements.pagination.appendChild(nextLi);
  }

  changePage(newPage) {
    if (newPage < 1 || newPage > Math.ceil(this.filteredPedidos.length / this.itemsPerPage)) return;
    this.currentPage = newPage;
    this.renderPedidosTable();
    this.renderPagination();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ================= FUNÇÕES DE DETALHES DO PEDIDO =================

  async viewPedido(pedidoId) {
    try {
      const token = this.getToken();
      if (!token) throw new Error('Usuário não autenticado');

      const response = await this.fetchWithAuth(`${this.BASE_URL}/api/pedidos/${pedidoId}/detalhes`);

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const pedido = await response.json();
      this.showPedidoDetailsModal(pedido);
    } catch (error) {
      console.error('Erro ao carregar detalhes do pedido:', error);
      this.showError('Erro ao carregar detalhes do pedido:', error.message);
    }
  }

  showPedidoDetailsModal(pedido) {
    const modalId = 'pedidoDetailsModal';
    let modalElement = document.getElementById(modalId);

    if (!modalElement) {
      modalElement = document.createElement('div');
      modalElement.className = 'modal fade';
      modalElement.id = modalId;
      modalElement.tabIndex = '-1';
      modalElement.setAttribute('aria-labelledby', 'pedidoDetailsModalLabel');
      modalElement.setAttribute('aria-hidden', 'true');

      modalElement.innerHTML = `
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="pedidoDetailsModalLabel">Detalhes do Pedido #${pedido.id}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body" id="pedido-details-content"></div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
          </div>
        </div>
      </div>`;

      document.body.appendChild(modalElement);
    }

    this.fillPedidoDetailsContent(pedido, modalElement);

    const modal = new bootstrap.Modal(modalElement);
    modal.show();
  }

  fillPedidoDetailsContent(pedido, modalElement) {
    const contentElement = modalElement.querySelector('#pedido-details-content');
    if (!contentElement) return;

    const cliente = pedido.cliente || {};
    const endereco = cliente.endereco || {};
    const itens = pedido.itens || [];

    contentElement.innerHTML = `
    <div class="row mb-4">
      <div class="col-md-6">
        <h6>Informações do Cliente</h6>
        <p><strong>Nome:</strong> ${cliente.nome || '-'}</p>
        <p><strong>Email:</strong> ${cliente.email || '-'}</p>
        <p><strong>Telefone:</strong> ${cliente.telefone || '-'}</p>
      </div>
      <div class="col-md-6">
        <h6>Informações do Pedido</h6>
        <p><strong>Data:</strong> ${this.formatDate(pedido.dataCompra)}</p>
        <p><strong>Status:</strong> <span class="${this.getStatusBadgeClass(pedido.statusPedido)}">${this.formatStatus(pedido.statusPedido)}</span></p>
        <p><strong>Forma de Entrega:</strong> ${this.formatEntrega(pedido.formaEntrega)}</p>
        <p><strong>Valor Total:</strong> R$ ${pedido.valorTotal?.toFixed(2) || '0.00'}</p>
      </div>
    </div>
    
    <div class="row mb-4">
      <div class="col-12">
        <h6>Endereço de Entrega</h6>
        <p>${this.formatEndereco(endereco)}</p>
        ${pedido.codigoRastreamento ? `<p><strong>Código de Rastreio:</strong> ${pedido.codigoRastreamento}</p>` : ''}
        ${pedido.dataEntregaPrevista ? `<p><strong>Previsão de Entrega:</strong> ${this.formatDate(pedido.dataEntregaPrevista)}</p>` : ''}
      </div>
    </div>
    
    <div class="row">
      <div class="col-12">
        <h6>Itens do Pedido</h6>
        <table class="table table-sm">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Quantidade</th>
              <th>Preço Unitário</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itens.map(item => `
              <tr>
                <td>${item.produto?.nome || 'Produto não encontrado'}</td>
                <td>${item.quantidade}</td>
                <td>R$ ${item.precoUnitario?.toFixed(2) || '0.00'}</td>
                <td>R$ ${((item.precoUnitario || 0) * item.quantidade).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
  }

  // ================= FUNÇÕES ADMINISTRATIVAS =================

  async savePedidoChanges() {
    if (!this.currentPedidoId) {
      this.showError('ID do pedido não encontrado.');
      return;
    }

    try {
      const novoStatus = document.getElementById('edit-status')?.value;
      const novaPrevisao = document.getElementById('edit-previsao')?.value;
      const novoRastreamento = document.getElementById('edit-tracking')?.value;
      const novasObservacoes = document.getElementById('edit-notes')?.value;

      if (novoStatus) {
        await this.fetchWithAuth(
          `${this.BASE_URL}/api/pedidos/${this.currentPedidoId}/status?novoStatus=${novoStatus}`,
          { method: 'PATCH' }
        );
      }

      if (novaPrevisao) {
        await this.fetchWithAuth(
          `${this.BASE_URL}/api/pedidos/${this.currentPedidoId}/previsao-entrega?novaData=${encodeURIComponent(novaPrevisao)}`,
          { method: 'PATCH' }
        );
      }

      if (novoRastreamento) {
        await this.fetchWithAuth(
          `${this.BASE_URL}/api/pedidos/${this.currentPedidoId}/rastreamento?codigo=${encodeURIComponent(novoRastreamento)}`,
          { method: 'PATCH' }
        );
      }

      // --- INÍCIO DA CORREÇÃO ---
      if (novasObservacoes || novasObservacoes === '') {
        await this.fetchWithAuth(
          `${this.BASE_URL}/api/pedidos/${this.currentPedidoId}/observacoes`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'text/plain;charset=UTF-8'
          },
          body: novasObservacoes
        }
        );
      }

      if (this.elements.editPedidoModal) this.elements.editPedidoModal.hide();
      await this.loadPedidos();
      this.showSuccess('Pedido atualizado com sucesso!');
    } catch (error) {
      console.error(error);
      this.showError('Erro ao salvar alterações:', error.message);
    }
  }

  confirmDelete(pedidoId) {
    if (!this.elements.confirmModal) return;

    const pedido = this.allPedidos.find((p) => p.id == pedidoId);
    if (!pedido) return;

    const cancelOrderIdSpan = document.getElementById('cancel-order-id');
    if (cancelOrderIdSpan) cancelOrderIdSpan.textContent = pedidoId;

    const confirmActionBtn = document.getElementById('confirmActionBtn');
    if (confirmActionBtn) {
      confirmActionBtn.dataset.action = 'delete';
      confirmActionBtn.dataset.pedidoId = pedidoId;
    }

    this.elements.confirmModal.show();
  }

  async executeConfirmedAction(event) {
    const btn = event.target.closest('#confirmActionBtn');
    if (!btn) return;

    const action = btn.dataset.action;
    const pedidoId = btn.dataset.pedidoId;

    if (action === 'delete') {
      try {
        await this.fetchWithAuth(`${this.BASE_URL}/api/pedidos/${pedidoId}/cancelar`, {
          method: 'DELETE'
        });

        this.showSuccess('Pedido cancelado com sucesso!');
        this.elements.confirmModal.hide();
        await this.loadPedidos();
      } catch (error) {
        this.showError('Erro ao cancelar pedido:', error.message);
        console.error(error);
      }
    }
  }

  openEditModal(pedidoId) {
    this.currentPedidoId = pedidoId;
    const pedido = this.allPedidos.find((p) => p.id == pedidoId);
    if (!pedido || !this.elements.editPedidoModal) return;

    document.getElementById('modal-order-id').textContent = `#${pedidoId}`;
    document.getElementById('edit-status').value = pedido.statusPedido || '';
    document.getElementById('edit-previsao').value = pedido.dataEntregaPrevista
      ? pedido.dataEntregaPrevista.substring(0, 10)
      : '';
    document.getElementById('edit-tracking').value = pedido.codigoRastreamento || '';
    document.getElementById('edit-notes').value = pedido.observacoes || '';

    this.elements.editPedidoModal.show();
  }

  // ================= FUNÇÕES AUXILIARES =================

  async fetchWithAuth(url, options = {}) {
    const token = this.getToken();
    if (!token) throw new Error('Token não encontrado');

    const headers = {
      'Authorization': `Bearer ${token}`,
      ...(options.headers || {})
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (response.status === 401) {
      this.handleUnauthorized();
      throw new Error('Não autorizado');
    }

    return response;
  }

  getToken() {
    return localStorage.getItem('jwtToken');
  }

  getCurrentUserRole() {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (Array.isArray(payload.role)) return payload.role[0];
      return payload.role || null;
    } catch (e) {
      console.error('Erro ao decodificar token:', e);
      return null;
    }
  }

  getCurrentUserId() {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.id || null;
    } catch (e) {
      console.error('Erro ao decodificar token:', e);
      return null;
    }
  }

  handleUnauthorized() {
    alert('Sessão expirada. Faça login novamente.'); //deixar esse alert
    window.location.href = '/login.html';
  }

  updateStatsCards(pedidos) {
    const stats = {
      total: pedidos.length,
      aguardando: pedidos.filter((p) => p.statusPedido === 'AGUARDANDO_PAGAMENTO').length,
      pago: pedidos.filter((p) => p.statusPedido === 'PAGO').length,
      separacao: pedidos.filter((p) => p.statusPedido === 'EM_SEPARACAO').length,
      enviado: pedidos.filter((p) => p.statusPedido === 'ENVIADO').length,
      cancelado: pedidos.filter((p) => p.statusPedido === 'CANCELADO').length
    };

    Object.entries(stats).forEach(([key, value]) => {
      if (this.elements.statsCards[key]) {
        this.elements.statsCards[key].textContent = value;
      }
    });
  }

  createPaginationItem(text, disabled, onClick) {
    const li = document.createElement('li');
    li.className = `page-item ${disabled ? 'disabled' : ''}`;
    li.innerHTML = `<a class="page-link" href="#">${text}</a>`;
    li.addEventListener('click', (e) => {
      e.preventDefault();
      if (!disabled) onClick();
    });
    return li;
  }

  // ================= FUNÇÕES DE FORMATAÇÃO =================

  formatDate(dateString) {
    if (!dateString) return '';
    const options = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('pt-BR', options);
  }

  formatStatus(status) {
    const statusMap = {
      AGUARDANDO_PAGAMENTO: 'Aguardando Pagamento',
      PAGO: 'Pago',
      EM_SEPARACAO: 'Em Separação',
      ENVIADO: 'Enviado',
      ENTREGUE: 'Entregue',
      CANCELADO: 'Cancelado',
    };
    return statusMap[status] || status;
  }

  getStatusBadgeClass(status) {
    const statusClasses = {
      AGUARDANDO_PAGAMENTO: 'badge bg-warning',
      PAGO: 'badge bg-primary',
      EM_SEPARACAO: 'badge bg-info',
      ENVIADO: 'badge bg-success',
      ENTREGUE: 'badge bg-success',
      CANCELADO: 'badge bg-danger',
    };
    return statusClasses[status] || 'badge bg-secondary';
  }

  formatEntrega(formaEntrega) {
    const entregaMap = {
      RETIRADA: 'Retirada',
      ENTREGA: 'Entrega',
      TRANSPORTADORA: 'Transportadora',
    };
    return entregaMap[formaEntrega] || formaEntrega || '';
  }

  formatEndereco(endereco) {
    if (!endereco) return 'Endereço não informado';

    const parts = [
      endereco.rua,
      endereco.numero,
      endereco.complemento,
      endereco.bairro,
      endereco.cidade,
      endereco.estado,
      endereco.cep,
      endereco.pais
    ].filter(Boolean);

    return parts.join(', ') || 'Endereço não informado';
  }

  truncateText(text, maxLength) {
    return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
  }

  setDefaultDates() {
    if (this.elements.startDate && !this.elements.startDate.value) {
      const now = new Date();
      now.setMonth(now.getMonth() - 1);
      this.elements.startDate.valueAsDate = now;
    }
    if (this.elements.endDate && !this.elements.endDate.value) {
      this.elements.endDate.valueAsDate = new Date();
    }
  }

  // ================= FUNÇÕES DE NOTIFICAÇÃO =================

  showSuccess(message) {
    this.showToast(message, 'success');
  }

  showError(message, detail = '') {
    console.error(message, detail);
    const fullMessage = detail ? `${message}: ${detail}` : message;
    this.showToast(fullMessage, 'error');
  }

  showToast(message, type = 'info') {
    // Criar elemento toast se não existir
    let toast = document.getElementById('global-toast');

    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'global-toast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }

    // Configurar o toast
    toast.textContent = message;
    toast.className = `toast show ${type}`;

    // Remover após 5 segundos
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }
}

// Inicialização quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {

  // Aguarda a inicialização do header
  if (typeof initHeader === 'function') {
    initHeader();
  } else {

  }

  // Inicializa o gerenciador de pedidos
  new PedidosManager();
});