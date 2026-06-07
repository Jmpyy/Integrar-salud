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
        configOverwrite: {
          disableDeepLinking: true,
          prejoinPageEnabled: false,
          enableNoisyMicDetection: false,
          disableInviteFunctions: true,
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'closedcaptions', 'desktop',
            'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
            'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
            'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
            'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone'
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
