// Configurações
const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:8080' : 'https://seu-backend.onrender.com';
const API_RELATORIOS_URL = `${API_BASE_URL}/api/relatorios`;

// Estado da aplicação
let estadoAtual = {
    pedidos: [],
    filtros: {},
    tipoRelatorio: 'resumido',
    dadosDashboard: null
};

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando sistema de relatórios...');
    inicializarAplicacao();
});

async function inicializarAplicacao() {
    try {
        // Configurar datas padrão (últimos 30 dias)
        configurarDatasPadrao();
        
        // Configurar event listeners
        configurarEventListeners();
        
        // Verificar autenticação
        const autenticado = await verificarAutenticacao();
        if (!autenticado) return;
        
        // Carregar dashboard inicial
        await carregarDashboardInicial();
        
        // Atualizar data/hora
        atualizarDataAtualizacao();
        
        console.log('Sistema de relatórios inicializado com sucesso');
    } catch (error) {
        console.error('Erro na inicialização:', error);
        mostrarMensagem('Erro ao inicializar sistema de relatórios', 'danger');
    }
}

function configurarDatasPadrao() {
    const dataFinal = new Date();
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - 30);
    
    document.getElementById('data-inicio').value = dataInicio.toISOString().split('T')[0];
    document.getElementById('data-final').value = dataFinal.toISOString().split('T')[0];
}

function configurarEventListeners() {
    // Form submit
    document.getElementById('report-form').addEventListener('submit', gerarRelatorio);
    
    // Botões de exportação
    document.getElementById('export-pdf').addEventListener('click', exportarPDF);
    document.getElementById('export-excel').addEventListener('click', exportarExcel);
    
    // Limpar filtros
    document.getElementById('limpar-filtros').addEventListener('click', limparFiltros);
    
    // Mudança de tipo de relatório
    document.getElementById('tipo-relatorio').addEventListener('change', function() {
        estadoAtual.tipoRelatorio = this.value;
    });
}

// ========== FUNÇÕES DE UTILIDADE ==========

function formatarData(data) {
    if (!data) return 'N/A';
    try {
        return new Date(data).toLocaleDateString('pt-BR');
    } catch (e) {
        return 'Data inválida';
    }
}

function formatarDataHora(data) {
    if (!data) return 'N/A';
    try {
        return new Date(data).toLocaleString('pt-BR');
    } catch (e) {
        return 'Data inválida';
    }
}

function formatarMoeda(valor) {
    if (!valor && valor !== 0) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor);
}

function traduzirStatus(status) {
    const statusMap = {
        'AGUARDANDO_PAGAMENTO': 'Aguardando Pagamento',
        'PAGO': 'Pago',
        'EM_SEPARACAO': 'Em Separação',
        'ENVIADO': 'Enviado',
        'ENTREGUE': 'Entregue',
        'CANCELADO': 'Cancelado'
    };
    return statusMap[status] || status;
}

function getBadgeColor(status) {
    const colorMap = {
        'AGUARDANDO_PAGAMENTO': 'bg-warning',
        'PAGO': 'bg-info',
        'EM_SEPARACAO': 'bg-primary',
        'ENVIADO': 'bg-secondary',
        'ENTREGUE': 'bg-success',
        'CANCELADO': 'bg-danger'
    };
    return colorMap[status] || 'bg-secondary';
}

function extrairValorNumerico(valorTotal) {
    if (!valorTotal) return 0;
    if (typeof valorTotal === 'number') return valorTotal;
    if (typeof valorTotal === 'object' && valorTotal !== null) {
        return valorTotal.doubleValue ? valorTotal.doubleValue() : 0;
    }
    return parseFloat(valorTotal) || 0;
}

// ========== AUTENTICAÇÃO E API ==========

function getAuthToken() {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
}

async function verificarAutenticacao() {
    const token = getAuthToken();
    if (!token) {
        mostrarMensagem('Você precisa estar logado para acessar os relatórios.', 'warning');
        setTimeout(() => window.location.href = '../login.html', 2000);
        return false;
    }
    return true;
}

async function fetchAutenticado(url, options = {}) {
    const token = getAuthToken();
    
    const config = {
        ...options,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        }
    };

    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        mostrarLoading(true);
        console.log(`Fazendo requisição para: ${url}`);
        
        const response = await fetch(url, config);
        
        if (response.status === 401) {
            mostrarMensagem('Sessão expirada. Faça login novamente.', 'warning');
            setTimeout(() => window.location.href = '../login.html', 2000);
            return null;
        }
        
        if (response.status === 403) {
            mostrarMensagem('Acesso negado. Você não tem permissão para acessar relatórios.', 'danger');
            return null;
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Resposta da API:', data);
        return data;
        
    } catch (error) {
        console.error('Erro na requisição:', error);
        throw error;
    } finally {
        mostrarLoading(false);
    }
}

// ========== FUNÇÕES PRINCIPAIS ==========

async function carregarDashboardInicial() {
    try {
        const dataInicio = document.getElementById('data-inicio').value;
        const dataFim = document.getElementById('data-final').value;
        
        const params = new URLSearchParams();
        if (dataInicio) params.append('dataInicio', dataInicio);
        if (dataFim) params.append('dataFim', dataFim);
        
        const dashboard = await fetchAutenticado(`${API_RELATORIOS_URL}/dashboard?${params.toString()}`);
        
        if (dashboard) {
            estadoAtual.dadosDashboard = dashboard;
            atualizarEstatisticas(dashboard);
            atualizarDataAtualizacao();
        }
    } catch (error) {
        console.warn('Erro ao carregar dashboard, usando dados de demonstração:', error);
        usarDadosDemonstracao();
    }
}

async function gerarRelatorio(event) {
    if (event) event.preventDefault();

    if (!await verificarAutenticacao()) return;

    const tipoRelatorio = document.getElementById('tipo-relatorio').value;
    const statusFiltro = document.getElementById('status').value;
    const dataInicio = document.getElementById('data-inicio').value;
    const dataFinal = document.getElementById('data-final').value;
    const cliente = document.getElementById('cliente').value;

    try {
        let url;
        const params = new URLSearchParams();

        // Validar datas
        if (dataInicio && dataFinal) {
            if (new Date(dataInicio) > new Date(dataFinal)) {
                mostrarMensagem('Data inicial não pode ser maior que data final', 'warning');
                return;
            }
            params.append('dataInicio', dataInicio);
            params.append('dataFim', dataFinal);
        }

        if (statusFiltro) params.append('status', statusFiltro);
        if (cliente) params.append('cliente', cliente);

        estadoAtual.filtros = { dataInicio, dataFinal, statusFiltro, cliente };
        estadoAtual.tipoRelatorio = tipoRelatorio;

        // Definir endpoint baseado no tipo de relatório
        switch (tipoRelatorio) {
            case 'dashboard':
                url = `${API_RELATORIOS_URL}/dashboard`;
                break;
            case 'financeiro':
                url = `${API_RELATORIOS_URL}/financeiro`;
                // Para financeiro, datas são obrigatórias
                if (!dataInicio || !dataFinal) {
                    mostrarMensagem('Para relatório financeiro, selecione um período', 'warning');
                    return;
                }
                break;
            case 'status':
                url = `${API_RELATORIOS_URL}/consolidado-status`;
                // Para status consolidado, datas são obrigatórias
                if (!dataInicio || !dataFinal) {
                    mostrarMensagem('Para relatório por status, selecione um período', 'warning');
                    return;
                }
                break;
            default:
                url = `${API_RELATORIOS_URL}/pedidos`;
        }

        const urlCompleta = `${url}?${params.toString()}`;
        console.log(`Gerando relatório: ${urlCompleta}`);
        
        const response = await fetchAutenticado(urlCompleta);
        
        if (!response) return;

        processarRespostaRelatorio(response, tipoRelatorio);
        atualizarDataAtualizacao();
        
    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        mostrarMensagem('Erro ao gerar relatório: ' + error.message, 'danger');
    }
}

function processarRespostaRelatorio(response, tipoRelatorio) {
    console.log(`Processando resposta para ${tipoRelatorio}:`, response);

    try {
        let pedidos = [];
        let dadosExtras = {};

        if (tipoRelatorio === 'status') {
            processarRelatorioConsolidado(response);
            return;
        } else if (tipoRelatorio === 'dashboard') {
            pedidos = response.ultimosPedidos || [];
            dadosExtras = response;
            estadoAtual.dadosDashboard = response;
            atualizarEstatisticas(response);
        } else if (tipoRelatorio === 'financeiro') {
            pedidos = response.pedidos || [];
            dadosExtras = response;
        } else {
            pedidos = Array.isArray(response) ? response : [];
        }

        estadoAtual.pedidos = pedidos;
        
        if (tipoRelatorio === 'dashboard') {
            exibirDashboard(response);
        } else {
            exibirRelatorioTabela(pedidos, tipoRelatorio, dadosExtras);
        }
        
        mostrarMensagem(`Relatório ${tipoRelatorio} gerado com ${pedidos.length} pedido(s)`, 'success');
        
    } catch (error) {
        console.error('Erro ao processar resposta:', error);
        mostrarMensagem('Erro ao processar dados do relatório', 'danger');
    }
}

function exibirRelatorioTabela(pedidos, tipoRelatorio, dadosExtras = {}) {
    const tbody = document.getElementById('resultado-relatorio');
    const contador = document.getElementById('contador-resultados');
    const resumo = document.getElementById('resumo-relatorio');
    
    contador.textContent = `${pedidos.length} pedido(s) encontrado(s)`;
    
    if (pedidos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted py-5">
                    <i class="bi bi-search fs-1 d-block mb-2"></i>
                    Nenhum pedido encontrado com os filtros selecionados
                </td>
            </tr>
        `;
        resumo.style.display = 'none';
        return;
    }

    let html = '';
    let totalVendas = 0;
    let pedidosAtivos = 0;

    // Ordenar por data mais recente
    pedidos.sort((a, b) => new Date(b.dataCompra) - new Date(a.dataCompra));

    pedidos.forEach(pedido => {
        const valor = extrairValorNumerico(pedido.valorTotal);
        const isCancelado = pedido.statusPedido === 'CANCELADO';
        
        if (!isCancelado) {
            totalVendas += valor;
            pedidosAtivos++;
        }

        html += `
            <tr>
                <td>
                    <strong>#${pedido.id}</strong>
                </td>
                <td>
                    <div class="fw-bold">${pedido.cliente?.nome || 'N/A'}</div>
                    <small class="text-muted">${pedido.cliente?.email || ''}</small>
                </td>
                <td>
                    <span class="badge badge-status ${getBadgeColor(pedido.statusPedido)}">
                        ${traduzirStatus(pedido.statusPedido)}
                    </span>
                </td>
                <td>
                    <div>${formatarData(pedido.dataCompra)}</div>
                    <small class="text-muted">${formatarDataHora(pedido.dataCompra).split(' ')[1]}</small>
                </td>
                <td class="fw-bold ${isCancelado ? 'text-danger' : 'text-success'}">
                    ${formatarMoeda(valor)}
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="verDetalhesPedido(${pedido.id})">
                        <i class="bi bi-eye"></i> Detalhes
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;

    // Atualizar resumo
    if (tipoRelatorio !== 'dashboard') {
        atualizarResumoRelatorio(pedidos.length, totalVendas, pedidosAtivos);
        resumo.style.display = 'block';
    }
}

function atualizarResumoRelatorio(totalPedidos, totalVendas, pedidosAtivos) {
    const ticketMedio = pedidosAtivos > 0 ? totalVendas / pedidosAtivos : 0;
    
    document.getElementById('resumo-total-pedidos').textContent = totalPedidos.toLocaleString('pt-BR');
    document.getElementById('resumo-total-vendas').textContent = formatarMoeda(totalVendas);
    document.getElementById('resumo-ticket-medio').textContent = formatarMoeda(ticketMedio);
    document.getElementById('resumo-pedidos-ativos').textContent = pedidosAtivos.toLocaleString('pt-BR');
}

function processarRelatorioConsolidado(dados) {
    const tbody = document.getElementById('resultado-relatorio');
    const contador = document.getElementById('contador-resultados');
    const resumo = document.getElementById('resumo-relatorio');
    
    let totalPedidos = 0;
    let html = '';

    // Esconder resumo para relatório consolidado
    resumo.style.display = 'none';

    for (const [status, info] of Object.entries(dados)) {
        const pedidosStatus = info.pedidos || [];
        const quantidade = info.quantidade || pedidosStatus.length;
        const valorTotal = info.valorTotal || 0;
        
        totalPedidos += quantidade;
        
        html += `
            <tr class="table-active">
                <td colspan="6" class="fw-bold">
                    <i class="bi bi-collection"></i>
                    ${traduzirStatus(status)} - ${quantidade} pedido(s) - Total: ${formatarMoeda(valorTotal)}
                </td>
            </tr>
        `;

        if (pedidosStatus.length > 0) {
            pedidosStatus.forEach(pedido => {
                const valor = extrairValorNumerico(pedido.valorTotal);
                const isCancelado = pedido.statusPedido === 'CANCELADO';
                
                html += `
                    <tr>
                        <td><strong>#${pedido.id}</strong></td>
                        <td>${pedido.cliente?.nome || 'N/A'}</td>
                        <td>
                            <span class="badge badge-status ${getBadgeColor(pedido.statusPedido)}">
                                ${traduzirStatus(pedido.statusPedido)}
                            </span>
                        </td>
                        <td>${formatarData(pedido.dataCompra)}</td>
                        <td class="fw-bold ${isCancelado ? 'text-danger' : 'text-success'}">
                            ${formatarMoeda(valor)}
                        </td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary" onclick="verDetalhesPedido(${pedido.id})">
                                <i class="bi bi-eye"></i> Detalhes
                            </button>
                        </td>
                    </tr>
                `;
            });
        } else {
            html += `
                <tr>
                    <td colspan="6" class="text-center text-muted py-3">
                        Nenhum pedido detalhado para este status
                    </td>
                </tr>
            `;
        }
    }

    contador.textContent = `${totalPedidos} pedido(s) consolidado(s) por status`;
    tbody.innerHTML = html || `
        <tr>
            <td colspan="6" class="text-center text-muted py-5">
                Nenhum dado encontrado para o período selecionado
            </td>
        </tr>
    `;
}

// ========== FUNÇÕES DE UI ==========

function mostrarLoading(mostrar) {
    document.getElementById('loading-spinner').style.display = mostrar ? 'block' : 'none';
}

function mostrarMensagem(mensagem, tipo) {
    // Remover mensagens existentes
    const mensagensExistentes = document.querySelectorAll('.alert-message');
    mensagensExistentes.forEach(msg => msg.remove());
    
    // Criar nova mensagem
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${tipo} alert-dismissible fade show alert-message mt-3`;
    alertDiv.innerHTML = `
        ${mensagem}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.querySelector('main').insertBefore(alertDiv, document.querySelector('.card'));
    
    // Auto-remover após 5 segundos
    setTimeout(() => {
        if (alertDiv.parentElement) {
            alertDiv.remove();
        }
    }, 5000);
}

function atualizarDataAtualizacao() {
    document.getElementById('data-atualizacao').textContent = 
        `Atualizado em: ${new Date().toLocaleString('pt-BR')}`;
}

function limparFiltros() {
    document.getElementById('report-form').reset();
    configurarDatasPadrao();
    document.getElementById('resultado-relatorio').innerHTML = `
        <tr>
            <td colspan="6" class="text-center text-muted py-5">
                <i class="bi bi-inbox fs-1 d-block mb-2"></i>
                Gere um relatório para visualizar dados
            </td>
        </tr>
    `;
    document.getElementById('resumo-relatorio').style.display = 'none';
    document.getElementById('contador-resultados').textContent = '0 pedidos encontrados';
    
    // Restaurar dashboard se existir
    if (estadoAtual.dadosDashboard) {
        atualizarEstatisticas(estadoAtual.dadosDashboard);
    }
    
    mostrarMensagem('Filtros limpos com sucesso', 'info');
}

// ========== FUNÇÕES DE EXPORTAÇÃO ==========

async function exportarPDF() {
    try {
        if (estadoAtual.pedidos.length === 0) {
            mostrarMensagem('Não há dados para exportar', 'warning');
            return;
        }

        mostrarMensagem('Gerando PDF...', 'info');
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Cabeçalho
        doc.setFontSize(20);
        doc.text('Relatório de Pedidos - Cranio Fix', 20, 20);
        doc.setFontSize(12);
        doc.text(`Período: ${document.getElementById('data-inicio').value} à ${document.getElementById('data-final').value}`, 20, 30);
        doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 37);
        doc.text(`Tipo: ${document.getElementById('tipo-relatorio').options[document.getElementById('tipo-relatorio').selectedIndex].text}`, 20, 44);
        
        // Dados da tabela
        const headers = [['ID', 'Cliente', 'Status', 'Data', 'Valor Total']];
        const data = estadoAtual.pedidos.map(pedido => [
            `#${pedido.id}`,
            pedido.cliente?.nome || 'N/A',
            traduzirStatus(pedido.statusPedido),
            formatarData(pedido.dataCompra),
            formatarMoeda(extrairValorNumerico(pedido.valorTotal))
        ]);
        
        doc.autoTable({
            head: headers,
            body: data,
            startY: 50,
            styles: { fontSize: 10 },
            headStyles: { fillColor: [44, 62, 80] },
            columnStyles: {
                0: { cellWidth: 20 },
                1: { cellWidth: 50 },
                2: { cellWidth: 40 },
                3: { cellWidth: 35 },
                4: { cellWidth: 35 }
            }
        });
        
        const fileName = `relatorio-pedidos-${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
        mostrarMensagem('PDF exportado com sucesso!', 'success');
        
    } catch (error) {
        console.error('Erro ao exportar PDF:', error);
        mostrarMensagem('Erro ao exportar PDF: ' + error.message, 'danger');
    }
}

async function exportarExcel() {
    try {
        if (estadoAtual.pedidos.length === 0) {
            mostrarMensagem('Não há dados para exportar', 'warning');
            return;
        }

        mostrarMensagem('Gerando Excel...', 'info');
        
        let csv = 'ID,Cliente,Email,Status,Data,Valor Total,Forma Entrega,Observações\n';
        
        estadoAtual.pedidos.forEach(pedido => {
            const valor = extrairValorNumerico(pedido.valorTotal);
            csv += `"${pedido.id}","${pedido.cliente?.nome || 'N/A'}","${pedido.cliente?.email || ''}","${traduzirStatus(pedido.statusPedido)}","${formatarData(pedido.dataCompra)}","${valor}","${pedido.formaEntrega || 'N/A'}","${pedido.observacoes || ''}"\n`;
        });
        
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `relatorio-pedidos-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        mostrarMensagem('Excel exportado com sucesso!', 'success');
        
    } catch (error) {
        console.error('Erro ao exportar Excel:', error);
        mostrarMensagem('Erro ao exportar Excel: ' + error.message, 'danger');
    }
}

// ========== FUNÇÕES AUXILIARES ==========

async function verDetalhesPedido(pedidoId) {
    try {
        const pedido = estadoAtual.pedidos.find(p => p.id === pedidoId);
        
        if (pedido) {
            const modalBody = document.getElementById('modalDetalhesBody');
            const valor = extrairValorNumerico(pedido.valorTotal);
            
            modalBody.innerHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <h6>Informações do Pedido</h6>
                        <p><strong>ID:</strong> #${pedido.id}</p>
                        <p><strong>Data:</strong> ${formatarDataHora(pedido.dataCompra)}</p>
                        <p><strong>Status:</strong> <span class="badge ${getBadgeColor(pedido.statusPedido)}">${traduzirStatus(pedido.statusPedido)}</span></p>
                        <p><strong>Valor Total:</strong> ${formatarMoeda(valor)}</p>
                        <p><strong>Forma de Entrega:</strong> ${pedido.formaEntrega || 'N/A'}</p>
                    </div>
                    <div class="col-md-6">
                        <h6>Informações do Cliente</h6>
                        <p><strong>Nome:</strong> ${pedido.cliente?.nome || 'N/A'}</p>
                        <p><strong>Email:</strong> ${pedido.cliente?.email || 'N/A'}</p>
                        ${pedido.cliente?.telefone ? `<p><strong>Telefone:</strong> ${pedido.cliente.telefone}</p>` : ''}
                        ${pedido.codigoRastreamento ? `<p><strong>Código Rastreamento:</strong> ${pedido.codigoRastreamento}</p>` : ''}
                    </div>
                </div>
                ${pedido.observacoes ? `
                <div class="row mt-3">
                    <div class="col-12">
                        <h6>Observações</h6>
                        <div class="border rounded p-2 bg-light">${pedido.observacoes}</div>
                    </div>
                </div>
                ` : ''}
                ${pedido.produtos && pedido.produtos.length > 0 ? `
                <div class="row mt-3">
                    <div class="col-12">
                        <h6>Produtos (${pedido.produtos.length})</h6>
                        <div class="border rounded p-2 bg-light">
                            ${pedido.produtos.map(produto => 
                                `<div class="mb-1">• ${produto.nome || 'Produto'} - ${formatarMoeda(produto.preco || 0)}</div>`
                            ).join('')}
                        </div>
                    </div>
                </div>
                ` : ''}
            `;
            
            const modal = new bootstrap.Modal(document.getElementById('modalDetalhes'));
            modal.show();
        } else {
            mostrarMensagem('Pedido não encontrado', 'warning');
        }
    } catch (error) {
        console.error('Erro ao carregar detalhes:', error);
        mostrarMensagem('Erro ao carregar detalhes do pedido', 'danger');
    }
}

function atualizarEstatisticas(dashboard) {
    if (!dashboard) return;
    
    document.getElementById('total-pedidos').textContent = (dashboard.totalPedidos || 0).toLocaleString('pt-BR');
    document.getElementById('total-vendas').textContent = formatarMoeda(dashboard.totalVendas || 0);
    document.getElementById('pedidos-entregues').textContent = (dashboard.pedidosEntregues || dashboard.pedidosPorStatus?.ENTREGUE || 0).toLocaleString('pt-BR');
    
    const totalPedidos = dashboard.totalPedidos || 1;
    const pedidosEntregues = dashboard.pedidosEntregues || dashboard.pedidosPorStatus?.ENTREGUE || 0;
    const taxaConversao = Math.round((pedidosEntregues / totalPedidos) * 100);
    document.getElementById('taxa-conversao').textContent = `${taxaConversao}%`;
    
    // Atualizar status da conexão
    document.getElementById('status-conexao').className = 'badge bg-success';
    document.getElementById('status-conexao').textContent = 'Conectado';
}

// ========== FALLBACK PARA DEMONSTRAÇÃO ==========

function usarDadosDemonstracao() {
    console.log('Usando dados de demonstração');
    
    const dadosMock = {
        totalPedidos: 24,
        totalVendas: 15480.50,
        pedidosEntregues: 18,
        pedidosPorStatus: {
            ENTREGUE: 18,
            PAGO: 4,
            ENVIADO: 2
        }
    };
    
    atualizarEstatisticas(dadosMock);
    document.getElementById('status-conexao').className = 'badge bg-warning';
    document.getElementById('status-conexao').textContent = 'Modo Demo';
    
    mostrarMensagem('Modo de demonstração ativo - Conectando com dados locais', 'info');
}

function exibirDashboard(dashboard) {
    atualizarEstatisticas(dashboard);
    exibirRelatorioTabela(dashboard.ultimosPedidos || [], 'dashboard', dashboard);
}

// ========== INICIALIZAÇÃO GLOBAL ==========

// Adicionar estilos dinâmicos
const style = document.createElement('style');
style.textContent = `
    .alert-message {
        position: fixed;
        top: 100px;
        right: 20px;
        z-index: 1050;
        min-width: 300px;
        max-width: 500px;
    }
    
    .badge-status {
        font-size: 0.75em;
        padding: 6px 12px;
        border-radius: 20px;
    }
    
    @media (max-width: 768px) {
        .export-buttons {
            flex-direction: column;
            gap: 10px;
        }
        
        .export-buttons .btn {
            width: 100%;
        }
    }
`;
document.head.appendChild(style);   