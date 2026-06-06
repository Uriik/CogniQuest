import React from 'react';

interface ShipIconProps {
  type: 'submarine' | 'destroyer' | 'cruiser';
  length: number;
  isHorizontal: boolean;
}

export const AnimatedShipIcon = ({ type, length, isHorizontal }: ShipIconProps) => {
  const width = isHorizontal ? length * 100 : 100;
  const height = isHorizontal ? 100 : length * 100;

  // We define a base ship that is horizontally oriented from 0,0 to length*100, 100
  // If vertical, we just rotate the entire SVG group by 90 degrees around the center
  const renderShipGraphic = () => {
    const len = length * 100;
    
    if (type === 'submarine') {
      // Submarino: length 1 (100x100)
      return (
        <g className="sub-body" fill="none" stroke="#0ff" strokeWidth="4" filter="url(#glow-cyan)">
          {/* Main Hull */}
          <rect x="15" y="25" width="70" height="50" rx="25" />
          {/* Conning tower */}
          <rect x="35" y="35" width="30" height="30" rx="5" fill="rgba(0, 255, 255, 0.2)" />
          {/* Details */}
          <line x1="15" y1="50" x2="85" y2="50" strokeOpacity="0.5" />
          <circle cx="50" cy="50" r="8" fill="#0ff" fillOpacity="0.5" />
          {/* Propeller area */}
          <path d="M 5 40 L 15 50 L 5 60 Z" fill="rgba(0, 255, 255, 0.5)" />
        </g>
      );
    }

    if (type === 'destroyer') {
      // Destroyer: length 3 (300x100)
      return (
        <g className="dest-body" fill="none" stroke="#f0f" strokeWidth="4" filter="url(#glow-magenta)">
          {/* Main Hull */}
          <path d={`M 20 50 L 60 20 L ${len - 20} 20 L ${len - 10} 50 L ${len - 20} 80 L 60 80 Z`} fill="rgba(255, 0, 255, 0.1)" />
          {/* Decks */}
          <rect x="80" y="35" width="120" height="30" rx="5" />
          <rect x="100" y="40" width="80" height="20" rx="2" fill="rgba(255, 0, 255, 0.2)" />
          {/* Turrets (Canhões) */}
          <circle cx="230" cy="50" r="12" />
          <line x1="230" y1="50" x2="270" y2="50" strokeWidth="6" />
          <circle cx="70" cy="50" r="10" />
          <line x1="70" y1="50" x2="30" y2="50" strokeWidth="4" />
          {/* Helipad lines */}
          <rect x="110" y="30" width="60" height="40" rx="2" strokeOpacity="0.3" strokeDasharray="5,5" />
        </g>
      );
    }

    if (type === 'cruiser') {
      // Cruiser / Aircraft Carrier: length 5 (500x100)
      return (
        <g className="cruise-body" fill="none" stroke="#8a2be2" strokeWidth="5" filter="url(#glow-purple)">
          {/* Massive Hull */}
          <path d={`M 30 50 L 80 15 L ${len - 30} 15 L ${len - 10} 50 L ${len - 30} 85 L 80 85 Z`} fill="rgba(138, 43, 226, 0.15)" />
          {/* Runway / Deck lines */}
          <line x1="80" y1="50" x2="${len - 40}" y2="50" strokeOpacity="0.6" strokeDasharray="15,10" strokeWidth="3" />
          <line x1="120" y1="25" x2="400" y2="25" strokeOpacity="0.3" />
          <line x1="120" y1="75" x2="400" y2="75" strokeOpacity="0.3" />
          {/* Command Tower */}
          <rect x="350" y="65" width="80" height="20" rx="3" fill="rgba(138, 43, 226, 0.4)" />
          <circle cx="390" cy="75" r="5" fill="#fff" />
          {/* Jet shapes on deck */}
          <path d="M 150 45 L 170 50 L 150 55 Z" fill="#8a2be2" />
          <path d="M 220 45 L 240 50 L 220 55 Z" fill="#8a2be2" />
          <path d="M 290 45 L 310 50 L 290 55 Z" fill="#8a2be2" />
          <path d="M 180 20 L 200 25 L 180 30 Z" fill="#8a2be2" />
          {/* Grid/plating */}
          <rect x="100" y="15" width="20" height="70" strokeOpacity="0.2" />
          <rect x="250" y="15" width="20" height="70" strokeOpacity="0.2" />
          <rect x="420" y="15" width="20" height="70" strokeOpacity="0.2" />
        </g>
      );
    }
  };

  return (
    <svg 
      width="100%" 
      height="100%" 
      viewBox={`0 0 ${width} ${height}`} 
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      style={{ display: 'block' }}
    >
      <defs>
        <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="glow-magenta" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="glow-purple" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      <style>
        {`
          @keyframes pulsate {
            0% { opacity: 0.8; }
            50% { opacity: 1; }
            100% { opacity: 0.8; }
          }
          .sub-body { animation: pulsate 2s infinite; }
          .dest-body { animation: pulsate 3s infinite; }
          .cruise-body { animation: pulsate 4s infinite; }
        `}
      </style>
      
      {/* If vertical, we render the horizontal ship and rotate it around the top-left corner then translate it so it stays within the viewBox */}
      <g transform={!isHorizontal ? `translate(100, 0) rotate(90)` : undefined}>
        {renderShipGraphic()}
      </g>
    </svg>
  );
};
