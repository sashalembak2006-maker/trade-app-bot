import { Component, type ErrorInfo, type ReactNode } from 'react';
import { logger } from '../services/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error('Boundary', error.message, info.componentStack);
  }

  private handleReload = () => {
    this.setState({ hasError: false, message: '' });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#050505] px-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-prime-gold to-prime-gold-dark text-3xl font-black text-black">
          !
        </div>
        <h1 className="mt-5 font-display text-xl font-extrabold tracking-widest text-gold text-glow-gold">
          PRIME TRADE BOT
        </h1>
        <h2 className="mt-4 text-lg font-bold text-white">Сталася непередбачена помилка</h2>
        <p className="mt-2 max-w-sm text-sm text-slate-400">
          Інтерфейс перехопив помилку і не дав застосунку зависнути. Спробуйте перезавантажити.
        </p>
        {this.state.message && (
          <p className="mt-3 max-w-sm break-words rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 font-mono text-[11px] text-red-300">
            {this.state.message}
          </p>
        )}
        <button
          type="button"
          onClick={this.handleReload}
          className="btn-gold mt-6 rounded-2xl px-6 py-3 text-sm"
        >
          🔄 Перезавантажити
        </button>
      </div>
    );
  }
}
