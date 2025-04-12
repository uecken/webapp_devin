import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import Character, { CharacterState, LimbType } from './Character';
import Stage, { StageData, Obstacle } from './Stage';
import { useWebRTC } from '../../hooks/useWebRTC';
import { v4 as uuidv4 } from 'uuid';

const AVAILABLE_LIMBS: LimbType[] = ['leftArm', 'rightArm', 'leftLeg', 'rightLeg'];

const STAGES: StageData[] = [
  {
    id: 1,
    name: 'Simple Obstacles',
    width: 800,
    height: 600,
    startPosition: { x: 100, y: 400 },
    obstacles: [
      { x: 0, y: 550, width: 800, height: 50, type: 'platform' }, // Ground
      { x: 300, y: 450, width: 200, height: 20, type: 'platform' }, // Platform
      { x: 600, y: 350, width: 150, height: 20, type: 'platform' }, // Platform
      { x: 400, y: 200, width: 50, height: 350, type: 'wall' }, // Wall
    ],
    goal: { x: 700, y: 300, width: 50, height: 50 }
  },
  {
    id: 2,
    name: 'Advanced Course',
    width: 800,
    height: 600,
    startPosition: { x: 100, y: 400 },
    obstacles: [
      { x: 0, y: 550, width: 800, height: 50, type: 'platform' }, // Ground
      { x: 200, y: 450, width: 100, height: 20, type: 'platform' }, // Platform
      { x: 350, y: 350, width: 100, height: 20, type: 'platform' }, // Platform
      { x: 500, y: 250, width: 100, height: 20, type: 'platform' }, // Platform
      { x: 650, y: 150, width: 100, height: 20, type: 'platform' }, // Platform
      { x: 300, y: 300, width: 30, height: 250, type: 'wall' }, // Wall
      { x: 450, y: 200, width: 30, height: 150, type: 'wall' }, // Wall
      { x: 600, y: 100, width: 30, height: 150, type: 'wall' }, // Wall
    ],
    goal: { x: 700, y: 100, width: 50, height: 50 }
  }
];

const initialCharacterState = (stageId: number): CharacterState => {
  const stage = STAGES.find(s => s.id === stageId) || STAGES[0];
  return {
    torsoPosition: { ...stage.startPosition },
    limbPositions: {
      leftArm: { x: stage.startPosition.x - 50, y: stage.startPosition.y - 30, angle: -Math.PI / 4 },
      rightArm: { x: stage.startPosition.x + 50, y: stage.startPosition.y - 30, angle: Math.PI / 4 },
      leftLeg: { x: stage.startPosition.x - 30, y: stage.startPosition.y + 70, angle: -Math.PI / 6 },
      rightLeg: { x: stage.startPosition.x + 30, y: stage.startPosition.y + 70, angle: Math.PI / 6 }
    },
    isGrounded: false
  };
};

const GRAVITY = 0.5;
const LIMB_STRENGTH = 5;
const FRICTION = 0.8;

interface GameProps {
  serverUrl: string;
}

const Game: React.FC<GameProps> = ({ serverUrl }) => {
  const [playerId] = useState<string>(uuidv4());
  const [playerName, setPlayerName] = useState<string>('');
  const [selectedLimb, setSelectedLimb] = useState<LimbType | ''>('');
  const [roomId, setRoomId] = useState<string>('');
  const [stageId, setStageId] = useState<number>(1);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [showJoinDialog, setShowJoinDialog] = useState<boolean>(true);
  const [showRoomDialog, setShowRoomDialog] = useState<boolean>(false);
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [characterState, setCharacterState] = useState<CharacterState>(initialCharacterState(stageId));
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [stageClear, setStageClear] = useState<boolean>(false);
  
  const { players, messages, sendMessage } = useWebRTC({
    roomId: roomId || '', // Don't use a random ID, we need to create a room first
    playerId,
    limbType: selectedLimb || 'spectator',
    serverUrl
  });
  
  const fetchRooms = useCallback(async () => {
    try {
      const response = await fetch(`${serverUrl}/rooms`);
      const data = await response.json();
      setAvailableRooms(data.rooms || []);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  }, [serverUrl]);
  
  const createRoom = useCallback(async () => {
    try {
      const response = await fetch(`${serverUrl}/rooms?stage_id=${stageId}`, {
        method: 'POST'
      });
      const data = await response.json();
      setRoomId(data.room_id);
      setShowRoomDialog(false);
      setGameStarted(true);
    } catch (error) {
      console.error('Error creating room:', error);
    }
  }, [serverUrl, stageId]);
  
  const joinRoom = useCallback((selectedRoomId: string) => {
    setRoomId(selectedRoomId);
    setShowRoomDialog(false);
    setGameStarted(true);
  }, []);
  
  const handleLimbMove = useCallback((limb: LimbType, movement: { x: number; y: number; angle: number }) => {
    if (limb !== selectedLimb) return;
    
    setCharacterState(prev => {
      const newState = { ...prev };
      newState.limbPositions[limb] = movement;
      
      sendMessage('limb_movement', {
        limb,
        position: movement
      });
      
      return newState;
    });
  }, [selectedLimb, sendMessage]);
  
  const handleCollision = useCallback((obstacle: Obstacle) => {
    if (obstacle.type === 'goal') {
      setStageClear(true);
    }
  }, []);
  
  useEffect(() => {
    if (!roomId && gameStarted) {
      createRoom();
    }
  }, [roomId, gameStarted, createRoom]);
  
  useEffect(() => {
    if (!gameStarted) return;
    
    const physicsInterval = setInterval(() => {
      setCharacterState(prev => {
        const newState = { ...prev };
        
        if (!newState.isGrounded) {
          newState.torsoPosition.y += GRAVITY;
        }
        
        const currentStage = STAGES.find(s => s.id === stageId) || STAGES[0];
        const isOnGround = currentStage.obstacles.some(obstacle => {
          if (obstacle.type === 'platform') {
            return (
              newState.torsoPosition.y + 60 >= obstacle.y && // Character bottom
              newState.torsoPosition.y + 60 <= obstacle.y + 10 && // Small tolerance
              newState.torsoPosition.x >= obstacle.x - 40 && // Character left
              newState.torsoPosition.x <= obstacle.x + obstacle.width + 40 // Character right
            );
          }
          return false;
        });
        
        newState.isGrounded = isOnGround;
        
        let totalForceX = 0;
        let totalForceY = 0;
        
        Object.entries(newState.limbPositions).forEach(([_, position]) => {
          const dx = position.x - newState.torsoPosition.x;
          const dy = position.y - newState.torsoPosition.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          const force = Math.min(distance * 0.1, LIMB_STRENGTH);
          const angle = Math.atan2(dy, dx);
          
          totalForceX += Math.cos(angle) * force;
          totalForceY += Math.sin(angle) * force;
        });
        
        newState.torsoPosition.x += totalForceX;
        
        if (!newState.isGrounded || totalForceY < 0) {
          newState.torsoPosition.y += totalForceY;
        }
        
        if (newState.isGrounded) {
          totalForceX *= FRICTION;
        }
        
        const currentStageData = STAGES.find(s => s.id === stageId) || STAGES[0];
        newState.torsoPosition.x = Math.max(40, Math.min(newState.torsoPosition.x, currentStageData.width - 40));
        newState.torsoPosition.y = Math.max(70, Math.min(newState.torsoPosition.y, currentStageData.height - 60));
        
        if (newState.torsoPosition.y >= currentStageData.height - 60) {
          setGameOver(true);
        }
        
        return newState;
      });
    }, 1000 / 60); // 60 FPS
    
    return () => {
      clearInterval(physicsInterval);
    };
  }, [gameStarted, stageId, sendMessage]);
  
  useEffect(() => {
    if (messages.length === 0) return;
    
    const latestMessage = messages[messages.length - 1];
    
    if (latestMessage.type === 'limb_movement') {
      if (latestMessage.limb_type && latestMessage.movement && latestMessage.limb_type !== selectedLimb) {
        const movement = latestMessage.movement as { x: number; y: number; angle: number };
        setCharacterState(prev => {
          const newState = { ...prev };
          newState.limbPositions[latestMessage.limb_type as LimbType] = movement;
          return newState;
        });
      }
      else if (latestMessage.data) {
        const { limb, position } = latestMessage.data;
        if (limb && position && limb !== selectedLimb) {
          setCharacterState(prev => {
            const newState = { ...prev };
            newState.limbPositions[limb as LimbType] = position;
            return newState;
          });
        }
      }
    } else if (latestMessage.type === 'game_state' && latestMessage.state) {
      setCharacterState(latestMessage.state);
    }
  }, [messages, selectedLimb]);
  
  const resetGame = useCallback(() => {
    setCharacterState(initialCharacterState(stageId));
    setGameOver(false);
    setStageClear(false);
    sendMessage('game_state', initialCharacterState(stageId));
  }, [stageId, sendMessage]);
  
  const nextStage = useCallback(() => {
    const nextStageId = stageId + 1;
    if (nextStageId <= STAGES.length) {
      setStageId(nextStageId);
      setCharacterState(initialCharacterState(nextStageId));
      setStageClear(false);
      sendMessage('game_state', initialCharacterState(nextStageId));
    } else {
      setGameStarted(false);
      setShowJoinDialog(true);
    }
  }, [stageId, sendMessage]);
  
  const startGame = useCallback(() => {
    if (!playerName || !selectedLimb) return;
    
    setShowJoinDialog(false);
    setShowRoomDialog(true);
    fetchRooms();
  }, [playerName, selectedLimb, fetchRooms]);
  
  return (
    <div className="container mx-auto p-4">
      {/* Game title */}
      <h1 className="text-3xl font-bold text-center mb-4">マルチリムモンスター</h1>
      <h2 className="text-xl text-center mb-8">Multi-Limb Monster</h2>
      
      {/* Game canvas */}
      {gameStarted && (
        <div className="relative mx-auto w-[800px] h-[600px] border border-gray-300 overflow-hidden">
          {/* Stage */}
          <Stage 
            stageData={STAGES.find(s => s.id === stageId) || STAGES[0]} 
            characterState={characterState}
            onCollision={handleCollision}
          />
          
          {/* Character */}
          <div className="absolute top-0 left-0 z-10">
            <Character 
              state={characterState} 
              controlledLimb={selectedLimb as LimbType} 
              onLimbMove={handleLimbMove}
            />
          </div>
          
          {/* Game info overlay */}
          <div className="absolute top-4 left-4 bg-white/80 p-2 rounded">
            <p>Stage: {STAGES.find(s => s.id === stageId)?.name}</p>
            <p>Players: {Object.keys(players).length}</p>
            <p>Your limb: {selectedLimb}</p>
          </div>
          
          {/* Connected players */}
          <div className="absolute top-4 right-4 bg-white/80 p-2 rounded">
            <p className="font-bold">Connected Players:</p>
            <ul>
              {Object.entries(players).map(([id, limb]) => (
                <li key={id}>{limb === selectedLimb ? `You (${limb})` : `Player (${limb})`}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      
      {/* Game controls */}
      {gameStarted && (
        <div className="mt-4 text-center">
          <Button onClick={resetGame} variant="outline" className="mr-2">
            Reset Position
          </Button>
          <Button onClick={() => setGameStarted(false)} variant="outline">
            Leave Game
          </Button>
        </div>
      )}
      
      {/* Join game dialog */}
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join Multi-Limb Monster</DialogTitle>
            <DialogDescription>
              Enter your name and select which limb you want to control
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="playerName">Your Name</label>
              <Input
                id="playerName"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="limbSelect">Select Limb</label>
              <Select value={selectedLimb} onValueChange={(value) => setSelectedLimb(value as LimbType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a limb to control" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_LIMBS.map((limb) => (
                    <SelectItem key={limb} value={limb}>
                      {limb === 'leftArm' ? 'Left Arm' : 
                       limb === 'rightArm' ? 'Right Arm' : 
                       limb === 'leftLeg' ? 'Left Leg' : 'Right Leg'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="stageSelect">Select Stage</label>
              <Select value={stageId.toString()} onValueChange={(value) => setStageId(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a stage" />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id.toString()}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button onClick={startGame} disabled={!playerName || !selectedLimb}>
            Continue
          </Button>
        </DialogContent>
      </Dialog>
      
      {/* Room selection dialog */}
      <Dialog open={showRoomDialog} onOpenChange={setShowRoomDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join or Create a Room</DialogTitle>
            <DialogDescription>
              Join an existing room or create a new one
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Button onClick={fetchRooms} variant="outline" className="w-full">
              Refresh Rooms
            </Button>
            
            {availableRooms.length > 0 ? (
              <div className="space-y-2">
                <p className="font-medium">Available Rooms:</p>
                <div className="grid gap-2">
                  {availableRooms.map((room) => (
                    <Card key={room.id}>
                      <CardContent className="p-4 flex justify-between items-center">
                        <div>
                          <p>Room: {room.id.substring(0, 8)}...</p>
                          <p>Players: {room.players}/{room.max_players}</p>
                          <p>Stage: {STAGES.find(s => s.id === room.stage_id)?.name || 'Unknown'}</p>
                        </div>
                        <Button 
                          onClick={() => joinRoom(room.id)} 
                          disabled={room.players >= room.max_players}
                        >
                          Join
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <p>No rooms available. Create a new one!</p>
            )}
          </div>
          
          <Button onClick={createRoom} className="w-full">
            Create New Room
          </Button>
        </DialogContent>
      </Dialog>
      
      {/* Game over dialog */}
      <AlertDialog open={gameOver}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Game Over!</AlertDialogTitle>
            <AlertDialogDescription>
              Your monster fell off the stage. Try again!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={resetGame}>
              Try Again
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Stage clear dialog */}
      <AlertDialog open={stageClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stage Clear!</AlertDialogTitle>
            <AlertDialogDescription>
              Congratulations! You've cleared the stage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={nextStage}>
              Next Stage
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Game;
