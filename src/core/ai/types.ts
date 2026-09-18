import { AspectRatio } from '../types/project';
import { TravelMode, RouteMode } from '../types/geo';

export type AiProvider = 'gemini' | 'ollama' | 'local';

export type AiActionType = 'create_route' | 'add_stops' | 'update_settings';

export interface AiStopProposal {
  name: string;
  lat: number;
  lng: number;
  behavior?: 'highlight' | 'pause' | 'passThrough';
  notes?: string;
  transportToNext?: {
    travelMode: TravelMode;
    vehicleIcon: 'car' | 'vintageCar' | 'plane' | 'motorcycle' | 'bus';
    routeMode: RouteMode;
  };
}

export interface AiProposedAction {
  id: string;
  type: AiActionType;
  title: string;
  description: string;
  projectName?: string;
  stops?: AiStopProposal[];
  settings?: {
    aspectRatio?: AspectRatio;
    duration?: number;
    fps?: number;
    styleId?: string;
    lineColor?: string;
    glowColor?: string;
  };
  applied?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  proposedAction?: AiProposedAction;
  isLoading?: boolean;
}

export interface AiConfig {
  provider: AiProvider;
  apiKey: string;
  model: string;
  customEndpoint?: string;
  ollamaEndpoint?: string;
}
