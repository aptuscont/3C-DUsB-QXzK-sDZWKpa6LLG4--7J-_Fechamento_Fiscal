// ===================================
// CONFIGURAÇÃO E VARIÁVEIS GLOBAIS
// ===================================

let empresas = [];
let fechamentos = [];
let competenciaAtual = null;
let viewAtual = 'kanban';

// ===================================
// INICIALIZAÇÃO
// ===================================

document.addEventListener('DOMContentLoaded', async () => {
    await carregarDados();
    carregarCompetenciasGallery();
    renderizarKanban();
});

// ===================================
// GERENCIAMENTO DE DADOS (JSON)
// ===================================

async function carregarDados() {
    try {
        // Tenta carregar do localStorage primeiro
        const empresasLocal = localStorage.getItem('empresas');
        const fechamentosLocal = localStorage.getItem('fechamentos');
        
        if (empresasLocal && fechamentosLocal) {
            empresas = JSON.parse(empresasLocal);
            fechamentos = JSON.parse(fechamentosLocal);
        } else {
            // Dados iniciais vazios
            empresas = [];
            fechamentos = [];
        }
        
        // Define competência atual (mês atual)
        if (!competenciaAtual) {
            const hoje = new Date();
            competenciaAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
        }
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        empresas = [];
        fechamentos = [];
    }
}

function salvarDados() {
    try {
        // Salvar no localStorage
        localStorage.setItem('empresas', JSON.stringify(empresas));
        localStorage.setItem('fechamentos', JSON.stringify(fechamentos));
        
        // Criar arquivos JSON para download/commit (opcional)
        downloadJSON('empresas', empresas);
        downloadJSON('fechamentos', fechamentos);
        
        console.log('✓ Dados salvos:', empresas.length, 'empresas,', fechamentos.length, 'fechamentos');
    } catch (error) {
        console.error('Erro ao salvar dados:', error);
        alert('Erro ao salvar dados!');
    }
}

function downloadJSON(nome, dados) {
    // Esta função cria os arquivos JSON que podem ser commitados no repositório
    const dataStr = JSON.stringify(dados, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    // Para commitar no git, você pode copiar esses arquivos para a pasta /data
    console.log(`JSON ${nome}.json criado:`, dados.length, 'registros');
}

// ===================================
// MENU SIDEBAR
// ===================================

function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

function voltarKanban() {
    document.getElementById('viewGerenciar').style.display = 'none';
    document.getElementById('viewKanban').style.display = 'grid';
    viewAtual = 'kanban';
    toggleMenu();
    renderizarKanban();
}

function abrirGerenciarEmpresas() {
    document.getElementById('viewKanban').style.display = 'none';
    document.getElementById('viewGerenciar').style.display = 'block';
    viewAtual = 'gerenciar';
    toggleMenu();
    renderizarTabelaEmpresas();
}

// ===================================
// GALERIA DE COMPETÊNCIAS
// ===================================

function carregarCompetenciasGallery() {
    const gallery = document.getElementById('competenciasGallery');
    gallery.innerHTML = '';
    
    const dataAtual = new Date();
    const competencias = [];
    
    // Gerar últimos 12 meses
    for (let i = 0; i < 12; i++) {
        const data = new Date(dataAtual.getFullYear(), dataAtual.getMonth() - i, 1);
        const mes = data.getMonth() + 1;
        const ano = data.getFullYear();
        const valor = `${ano}-${String(mes).padStart(2, '0')}`;
        
        competencias.push({
            valor: valor,
            mes: getNomeMes(mes),
            ano: ano
        });
    }
    
    competencias.forEach(comp => {
        const card = document.createElement('div');
        card.className = 'competencia-card';
        if (comp.valor === competenciaAtual) {
            card.classList.add('active');
        }
        
        card.innerHTML = `
            <div class="mes">${comp.mes}</div>
            <div class="ano">${comp.ano}</div>
        `;
        
        card.onclick = () => selecionarCompetencia(comp.valor);
        gallery.appendChild(card);
    });
}

function selecionarCompetencia(competencia) {
    competenciaAtual = competencia;
    
    // Atualizar cards ativos
    document.querySelectorAll('.competencia-card').forEach(card => {
        card.classList.remove('active');
    });
    event.target.closest('.competencia-card').classList.add('active');
    
    // Recarregar kanban
    if (viewAtual === 'kanban') {
        renderizarKanban();
    }
}

// ===================================
// GERENCIAR EMPRESAS - TABELA
// ===================================

function renderizarTabelaEmpresas() {
    const tbody = document.getElementById('tabelaEmpresasBody');
    tbody.innerHTML = '';
    
    if (empresas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: #7f8c8d;">Nenhuma empresa cadastrada</td></tr>';
        return;
    }
    
    // Ordenar por código
    const empresasOrdenadas = [...empresas].sort((a, b) => a.codigo.localeCompare(b.codigo));
    
    empresasOrdenadas.forEach(empresa => {
        const tr = document.createElement('tr');
        
        const statusBadge = empresa.ativo 
            ? '<span class="status-badge ativo">Ativo</span>' 
            : '<span class="status-badge inativo">Inativo</span>';
        
        tr.innerHTML = `
            <td><strong>${empresa.codigo}</strong></td>
            <td>${formatarCompetencia(empresa.competenciaInicial)}</td>
            <td>${statusBadge}</td>
            <td>${formatarData(empresa.createdAt)}</td>
            <td>
                <div class="table-actions">
                    <button class="btn-secondary" onclick="editarEmpresa('${empresa.id}')">Editar</button>
                    <button class="${empresa.ativo ? 'btn-secondary' : 'btn-primary'}" onclick="toggleEmpresa('${empresa.id}')">
                        ${empresa.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                    <button class="btn-danger" onclick="removerEmpresa('${empresa.id}')">Excluir</button>
                </div>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
}

// ===================================
// GERENCIAR EMPRESAS - AÇÕES
// ===================================

function abrirModalNovaEmpresa() {
    // Preencher select de competências
    const select = document.getElementById('competenciaInicial');
    select.innerHTML = '';
    
    const dataAtual = new Date();
    for (let i = 0; i < 24; i++) {
        const data = new Date(dataAtual.getFullYear(), dataAtual.getMonth() - i, 1);
        const mes = data.getMonth() + 1;
        const ano = data.getFullYear();
        const valor = `${ano}-${String(mes).padStart(2, '0')}`;
        
        const option = document.createElement('option');
        option.value = valor;
        option.textContent = formatarCompetencia(valor);
        select.appendChild(option);
    }
    
    document.getElementById('codigoEmpresa').value = '';
    document.getElementById('modalNovaEmpresa').style.display = 'block';
    document.getElementById('codigoEmpresa').focus();
}

function fecharModalNovaEmpresa() {
    document.getElementById('modalNovaEmpresa').style.display = 'none';
}

function adicionarEmpresa() {
    const codigo = document.getElementById('codigoEmpresa').value.trim().toUpperCase();
    const competenciaInicial = document.getElementById('competenciaInicial').value;
    
    if (!codigo) {
        alert('Digite um código para a empresa');
        return;
    }
    
    if (empresas.find(e => e.codigo === codigo)) {
        alert('Empresa com este código já existe!');
        return;
    }
    
    const novaEmpresa = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        codigo: codigo,
        competenciaInicial: competenciaInicial,
        ativo: true,
        createdAt: new Date().toISOString()
    };
    
    empresas.push(novaEmpresa);
    
    // Criar fechamentos para todas as competências a partir da inicial
    criarFechamentosIniciais(novaEmpresa);
    
    salvarDados();
    fecharModalNovaEmpresa();
    renderizarTabelaEmpresas();
    
    alert(`Empresa ${codigo} adicionada com sucesso!`);
}

function criarFechamentosIniciais(empresa) {
    const [anoInicial, mesInicial] = empresa.competenciaInicial.split('-').map(Number);
    const dataAtual = new Date();
    const mesAtual = dataAtual.getMonth() + 1;
    const anoAtual = dataAtual.getFullYear();
    
    // Criar fechamentos da competência inicial até o mês atual
    for (let ano = anoInicial; ano <= anoAtual; ano++) {
        const mesStart = (ano === anoInicial) ? mesInicial : 1;
        const mesEnd = (ano === anoAtual) ? mesAtual : 12;
        
        for (let mes = mesStart; mes <= mesEnd; mes++) {
            const competencia = `${ano}-${String(mes).padStart(2, '0')}`;
            
            // Verificar se já existe
            const existe = fechamentos.find(f => 
                f.empresaId === empresa.id && f.competencia === competencia
            );
            
            if (!existe) {
                fechamentos.push({
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    empresaId: empresa.id,
                    competencia: competencia,
                    status: 'pendente',
                    dataInicio: null,
                    dataConclusao: null,
                    observacoes: null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            }
        }
    }
}

function editarEmpresa(id) {
    const empresa = empresas.find(e => e.id === id);
    if (!empresa) return;
    
    // Preencher select
    const select = document.getElementById('editarCompetenciaInicial');
    select.innerHTML = '';
    
    const dataAtual = new Date();
    for (let i = 0; i < 24; i++) {
        const data = new Date(dataAtual.getFullYear(), dataAtual.getMonth() - i, 1);
        const mes = data.getMonth() + 1;
        const ano = data.getFullYear();
        const valor = `${ano}-${String(mes).padStart(2, '0')}`;
        
        const option = document.createElement('option');
        option.value = valor;
        option.textContent = formatarCompetencia(valor);
        if (valor === empresa.competenciaInicial) {
            option.selected = true;
        }
        select.appendChild(option);
    }
    
    document.getElementById('editarCodigo').value = empresa.codigo;
    document.getElementById('editarEmpresaId').value = empresa.id;
    document.getElementById('modalEditarEmpresa').style.display = 'block';
}

function fecharModalEditarEmpresa() {
    document.getElementById('modalEditarEmpresa').style.display = 'none';
}

function salvarEdicaoEmpresa() {
    const id = document.getElementById('editarEmpresaId').value;
    const novaCompetenciaInicial = document.getElementById('editarCompetenciaInicial').value;
    
    const empresa = empresas.find(e => e.id === id);
    if (!empresa) return;
    
    empresa.competenciaInicial = novaCompetenciaInicial;
    empresa.updatedAt = new Date().toISOString();
    
    // Recriar fechamentos
    fechamentos = fechamentos.filter(f => f.empresaId !== empresa.id);
    criarFechamentosIniciais(empresa);
    
    salvarDados();
    fecharModalEditarEmpresa();
    renderizarTabelaEmpresas();
    
    alert('Empresa atualizada com sucesso!');
}

function toggleEmpresa(id) {
    const empresa = empresas.find(e => e.id === id);
    if (empresa) {
        empresa.ativo = !empresa.ativo;
        empresa.updatedAt = new Date().toISOString();
        salvarDados();
        renderizarTabelaEmpresas();
    }
}

function removerEmpresa(id) {
    if (!confirm('Tem certeza que deseja excluir esta empresa? Todos os fechamentos relacionados serão removidos.')) {
        return;
    }
    
    empresas = empresas.filter(e => e.id !== id);
    fechamentos = fechamentos.filter(f => f.empresaId !== id);
    
    salvarDados();
    renderizarTabelaEmpresas();
    
    alert('Empresa removida com sucesso!');
}

// ===================================
// KANBAN
// ===================================

function renderizarKanban() {
    const colunas = ['pendente', 'em-andamento', 'concluido'];
    
    colunas.forEach(status => {
        const container = document.getElementById(status);
        container.innerHTML = '';
        
        const empresasAtivas = empresas.filter(e => e.ativo);
        let count = 0;
        
        empresasAtivas.forEach(empresa => {
            // Verificar se empresa deve aparecer nesta competência
            const [anoInicial, mesInicial] = empresa.competenciaInicial.split('-').map(Number);
            const [anoAtual, mesAtual] = competenciaAtual.split('-').map(Number);
            
            const dataInicial = new Date(anoInicial, mesInicial - 1);
            const dataAtualComp = new Date(anoAtual, mesAtual - 1);
            
            if (dataAtualComp >= dataInicial) {
                const fechamento = obterFechamento(empresa.id, competenciaAtual);
                
                if (fechamento.status === status) {
                    const card = criarCard(empresa, fechamento);
                    container.appendChild(card);
                    count++;
                }
            }
        });
        
        document.getElementById(`count-${status}`).textContent = count;
    });
}

function criarCard(empresa, fechamento) {
    const card = document.createElement('div');
    card.className = 'card';
    card.draggable = true;
    card.dataset.empresaId = empresa.id;
    card.dataset.status = fechamento.status;
    
    let dataInfo = 'Aguardando';
    if (fechamento.dataConclusao) {
        const dias = calcularDiasDecorridos(fechamento.dataInicio, fechamento.dataConclusao);
        dataInfo = `✓ ${formatarData(fechamento.dataConclusao)} (${dias} dias)`;
    } else if (fechamento.dataInicio) {
        const dias = calcularDiasDecorridos(fechamento.dataInicio, new Date().toISOString());
        dataInfo = `Há ${dias} dias`;
    }
    
    card.innerHTML = `
        <div class="card-codigo">${empresa.codigo}</div>
        <div class="card-info">${dataInfo}</div>
        <span class="card-status status-${fechamento.status}">
            ${getNomeStatus(fechamento.status)}
        </span>
    `;
    
    card.addEventListener('dragstart', dragStart);
    card.addEventListener('dragend', dragEnd);
    
    return card;
}

function obterFechamento(empresaId, competencia) {
    let fechamento = fechamentos.find(f => 
        f.empresaId === empresaId && f.competencia === competencia
    );
    
    if (!fechamento) {
        fechamento = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            empresaId: empresaId,
            competencia: competencia,
            status: 'pendente',
            dataInicio: null,
            dataConclusao: null,
            observacoes: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        fechamentos.push(fechamento);
        salvarDados();
    }
    
    return fechamento;
}

// ===================================
// DRAG AND DROP
// ===================================

let draggedElement = null;

function dragStart(e) {
    draggedElement = e.target;
    e.target.classList.add('dragging');
}

function dragEnd(e) {
    e.target.classList.remove('dragging');
}

function allowDrop(e) {
    e.preventDefault();
}

function drop(e) {
    e.preventDefault();
    
    if (!draggedElement) return;
    
    const newStatus = e.target.closest('.cards-container').id;
    const empresaId = draggedElement.dataset.empresaId;
    
    atualizarStatus(empresaId, newStatus);
    renderizarKanban();
}

function atualizarStatus(empresaId, novoStatus) {
    const fechamento = fechamentos.find(f => 
        f.empresaId === empresaId && f.competencia === competenciaAtual
    );
    
    if (fechamento && fechamento.status !== novoStatus) {
        fechamento.status = novoStatus;
        fechamento.updatedAt = new Date().toISOString();
        
        if (novoStatus === 'em-andamento' && !fechamento.dataInicio) {
            fechamento.dataInicio = new Date().toISOString();
        }
        
        if (novoStatus === 'concluido' && !fechamento.dataConclusao) {
            fechamento.dataConclusao = new Date().toISOString();
        }
        
        // Se voltar para pendente, limpar datas
        if (novoStatus === 'pendente') {
            fechamento.dataInicio = null;
            fechamento.dataConclusao = null;
        }
        
        salvarDados();
    }
}

// ===================================
// EXPORTAR EXCEL (ExcelJS)
// ===================================

async function exportarExcel() {
    if (typeof ExcelJS === 'undefined') {
        alert('Biblioteca ExcelJS não carregada. Verifique sua conexão com a internet.');
        return;
    }
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Fechamentos');
    
    // Configurar colunas
    worksheet.columns = [
        { header: 'Código', key: 'codigo', width: 15 },
        { header: 'Competência', key: 'competencia', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Data Início', key: 'dataInicio', width: 15 },
        { header: 'Data Conclusão', key: 'dataConclusao', width: 15 },
        { header: 'Dias Decorridos', key: 'dias', width: 15 },
        { header: 'Observações', key: 'observacoes', width: 30 }
    ];
    
    // Estilizar cabeçalho
    worksheet.getRow(1).font = { bold: true, size: 12 };
    worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF3498DB' }
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    
    // Adicionar dados
    const empresasAtivas = empresas.filter(e => e.ativo);
    
    empresasAtivas.forEach(empresa => {
        const fechamento = fechamentos.find(f => 
            f.empresaId === empresa.id && f.competencia === competenciaAtual
        );
        
        if (fechamento) {
            const dias = fechamento.dataInicio && fechamento.dataConclusao
                ? calcularDiasDecorridos(fechamento.dataInicio, fechamento.dataConclusao)
                : fechamento.dataInicio
                ? calcularDiasDecorridos(fechamento.dataInicio, new Date().toISOString())
                : 0;
            
            const row = worksheet.addRow({
                codigo: empresa.codigo,
                competencia: formatarCompetencia(competenciaAtual),
                status: getNomeStatus(fechamento.status),
                dataInicio: fechamento.dataInicio ? formatarData(fechamento.dataInicio) : '-',
                dataConclusao: fechamento.dataConclusao ? formatarData(fechamento.dataConclusao) : '-',
                dias: dias || '-',
                observacoes: fechamento.observacoes || '-'
            });
            
            // Colorir linha baseado no status
            const cor = fechamento.status === 'concluido' ? 'FFD4EDDA' 
                      : fechamento.status === 'em-andamento' ? 'FFFFEAA7' 
                      : 'FFFEE';
            
            row.eachCell((cell) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: cor }
                };
            });
        }
    });
    
    // Adicionar bordas
    worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });
    });
    
    // Gerar arquivo
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Fechamento_${formatarCompetencia(competenciaAtual).replace('/', '-')}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    alert('Excel exportado com sucesso!');
}

// ===================================
// UTILITÁRIOS
// ===================================

function formatarData(dataISO) {
    if (!dataISO) return '-';
    const data = new Date(dataISO);
    return data.toLocaleDateString('pt-BR');
}

function formatarCompetencia(competencia) {
    const [ano, mes] = competencia.split('-');
    return `${getNomeMes(parseInt(mes))}/${ano}`;
}

function getNomeMes(mes) {
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 
                   'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return meses[mes - 1];
}

function getNomeStatus(status) {
    const nomes = {
        'pendente': 'Pendente',
        'em-andamento': 'Em Andamento',
        'concluido': 'Concluído'
    };
    return nomes[status] || status;
}

function calcularDiasDecorridos(dataInicio, dataFim) {
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    const diff = fim - inicio;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// ===================================
// EVENTOS DE TECLADO
// ===================================

document.addEventListener('keydown', (e) => {
    // ESC para fechar modais
    if (e.key === 'Escape') {
        fecharModalNovaEmpresa();
        fecharModalEditarEmpresa();
        if (document.getElementById('sidebar').classList.contains('active')) {
            toggleMenu();
        }
    }
    
    // Enter para adicionar empresa
    if (e.key === 'Enter') {
        if (document.getElementById('modalNovaEmpresa').style.display === 'block') {
            adicionarEmpresa();
        }
    }
});

// Fechar modal ao clicar fora
window.onclick = function(event) {
    const modalNova = document.getElementById('modalNovaEmpresa');
    const modalEditar = document.getElementById('modalEditarEmpresa');
    
    if (event.target === modalNova) {
        fecharModalNovaEmpresa();
    }
    if (event.target === modalEditar) {
        fecharModalEditarEmpresa();
    }
}
