import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Transacao {
  id?: number;
  descricao: string;
  estabelecimento?: string;
  valor: number;
  categoria: string;
  conta?: string;
  tipo: 'receita' | 'despesa';
  data: string;
  isNfce?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class FinanceService {
  private apiUrl = 'https://controle-financeiro-backend-b3wz.onrender.com';

  constructor(private http: HttpClient) {}

  getTransacoes(): Observable<Transacao[]> {
    return this.http.get<Transacao[]>(`${this.apiUrl}/transacoes`);
  }

  addTransacao(transacao: Transacao): Observable<any> {
    return this.http.post(`${this.apiUrl}/transacoes`, transacao);
  }

  consultarNfce(urlNfce: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/nfce/consultar`, { url: urlNfce });
  }

  getProdutos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/produtos`);
  }
}
