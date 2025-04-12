import React, { useEffect, useRef } from 'react';
import { CharacterState } from './Character';

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'platform' | 'wall' | 'goal';
}

export interface StageData {
  id: number;
  name: string;
  width: number;
  height: number;
  startPosition: { x: number; y: number };
  obstacles: Obstacle[];
  goal: { x: number; y: number; width: number; height: number };
}

interface StageProps {
  stageData: StageData;
  characterState: CharacterState;
  onCollision?: (obstacle: Obstacle) => void;
}

const Stage: React.FC<StageProps> = ({ stageData, characterState, onCollision }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = stageData.width;
    canvas.height = stageData.height;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#87CEEB'; // Sky blue
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    stageData.obstacles.forEach(obstacle => {
      switch (obstacle.type) {
        case 'platform':
          ctx.fillStyle = '#8B4513'; // Brown
          break;
        case 'wall':
          ctx.fillStyle = '#696969'; // Dark gray
          break;
        case 'goal':
          ctx.fillStyle = '#FFD700'; // Gold
          break;
        default:
          ctx.fillStyle = '#000000'; // Black
      }
      
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    });
    
    ctx.fillStyle = 'rgba(0, 255, 0, 0.3)'; // Semi-transparent green
    ctx.fillRect(
      stageData.goal.x,
      stageData.goal.y,
      stageData.goal.width,
      stageData.goal.height
    );
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      stageData.goal.x,
      stageData.goal.y,
      stageData.goal.width,
      stageData.goal.height
    );
    
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(
      stageData.goal.x + 10,
      stageData.goal.y - 50,
      5,
      50
    );
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(stageData.goal.x + 15, stageData.goal.y - 50);
    ctx.lineTo(stageData.goal.x + 35, stageData.goal.y - 40);
    ctx.lineTo(stageData.goal.x + 15, stageData.goal.y - 30);
    ctx.closePath();
    ctx.fill();
    
  }, [stageData]);
  
  useEffect(() => {
    if (!onCollision) return;
    
    stageData.obstacles.forEach(obstacle => {
      const characterX = characterState.torsoPosition.x;
      const characterY = characterState.torsoPosition.y;
      const characterRadius = 40; // Approximate character radius
      
      const collides = (
        characterX + characterRadius > obstacle.x &&
        characterX - characterRadius < obstacle.x + obstacle.width &&
        characterY + characterRadius > obstacle.y &&
        characterY - characterRadius < obstacle.y + obstacle.height
      );
      
      if (collides) {
        onCollision(obstacle);
      }
    });
    
    const characterX = characterState.torsoPosition.x;
    const characterY = characterState.torsoPosition.y;
    const characterRadius = 40;
    
    const reachedGoal = (
      characterX + characterRadius > stageData.goal.x &&
      characterX - characterRadius < stageData.goal.x + stageData.goal.width &&
      characterY + characterRadius > stageData.goal.y &&
      characterY - characterRadius < stageData.goal.y + stageData.goal.height
    );
    
    if (reachedGoal) {
      onCollision({ ...stageData.goal, type: 'goal' });
    }
    
  }, [characterState, stageData, onCollision]);
  
  return (
    <div className="relative">
      <canvas 
        ref={canvasRef} 
        className="absolute top-0 left-0 z-0"
      />
    </div>
  );
};

export default Stage;
