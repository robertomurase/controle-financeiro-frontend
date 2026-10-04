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
  private readonly PROD_API_URL = 'https://controle-financeiro-backend-b3wz.onrender.com/api';
  private readonly DEV_API_URL = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  public get apiUrl(): string {
    if (typeof window !== 'undefined') {
      const customUrl = localStorage.getItem('API_URL');
      if (customUrl && customUrl.trim() !== '') {
        return customUrl.trim().replace(/\/+$/, '');
      }

      const host = window.location.hostname;
      if (host !== 'localhost' && host !== '127.0.0.1') {
        return this.PROD_API_URL;
      }
    }
    return this.DEV_API_URL;
  }

  public setApiUrl(novaUrl: string): void {
    if (typeof window !== 'undefined' && novaUrl) {
      const urlLimpa = novaUrl.trim().replace(/\/+$/, '');
      localStorage.setItem('API_URL', urlLimpa);
    }
  }

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