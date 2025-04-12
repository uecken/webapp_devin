import React, { useEffect, useRef } from 'react';

export type LimbType = 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg';

export interface LimbPosition {
  x: number;
  y: number;
  angle: number;
}

export interface CharacterState {
  torsoPosition: { x: number; y: number };
  limbPositions: Record<LimbType, LimbPosition>;
  isGrounded: boolean;
}

interface CharacterProps {
  state: CharacterState;
  controlledLimb?: LimbType;
  onLimbMove?: (limb: LimbType, movement: { x: number; y: number; angle: number }) => void;
}

const Character: React.FC<CharacterProps> = ({ state, controlledLimb, onLimbMove }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#8B4513'; // Brown color for torso
    ctx.beginPath();
    ctx.ellipse(
      state.torsoPosition.x, 
      state.torsoPosition.y, 
      40, // width
      60, // height
      0, // rotation
      0, 
      Math.PI * 2
    );
    ctx.fill();
    
    ctx.fillStyle = '#D2B48C'; // Tan color for head
    ctx.beginPath();
    ctx.arc(
      state.torsoPosition.x,
      state.torsoPosition.y - 70,
      30, // radius
      0,
      Math.PI * 2
    );
    ctx.fill();
    
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(state.torsoPosition.x - 10, state.torsoPosition.y - 75, 8, 0, Math.PI * 2);
    ctx.arc(state.torsoPosition.x + 10, state.torsoPosition.y - 75, 8, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(state.torsoPosition.x - 10, state.torsoPosition.y - 75, 4, 0, Math.PI * 2);
    ctx.arc(state.torsoPosition.x + 10, state.torsoPosition.y - 75, 4, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(state.torsoPosition.x, state.torsoPosition.y - 60, 10, 0, Math.PI);
    ctx.stroke();
    
    Object.entries(state.limbPositions).forEach(([limbType, position]) => {
      const isControlled = limbType === controlledLimb;
      
      ctx.strokeStyle = isControlled ? '#FF0000' : '#000000';
      ctx.lineWidth = 10;
      
      let attachX = state.torsoPosition.x;
      let attachY = state.torsoPosition.y;
      
      if (limbType === 'leftArm') {
        attachX -= 30;
        attachY -= 20;
      } else if (limbType === 'rightArm') {
        attachX += 30;
        attachY -= 20;
      } else if (limbType === 'leftLeg') {
        attachX -= 20;
        attachY += 50;
      } else if (limbType === 'rightLeg') {
        attachX += 20;
        attachY += 50;
      }
      
      ctx.beginPath();
      ctx.moveTo(attachX, attachY);
      ctx.lineTo(position.x, position.y);
      ctx.stroke();
      
      ctx.fillStyle = isControlled ? '#FF0000' : '#000000';
      ctx.beginPath();
      ctx.arc(position.x, position.y, 15, 0, Math.PI * 2);
      ctx.fill();
    });
    
  }, [state, controlledLimb]);
  
  useEffect(() => {
    if (!controlledLimb || !onLimbMove) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (e.buttons !== 1) return; // Only respond to left mouse button
      
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const dx = x - state.torsoPosition.x;
      const dy = y - state.torsoPosition.y;
      const angle = Math.atan2(dy, dx);
      
      onLimbMove(controlledLimb, { x, y, angle });
    };
    
    canvas.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
    };
  }, [controlledLimb, onLimbMove, state]);
  
  return (
    <canvas 
      ref={canvasRef} 
      width={800} 
      height={600} 
      className="border border-gray-300 bg-gray-100"
    />
  );
};

export default Character;
