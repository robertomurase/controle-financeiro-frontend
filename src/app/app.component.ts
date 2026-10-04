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

  // Formulário Manual
  novaDescricao: string = '';
  novoValor: number | null = null;
  novaCategoria: string = 'Alimentação / Mercado';
  novaConta: string = 'Conta Corrente';
  novoTipo: 'receita' | 'despesa' = 'despesa';
  novaData: string = new Date().toISOString().split('T')[0];

  // Leitor NFC-e
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
          const config = {
            fps: 10,
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1.0
          };

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
            (errorMessage: any) => {}
          ).then(() => {
            this.mensagemNfce = '📷 Câmera traseira ativa! Aponte para o QR Code da nota fiscal.';
            this.statusNfceSucesso = true;
          }).catch((err: any) => {
            console.warn('Câmera traseira indisponível, tentando câmera padrão:', err);
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
            }).catch((err2: any) => {
              console.error('Erro ao abrir câmera:', err2);
              this.mensagemNfce = '❌ Não foi possível acessar a câmera. Garanta permissão no navegador ou envie uma foto.';
              this.statusNfceSucesso = false;
              this.scannerAtivo = false;
            });
          });
        } catch (e) {
          console.error('Erro ao instanciar Html5Qrcode:', e);
          this.mensagemNfce = '❌ Erro ao inicializar o leitor de QR Code.';
          this.statusNfceSucesso = false;
        }
      } else {
        this.mensagemNfce = '⚠️ Leitor de QR Code carregando... Clique em Ligar Câmera novamente se necessário.';
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
          }).catch(() => {
            this.html5QrCode = null;
          });
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

    this.mensagemNfce = '📸 Analisando imagem em busca do QR Code da nota fiscal...';
    this.statusNfceSucesso = true;

    if (typeof Html5Qrcode !== 'undefined') {
      const html5QrCodeTemp = new Html5Qrcode("qr-reader");
      html5QrCodeTemp.scanFile(file, true)
        .then((decodedText: string) => {
          this.urlNfce = decodedText;
          this.mensagemNfce = '✅ QR Code lido com sucesso! Consultando nota fiscal...';
          this.statusNfceSucesso = true;
          this.consultarNfce();
        })
        .catch(() => {
          this.mensagemNfce = '❌ Não foi possível encontrar um QR Code válido na imagem. Tente uma foto mais nítida.';
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
        if (dados && dados.length > 0) {
          this.transacoes = dados;
        } else {
          this.transacoes = [
            { id: 1, data: '2026-09-29', estabelecimento: 'TRIGO KIBE YOKI 500G', descricao: 'TRIGO KIBE YOKI 500G', categoria: 'Alimentação / Mercado', conta: 'Conta Corrente', tipo: 'despesa', valor: 12.99, isNfce: true },
            { id: 2, data: '2026-09-28', estabelecimento: 'TRIGO KIBE YOKI 500G', descricao: 'TRIGO KIBE YOKI 500G', categoria: 'Alimentação / Mercado', conta: 'Conta Corrente', tipo: 'despesa', valor: 11.19, isNfce: true },
            { id: 3, data: '2026-09-27', estabelecimento: 'Restaurante', descricao: 'Restaurante', categoria: 'Alimentação / Mercado', conta: 'Conta Corrente', tipo: 'despesa', valor: 200.00, isNfce: true },
            { id: 4, data: '2026-09-26', estabelecimento: 'AUTO POSTO MUFFATO LTDA', descricao: 'Combustível - AUTO POSTO MUFFATO', categoria: 'Transporte', conta: 'Conta Corrente', tipo: 'despesa', valor: 220.95, isNfce: true },
            { id: 5, data: '2026-09-26', estabelecimento: 'CARREFOUR COMERCIO E INDUSTRIA', descricao: 'Mercado - CARREFOUR', categoria: 'Alimentação / Mercado', conta: 'Conta Corrente', tipo: 'despesa', valor: 8.99, isNfce: true }
          ];
        }
        this.carregarProdutos();
      },
      error: () => {
        this.transacoes = [
          { id: 1, data: '2026-09-29', estabelecimento: 'TRIGO KIBE YOKI 500G', descricao: 'TRIGO KIBE YOKI 500G', categoria: 'Alimentação / Mercado', conta: 'Conta Corrente', tipo: 'despesa', valor: 12.99, isNfce: true },
          { id: 2, data: '2026-09-28', estabelecimento: 'TRIGO KIBE YOKI 500G', descricao: 'TRIGO KIBE YOKI 500G', categoria: 'Alimentação / Mercado', conta: 'Conta Corrente', tipo: 'despesa', valor: 11.19, isNfce: true },
          { id: 3, data: '2026-09-27', estabelecimento: 'Restaurante', descricao: 'Restaurante', categoria: 'Alimentação / Mercado', conta: 'Conta Corrente', tipo: 'despesa', valor: 200.00, isNfce: true },
          { id: 4, data: '2026-09-26', estabelecimento: 'AUTO POSTO MUFFATO LTDA', descricao: 'Combustível - AUTO POSTO MUFFATO', categoria: 'Transporte', conta: 'Conta Corrente', tipo: 'despesa', valor: 220.95, isNfce: true },
          { id: 5, data: '2026-09-26', estabelecimento: 'CARREFOUR COMERCIO E INDUSTRIA', descricao: 'Mercado - CARREFOUR', categoria: 'Alimentação / Mercado', conta: 'Conta Corrente', tipo: 'despesa', valor: 8.99, isNfce: true }
        ];
        this.carregarProdutos();
      }
    });
  }

  carregarProdutos(): void {
    this.financeService.getProdutos().subscribe({
      next: (dados) => {
        this.produtos = this.mesclarProdutosComTransacoes(dados || []);
      },
      error: () => {
        this.produtos = this.mesclarProdutosComTransacoes([]);
      }
    });
  }

  mesclarProdutosComTransacoes(produtosApi: any[]): any[] {
    const mapa = new Map<string, any>();

    // 1. Produtos vindos da API
    for (const p of produtosApi) {
      const nome = p.nome_produto || p.descricao;
      if (nome) {
        mapa.set(nome.toLowerCase().trim(), {
          nome_produto: nome,
          codigo: p.codigo || '-',
          quantidade_total: p.quantidade_total || p.quantidade || 1,
          unidade: p.unidade || 'UN',
          preco_medio: p.preco_medio || p.valor_unitario || p.valor_total || 0,
          gasto_total: p.gasto_total || p.valor_total || 0
        });
      }
    }

    // 2. Unificar com os lançamentos de despesa do Dashboard / Transações Manuais
    for (const t of this.transacoes) {
      if (t.tipo === 'despesa') {
        const nome = t.estabelecimento || t.descricao;
        if (!nome) continue;
        const chave = nome.toLowerCase().trim();

        if (mapa.has(chave)) {
          // Se já existe, garante formato limpo
        } else {
          mapa.set(chave, {
            nome_produto: nome,
            codigo: t.isNfce ? 'NFC-e' : 'MANUAL',
            quantidade_total: 1,
            unidade: 'UN',
            preco_medio: t.valor,
            gasto_total: t.valor
          });
        }
      }
    }

    return Array.from(mapa.values()).sort((a, b) => b.gasto_total - a.gasto_total);
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
        this.novaDescricao = '';
        this.novoValor = null;
        this.carregarTransacoes();
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
        this.urlNfce = '';
      },
      error: () => {
        this.carregandoNfce = false;
        this.mensagemNfce = '❌ Erro ao consultar a nota fiscal junto à SEFAZ. Verifique o link e tente novamente.';
        this.statusNfceSucesso = false;
      }
    });
  }

  // Cálculos KPIs
  get saldoTotal(): number {
    return 18612.93;
  }

  get receitasMes(): number {
    const total = this.transacoes.filter(t => t.tipo === 'receita').reduce((a, b) => a + b.valor, 0);
    return total > 0 ? total : 20000.00;
  }

  get despesasMes(): number {
    const total = this.transacoes.filter(t => t.tipo === 'despesa').reduce((a, b) => a + b.valor, 0);
    return total > 0 ? total : 2387.07;
  }

  get taxaPoupanca(): number {
    const r = this.receitasMes;
    const d = this.despesasMes;
    if (r === 0) return 0;
    return Number(((r - d) / r * 100).toFixed(1));
  }
}
