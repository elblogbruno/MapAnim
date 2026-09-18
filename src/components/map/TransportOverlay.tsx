import React from 'react';
import { TransportSceneState } from '../../core/types/animation';

interface ScreenPoint {
  x: number;
  y: number;
}

interface Props {
  transport: TransportSceneState;
  projectCoord: (lng: number, lat: number) => ScreenPoint | null;
}

export const TransportOverlay: React.FC<Props> = ({ transport, projectCoord }) => {
  if (!transport.visible || !transport.position) return null;

  const pt = projectCoord(transport.position[0], transport.position[1]);
  if (!pt) return null;

  const size = transport.size || 26;
  const heading = transport.heading || 0; // Degrees

  return (
    <div
      className="absolute pointer-events-none z-20 transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 ease-linear"
      style={{
        left: `${pt.x}px`,
        top: `${pt.y}px`,
        transform: `translate(-50%, -50%) rotate(${heading}deg)`,
      }}
    >
      {transport.icon === 'plane' ? (
        // ✈️ Jet Airliner with drop shadow
        <svg
          width={size * 1.3}
          height={size * 1.3}
          viewBox="0 0 32 32"
          className="filter drop-shadow-xl"
        >
          {/* Plane Body */}
          <path
            d="M16 2 L18 10 L29 17 L29 20 L18 16 L18 24 L22 27 L22 29 L16 27 L10 29 L10 27 L14 24 L14 16 L3 20 L3 17 L14 10 Z"
            fill={transport.color || '#FFFFFF'}
            stroke="#1E293B"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          {/* Cockpit Glass */}
          <ellipse cx="16" cy="6" rx="1.5" ry="2.5" fill="#38BDF8" />
          {/* Wing Red Accent */}
          <path d="M15 13 L17 13 L17 18 L15 18 Z" fill="#EF4444" />
        </svg>
      ) : transport.icon === 'vintageCar' ? (
        // 🚗 Vintage Classic Top-Down Sedan
        <svg
          width={size}
          height={size * 1.4}
          viewBox="0 0 24 34"
          className="filter drop-shadow-lg"
        >
          {/* Shadow */}
          <rect x="2" y="3" width="20" height="28" rx="6" fill="rgba(0,0,0,0.3)" />
          {/* Wheels */}
          <rect x="1" y="5" width="3" height="6" rx="1.5" fill="#0F172A" />
          <rect x="20" y="5" width="3" height="6" rx="1.5" fill="#0F172A" />
          <rect x="1" y="23" width="3" height="6" rx="1.5" fill="#0F172A" />
          <rect x="20" y="23" width="3" height="6" rx="1.5" fill="#0F172A" />
          {/* Chassis */}
          <rect x="3" y="2" width="18" height="30" rx="6" fill={transport.color || '#F7F3E8'} stroke="#1E293B" strokeWidth="1.5" />
          {/* Hood Chrome Trim */}
          <path d="M7 3 L17 3 L16 8 L8 8 Z" fill="#CBD5E1" />
          {/* Windshield */}
          <rect x="5" y="9" width="14" height="4.5" rx="1.5" fill="#334155" />
          {/* Cabin Roof */}
          <rect x="5.5" y="14" width="13" height="8" rx="1" fill="#8C342D" />
          {/* Rear window */}
          <rect x="5" y="23" width="14" height="3.5" rx="1" fill="#334155" />
          {/* Headlights */}
          <circle cx="6" cy="3.5" r="1.5" fill="#FDE047" stroke="#CA8A04" strokeWidth="0.5" />
          <circle cx="18" cy="3.5" r="1.5" fill="#FDE047" stroke="#CA8A04" strokeWidth="0.5" />
          {/* Taillights */}
          <circle cx="6" cy="30.5" r="1.2" fill="#EF4444" />
          <circle cx="18" cy="30.5" r="1.2" fill="#EF4444" />
        </svg>
      ) : transport.icon === 'car' ? (
        // 🏎️ Modern Sports Car / SUV
        <svg
          width={size}
          height={size * 1.35}
          viewBox="0 0 24 32"
          className="filter drop-shadow-lg"
        >
          {/* Shadow */}
          <rect x="2" y="3" width="20" height="26" rx="5" fill="rgba(0,0,0,0.3)" />
          {/* Wheels */}
          <rect x="1" y="5" width="2.5" height="5" rx="1" fill="#0F172A" />
          <rect x="20.5" y="5" width="2.5" height="5" rx="1" fill="#0F172A" />
          <rect x="1" y="22" width="2.5" height="5" rx="1" fill="#0F172A" />
          <rect x="20.5" y="22" width="2.5" height="5" rx="1" fill="#0F172A" />
          {/* Body */}
          <rect x="3" y="2" width="18" height="28" rx="5" fill="#3B82F6" stroke="#1E293B" strokeWidth="1.2" />
          {/* Windshield */}
          <path d="M5 9 L19 9 L17 14 L7 14 Z" fill="#0F172A" />
          {/* Roof */}
          <rect x="6" y="14.5" width="12" height="7" rx="1" fill="#1D4ED8" />
          {/* Rear Window */}
          <path d="M7 22 L17 22 L18 25 L6 25 Z" fill="#0F172A" />
          {/* LED Headlights */}
          <rect x="5" y="2.5" width="3" height="1.5" rx="0.5" fill="#E0F2FE" />
          <rect x="16" y="2.5" width="3" height="1.5" rx="0.5" fill="#E0F2FE" />
          {/* LED Taillights */}
          <rect x="5" y="29" width="14" height="1.5" rx="0.5" fill="#EF4444" />
        </svg>
      ) : transport.icon === 'bus' ? (
        // 🚐 Road Camper / Bus
        <svg
          width={size * 1.1}
          height={size * 1.5}
          viewBox="0 0 26 36"
          className="filter drop-shadow-lg"
        >
          {/* Shadow */}
          <rect x="2" y="3" width="22" height="30" rx="4" fill="rgba(0,0,0,0.3)" />
          {/* Body */}
          <rect x="3" y="2" width="20" height="32" rx="4" fill="#10B981" stroke="#064E3B" strokeWidth="1.5" />
          {/* Front Windshield */}
          <rect x="5" y="4" width="16" height="5" rx="1" fill="#0F172A" />
          {/* Side Windows */}
          <rect x="4.5" y="11" width="3" height="15" rx="0.5" fill="#0F172A" />
          <rect x="18.5" y="11" width="3" height="15" rx="0.5" fill="#0F172A" />
          {/* Pop-up Sunroof / Roof Rack */}
          <rect x="8.5" y="11" width="9" height="16" rx="1" fill="#047857" stroke="#064E3B" strokeWidth="1" />
          {/* Headlights */}
          <circle cx="6" cy="3" r="1.5" fill="#FDE047" />
          <circle cx="20" cy="3" r="1.5" fill="#FDE047" />
        </svg>
      ) : transport.icon === 'motorcycle' ? (
        // 🏍️ Motorbike
        <svg
          width={size * 0.75}
          height={size * 1.3}
          viewBox="0 0 16 30"
          className="filter drop-shadow-md"
        >
          {/* Tires */}
          <rect x="6.5" y="2" width="3" height="7" rx="1.5" fill="#0F172A" />
          <rect x="6.5" y="21" width="3" height="7" rx="1.5" fill="#0F172A" />
          {/* Handlebars */}
          <rect x="2" y="7" width="12" height="2" rx="1" fill="#CBD5E1" stroke="#0F172A" strokeWidth="0.8" />
          {/* Gas Tank */}
          <ellipse cx="8" cy="13" rx="3" ry="4" fill="#E11D48" stroke="#881337" strokeWidth="0.8" />
          {/* Rider Helmet */}
          <circle cx="8" cy="17" r="3.5" fill="#1E293B" stroke="#0F172A" strokeWidth="1" />
          <ellipse cx="8" cy="15.5" rx="2" ry="1" fill="#38BDF8" />
          {/* Headlight */}
          <circle cx="8" cy="2" r="1.2" fill="#FDE047" />
        </svg>
      ) : (
        // Clean Travel Dot
        <div
          className="rounded-full bg-white border-2 border-accent-600 shadow-xl flex items-center justify-center"
          style={{ width: `${size}px`, height: `${size}px` }}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-accent-600 animate-pulse" />
        </div>
      )}
    </div>
  );
};
