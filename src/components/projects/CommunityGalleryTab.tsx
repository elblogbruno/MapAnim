import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Sparkles,
  Compass,
  MapPin,
  Clock,
  Copy,
  ExternalLink,
  Loader2,
  Check,
  Smartphone,
  Monitor,
  Flame,
  Globe2,
  X,
  Heart,
  Eye,
} from 'lucide-react';
import {
  CommunityProjectItem,
  fetchCommunityProjects,
  forkCommunityProject,
  toggleProjectLike,
  recordProjectView,
} from '../../core/project/cloudStorage';
import { ProjectData } from '../../core/types/project';
import { haptics } from '../../utils/haptics';

interface CommunityGalleryTabProps {
  onProjectLoaded: (project: ProjectData) => void;
}

export const CommunityGalleryTab: React.FC<CommunityGalleryTabProps> = ({ onProjectLoaded }) => {
  const [items, setItems] = useState<CommunityProjectItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<
    'all' | 'official' | 'car' | 'plane' | 'vertical' | 'horizontal'
  >('all');
  const [sortBy, setSortBy] = useState<'likes' | 'views' | 'recent'>('likes');
  const [forkingId, setForkingId] = useState<string | null>(null);
  const [forkSuccessId, setForkSuccessId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    fetchCommunityProjects().then(({ projects }) => {
      if (mounted) {
        setItems(projects);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const handleToggleLike = async (e: React.MouseEvent, item: CommunityProjectItem) => {
    e.stopPropagation();
    haptics.light();
    const currentCount = item.likesCount || 0;
    const { liked, newCount } = await toggleProjectLike(item.id, currentCount);
    setItems(prev =>
      prev.map(p =>
        p.id === item.id ? { ...p, userHasLiked: liked, likesCount: newCount } : p
      )
    );
  };

  const handleFork = async (item: CommunityProjectItem) => {
    try {
      recordProjectView(item.id);
      setForkingId(item.id);
      const res = await forkCommunityProject(item);
      if (res.project) {
        setForkSuccessId(item.id);
        setTimeout(() => {
          onProjectLoaded(res.project!);
        }, 400);
      } else {
        alert(res.error || 'Error al clonar la ruta seleccionada.');
      }
    } catch (err: any) {
      alert(err.message || 'Error inesperado al clonar.');
    } finally {
      setForkingId(null);
    }
  };

  const filteredItems = useMemo(() => {
    const list = items.filter(item => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesDesc = (item.description || '').toLowerCase().includes(q);
        const matchesAuthor = item.authorName.toLowerCase().includes(q);
        const matchesOrigin = (item.originName || '').toLowerCase().includes(q);
        const matchesDest = (item.destinationName || '').toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesAuthor && !matchesOrigin && !matchesDest) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory === 'official' && !item.isOfficial) return false;
      if (selectedCategory === 'car' && !item.transportIcons.includes('🚗')) return false;
      if (selectedCategory === 'plane' && !item.transportIcons.includes('✈️')) return false;
      if (selectedCategory === 'vertical' && item.aspectRatio !== '9:16') return false;
      if (selectedCategory === 'horizontal' && item.aspectRatio !== '16:9') return false;

      return true;
    });

    if (sortBy === 'likes') {
      list.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
    } else if (sortBy === 'views') {
      list.sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0));
    } else {
      list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }

    return list;
  }, [items, searchQuery, selectedCategory, sortBy]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-studio-950">
      {/* Top Banner / Filter Subheader */}
      <div className="p-3 sm:p-4 border-b border-white/[0.08] bg-studio-900/40 flex flex-col md:flex-row gap-2.5 sm:gap-3 items-stretch md:items-center justify-between flex-shrink-0">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-studio-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por destino, ruta o autor..."
            className="w-full bg-studio-950 border border-studio-750 rounded-xl pl-9 pr-8 py-2 sm:py-1.5 text-xs text-white placeholder-studio-500 focus:outline-none focus:border-accent-500 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-studio-500 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto scrollbar-none pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap min-h-[34px] flex items-center gap-1.5 transition-all active:scale-95 ${
              selectedCategory === 'all'
                ? 'bg-studio-800 text-white border border-studio-700 shadow-sm'
                : 'text-studio-400 hover:text-studio-200 hover:bg-studio-900'
            }`}
          >
            Todas
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('official')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap min-h-[34px] flex items-center gap-1.5 transition-all active:scale-95 ${
              selectedCategory === 'official'
                ? 'bg-amber-950 text-amber-300 border border-amber-800 shadow-sm'
                : 'text-studio-400 hover:text-studio-200 hover:bg-studio-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Destacadas</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('car')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap min-h-[34px] flex items-center gap-1.5 transition-all active:scale-95 ${
              selectedCategory === 'car'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 shadow-sm'
                : 'text-studio-400 hover:text-studio-200 hover:bg-studio-900'
            }`}
          >
            <span>🚗 Road Trips</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('plane')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap min-h-[34px] flex items-center gap-1.5 transition-all active:scale-95 ${
              selectedCategory === 'plane'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 shadow-sm'
                : 'text-studio-400 hover:text-studio-200 hover:bg-studio-900'
            }`}
          >
            <span>✈️ Vuelos</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('vertical')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap min-h-[34px] flex items-center gap-1.5 transition-all active:scale-95 ${
              selectedCategory === 'vertical'
                ? 'bg-sky-950 text-sky-300 border border-sky-800 shadow-sm'
                : 'text-studio-400 hover:text-studio-200 hover:bg-studio-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-sky-400" />
            <span>9:16 Reels</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('horizontal')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap min-h-[34px] flex items-center gap-1.5 transition-all active:scale-95 ${
              selectedCategory === 'horizontal'
                ? 'bg-purple-950 text-purple-300 border border-purple-800 shadow-sm'
                : 'text-studio-400 hover:text-studio-200 hover:bg-studio-900'
            }`}
          >
            <Monitor className="w-3.5 h-3.5 text-purple-400" />
            <span>16:9 Cine</span>
          </button>

          {/* Sort Selector */}
          <div className="ml-auto flex-shrink-0 pl-1">
            <select
              value={sortBy}
              onChange={(e) => {
                haptics.selection();
                setSortBy(e.target.value as any);
              }}
              className="bg-studio-950 border border-studio-800 rounded-xl px-2.5 py-1.5 text-xs text-studio-300 focus:outline-none min-h-[34px] font-semibold cursor-pointer"
            >
              <option value="likes">❤️ Más Valoradas</option>
              <option value="views">👁️ Más Vistas</option>
              <option value="recent">⏱️ Más Recientes</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid Content */}
      <div
        data-scrollable="true"
        className="flex-1 overflow-y-auto p-3.5 sm:p-5 custom-scrollbar touch-pan-y overscroll-contain"
        style={{
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y',
          overscrollBehavior: 'contain',
        }}
      >
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 text-studio-400">
            <Loader2 className="w-7 h-7 animate-spin text-accent-400" />
            <p className="text-xs">Cargando rutas de la comunidad...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center gap-2 text-studio-400">
            <Globe2 className="w-10 h-10 text-studio-600" />
            <p className="text-sm font-semibold text-studio-300">No se encontraron rutas con este filtro</p>
            <p className="text-xs text-studio-500">Prueba con otro término de búsqueda o categoría.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {filteredItems.map(item => {
              const isForking = forkingId === item.id;
              const isSuccess = forkSuccessId === item.id;

              return (
                <div
                  key={item.id}
                  className="bg-studio-900/70 border border-white/[0.08] hover:border-accent-500/50 rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:shadow-black/50 group"
                >
                  <div>
                    {/* Top Row: Author & Badges */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-accent-500/20 border border-accent-500/40 flex items-center justify-center text-accent-300 text-[10px] font-bold flex-shrink-0">
                          {item.authorAvatar ? (
                            <img
                              src={item.authorAvatar}
                              alt={item.authorName}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            item.authorName.slice(0, 1).toUpperCase()
                          )}
                        </div>
                        <span className="text-xs text-studio-300 font-medium truncate">
                          {item.authorName}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {item.isOfficial && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            <Flame className="w-3 h-3 text-amber-400" />
                            Oficial
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-studio-800 text-studio-300 border border-studio-700">
                          {item.aspectRatio}
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-sm font-bold text-white group-hover:text-accent-300 transition-colors line-clamp-1 mb-1">
                      {item.name}
                    </h3>

                    {/* Description */}
                    {item.description && (
                      <p className="text-xs text-studio-400 line-clamp-2 mb-3">
                        {item.description}
                      </p>
                    )}

                    {/* Route Info Badge */}
                    {(item.originName || item.destinationName) && (
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-studio-950/70 border border-studio-800/80 mb-3 text-xs">
                        <MapPin className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1 truncate text-studio-200">
                          <span className="font-medium text-white">{item.originName || 'Inicio'}</span>
                          <span className="mx-1.5 text-studio-500">➔</span>
                          <span className="font-medium text-white">{item.destinationName || 'Destino'}</span>
                        </div>
                      </div>
                    )}

                    {/* Stats bar */}
                    <div className="flex items-center gap-3 text-[11px] text-studio-400 mb-3">
                      <span className="flex items-center gap-1">
                        <Compass className="w-3 h-3 text-studio-500" />
                        {item.stopsCount} paradas
                      </span>
                      {item.totalDistanceKm ? (
                        <span>• {Math.round(item.totalDistanceKm).toLocaleString()} km</span>
                      ) : null}
                      {item.viewsCount !== undefined && item.viewsCount > 0 && (
                        <span className="flex items-center gap-1 text-studio-400">
                          <Eye className="w-3 h-3 text-studio-500" />
                          {item.viewsCount.toLocaleString()}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-studio-500" />
                        {item.durationSeconds}s
                      </span>
                      {item.transportIcons?.length > 0 && (
                        <span className="ml-auto flex items-center gap-0.5 text-xs">
                          {item.transportIcons.map((ic, i) => (
                            <span key={i}>{ic}</span>
                          ))}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Actions: Like & Clone */}
                  <div className="pt-3 border-t border-studio-800/80 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleToggleLike(e, item)}
                      className={`h-10 sm:h-9 px-3 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all active:scale-90 ${
                        item.userHasLiked
                          ? 'bg-rose-500/20 border-rose-500/60 text-rose-300 shadow-sm shadow-rose-900/30'
                          : 'bg-studio-900 border-studio-800 text-studio-400 hover:text-rose-300 hover:border-rose-900/50'
                      }`}
                      title={item.userHasLiked ? 'Quitar Me Gusta' : 'Dar Me Gusta'}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 transition-transform ${
                          item.userHasLiked ? 'fill-rose-500 text-rose-500 scale-110' : ''
                        }`}
                      />
                      <span>{item.likesCount || 0}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleFork(item)}
                      disabled={isForking}
                      className={`flex-1 h-10 sm:h-9 flex items-center justify-center gap-1.5 px-4 rounded-xl font-bold text-xs shadow-md transition-all active:scale-95 ${
                        isSuccess
                          ? 'bg-emerald-600 text-white border border-emerald-500'
                          : 'bg-accent-600 hover:bg-accent-500 text-white border border-accent-500/40 shadow-accent-600/20'
                      }`}
                    >
                      {isForking ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Clonando...</span>
                        </>
                      ) : isSuccess ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>¡Clonado! Abriendo...</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Clonar a mis proyectos</span>
                        </>
                      )}
                    </button>

                    {item.shareSlug && (
                      <a
                        href={`/?share=${item.shareSlug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-10 h-10 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl bg-studio-850 hover:bg-studio-800 border border-studio-700 text-studio-300 hover:text-white transition-colors active:scale-95 flex-shrink-0"
                        title="Abrir vista compartida pública"
                        aria-label="Abrir vista compartida pública"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
