import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Settings,
  Trash2,
  Check,
  MapPin,
  Compass,
  ExternalLink,
  Plane,
  Car,
  Server,
  RefreshCw,
  Wand2,
  MessageSquare,
  ArrowRight,
  Smartphone,
  Monitor,
  Square,
  CheckCircle2,
} from 'lucide-react';
import { useAiStore } from '../../store/useAiStore';
import { useEditorStore } from '../../store/useEditorStore';
import { useProjectStore } from '../../store/useProjectStore';
import { fetchOllamaModels } from '../../core/ai/aiService';
import {
  MAGIC_PRESET_PROMPTS,
  generateMagicRouteFromPrompt,
} from '../../core/ai/magicRouteGenerator';
import { ProjectData, AspectRatio } from '../../core/types/project';
import { useTouchDragToDismiss } from '../../hooks/useTouchDragToDismiss';

const PROMPT_SUGGESTIONS = [
  {
    icon: '✈️',
    label: 'Madrid a Chicago y Los Ángeles',
    prompt: 'Crea una ruta empezando en Madrid con vuelo en avión a Chicago, y luego en coche hasta Los Ángeles.',
  },
  {
    icon: '🚗',
    label: 'Costa Oeste de EE.UU.',
    prompt: 'Ruta de 5 días por la Costa Oeste: San Francisco, Yosemite, Las Vegas, Gran Cañón y Los Ángeles.',
  },
  {
    icon: '🗾',
    label: 'Tour por Japón',
    prompt: 'Planifica un viaje por Japón empezando en Tokio, pasando por el Monte Fuji, Kioto, Osaka y terminando en Hiroshima.',
  },
  {
    icon: '🇪🇸',
    label: 'Ruta Norte de España',
    prompt: 'Ruta en coche por el norte de España: San Sebastián, Bilbao, Santander, Oviedo y Santiago de Compostela.',
  },
  {
    icon: '📱',
    label: 'Adaptar a TikTok / Reels (9:16)',
    prompt: 'Ajusta el proyecto a formato vertical 9:16 para TikTok/Reels, 15 segundos de duración y estilo satélite.',
  },
];

export const AiChatDrawer: React.FC = () => {
  const { isAiChatOpen, setIsAiChatOpen } = useEditorStore();
  const { dragProps, sheetStyle } = useTouchDragToDismiss({
    onDismiss: () => setIsAiChatOpen(false),
  });
  const {
    messages,
    isLoading,
    isSettingsOpen,
    config,
    sendMessage,
    applyAction,
    updateConfig,
    setIsSettingsOpen,
    clearMessages,
  } = useAiStore();

  const [input, setInput] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState(config.apiKey);
  const [ollamaEndpointInput, setOllamaEndpointInput] = useState(config.ollamaEndpoint || 'http://localhost:11434');
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [isCheckingOllama, setIsCheckingOllama] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<'idle' | 'connected' | 'error'>('idle');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Magic Generator state
  const [aiViewMode, setAiViewMode] = useState<'magic' | 'chat'>('magic');
  const [magicPrompt, setMagicPrompt] = useState(
    'Ruta de 10 días por la Costa Oeste: San Francisco, Yosemite, Las Vegas y Gran Cañón en camper van'
  );
  const [magicAspect, setMagicAspect] = useState<AspectRatio>('16:9');
  const [isGeneratingMagic, setIsGeneratingMagic] = useState(false);
  const [magicProgressStep, setMagicProgressStep] = useState<string | null>(null);
  const [generatedMagicProject, setGeneratedMagicProject] = useState<ProjectData | null>(null);
  const [magicSuccess, setMagicSuccess] = useState(false);

  const checkOllama = async (endpoint = ollamaEndpointInput) => {
    setIsCheckingOllama(true);
    try {
      const models = await fetchOllamaModels(endpoint);
      setOllamaModels(models);
      if (models.length > 0) {
        setOllamaStatus('connected');
        if (config.provider === 'ollama' && (!config.model || !models.includes(config.model))) {
          updateConfig({ model: models[0] });
        }
      } else {
        setOllamaStatus('error');
      }
    } catch {
      setOllamaStatus('error');
    } finally {
      setIsCheckingOllama(false);
    }
  };

  useEffect(() => {
    if (config.provider === 'ollama') {
      checkOllama(config.ollamaEndpoint || 'http://localhost:11434');
    }
  }, [config.provider, config.ollamaEndpoint]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (isAiChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isAiChatOpen, isLoading]);

  useEffect(() => {
    setApiKeyInput(config.apiKey);
    if (config.ollamaEndpoint) setOllamaEndpointInput(config.ollamaEndpoint);
  }, [config.apiKey, config.ollamaEndpoint]);

  if (!isAiChatOpen) return null;

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleGenerateMagic = async () => {
    if (!magicPrompt.trim() || isGeneratingMagic) return;
    setIsGeneratingMagic(true);
    setMagicProgressStep('Iniciando director de ruta...');
    setGeneratedMagicProject(null);
    setMagicSuccess(false);

    try {
      const promptWithAspect = `${magicPrompt} en formato ${magicAspect}`;
      const proj = await generateMagicRouteFromPrompt(promptWithAspect, step => {
        setMagicProgressStep(step);
      });
      setGeneratedMagicProject(proj);
    } catch (err) {
      console.error('Magic route generator error:', err);
      alert('Hubo un error al generar la ruta. Por favor intenta de nuevo.');
    } finally {
      setIsGeneratingMagic(false);
      setMagicProgressStep(null);
    }
  };

  const handleApplyGeneratedProject = () => {
    if (!generatedMagicProject) return;
    setMagicSuccess(true);
    useProjectStore.getState().setProject(generatedMagicProject, true);
    setTimeout(() => {
      setIsAiChatOpen(false);
      setMagicSuccess(false);
    }, 450);
  };

  const handleSaveApiKey = () => {
    updateConfig({ apiKey: apiKeyInput.trim() });
    setIsSettingsOpen(false);
  };

  const handleSaveOllamaSettings = () => {
    updateConfig({ ollamaEndpoint: ollamaEndpointInput.trim() });
    checkOllama(ollamaEndpointInput.trim());
  };

  const renderBadge = () => {
    if (config.provider === 'ollama') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-sky-950/90 text-sky-300 border border-sky-800/60 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
          <span>Ollama: {config.model || 'llama3.2'}</span>
        </span>
      );
    }
    if (config.provider === 'gemini') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-purple-950/80 text-purple-300 border border-purple-800/60 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          <span>{config.apiKey ? (config.model.includes('2.0') ? 'Gemini 2.0' : 'Gemini 1.5') : 'Gemini (Sin Clave)'}</span>
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        <span>Motor Local</span>
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
      {/* Backdrop click to close */}
      <div
        className="flex-1 hidden md:block"
        onClick={() => setIsAiChatOpen(false)}
      />

      {/* Drawer Container */}
      <div
        style={sheetStyle}
        className="w-full md:w-[480px] lg:w-[520px] h-full bg-studio-950 border-l border-white/[0.12] flex flex-col shadow-2xl overflow-hidden animate-slide-left pointer-events-auto"
      >
        {/* Mobile Pull Down Handle */}
        <div
          {...dragProps}
          className="md:hidden py-2.5 flex items-center justify-center bg-studio-900 cursor-grab active:cursor-grabbing touch-none select-none border-b border-white/[0.06] flex-shrink-0"
        >
          <div className="w-12 h-1.5 bg-studio-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-white/[0.08] bg-studio-900/80 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-xs sm:text-sm text-white tracking-tight">
                  AI Route Director
                </h3>
                {renderBadge()}
              </div>
              <p className="text-[10px] text-studio-400 font-mono">
                Generador y copiloto cinemático
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`p-1.5 rounded-lg border transition-colors ${
                isSettingsOpen
                  ? 'bg-purple-950 border-purple-700 text-purple-200'
                  : 'bg-studio-900 border-studio-800 text-studio-400 hover:text-white'
              }`}
              title="Ajustes de IA / API Key"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={clearMessages}
              className="p-1.5 rounded-lg bg-studio-900 border border-studio-800 text-studio-400 hover:text-red-300 hover:border-red-900/60 transition-colors"
              title="Limpiar conversación"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsAiChatOpen(false)}
              className="p-1.5 rounded-lg bg-studio-900 border border-studio-800 text-studio-400 hover:text-white transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* AI Config / API Key Settings Accordion */}
        {isSettingsOpen && (
          <div className="p-3.5 bg-studio-900/95 border-b border-purple-900/40 space-y-3.5 animate-fade-in text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-purple-400" />
                <span>Configuración del Motor de IA</span>
              </span>
              {config.provider === 'gemini' && (
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-purple-400 hover:text-purple-300 underline flex items-center gap-1"
                >
                  <span>Obtener API Key gratis</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Provider selector */}
            <div>
              <label className="block text-[10px] font-mono uppercase text-studio-400 mb-1 font-semibold">
                Proveedor de IA
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-studio-950 p-1 rounded-lg border border-studio-800">
                <button
                  type="button"
                  onClick={() => updateConfig({ provider: 'ollama', model: ollamaModels[0] || 'llama3.2' })}
                  className={`py-1.5 px-2 rounded-md text-center text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    config.provider === 'ollama'
                      ? 'bg-sky-600 text-white shadow-sm font-bold'
                      : 'text-studio-400 hover:text-white hover:bg-studio-900'
                  }`}
                >
                  <Server className="w-3 h-3" />
                  <span>Ollama</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateConfig({ provider: 'gemini', model: 'gemini-2.0-flash' })}
                  className={`py-1.5 px-2 rounded-md text-center text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    config.provider === 'gemini'
                      ? 'bg-purple-600 text-white shadow-sm font-bold'
                      : 'text-studio-400 hover:text-white hover:bg-studio-900'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Gemini</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateConfig({ provider: 'local' })}
                  className={`py-1.5 px-2 rounded-md text-center text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    config.provider === 'local'
                      ? 'bg-emerald-600 text-white shadow-sm font-bold'
                      : 'text-studio-400 hover:text-white hover:bg-studio-900'
                  }`}
                >
                  <Compass className="w-3 h-3" />
                  <span>Local</span>
                </button>
              </div>
            </div>

            {/* Provider: Ollama */}
            {config.provider === 'ollama' && (
              <div className="space-y-2.5 pt-2 border-t border-studio-800">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-studio-400 mb-1">
                    Endpoint de Ollama
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={ollamaEndpointInput}
                      onChange={e => setOllamaEndpointInput(e.target.value)}
                      placeholder="http://localhost:11434"
                      className="flex-1 bg-studio-950 border border-studio-750 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                    />
                    <button
                      onClick={handleSaveOllamaSettings}
                      disabled={isCheckingOllama}
                      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 flex-shrink-0"
                    >
                      <RefreshCw className={`w-3 h-3 ${isCheckingOllama ? 'animate-spin' : ''}`} />
                      <span>{isCheckingOllama ? 'Comprobando...' : 'Conectar'}</span>
                    </button>
                  </div>
                </div>

                {/* Connection Status indicator */}
                {ollamaStatus === 'connected' && (
                  <div className="px-2.5 py-1.5 rounded-lg bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-[11px] flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 flex-shrink-0 text-emerald-400" />
                    <span>Conectado a Ollama. {ollamaModels.length} modelo(s) detectado(s).</span>
                  </div>
                )}
                {ollamaStatus === 'error' && (
                  <div className="px-2.5 py-1.5 rounded-lg bg-amber-950/70 border border-amber-800 text-amber-300 text-[11px] leading-tight">
                    <span>⚠️ No se pudo conectar con Ollama en {ollamaEndpointInput}. Asegúrate de ejecutar en terminal: <code className="bg-black/40 px-1 py-0.5 rounded font-mono text-[10px]">ollama serve</code> o abrir la app Ollama.</span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-mono uppercase text-studio-400">
                      Modelo de Ollama
                    </label>
                    <span className="text-[10px] text-studio-500">Ej: llama3.2, mistral, deepseek-r1</span>
                  </div>

                  {ollamaModels.length > 0 ? (
                    <div className="flex gap-2">
                      <select
                        value={config.model}
                        onChange={e => updateConfig({ model: e.target.value })}
                        className="flex-1 bg-studio-950 border border-studio-750 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                      >
                        {ollamaModels.map(m => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={config.model || ''}
                        onChange={e => updateConfig({ model: e.target.value })}
                        placeholder="llama3.2"
                        className="flex-1 bg-studio-950 border border-studio-750 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Provider: Gemini */}
            {config.provider === 'gemini' && (
              <div className="space-y-2.5 pt-2 border-t border-studio-800">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-studio-400 mb-1">
                    Google Gemini API Key
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={apiKeyInput}
                      onChange={e => setApiKeyInput(e.target.value)}
                      placeholder="AIzaSy..."
                      className="flex-1 bg-studio-950 border border-studio-750 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                    <button
                      onClick={handleSaveApiKey}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-colors flex-shrink-0"
                    >
                      Guardar
                    </button>
                  </div>
                  <p className="text-[10px] text-studio-400 mt-1">
                    {config.apiKey
                      ? '✓ Clave guardada localmente en tu navegador.'
                      : 'Introduce una clave para utilizar Gemini 2.0 Flash / Pro con razonamiento avanzado.'}
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-studio-400 mb-1">
                    Modelo de Gemini
                  </label>
                  <select
                    value={config.model}
                    onChange={e => updateConfig({ model: e.target.value })}
                    className="w-full bg-studio-950 border border-studio-750 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash (Recomendado - Ultrarrápido)</option>
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro (Máximo detalle)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Provider: Local */}
            {config.provider === 'local' && (
              <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-[11px] text-emerald-200/90 leading-relaxed">
                <p className="font-semibold text-emerald-300 mb-1 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5" />
                  Motor Cinemático Local
                </p>
                Funciona sin conexión a internet ni consumo de API externa. Interpreta intenciones de viaje (orígenes, destinos, transportes como avión, coche o tren, estilo de mapa y duración) de forma 100% privada.
              </div>
            )}
          </div>
        )}

        {/* Mode Switcher Tabs */}
        <div className="p-2 border-b border-white/[0.08] bg-studio-950 flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => setAiViewMode('magic')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
              aiViewMode === 'magic'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/20'
                : 'text-studio-400 hover:text-studio-200 hover:bg-studio-900'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5 text-purple-200" />
            <span>Generador Mágico ✨</span>
          </button>

          <button
            type="button"
            onClick={() => setAiViewMode('chat')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
              aiViewMode === 'chat'
                ? 'bg-studio-800 text-white shadow-sm border border-studio-700'
                : 'text-studio-400 hover:text-studio-200 hover:bg-studio-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-studio-400" />
            <span>Chat Copiloto</span>
          </button>
        </div>

        {aiViewMode === 'magic' ? (
          <div
            data-scrollable="true"
            className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar text-xs touch-pan-y overscroll-contain"
            style={{
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-y',
              overscrollBehavior: 'contain',
            }}
          >
            {/* Intro Hero Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/40 to-indigo-950/40 border border-purple-800/40 space-y-2 relative overflow-hidden">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  <Wand2 className="w-4 h-4" />
                </span>
                <h4 className="text-sm font-black text-white">Generador Instantáneo de Rutas</h4>
              </div>
              <p className="text-studio-300 text-[11px] leading-relaxed">
                Escribe en lenguaje natural cualquier viaje soñado. La IA geolocalizará las paradas, elegirá los mejores medios de transporte (aviones, trenes, coches) y creará una animación cinemática en segundos.
              </p>
            </div>

            {/* Presets Chips */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase text-studio-400 font-bold block">
                Itinerarios de Ejemplo (Inspiración en 1 Clic)
              </span>
              <div className="grid grid-cols-2 gap-2">
                {MAGIC_PRESET_PROMPTS.map(preset => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setMagicPrompt(preset.prompt);
                      setMagicAspect(preset.aspectRatio);
                      setGeneratedMagicProject(null);
                    }}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-studio-900/80 hover:bg-studio-850 border border-studio-800 hover:border-purple-500/50 text-left transition-all group"
                  >
                    <span className="text-base flex-shrink-0">{preset.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-white font-semibold text-[11px] group-hover:text-purple-300 truncate">
                        {preset.title}
                      </div>
                      <div className="text-[9px] text-studio-400 font-mono">
                        {preset.aspectRatio} • {preset.category}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt Text Input */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase text-studio-400 font-bold block">
                Describe tu recorrido o destinos
              </label>
              <textarea
                value={magicPrompt}
                onChange={e => setMagicPrompt(e.target.value)}
                rows={3}
                placeholder="Ej: Ruta en coche de Madrid a Lisboa pasando por Toledo, Mérida y Évora..."
                className="w-full bg-studio-900 border border-studio-750 focus:border-purple-500 rounded-xl p-3 text-white text-xs placeholder-studio-500 focus:outline-none leading-relaxed transition-all resize-none shadow-inner"
              />
            </div>

            {/* Aspect Ratio Selector */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase text-studio-400 font-bold block">
                Formato de Vídeo
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { ratio: '16:9' as AspectRatio, label: '16:9', icon: Monitor, desc: 'Horizontal' },
                  { ratio: '9:16' as AspectRatio, label: '9:16', icon: Smartphone, desc: 'Reels' },
                  { ratio: '1:1' as AspectRatio, label: '1:1', icon: Square, desc: 'Cuadrado' },
                  { ratio: '21:9' as AspectRatio, label: '21:9', icon: Monitor, desc: 'Cine' },
                ].map(opt => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.ratio}
                      type="button"
                      onClick={() => setMagicAspect(opt.ratio)}
                      className={`flex flex-col items-center p-2 rounded-xl border text-center transition-all ${
                        magicAspect === opt.ratio
                          ? 'bg-purple-950 border-purple-500 text-white font-bold shadow-md shadow-purple-950/50'
                          : 'bg-studio-900 border-studio-800 text-studio-400 hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 mb-1 text-purple-400" />
                      <span className="text-[11px] font-mono font-bold">{opt.label}</span>
                      <span className="text-[9px] text-studio-400">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Generate Action Button */}
            <button
              type="button"
              onClick={handleGenerateMagic}
              disabled={isGeneratingMagic || !magicPrompt.trim()}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-rose-600 hover:brightness-110 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
            >
              {isGeneratingMagic ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{magicProgressStep || 'Diseñando tu viaje...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generar Ruta Cinemática ✨</span>
                </>
              )}
            </button>

            {/* Generated Result Preview Card */}
            {generatedMagicProject && (
              <div className="p-4 rounded-2xl bg-studio-900/90 border border-emerald-500/40 space-y-3 animate-fade-in shadow-xl shadow-black/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 className="w-4 h-4" />
                    </span>
                    <div>
                      <h5 className="font-bold text-white text-xs">
                        {generatedMagicProject.metadata.name}
                      </h5>
                      <span className="text-[10px] text-emerald-400 font-mono">
                        ¡Ruta sintetizada y optimizada!
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-studio-800 text-studio-300 border border-studio-700">
                    {generatedMagicProject.video.aspectRatio}
                  </span>
                </div>

                {/* Stops Flow */}
                <div className="p-2.5 rounded-xl bg-studio-950/70 border border-studio-800 space-y-1.5">
                  <span className="text-[9px] uppercase font-bold text-studio-400 font-mono tracking-wider block">
                    Paradas detectadas ({generatedMagicProject.route.stops.length})
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {generatedMagicProject.route.stops.map((stop, i) => (
                      <React.Fragment key={stop.id}>
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-studio-900 border border-studio-750 text-white font-medium text-[10px]">
                          <MapPin className="w-3 h-3 text-emerald-400" />
                          <span>{stop.displayName}</span>
                        </span>
                        {i < generatedMagicProject.route.stops.length - 1 && (
                          <span className="text-studio-500 text-[10px]">➔</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="flex items-center justify-between text-[11px] text-studio-300 pt-1">
                  <span>⏱️ {generatedMagicProject.video.duration}s de video</span>
                  <span>🎨 {generatedMagicProject.map.stylePreset}</span>
                  <span>🎵 Música y SFX listos</span>
                </div>

                {/* Apply Button */}
                <button
                  type="button"
                  onClick={handleApplyGeneratedProject}
                  className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    magicSuccess
                      ? 'bg-emerald-600 text-white border border-emerald-500'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 active:scale-98'
                  }`}
                >
                  {magicSuccess ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>¡Cargado en el editor!</span>
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4" />
                      <span>Cargar Viaje en el Editor</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Chat Messages Stream */}
            <div
              data-scrollable="true"
              className="flex-1 overflow-y-auto p-4 space-y-4 touch-pan-y overscroll-contain"
              style={{
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-y',
                overscrollBehavior: 'contain',
              }}
            >
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              {/* Message Bubble */}
              <div
                className={`max-w-[88%] rounded-2xl p-3 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-accent-600 to-rose-600 text-white shadow-md shadow-accent-600/10 rounded-br-none font-medium'
                    : 'bg-studio-900/90 border border-studio-800 text-studio-200 rounded-bl-none shadow-sm'
                }`}
              >
                {/* Formatted Text Content */}
                <div className="whitespace-pre-wrap space-y-1.5">
                  {msg.content.split('\n').map((line, idx) => {
                    // Quick markdown bold renderer
                    const parts = line.split(/(\*\*.*?\*\*)/g);
                    return (
                      <p key={idx} className={line.startsWith('- ') ? 'pl-2' : ''}>
                        {parts.map((p, pIdx) => {
                          if (p.startsWith('**') && p.endsWith('**')) {
                            return <strong key={pIdx} className="text-white font-bold">{p.slice(2, -2)}</strong>;
                          }
                          return p;
                        })}
                      </p>
                    );
                  })}
                </div>

                {/* Proposed Action Card */}
                {msg.proposedAction && (
                  <div className="mt-3 pt-3 border-t border-white/[0.12] space-y-2">
                    <div className="bg-studio-950/80 border border-purple-500/40 rounded-xl p-3 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white flex items-center gap-1.5">
                          <Compass className="w-3.5 h-3.5 text-purple-400" />
                          <span>{msg.proposedAction.title}</span>
                        </span>
                        <span className="text-[10px] font-mono text-purple-300 bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-800/40">
                          {msg.proposedAction.type === 'create_route' ? 'Nueva Ruta' : 'Ajustes'}
                        </span>
                      </div>

                      {/* Stops list summary */}
                      {msg.proposedAction.stops && msg.proposedAction.stops.length > 0 && (
                        <div className="space-y-1 text-[11px]">
                          <div className="text-[10px] font-mono uppercase text-studio-400">
                            Itinerario propuesto ({msg.proposedAction.stops.length} paradas):
                          </div>
                          <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                            {msg.proposedAction.stops.map((stop, sIdx) => {
                              const isPlane = stop.transportToNext?.travelMode === 'airplane';
                              return (
                                <div
                                  key={sIdx}
                                  className="flex items-center justify-between p-1.5 rounded-lg bg-studio-900 border border-studio-800 text-[11px]"
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <MapPin className="w-3 h-3 text-studio-400 flex-shrink-0" />
                                    <span className="font-semibold text-white truncate">{stop.name}</span>
                                  </div>
                                  {stop.transportToNext && (
                                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1 ${
                                      isPlane ? 'bg-sky-950 text-sky-300 border border-sky-800/50' : 'bg-studio-800 text-studio-300'
                                    }`}>
                                      {isPlane ? <Plane className="w-2.5 h-2.5" /> : <Car className="w-2.5 h-2.5" />}
                                      <span>{isPlane ? 'Vuelo' : 'Carretera'}</span>
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Settings summary */}
                      {msg.proposedAction.settings && (
                        <div className="flex flex-wrap gap-1.5 text-[10px] font-mono pt-1">
                          {msg.proposedAction.settings.aspectRatio && (
                            <span className="bg-studio-900 px-1.5 py-0.5 rounded border border-studio-800 text-studio-300">
                              Aspecto: {msg.proposedAction.settings.aspectRatio}
                            </span>
                          )}
                          {msg.proposedAction.settings.duration && (
                            <span className="bg-studio-900 px-1.5 py-0.5 rounded border border-studio-800 text-studio-300">
                              Duración: {msg.proposedAction.settings.duration}s
                            </span>
                          )}
                          {msg.proposedAction.settings.styleId && (
                            <span className="bg-studio-900 px-1.5 py-0.5 rounded border border-studio-800 text-studio-300">
                              Estilo: {msg.proposedAction.settings.styleId}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Apply Button */}
                      <button
                        onClick={() => applyAction(msg.proposedAction!)}
                        disabled={msg.proposedAction.applied}
                        className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-extrabold transition-all shadow-md ${
                          msg.proposedAction.applied
                            ? 'bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 cursor-default'
                            : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-accent-600 hover:brightness-110 text-white shadow-purple-600/30 active:scale-98'
                        }`}
                      >
                        {msg.proposedAction.applied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>✓ Aplicado al proyecto</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Aplicar al Proyecto</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Timestamp */}
              <span className="text-[9px] font-mono text-studio-500 mt-1 px-1">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-studio-900/80 border border-purple-900/40 text-purple-300 text-xs animate-pulse max-w-[80%]">
              <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
              <span>Planificando ruta y calculando geometrías...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Chips */}
        <div className="p-2.5 border-t border-white/[0.08] bg-studio-900/40 overflow-x-auto scrollbar-none flex gap-1.5 flex-shrink-0">
          {PROMPT_SUGGESTIONS.map((item, idx) => (
            <button
              key={idx}
              onClick={() => sendMessage(item.prompt)}
              disabled={isLoading}
              className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-studio-900/80 hover:bg-studio-800 border border-studio-750/70 text-studio-300 hover:text-white text-[11px] font-medium transition-all"
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Bottom Input Area */}
        <div className="p-3 sm:p-4 border-t border-white/[0.08] bg-studio-900/80 flex-shrink-0">
          <div className="flex items-end gap-2 bg-studio-950 border border-studio-750 focus-within:border-purple-500/80 rounded-xl p-2 transition-all">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe tu ruta (ej: 'Vuelo de España a Chicago y coche a Los Ángeles')..."
              rows={2}
              className="flex-1 bg-transparent text-xs text-white placeholder-studio-500 resize-none focus:outline-none leading-relaxed"
            />

            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="p-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-accent-600 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-md shadow-purple-600/20 transition-all flex-shrink-0"
              title="Enviar mensaje (Enter)"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          <div className="flex justify-between items-center mt-1.5 px-1 text-[10px] text-studio-500 font-mono">
            <span>Enter para enviar • Shift+Enter para nueva línea</span>
            <span>
              Motor:{' '}
              {config.provider === 'ollama'
                ? `Ollama (${config.model || 'local'})`
                : config.provider === 'gemini'
                ? config.apiKey
                  ? `Gemini AI (${config.model})`
                  : 'Gemini (Sin Clave)'
                : 'Smart Local Offline'}
            </span>
          </div>
        </div>
        </>
      )}
    </div>
  </div>
);
};
