import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.financeiro.app',
  appName: 'Controle Financeiro',
  webDir: 'dist/controle-financeiro-frontend/browser',
  server: {
    androidScheme: 'https'
  }
};

export default config;
