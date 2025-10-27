// ===================================
// DADOS E CONFIGURAÇÃO
// ===================================

let empresas = JSON.parse(localStorage.getItem('empresas')) || [];
let fechamentos = JSON.parse(localStorage.getItem('fechamentos')) || [];
let competenciaAtual = '2024-10';

// ===================================
// INICIALIZAÇÃO
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    carregarCompetencias();
    renderizarKanban();
    
    document.getElementById('competencia').addEventListener('change', (e) => {
        competenciaAtual = e.target.value;
        renderizarKanban();
    });
});

// ===================================
// GERENCIAR EMPRESAS
// ===================================

function adicionarEmpresa() {
    const codigo = document.getElementById('codigoEmpresa').value.trim().toUpperCase();
    
    if (!codigo) {
        alert('Digite um código para a empresa');
        return;
    }
    
    if (empresas.find(e => e.codigo === codigo)) {
        alert('Empresa já existe!');
        return;
    }
    
    empresas.push({
        id: Date.now().toString(),
        codigo: codigo,
        ativo: true,
        createdAt: new Date().toISOString()
    });
    
    salvarDados();
    document.getElementById('codigoEmpresa').value = '';
    fecharModalEmpresa();
    renderizarKanban();
}

function abrirGerenciarEmpresas() {
    const lista = document.getElementById('listaEmpresas');
    lista.innerHTML = '';
    
    empresas.forEach(empresa => {
        const div = document.createElement('div');
        div.className = `empresa-item ${!empresa.ativo ? 'inativa' : ''}`;
        div.innerHTML = `
            <span><strong>${empresa.codigo}</strong></span>
            <div class="empresa-actions">
                <button onclick="toggleEmpresa('${empresa.id}')">
                    ${empresa.ativo ? 'Desativar' : 'Ativar'}
                </button>
                <button onclick="removerEmpresa('${empresa.id}')" style="background: #e74c3c">
                    Excluir
                </button>
            </div>
        `;
        lista.appendChild(div);
    });
    
    document.getElementById('modalGerenciar').style.display = 'block';
}

function toggleEmpresa(id) {
    const empresa = empresas.find(e => e.id === id);
    if (empresa) {
        empresa.ativo = !empresa.ativo;
        salvarDados();
        abrirGerenciarEmpresas();
        renderizarKanban();
    }
}

function removerEmpresa(id) {
    if (confirm('Tem certeza que deseja excluir esta empresa?')) {
        empresas = empresas.filter(e => e.id !== id);
        fechamentos = fechamentos.filter(f => f.empresaId !== id);
        salvarDados();
        abrirGerenciarEmpresas();
        renderizarKanban();
    }
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
            const fechamento = obterFechamento(empresa.id, competenciaAtual);
            
            if (fechamento.status === status) {
                const card = criarCard(empresa, fechamento);
                container.appendChild(card);
                count++;
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
    
    const dataInfo = fechamento.dataConclusao 
        ? `Concluído: ${formatarData(fechamento.dataConclusao)}`
        : fechamento.dataInicio
        ? `Iniciado: ${formatarData(fechamento.dataInicio)}`
        : 'Aguardando';
    
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
            id: Date.now().toString() + Math.random(),
            empresaId: empresaId,
            competencia: competencia,
            status: 'pendente',
            dataInicio: null,
            dataConclusao: null,
            createdAt: new Date().toISOString()
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
    
    if (fechamento) {
        fechamento.status = novoStatus;
        fechamento.updatedAt = new Date().toISOString();
        
        if (novoStatus === 'em-andamento' && !fechamento.dataInicio) {
            fechamento.dataInicio = new Date().toISOString();
        }
        
        if (novoStatus === 'concluido') {
            fechamento.dataConclusao = new Date().toISOString();
        }
        
        salvarDados();
    }
}

// ===================================
// EXPORTAR EXCEL
// ===================================

function exportarExcel() {
    const empresasConcluidas = [];
    
    empresas.filter(e => e.ativo).forEach(empresa => {
        const fechamento = fechamentos.find(f => 
            f.empresaId === empresa.id && 
            f.competencia === competenciaAtual
        );
        
        if (fechamento && fechamento.status === 'concluido') {
            empresasConcluidas.push({
                codigo: empresa.codigo,
                status: 'Concluído',
                dataInicio: fechamento.dataInicio ? formatarData(fechamento.dataInicio) : '-',
                dataConclusao: formatarData(fechamento.dataConclusao),
                competencia: formatarCompetencia(competenciaAtual)
            });
        }
    });
    
    if (empresasConcluidas.length === 0) {
        alert('Nenhuma empresa concluída para exportar');
        return;
    }
    
    // Criar CSV
    let csv = 'Código,Status,Data Início,Data Conclusão,Competência\n';
    empresasConcluidas.forEach(e => {
        csv += `${e.codigo},${e.status},${e.dataInicio},${e.dataConclusao},${e.competencia}\n`;
    });
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `fechamento-${competenciaAtual}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ===================================
// COMPETÊNCIAS
// ===================================

function carregarCompetencias() {
    const select = document.getElementById('competencia');
    select.innerHTML = '';
    
    const dataAtual = new Date();
    const anoAtual = dataAtual.getFullYear();
    
    for (let i = 0; i < 12; i++) {
        const data = new Date(anoAtual, dataAtual.getMonth() - i, 1);
        const mes = data.getMonth() + 1;
        const ano = data.getFullYear();
        const valor = `${ano}-${mes.toString().padStart(2, '0')}`;
        const texto = formatarCompetencia(valor);
        
        const option = document.createElement('option');
        option.value = valor;
        option.textContent = texto;
        select.appendChild(option);
    }
}

// ===================================
// UTILITÁRIOS
// ===================================

function salvarDados() {
    localStorage.setItem('empresas', JSON.stringify(empresas));
    localStorage.setItem('fechamentos', JSON.stringify(fechamentos));
}

function formatarData(dataISO) {
    const data = new Date(dataISO);
    return data.toLocaleDateString('pt-BR');
}

function formatarCompetencia(competencia) {
    const [ano, mes] = competencia.split('-');
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                   'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${meses[parseInt(mes) - 1]}/${ano}`;
}

function getNomeStatus(status) {
    const nomes = {
        'pendente': 'Pendente',
        'em-andamento': 'Em Andamento',
        'concluido': 'Concluído'
    };
    return nomes[status] || status;
}

// ===================================
// MODALS
// ===================================

function abrirModalEmpresa() {
    document.getElementById('modalEmpresa').style.display = 'block';
    document.getElementById('codigoEmpresa').focus();
}

function fecharModalEmpresa() {
    document.getElementById('modalEmpresa').style.display = 'none';
}

function fecharGerenciarEmpresas() {
    document.getElementById('modalGerenciar').style.display = 'none';
}

// Fechar modal ao clicar fora
window.onclick = function(event) {
    const modalEmpresa = document.getElementById('modalEmpresa');
    const modalGerenciar = document.getElementById('modalGerenciar');
    
    if (event.target === modalEmpresa) {
        fecharModalEmpresa();
    }
    if (event.target === modalGerenciar) {
        fecharGerenciarEmpresas();
    }
}

// Enter para adicionar empresa
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && document.getElementById('modalEmpresa').style.display === 'block') {
        adicionarEmpresa();
    }
});
