import React, { useEffect, useState } from 'react';
import { 
  PushNotifications,
  PushNotificationSchema,
  Token,
  ActionPerformed
} from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

/**
 * Componente para gerenciar notificações push em dispositivos móveis
 * Este componente não renderiza nada visualmente, apenas gerencia notificações
 */
const MobilePushNotifications: React.FC = () => {
  const [notificationsInitialized, setNotificationsInitialized] = useState(false);
  
  useEffect(() => {
    // Só executa em ambiente nativo (Android/iOS)
    if (Capacitor.isNativePlatform()) {
      const initializePushNotifications = async () => {
        try {
          // Verificar permissões
          const permissionStatus = await PushNotifications.checkPermissions();
          
          if (permissionStatus.receive !== 'granted') {
            // Solicitar permissão
            await PushNotifications.requestPermissions();
          }
          
          // Registrar event listeners
          PushNotifications.addListener('registration', 
            (token: Token) => {
              console.log('Push registration success:', token.value);
              // Aqui você enviaria o token para seu backend para
              // armazenar e usar nas notificações push
              sendTokenToBackend(token.value);
            }
          );
          
          PushNotifications.addListener('registrationError', 
            (error: any) => {
              console.error('Push registration error:', error);
            }
          );
          
          PushNotifications.addListener('pushNotificationReceived', 
            (notification: PushNotificationSchema) => {
              console.log('Push notification received:', notification);
              // Você pode adicionar lógica adicional ao receber uma notificação
              // enquanto o app está aberto
            }
          );
          
          PushNotifications.addListener('pushNotificationActionPerformed', 
            (action: ActionPerformed) => {
              console.log('Push notification action performed:', action);
              // Normalmente aqui você navegaria para uma tela específica
              // com base na notificação que o usuário clicou
              handleNotificationAction(action);
            }
          );
          
          // Registrar para notificações push
          await PushNotifications.register();
          
          setNotificationsInitialized(true);
        } catch (error) {
          console.error('Erro ao inicializar notificações push:', error);
        }
      };
      
      if (!notificationsInitialized) {
        initializePushNotifications();
      }
    }
    
    // Cleanup
    return () => {
      if (Capacitor.isNativePlatform() && notificationsInitialized) {
        // Remover listeners quando o componente for desmontado
        PushNotifications.removeAllListeners();
      }
    };
  }, [notificationsInitialized]);
  
  // Função para enviar token para o backend
  const sendTokenToBackend = async (token: string) => {
    try {
      // Implemente a lógica para enviar o token para seu backend
      await fetch('/api/notifications/register-device', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });
    } catch (error) {
      console.error('Erro ao enviar token para backend:', error);
    }
  };
  
  // Função para lidar com ações de notificação
  const handleNotificationAction = (action: ActionPerformed) => {
    const data = action.notification.data;
    
    // Exemplo de navegação baseada no tipo de notificação
    if (data && data.type) {
      switch (data.type) {
        case 'LOST_PET':
          // Navegar para página de pet perdido
          window.location.href = `/pets/${data.petId}`;
          break;
        case 'DONATION':
          // Navegar para página de doação
          window.location.href = `/donations/${data.donationId}`;
          break;
        case 'MESSAGE':
          // Navegar para conversa
          window.location.href = `/chat/${data.conversationId}`;
          break;
        default:
          // Fallback para homepage
          window.location.href = '/';
      }
    }
  };

  // Este componente não renderiza nada visível
  return null;
};

export default MobilePushNotifications;