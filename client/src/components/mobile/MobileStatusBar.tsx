import React, { useEffect } from 'react';
import { StatusBar, Style as StatusBarStyle } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

interface MobileStatusBarProps {
  style?: 'light' | 'dark';
  backgroundColor?: string;
}

/**
 * Componente para controlar a barra de status em aplicativos móveis
 * Este componente não renderiza nada visualmente, apenas controla a API nativa
 */
const MobileStatusBar: React.FC<MobileStatusBarProps> = ({
  style = 'light',
  backgroundColor = '#FFFFFF'
}) => {
  useEffect(() => {
    // Só executa em ambiente nativo (Android/iOS)
    if (Capacitor.isNativePlatform()) {
      const setupStatusBar = async () => {
        try {
          // Configura o estilo da barra de status (texto claro ou escuro)
          await StatusBar.setStyle({
            style: style === 'light' ? StatusBarStyle.Light : StatusBarStyle.Dark
          });
          
          // Em Android, também configuramos a cor de fundo
          if (Capacitor.getPlatform() === 'android') {
            await StatusBar.setBackgroundColor({ color: backgroundColor });
          }
        } catch (error) {
          console.error('Erro ao configurar barra de status:', error);
        }
      };
      
      setupStatusBar();
    }
  }, [style, backgroundColor]);

  // Este componente não renderiza nada visível
  return null;
};

export default MobileStatusBar;