import React, { useEffect, useRef } from 'react';

const JitsiMeeting = ({ roomName, displayName, onReadyToClose, onJoined }) => {
  const containerRef = useRef(null);
  const apiRef = useRef(null);

  const onReadyToCloseRef = useRef(onReadyToClose);
  const onJoinedRef = useRef(onJoined);

  useEffect(() => {
    onReadyToCloseRef.current = onReadyToClose;
    onJoinedRef.current = onJoined;
  }, [onReadyToClose, onJoined]);

  useEffect(() => {
    // Si el script ya existe, no lo volvemos a cargar
    if (!window.JitsiMeetExternalAPI) {
      const script = document.createElement('script');
      script.src = 'https://meet.guifi.net/external_api.js';
      script.async = true;
      script.onload = initJitsi;
      document.body.appendChild(script);
    } else {
      initJitsi();
    }

    function initJitsi() {
      if (!containerRef.current) return;
      
      const domain = 'meet.guifi.net';
      const options = {
        roomName: roomName,
        parentNode: containerRef.current,
        lang: 'es', // Forzar idioma español
        configOverwrite: {
          defaultLanguage: 'es', // Forzar español internamente
          disableDeepLinking: true,
          prejoinPageEnabled: true, // Mostrar lobby previo
          prejoinConfig: { enabled: true }, // Mostrar lobby previo
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

      apiRef.current.addListener('videoConferenceJoined', () => {
        if (onJoinedRef.current) onJoinedRef.current();
      });
    }

    return () => {
      if (apiRef.current) {
        apiRef.current.dispose();
      }
    };
  }, [roomName, displayName]);

  return <div ref={containerRef} className="w-full h-full bg-black border-0" />;
};

export default JitsiMeeting;
