import { create } from 'zustand';
import { ChatMessage, AiConfig, AiProposedAction } from '../core/ai/types';
import { processAiMessage, executeAiAction } from '../core/ai/aiService';
import { useProjectStore } from './useProjectStore';

const AI_CONFIG_KEY = 'mapanim_ai_config';
const AI_MESSAGES_KEY = 'mapanim_ai_messages';

const INITIAL_WELCOME: ChatMessage = {
  id: 'msg_welcome',
  role: 'assistant',
  content: `¡Hola! Soy tu **Copiloto IA de Rutas** para Route Motion Studio.\n\nPuedo crear itinerarios completos desde cero, configurar vuelos oceánicos en avión ✈️ y tramos de carretera en coche 🚗, ajustar el formato a TikTok / Reels (9:16) y mucho más.\n\n**Prueba pidiéndome:**\n- *"Crea una ruta de Madrid a Chicago en avión y luego coche a Los Ángeles"*\n- *"Ruta de 5 días por la Costa Oeste: San Francisco, Las Vegas, Gran Cañón y Los Ángeles"*\n- *"Viaje en tren o coche por Japón: Tokio, Kioto, Osaka e Hiroshima"*\n- *"Ruta por el norte de España: San Sebastián, Bilbao, Santander y Santiago"*\n- *"Ajustar vídeo a formato vertical 9:16, 15 segundos y estilo satélite"*`,
  timestamp: Date.now(),
};

interface AiState {
  messages: ChatMessage[];
  isLoading: boolean;
  isSettingsOpen: boolean;
  config: AiConfig;

  sendMessage: (content: string) => Promise<void>;
  applyAction: (action: AiProposedAction) => Promise<void>;
  updateConfig: (updates: Partial<AiConfig>) => void;
  setIsSettingsOpen: (open: boolean) => void;
  clearMessages: () => void;
}

function loadInitialConfig(): AiConfig {
  try {
    const raw = localStorage.getItem(AI_CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    provider: 'gemini',
    apiKey: '',
    model: 'gemini-2.0-flash',
    ollamaEndpoint: 'http://localhost:11434',
  };
}

function loadInitialMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(AI_MESSAGES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [INITIAL_WELCOME];
}

export const useAiStore = create<AiState>((set, get) => ({
  messages: loadInitialMessages(),
  isLoading: false,
  isSettingsOpen: false,
  config: loadInitialConfig(),

  updateConfig: (updates) => {
    const newConfig = { ...get().config, ...updates };
    set({ config: newConfig });
    try {
      localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(newConfig));
    } catch {}
  },

  setIsSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),

  clearMessages: () => {
    const cleared = [INITIAL_WELCOME];
    set({ messages: cleared });
    try {
      localStorage.setItem(AI_MESSAGES_KEY, JSON.stringify(cleared));
    } catch {}
  },

  sendMessage: async (content: string) => {
    const text = content.trim();
    if (!text || get().isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const currentMessages = [...get().messages, userMsg];
    set({ messages: currentMessages, isLoading: true });

    try {
      const projectStore = useProjectStore.getState();
      const result = await processAiMessage(
        text,
        currentMessages,
        get().config,
        projectStore.project
      );

      const aiMsg: ChatMessage = {
        id: `msg_ai_${Date.now()}`,
        role: 'assistant',
        content: result.text,
        timestamp: Date.now(),
        proposedAction: result.action,
      };

      const updated = [...currentMessages, aiMsg];
      set({ messages: updated, isLoading: false });

      try {
        localStorage.setItem(AI_MESSAGES_KEY, JSON.stringify(updated.slice(-30)));
      } catch {}
    } catch (err: any) {
      console.error('Error in AI chat flow:', err);
      const errorMsg: ChatMessage = {
        id: `msg_err_${Date.now()}`,
        role: 'assistant',
        content: `Lo siento, ocurrió un error procesando tu solicitud: ${err?.message || 'Error desconocido'}.`,
        timestamp: Date.now(),
      };
      set({ messages: [...currentMessages, errorMsg], isLoading: false });
    }
  },

  applyAction: async (action: AiProposedAction) => {
    try {
      const projectStore = useProjectStore.getState();
      await executeAiAction(action, projectStore);

      // Mark the action as applied in chat history
      const updatedMessages = get().messages.map(m => {
        if (m.proposedAction?.id === action.id) {
          return {
            ...m,
            proposedAction: {
              ...m.proposedAction,
              applied: true,
            },
          };
        }
        return m;
      });

      set({ messages: updatedMessages });
      try {
        localStorage.setItem(AI_MESSAGES_KEY, JSON.stringify(updatedMessages.slice(-30)));
      } catch {}
    } catch (err) {
      console.error('Failed to apply AI action:', err);
      alert('Error al aplicar los cambios al proyecto.');
    }
  },
}));
