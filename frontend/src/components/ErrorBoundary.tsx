import React, { Component, ReactNode } from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('[Ele-Visualize] Render Error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="w-full h-full min-h-[300px] flex items-center justify-center p-6 bg-[var(--color-canvas)] border border-[var(--color-hairline)] rounded-lg">
                    <div className="text-center max-w-md p-6 bg-[var(--color-surface-1)] rounded-lg border border-[var(--color-hairline)] flex flex-col items-center">
                        <div className="w-12 h-12 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-hairline)] flex items-center justify-center text-amber-400 mb-3">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-display font-bold text-[var(--color-ink)] mb-1">
                            3D Stage Initialization
                        </h3>
                        <p className="text-xs text-[var(--color-ink-muted)] mb-4 leading-relaxed font-mono">
                            {this.state.error?.message || 'A WebGL shader or rendering event was interrupted.'}
                        </p>
                        <button
                            onClick={() => {
                                this.setState({ hasError: false, error: null });
                                window.location.reload();
                            }}
                            className="px-4 py-2 bg-[var(--color-accent)] hover:bg-[#4f5ac4] text-white text-xs font-bold rounded flex items-center gap-2 transition-colors"
                        >
                            <RotateCcw className="w-3.5 h-3.5" /> Reload Visualizer
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
