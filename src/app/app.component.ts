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
  activeTab: 'dashboard' | 'transacoes' | 'nfce' | 'produtos' = 'dashboard';
  menuAberto: boolean = false;
  transacoes: Transacao[] = [];
  produtos: any[] = [];
  dadosUltimaNota: any = null;

  // Busca e Filtro de Produtos
  buscaProduto: string = '';

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

  // Form Transação
  novaDescricao: string = '';
  novoValor: number | null = null;
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

  setTab(tab: 'dashboard' | 'transacoes' | 'nfce' | 'produtos'): void {
    this.pararScanner();
    this.activeTab = tab;
    this.fecharMenu();
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
          this.html5QrCode = new Html5Qrcode("qr-reader");
          const config = { fps: 10, qrbox: { width: 220, height: 220 }, aspectRatio: 1.0 };

          this.html5QrCode.start(
            { facingMode: "environment" },
            config,
            (decodedText: string) => {
              this.urlNfce = decodedText;
              this.mensagemNfce = '✅ QR Code lido com sucesso! Consultando nota fiscal...';
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
              { facingMode: "user" },
              config,
              (decodedText: string) => {
                this.urlNfce = decodedText;
                this.mensagemNfce = '✅ QR Code lido com sucesso! Consultando nota fiscal...';
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
      const html5QrCodeTemp = new Html5Qrcode("qr-reader");
      html5QrCodeTemp.scanFile(file, true)
        .then((decodedText: string) => {
          this.urlNfce = decodedText;
          this.mensagemNfce = '✅ QR Code identificado! Importando nota fiscal...';
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

  // Lista Filtrada de Produtos (Busca + Ordem Alfabética por Nome)
  get produtosFiltrados(): any[] {
    if (!this.produtos) return [];
    
    let lista = [...this.produtos];
    if (this.buscaProduto && this.buscaProduto.trim()) {
      const termo = this.buscaProduto.toLowerCase().trim();
      lista = lista.filter(p =>
        (p.nome_produto && p.nome_produto.toLowerCase().includes(termo)) ||
        (p.codigo && p.codigo.toLowerCase().includes(termo))
      );
    }

    // Ordenação Alfabética por Nome do Produto
    return lista.sort((a, b) => {
      const nomeA = (a.nome_produto || '').toLowerCase();
      const nomeB = (b.nome_produto || '').toLowerCase();
      return nomeA.localeCompare(nomeB);
    });
  }

  limparBusca(): void {
    this.buscaProduto = '';
  }

  // Modal de Evolução de Preços
  abrirModalEvolucaoPreco(p: any): void {
    if (!p || !p.nome_produto) return;
    this.produtoSelecionado = p;

    // Filtra todo o histórico deste produto pelo nome
    const nomeAlvo = p.nome_produto.toLowerCase().trim();
    const historico = this.produtos.filter(item => 
      item.nome_produto && item.nome_produto.toLowerCase().trim() === nomeAlvo
    );

    // Ordena por data (da mais antiga para a mais recente para o gráfico)
    historico.sort((a, b) => {
      const dataA = a.data_emissao || a.data_cadastro || a.data || '';
      const dataB = b.data_emissao || b.data_cadastro || b.data || '';
      return dataA.localeCompare(dataB);
    });

    this.historicoPrecosProduto = historico;

    // Cálculos KPI do Preço
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

    // Gera as coordenadas do Gráfico SVG
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
    const svgHeight = 200;
    const marginX = 50;
    const marginYTop = 30;
    const marginYBottom = 150;
    const availableWidth = svgWidth - 2 * marginX;
    const availableHeight = marginYBottom - marginYTop;

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
        y = 90; // linha reta no centro
      }

      const rawData = item.data_emissao || item.data_cadastro || item.data || '';
      const dataFormatted = rawData ? rawData.split('-').slice(1).join('/') : `P${index + 1}`;

      return {
        x,
        y,
        valor: val,
        dataFormatted
      };
    });

    const ptsStr = this.pontosGrafico.map(pt => `${pt.x},${pt.y}`).join(' ');
    this.svgLinePoints = ptsStr;

    if (this.pontosGrafico.length > 0) {
      const firstX = this.pontosGrafico[0].x;
      const lastX = this.pontosGrafico[this.pontosGrafico.length - 1].x;
      this.svgAreaPoints = `${firstX},150 ${ptsStr} ${lastX},150`;
    } else {
      this.svgAreaPoints = '';
    }
  }

  salvarTransacao(): void {
    if (!this.novaDescricao || !this.novoValor) {
      alert('Preencha a descrição e o valor!');
      return;
    }

    const nova: Transacao = {
      descricao: this.novaDescricao,
      estabelecimento: this.novaDescricao,
      valor: this.novoValor,
      categoria: this.novaCategoria,
      conta: this.novaConta,
      tipo: this.novoTipo,
      data: this.novaData
    };

    this.financeService.addTransacao(nova).subscribe({
      next: () => {
        this.carregarTransacoes();
        this.carregarProdutos();
        this.novaDescricao = '';
        this.novoValor = null;
        this.activeTab = 'dashboard';
      },
      error: (err) => console.error('Erro ao salvar:', err)
    });
  }

  consultarNfce(): void {
    if (!this.urlNfce) {
      alert('Cole ou escaneie o QR Code da NFC-e!');
      return;
    }

    this.carregandoNfce = true;
    this.mensagemNfce = 'Processando nota fiscal com a SEFAZ...';
    this.statusNfceSucesso = true;

    this.financeService.consultarNfce(this.urlNfce).subscribe({
      next: (res) => {
        this.carregandoNfce = false;
        this.mensagemNfce = '✅ Nota fiscal importada e produtos cadastrados com sucesso!';
        this.statusNfceSucesso = true;
        this.dadosUltimaNota = res?.dadosNota || null;
        this.carregarTransacoes();
        this.carregarProdutos();
        this.urlNfce = '';
      },
      error: (err) => {
        this.carregandoNfce = false;
        const msgErro = err?.error?.error || 'Erro ao consultar a nota fiscal junto à SEFAZ. Verifique o link e tente novamente.';
        this.mensagemNfce = `❌ ${msgErro}`;
        this.statusNfceSucesso = false;
      }
    });
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

  get taxaPoupanca(): number {
    const r = this.receitasMes;
    const d = this.despesasMes;
    if (r === 0) return 0;
    return Number(((r - d) / r * 100).toFixed(1));
  }
}
