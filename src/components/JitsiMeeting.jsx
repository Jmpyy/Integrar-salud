import React, { useEffect, useRef } from 'react';

const JitsiMeeting = ({ roomName, displayName, password, isModerator, onReadyToClose, onJoined }) => {
  const containerRef = useRef(null);
  const apiRef = useRef(null);

  const onReadyToCloseRef = useRef(onReadyToClose);
  const onJoinedRef = useRef(onJoined);

  useEffect(() => {
    onReadyToCloseRef.current = onReadyToClose;
    onJoinedRef.current = onJoined;
  }, [onReadyToClose, onJoined]);

  useEffect(() => {
    let isMounted = true;

    function initJitsi() {
      if (!isMounted || !containerRef.current) return;
      
      // Por si acaso, si ya hay una instancia, la destruimos antes de crear otra
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }
      
      const domain = 'meet.jit.si';
      const options = {
        roomName: roomName,
        parentNode: containerRef.current,
        lang: 'es', // Forzar idioma español
        configOverwrite: {
          defaultLanguage: 'es', // Forzar español internamente
          disableDeepLinking: true,
          prejoinPageEnabled: isModerator, // Mostrar lobby previo solo al médico
          prejoinConfig: { enabled: isModerator }, // Mostrar lobby previo solo al médico
          enableNoisyMicDetection: false,
          disableInviteFunctions: true,
          stereo: false, // Forzar mono
          p2p: { enabled: false }, // Deshabilitar P2P
          
          // Optimizaciones de Telemedicina (Estabilidad y UX)
          resolution: 720, // Limitar a HD para evitar saturar conexiones de pacientes con datos móviles
          requireDisplayName: true,
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          
          // API Moderna (Las versiones recientes de Jitsi mueven los botones al configOverwrite)
          toolbarButtons: [
            'microphone', 'camera', 'desktop', 'chat', 'raisehand', 'tileview', 'settings', 'hangup'
          ],
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'desktop', 'chat', 'raisehand', 'tileview', 'settings', 'hangup'
          ],
        },
        userInfo: {
          displayName: displayName
        }
      };

      apiRef.current = new window.JitsiMeetExternalAPI(domain, options);
      
      // Forzar el nombre por si el localStorage de Jitsi lo sobreescribe
      apiRef.current.executeCommand('displayName', displayName);

      // Evento clave: cuando el usuario presiona el botón rojo de cortar
      apiRef.current.addListener('videoConferenceLeft', () => {
        if (onReadyToCloseRef.current) onReadyToCloseRef.current();
      });
      
      apiRef.current.addListener('readyToClose', () => {
        if (onReadyToCloseRef.current) onReadyToCloseRef.current();
      });

      // Flag para que solo se envíe la contraseña una sola vez (evita bucles si el evento se dispara varias veces)
      let passwordSent = false;
      apiRef.current.addListener('passwordRequired', () => {
        if (password && !passwordSent) {
          passwordSent = true;
          // Un pequeño delay asegura que Jitsi esté listo para recibir el comando y salte el popup
          setTimeout(() => {
            if (apiRef.current) {
              apiRef.current.executeCommand('password', password);
            }
          }, 300);
        }
      });

      apiRef.current.addListener('videoConferenceJoined', () => {
        if (onJoinedRef.current) onJoinedRef.current();
        
        if (isModerator && password) {
          // Aplicar contraseña siempre que el médico se une/vuelve a unirse
          // Esto le devuelve el control de la sala aunque el paciente haya llegado primero
          apiRef.current.executeCommand('password', password);
        }
      });
    }

    if (!window.JitsiMeetExternalAPI) {
      let script = document.querySelector('script[src="https://meet.jit.si/external_api.js"]');
      if (!script) {
        script = document.createElement('script');
        script.src = 'https://meet.jit.si/external_api.js';
        script.async = true;
        document.body.appendChild(script);
      }
      
      const handleLoad = () => {
        if (isMounted) initJitsi();
      };
      
      script.addEventListener('load', handleLoad);
      
      return () => {
        isMounted = false;
        script.removeEventListener('load', handleLoad);
        if (apiRef.current) {
          apiRef.current.dispose();
          apiRef.current = null;
        }
      };
    } else {
      initJitsi();
    }

    return () => {
      isMounted = false;
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }
    };
  }, [roomName, displayName]);

  return <div ref={containerRef} className="w-full h-full bg-black border-0" />;
};

export default JitsiMeeting;
