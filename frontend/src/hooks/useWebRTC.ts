import { useEffect, useRef, useState, useCallback } from 'react';
import SimplePeer from 'simple-peer';

interface WebRTCOptions {
  roomId: string;
  playerId: string;
  limbType: string;
  serverUrl: string;
}

interface PeerConnection {
  peer: SimplePeer.Instance;
  playerId: string;
}

export interface WebRTCMessage {
  type: string;
  sender?: string;
  data?: any;
  player_id?: string;
  players?: Record<string, string>;
  limb_type?: string;
  movement?: { x: number; y: number; angle: number };
  state?: any;
}

const useWebRTC = ({ roomId, playerId, limbType, serverUrl }: WebRTCOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const [peers, setPeers] = useState<Record<string, PeerConnection>>({});
  const [players, setPlayers] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<WebRTCMessage[]>([]);
  
  const wsRef = useRef<WebSocket | null>(null);
  
  useEffect(() => {
    if (!roomId) {
      console.log('No room ID provided, not connecting to WebSocket');
      return;
    }
    
    const wsUrl = `${serverUrl.replace(/^http/, 'ws')}/ws/${roomId}/${playerId}?limb_type=${limbType}`;
    console.log('Connecting to WebSocket:', wsUrl);
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket connection established');
      setIsConnected(true);
    };
    
    ws.onclose = (event) => {
      console.log('WebSocket connection closed', event.code, event.reason);
      setIsConnected(false);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleSignalingMessage(message);
    };
    
    wsRef.current = ws;
    
    return () => {
      ws.close();
    };
  }, [roomId, playerId, limbType, serverUrl]);
  
  const handleSignalingMessage = useCallback((message: WebRTCMessage) => {
    setMessages(prev => [...prev, message]);
    
    switch (message.type) {
      case 'player_joined':
        if (message.players) {
          setPlayers(message.players);
        }
        
        if (message.player_id && message.player_id !== playerId && !peers[message.player_id]) {
          createPeer(message.player_id, true);
        }
        break;
        
      case 'player_left':
        if (message.player_id && peers[message.player_id]) {
          peers[message.player_id].peer.destroy();
          setPeers(prev => {
            const newPeers = { ...prev };
            if (message.player_id) {
              delete newPeers[message.player_id];
            }
            return newPeers;
          });
          
          setPlayers(prev => {
            const newPlayers = { ...prev };
            if (message.player_id) {
              delete newPlayers[message.player_id];
            }
            return newPlayers;
          });
        }
        break;
        
      case 'offer':
        handleOffer(message);
        break;
        
      case 'answer':
        handleAnswer(message);
        break;
        
      case 'ice-candidate':
        handleIceCandidate(message);
        break;
        
      default:
        break;
    }
  }, [peers, playerId]);
  
  const createPeer = useCallback((targetId: string, initiator: boolean) => {
    console.log(`Creating peer connection with ${targetId}, initiator: ${initiator}`);
    
    const peer = new SimplePeer({
      initiator,
      trickle: true,
    });
    
    peer.on('signal', (data) => {
      const signalData = {
        type: initiator ? 'offer' : 'answer',
        target: targetId,
        data,
      };
      
      wsRef.current?.send(JSON.stringify(signalData));
    });
    
    peer.on('connect', () => {
      console.log(`Connected to peer ${targetId}`);
    });
    
    peer.on('data', (data) => {
      try {
        const message = JSON.parse(data.toString());
        setMessages(prev => [...prev, { ...message, sender: targetId }]);
      } catch (error) {
        console.error('Error parsing peer data:', error);
      }
    });
    
    peer.on('error', (err) => {
      console.error(`Peer connection error with ${targetId}:`, err);
    });
    
    peer.on('close', () => {
      console.log(`Peer connection with ${targetId} closed`);
      setPeers(prev => {
        const newPeers = { ...prev };
        delete newPeers[targetId];
        return newPeers;
      });
    });
    
    setPeers(prev => ({
      ...prev,
      [targetId]: { peer, playerId: targetId },
    }));
    
    return peer;
  }, []);
  
  const handleOffer = useCallback((message: WebRTCMessage) => {
    if (!message.sender || !message.data) return;
    
    let peer = peers[message.sender]?.peer;
    
    if (!peer) {
      const newPeer = createPeer(message.sender, false);
      peer = newPeer;
    }
    
    peer.signal(message.data);
  }, [peers, createPeer]);
  
  const handleAnswer = useCallback((message: WebRTCMessage) => {
    if (!message.sender || !message.data) return;
    
    const peer = peers[message.sender]?.peer;
    
    if (peer) {
      peer.signal(message.data);
    }
  }, [peers]);
  
  const handleIceCandidate = useCallback((message: WebRTCMessage) => {
    if (!message.sender || !message.data) return;
    
    const peer = peers[message.sender]?.peer;
    
    if (peer) {
      peer.signal(message.data);
    }
  }, [peers]);
  
  const sendMessage = useCallback((type: string, data: any) => {
    let message;
    if (type === 'limb_movement') {
      message = { 
        type, 
        movement: data.position 
      };
    } else {
      message = { type, data };
    }
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
    
    const peerMessage = { type, data };
    Object.values(peers).forEach(({ peer }) => {
      if (peer.connected) {
        peer.send(JSON.stringify(peerMessage));
      }
    });
  }, [peers]);
  
  return {
    isConnected,
    players,
    messages,
    sendMessage,
  };
};

export { useWebRTC };
