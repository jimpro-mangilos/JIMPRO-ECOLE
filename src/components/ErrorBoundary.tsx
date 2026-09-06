import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  componentStack: string;
}

// Chunk-load errors happen when a lazy-loaded module (code-split chunk) fails to
// load — typically after a redeploy when the browser still holds a stale
// index.html referencing old chunk filenames. Only a full page reload recovers.
function isChunkLoadError(error: Error | null | undefined): boolean {
  const msg = String(error?.message || error || '');
  return /dynamically imported|module script|failed to fetch|error loading/i.test(msg);
}

// Corruption DOM (ex. 'Failed to execute removeChild ... not a child of this node') :
// React perd la trace d'un nœud déjà retiré — fréquent après une longue session de
// dev avec beaucoup de mises à jour à chaud (HMR). L'état interne de React est alors
// désynchronisé du DOM : 'Réessayer' re-rend l'arbre cassé. Seul un rechargement
// complet de la page répare réellement.
function isDomCorruptionError(error: Error | null | undefined): boolean {
  const msg = String(error?.message || error || '');
  return /removeChild|not a child of this node|NotFoundError/i.test(msg);
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, componentStack: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, componentStack: '' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
    this.setState({ componentStack: info.componentStack || '' });

    // Stale chunk OU corruption DOM → reload once (guarded to avoid a reload loop).
    if (isChunkLoadError(error) || isDomCorruptionError(error)) {
      try {
        if (!sessionStorage.getItem('jimpro_reload_guard')) {
          sessionStorage.setItem('jimpro_reload_guard', '1');
          window.location.reload();
        }
      } catch {
        /* ignore */
      }
    }
  }

  handleReset = () => {
    if (isChunkLoadError(this.state.error) || isDomCorruptionError(this.state.error)) {
      window.location.reload();
    } else {
      this.setState({ hasError: false, error: null });
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const chunkError = isChunkLoadError(this.state.error);
      const domCorruption = isDomCorruptionError(this.state.error);

      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="bg-white rounded-xl shadow-lg border border-red-100 max-w-md w-full p-8 text-center">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-7 h-7 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {chunkError ? 'Mise à jour nécessaire' : domCorruption ? 'Interface désynchronisée' : 'Une erreur est survenue'}
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              {chunkError
                ? 'Une nouvelle version de l’application est disponible. Rechargez la page pour continuer.'
                : domCorruption
                  ? 'L’affichage s’est désynchronisé (erreur interne de mise à jour du DOM). Rechargez la page pour repartir proprement.'
                  : this.state.error?.message || 'Erreur inattendue dans cette section.'}
            </p>
            {!chunkError && this.state.componentStack && (
              <details className="mb-4 text-left">
                <summary className="text-xs text-red-400 cursor-pointer">Détails techniques (pile du composant)</summary>
                <pre className="mt-2 text-[10px] text-gray-500 bg-gray-50 rounded p-2 overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap break-all">{this.state.componentStack}</pre>
              </details>
            )}
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              {(chunkError || domCorruption) ? 'Recharger la page' : 'Réessayer'}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
