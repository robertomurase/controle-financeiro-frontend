import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinanceService, Transacao } from './services/finance.service';

declare var Html5Qrcode: any;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit, OnDestroy {
  activeTab: 'dashboard' | 'transacoes' | 'nfce' | 'entradas' | 'saidas' | 'produtos' = 'dashboard';
  menuAberto: boolean = false;
  settingsMenuAberto: boolean = false;
  modoClaro: boolean = false;
  tamanhoFonte: number = 16;

  transacoes: Transacao[] = [];
  produtos: any[] = [];
  dadosUltimaNota: any = null;
  dadosNotaPreview: any = null; // Pré-visualização da NFC-e antes de salvar

  // Busca e Filtro por Estabelecimento na Lista de Produtos
  buscaProduto: string = '';
  filtroEstabelecimento: string = '';

  // Filtros de Ano, Mês e Busca para Entradas e Saídas (Padrão: Mês e Ano atuais)
  filtroAnoEntrada: string = String(new Date().getFullYear());
  filtroMesEntrada: string = String(new Date().getMonth() + 1).padStart(2, '0');
  buscaEntrada: string = '';

  filtroAnoSaida: string = String(new Date().getFullYear());
  filtroMesSaida: string = String(new Date().getMonth() + 1).padStart(2, '0');
  filtroEstabelecimentoSaida: string = '';
  buscaSaida: string = '';

  // Gráfico de Barras - Fluxo de Caixa Recente (Dinamico)
  anoGrafico: string = String(new Date().getFullYear());

  // Modal de Edição de Transações
  modalEdicaoAberto: boolean = false;
  transacaoEdicao: any = null;

  // Modal de Evolução de Preços
  modalPrecoAberto: boolean = false;
  produtoSelecionado: any = null;
  historicoPrecosProduto: any[] = [];
  precoMenor: number = 0;
  precoMaior: number = 0;
  precoAtual: number = 0;
  variacaoPercentual: number = 0;
  pontosGrafico: any[] = [];
  svgLinePoints: string = '';
  svgAreaPoints: string = '';

  // Form Transação Manual
  novaDescricao: string = '';
  novoValor: number | null = null;
  novaQuantidade: number = 1;
  novoEstabelecimento: string = '';
  novaCategoria: string = 'Alimentação / Mercado';
  novaConta: string = 'Conta Corrente';
  novoTipo: 'receita' | 'despesa' = 'despesa';
  novaData: string = new Date().toISOString().split('T')[0];

  // Leitor QR Code
  urlNfce: string = '';
  carregandoNfce: boolean = false;
  mensagemNfce: string = '';
  statusNfceSucesso: boolean = true;
  scannerModo: 'camera' | 'arquivo' | 'manual' = 'camera';
  scannerAtivo: boolean = false;
  html5QrCode: any = null;

  constructor(private financeService: FinanceService) {}

  ngOnInit(): void {
    this.carregarTransacoes();
    this.carregarProdutos();

    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('THEME_MODE');
      if (savedTheme === 'light') {
        this.modoClaro = true;
        document.body.classList.add('light-theme');
      }

      const savedFontSize = localStorage.getItem('FONT_SIZE');
      if (savedFontSize) {
        this.tamanhoFonte = Number(savedFontSize);
        document.documentElement.style.fontSize = ;
      }
    }
  }

  ngOnDestroy(): void {
    this.pararScanner();
  }

  toggleMenu(): void {
    this.menuAberto = !this.menuAberto;
  }

  fecharMenu(): void {
    this.menuAberto = false;
  }

  toggleSettingsMenu(): void {
    this.settingsMenuAberto = !this.settingsMenuAberto;
  }

  fecharSettingsMenu(): void {
    this.settingsMenuAberto = false;
  }

  alternarTemaModal(): void {
    this.modoClaro = !this.modoClaro;
    if (this.modoClaro) {
      document.body.classList.add('light-theme');
      localStorage.setItem('THEME_MODE', 'light');
    } else {
      document.body.classList.remove('light-theme');
      localStorage.setItem('THEME_MODE', 'dark');
    }
  }

  aumentarFonte(): void {
    if (this.tamanhoFonte < 22) {
      this.tamanhoFonte += 1;
      document.documentElement.style.fontSize = ;
      localStorage.setItem('FONT_SIZE', String(this.tamanhoFonte));
    }
  }

  diminuirFonte(): void {
    if (this.tamanhoFonte > 12) {
      this.tamanhoFonte -= 1;
      document.documentElement.style.fontSize = ;
      localStorage.setItem('FONT_SIZE', String(this.tamanhoFonte));
    }
  }

  setTab(tab: 'dashboard' | 'transacoes' | 'nfce' | 'entradas' | 'saidas' | 'produtos'): void {
    this.pararScanner();
    this.activeTab = tab;
    this.fecharMenu();
    this.fecharSettingsMenu();
    if (tab === 'nfce' && this.scannerModo === 'camera') {
      setTimeout(() => this.iniciarScanner(), 200);
    }
  }

  setModoScanner(modo: 'camera' | 'arquivo' | 'manual'): void {
    this.pararScanner();
    this.scannerModo = modo;
    this.mensagemNfce = '';
    if (modo === 'camera') {
      setTimeout(() => this.iniciarScanner(), 200);
    } else if (modo === 'arquivo') {
      setTimeout(() => this.triggerFileInput(), 150);
    }
  }

  triggerFileInput(): void {
    const fileInput = document.getElementById('qr-file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  iniciarScanner(): void {
    this.pararScanner();
    this.scannerAtivo = true;
    this.mensagemNfce = '📷 Solicitando acesso à câmera traseira... Aguarde.';
    this.statusNfceSucesso = true;

    setTimeout(() => {
      if (typeof Html5Qrcode !== 'undefined') {
        try {
          this.html5QrCode = new Html5Qrcode(qr-reader);
          const config = { fps: 10, qrbox: { width: 220, height: 220 }, aspectRatio: 1.0 };

          this.html5QrCode.start(
            { facingMode: environment },
            config,
            (decodedText: string) => {
              this.urlNfce = decodedText;
              this.mensagemNfce = '✅ QR Code lido com sucesso! Extraindo produtos...';
              this.statusNfceSucesso = true;
              this.pararScanner();
              this.consultarNfce();
            },
            () => {}
          ).then(() => {
            this.mensagemNfce = '📷 Câmera traseira ativa! Aponte para o QR Code da nota fiscal.';
            this.statusNfceSucesso = true;
          }).catch(() => {
            this.html5QrCode.start(
              { facingMode: user },
              config,
              (decodedText: string) => {
                this.urlNfce = decodedText;
                this.mensagemNfce = '✅ QR Code lido com sucesso! Extraindo produtos...';
                this.statusNfceSucesso = true;
                this.pararScanner();
                this.consultarNfce();
              },
              () => {}
            ).then(() => {
              this.mensagemNfce = '📷 Câmera ativa! Aponte para o QR Code da nota fiscal.';
              this.statusNfceSucesso = true;
            }).catch(() => {
              this.mensagemNfce = '❌ Não foi possível acessar a câmera. Tente enviar foto ou colar o link.';
              this.statusNfceSucesso = false;
              this.scannerAtivo = false;
            });
          });
        } catch (e) {
          this.mensagemNfce = '❌ Erro ao inicializar o leitor de QR Code.';
          this.statusNfceSucesso = false;
        }
      } else {
        this.mensagemNfce = '⚠️ Leitor de QR Code carregando... Clique em Ligar Câmera se necessário.';
        this.statusNfceSucesso = false;
      }
    }, 200);
  }

  pararScanner(): void {
    if (this.html5QrCode) {
      try {
        if (this.html5QrCode.isScanning) {
          this.html5QrCode.stop().then(() => {
            try { this.html5QrCode.clear(); } catch (e) {}
            this.html5QrCode = null;
          }).catch(() => { this.html5QrCode = null; });
        } else {
          try { this.html5QrCode.clear(); } catch (e) {}
          this.html5QrCode = null;
        }
      } catch (e) {
        this.html5QrCode = null;
      }
    }
    this.scannerAtivo = false;
  }

  processarFotoQrCode(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    this.mensagemNfce = '📸 Analisando imagem em busca do QR Code...';
    this.statusNfceSucesso = true;

    if (typeof Html5Qrcode !== 'undefined') {
      const html5QrCodeTemp = new Html5Qrcode(qr-reader);
      html5QrCodeTemp.scanFile(file, true)
        .then((decodedText: string) => {
          this.urlNfce = decodedText;
          this.mensagemNfce = '✅ QR Code identificado! Extraindo dados da nota...';
          this.statusNfceSucesso = true;
          this.consultarNfce();
        })
        .catch(() => {
          this.mensagemNfce = '❌ Não foi possível encontrar um QR Code válido na imagem. Tente uma imagem mais nítida.';
          this.statusNfceSucesso = false;
        });
    } else {
      this.mensagemNfce = '⚠️ Biblioteca do leitor indisponível no momento.';
      this.statusNfceSucesso = false;
    }
  }

  carregarTransacoes(): void {
    this.financeService.getTransacoes().subscribe({
      next: (dados) => {
        this.transacoes = dados || [];
      },
      error: () => {
        this.transacoes = [];
      }
    });
  }

  carregarProdutos(): void {
    this.financeService.getProdutos().subscribe({
      next: (dados) => {
        this.produtos = dados || [];
      },
      error: () => {
        this.produtos = [];
      }
    });
  }

  get anosDisponiveis(): string[] {
    const setAnos = new Set<string>();
    const anoAtual = String(new Date().getFullYear());
    setAnos.add(anoAtual);

    (this.transacoes || []).forEach(t => {
      if (t.data) {
        const ano = t.data.split('-')[0];
        if (ano && ano.length === 4) setAnos.add(ano);
      }
    });

    return Array.from(setAnos).sort((a, b) => b.localeCompare(a));
  }

  get mesesOpcoes(): { val: string, label: string }[] {
    return [
      { val: '', label: '🗓️ Todos os Meses' },
      { val: '01', label: '01 - Janeiro' },
      { val: '02', label: '02 - Fevereiro' },
      { val: '03', label: '03 - Março' },
      { val: '04', label: '04 - Abril' },
      { val: '05', label: '05 - Maio' },
      { val: '06', label: '06 - Junho' },
      { val: '07', label: '07 - Julho' },
      { val: '08', label: '08 - Agosto' },
      { val: '09', label: '09 - Setembro' },
      { val: '10', label: '10 - Outubro' },
      { val: '11', label: '11 - Novembro' },
      { val: '12', label: '12 - Dezembro' }
    ];
  }

  get entradasFiltradas(): Transacao[] {
    let lista = (this.transacoes || []).filter(t => t.tipo === 'receita');

    if (this.filtroAnoEntrada) {
      lista = lista.filter(t => t.data && t.data.startsWith(this.filtroAnoEntrada));
    }

    if (this.filtroMesEntrada) {
      lista = lista.filter(t => {
        if (!t.data) return false;
        const partes = t.data.split('-');
        return partes.length >= 2 && partes[1] === this.filtroMesEntrada;
      });
    }

    if (this.buscaEntrada && this.buscaEntrada.trim()) {
      const termo = this.buscaEntrada.toLowerCase().trim();
      lista = lista.filter(t =>
        (t.descricao && t.descricao.toLowerCase().includes(termo)) ||
        (t.categoria && t.categoria.toLowerCase().includes(termo)) ||
        (t.conta && t.conta.toLowerCase().includes(termo))
      );
    }

    return lista;
  }

  get totalEntradas(): number {
    return this.entradasFiltradas.reduce((acc, t) => acc + (Number(t.valor) || 0), 0);
  }

  limparBuscaEntrada(): void {
    this.buscaEntrada = '';
  }

  get saidasFiltradas(): Transacao[] {
    let lista = (this.transacoes || []).filter(t => t.tipo === 'despesa');

    if (this.filtroAnoSaida) {
      lista = lista.filter(t => t.data && t.data.startsWith(this.filtroAnoSaida));
    }

    if (this.filtroMesSaida) {
      lista = lista.filter(t => {
        if (!t.data) return false;
        const partes = t.data.split('-');
        return partes.length >= 2 && partes[1] === this.filtroMesSaida;
      });
    }

    if (this.filtroEstabelecimentoSaida && this.filtroEstabelecimentoSaida.trim()) {
      const estAlvo = this.filtroEstabelecimentoSaida.trim();
      lista = lista.filter(t => (t.estabelecimento || t.descricao || 'Cadastro Manual').trim() === estAlvo);
    }

    if (this.buscaSaida && this.buscaSaida.trim()) {
      const termo = this.buscaSaida.toLowerCase().trim();
      lista = lista.filter(t =>
        (t.descricao && t.descricao.toLowerCase().includes(termo)) ||
        (t.estabelecimento && t.estabelecimento.toLowerCase().includes(termo)) ||
        (t.categoria && t.categoria.toLowerCase().includes(termo))
      );
    }

    return lista;
  }

  get estabelecimentosSaidasUnicos(): string[] {
    if (!this.transacoes) return [];
    const setEst = new Set<string>();
    this.transacoes.filter(t => t.tipo === 'despesa').forEach(t => {
      const est = (t.estabelecimento || t.descricao || 'Cadastro Manual').trim();
      if (est) setEst.add(est);
    });
    return Array.from(setEst).sort();
  }

  get totalSaidas(): number {
    return this.saidasFiltradas.reduce((acc, t) => acc + (Number(t.valor) || 0), 0);
  }

  limparBuscaSaida(): void {
    this.buscaSaida = '';
  }

  // Dados Dinâmicos para o Gráfico de Barras (Fluxo de Caixa Recente)
  get anosDisponiveisGrafico(): string[] {
    return this.anosDisponiveis;
  }

  get dadosGraficoBarras(): any[] {
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const ano = this.anoGrafico || String(new Date().getFullYear());

    const transAno = (this.transacoes || []).filter(t => t.data && t.data.startsWith(ano));

    const totaisPorMes = meses.map((mesLabel, index) => {
      const mesNum = String(index + 1).padStart(2, '0');
      const prefixo = ;

      const transMes = transAno.filter(t => t.data.startsWith(prefixo));
      const receitaVal = transMes.filter(t => t.tipo === 'receita').reduce((acc, t) => acc + (Number(t.valor) || 0), 0);
      const despesaVal = transMes.filter(t => t.tipo === 'despesa').reduce((acc, t) => acc + (Number(t.valor) || 0), 0);

      return {
        mesLabel,
        receitaVal,
        despesaVal
      };
    });

    const maxVal = Math.max(...totaisPorMes.map(m => Math.max(m.receitaVal, m.despesaVal)), 100);

    return totaisPorMes.map(m => ({
      ...m,
      receitaAlturaPct: maxVal > 0 ? (m.receitaVal / maxVal) * 85 : 0,
      despesaAlturaPct: maxVal > 0 ? (m.despesaVal / maxVal) * 85 : 0
    }));
  }

  // Modal de Edição de Transações
  abrirModalEdicao(t: Transacao): void {
    if (!t) return;
    this.transacaoEdicao = { ...t };
    this.modalEdicaoAberto = true;
  }

  fecharModalEdicao(): void {
    this.modalEdicaoAberto = false;
    this.transacaoEdicao = null;
  }

  salvarEdicaoTransacao(): void {
    if (!this.transacaoEdicao || !this.transacaoEdicao.id) return;

    if (!this.transacaoEdicao.descricao || !this.transacaoEdicao.valor) {
      alert('Preencha a descrição e o valor!');
      return;
    }

    this.financeService.updateTransacao(this.transacaoEdicao.id, this.transacaoEdicao).subscribe({
      next: () => {
        this.carregarTransacoes();
        this.carregarProdutos();
        this.fecharModalEdicao();
        alert('Transação atualizada com sucesso!');
      },
      error: (err) => {
        console.error('Erro ao editar:', err);
        alert('Erro ao atualizar transação.');
      }
    });
  }

  excluirTransacao(t: Transacao): void {
    if (!t || !t.id) return;
    if (confirm()) {
      this.financeService.deleteTransacao(t.id).subscribe({
        next: () => {
          this.carregarTransacoes();
          this.carregarProdutos();
        },
        error: (err) => {
          console.error('Erro ao excluir:', err);
          alert('Erro ao excluir transação.');
        }
      });
    }
  }

  get estabelecimentosUnicos(): string[] {
    if (!this.produtos) return [];
    const setEst = new Set<string>();
    this.produtos.forEach(p => {
      const est = (p.estabelecimento || 'Cadastro Manual').trim();
      if (est) setEst.add(est);
    });
    return Array.from(setEst).sort();
  }

  get produtosFiltrados(): any[] {
    if (!this.produtos) return [];
    let lista = [...this.produtos];

    if (this.filtroEstabelecimento && this.filtroEstabelecimento.trim()) {
      const estAlvo = this.filtroEstabelecimento.trim();
      lista = lista.filter(p => (p.estabelecimento || 'Cadastro Manual').trim() === estAlvo);
    }

    if (this.buscaProduto && this.buscaProduto.trim()) {
      const termo = this.buscaProduto.toLowerCase().trim();
      lista = lista.filter(p =>
        (p.nome_produto && p.nome_produto.toLowerCase().includes(termo)) ||
        (p.estabelecimento && p.estabelecimento.toLowerCase().includes(termo))
      );
    }

    return lista.sort((a, b) => {
      const nomeA = (a.nome_produto || '').toLowerCase();
      const nomeB = (b.nome_produto || '').toLowerCase();
      return nomeA.localeCompare(nomeB);
    });
  }

  limparBusca(): void {
    this.buscaProduto = '';
  }

  excluirItemProduto(p: any): void {
    if (!p) return;
    const nomeItem = p.nome_produto || 'este produto';
    if (confirm()) {
      this.financeService.deleteProdutoItem(p.id, p.origem, p.nome_produto).subscribe({
        next: () => {
          this.carregarProdutos();
          this.carregarTransacoes();
        },
        error: () => {
          if (p.nome_produto) {
            this.financeService.deleteProdutoPorNome(p.nome_produto).subscribe({
              next: () => {
                this.carregarProdutos();
                this.carregarTransacoes();
              }
            });
          }
        }
      });
    }
  }

  abrirModalEvolucaoPreco(p: any): void {
    if (!p || !p.nome_produto) return;
    this.produtoSelecionado = p;

    const nomeAlvo = p.nome_produto.toLowerCase().trim();
    const historico = this.produtos.filter(item => 
      item.nome_produto && item.nome_produto.toLowerCase().trim() === nomeAlvo
    );

    historico.sort((a, b) => {
      const dataA = a.data_emissao || a.data_cadastro || a.data || '';
      const dataB = b.data_emissao || b.data_cadastro || b.data || '';
      return dataA.localeCompare(dataB);
    });

    this.historicoPrecosProduto = historico;

    const valores = historico.map(h => Number(h.valor_unitario || h.preco_medio || 0)).filter(v => v > 0);
    if (valores.length > 0) {
      this.precoMenor = Math.min(...valores);
      this.precoMaior = Math.max(...valores);
      this.precoAtual = valores[valores.length - 1];

      if (valores.length > 1) {
        const primeiro = valores[0];
        this.variacaoPercentual = ((this.precoAtual - primeiro) / primeiro) * 100;
      } else {
        this.variacaoPercentual = 0;
      }
    } else {
      this.precoMenor = Number(p.valor_unitario || p.preco_medio || 0);
      this.precoMaior = this.precoMenor;
      this.precoAtual = this.precoMenor;
      this.variacaoPercentual = 0;
    }

    this.gerarPontosGraficoSVG(historico);
    this.modalPrecoAberto = true;
  }

  fecharModalPreco(): void {
    this.modalPrecoAberto = false;
    this.produtoSelecionado = null;
  }

  gerarPontosGraficoSVG(historico: any[]): void {
    if (!historico || historico.length === 0) {
      this.pontosGrafico = [];
      this.svgLinePoints = '';
      this.svgAreaPoints = '';
      return;
    }

    const svgWidth = 500;
    const marginX = 50;
    const marginYBottom = 150;
    const availableWidth = svgWidth - 2 * marginX;
    const availableHeight = 120;

    const valores = historico.map(h => Number(h.valor_unitario || h.preco_medio || 0));
    const minVal = Math.min(...valores);
    const maxVal = Math.max(...valores);
    const valRange = maxVal - minVal === 0 ? 1 : maxVal - minVal;

    const n = historico.length;

    this.pontosGrafico = historico.map((item, index) => {
      const val = Number(item.valor_unitario || item.preco_medio || 0);
      const x = n === 1 ? svgWidth / 2 : marginX + (index / (n - 1)) * availableWidth;
      
      let y = marginYBottom - ((val - minVal) / valRange) * availableHeight;
      if (maxVal === minVal) {
        y = 90;
      }

      const rawData = item.data_emissao || item.data_cadastro || item.data || '';
      const dataFormatted = rawData ? rawData.split('-').slice(1).join('/') : ;

      return {
        x,
        y,
        valor: val,
        dataFormatted
      };
    });

    const ptsStr = this.pontosGrafico.map(pt => ).join(' ');
    this.svgLinePoints = ptsStr;

    if (this.pontosGrafico.length > 0) {
      const firstX = this.pontosGrafico[0].x;
      const lastX = this.pontosGrafico[this.pontosGrafico.length - 1].x;
      this.svgAreaPoints = ;
    } else {
      this.svgAreaPoints = '';
    }
  }

  salvarTransacao(): void {
    if (!this.novaDescricao || !this.novoValor) {
      alert('Preencha a descrição e o valor!');
      return;
    }

    const isSalario = this.novaCategoria === 'Salário';
    const qtd = isSalario ? 1 : (this.novaQuantidade && this.novaQuantidade > 0 ? Number(this.novaQuantidade) : 1);
    const valUnit = Number(this.novoValor) || 0;
    const valTotal = isSalario ? valUnit : valUnit * qtd;

    const nova: any = {
      descricao: this.novaDescricao,
      estabelecimento: isSalario ? 'Cadastro Manual' : (this.novoEstabelecimento && this.novoEstabelecimento.trim() ? this.novoEstabelecimento.trim() : 'Cadastro Manual'),
      quantidade: qtd,
      valorUnitario: valUnit,
      valor: valTotal,
      categoria: this.novaCategoria,
      conta: this.novaConta || 'Conta Corrente',
      tipo: isSalario ? 'receita' : this.novoTipo,
      data: this.novaData
    };

    this.financeService.addTransacao(nova).subscribe({
      next: () => {
        this.carregarTransacoes();
        this.carregarProdutos();
        this.novaDescricao = '';
        this.novoValor = null;
        this.novaQuantidade = 1;
        this.novoEstabelecimento = '';
        this.activeTab = 'dashboard';
        alert('✅ Transação salva com sucesso!');
      },
      error: (err) => {
        console.error('Erro ao salvar:', err);
        alert('Erro ao salvar transação.');
      }
    });
  }

  // Leitor NFC-e: Extração e Pré-visualização
  consultarNfce(): void {
    if (!this.urlNfce) {
      alert('Cole ou escaneie o QR Code da NFC-e!');
      return;
    }

    this.carregandoNfce = true;
    this.mensagemNfce = '📸 Extraindo dados da nota fiscal com a SEFAZ... Aguarde.';
    this.statusNfceSucesso = true;

    this.financeService.extrairNfce(this.urlNfce).subscribe({
      next: (res) => {
        this.carregandoNfce = false;
        const totalItens = res?.dadosNota?.itens?.length || 0;
        this.mensagemNfce = ;
        this.statusNfceSucesso = true;
        this.dadosNotaPreview = res?.dadosNota || null;
      },
      error: () => {
        this.financeService.consultarNfce(this.urlNfce).subscribe({
          next: (res) => {
            this.carregandoNfce = false;
            const totalItens = res?.dadosNota?.itens?.length || 0;
            this.mensagemNfce = ;
            this.statusNfceSucesso = true;
            this.dadosNotaPreview = res?.dadosNota || null;
          },
          error: (err2) => {
            this.carregandoNfce = false;
            const msgErro = err2?.error?.error || 'Erro ao consultar a nota fiscal junto à SEFAZ. Verifique o link e tente novamente.';
            this.mensagemNfce = ;
            this.statusNfceSucesso = false;
          }
        });
      }
    });
  }

  confirmarEGravarNfce(): void {
    if (!this.dadosNotaPreview) {
      alert('Nenhum dado de nota para salvar.');
      return;
    }

    this.carregandoNfce = true;
    this.mensagemNfce = '💾 Salvando transação em Saídas e cadastrando produtos...';

    this.financeService.salvarNfce(this.dadosNotaPreview).subscribe({
      next: () => {
        this.carregandoNfce = false;
        const totalItens = this.dadosNotaPreview?.itens?.length || 0;
        this.mensagemNfce = ;
        this.statusNfceSucesso = true;
        this.dadosNotaPreview = null;
        this.urlNfce = '';
        this.carregarTransacoes();
        this.carregarProdutos();
        alert('✅ NFC-e e produtos salvos com sucesso!');
      },
      error: (err) => {
        this.carregandoNfce = false;
        const msgErro = err?.error?.error || 'Erro ao salvar a nota fiscal.';
        this.mensagemNfce = ;
        this.statusNfceSucesso = false;
      }
    });
  }

  descartarPreviewNfce(): void {
    this.dadosNotaPreview = null;
    this.mensagemNfce = '';
  }

  get ultimos10Transacoes(): Transacao[] {
    return (this.transacoes || []).slice(0, 10);
  }

  onCategoriaChange(): void {
    if (this.novaCategoria === 'Salário') {
      this.novoTipo = 'receita';
    }
  }

  get saldoTotal(): number {
    return 18612.93;
  }

  get receitasMes(): number {
    return this.transacoes.filter(t => t.tipo === 'receita').reduce((a, b) => a + b.valor, 0);
  }

  get despesasMes(): number {
    return this.transacoes.filter(t => t.tipo === 'despesa').reduce((a, b) => a + b.valor, 0);
  }
}
