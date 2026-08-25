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
                <div className="w-full h-full min-h-[300px] flex items-center justify-center p-6 bg-slate-50 border border-slate-200/80 rounded-2xl">
                    <div className="text-center max-w-md p-6 bg-white rounded-3xl border border-black/[0.08] shadow-card flex flex-col items-center">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 mb-3">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-serif font-bold text-slate-900 mb-1">
                            3D Stage Initialization
                        </h3>
                        <p className="text-xs text-slate-500 mb-4 leading-relaxed font-sans">
                            {this.state.error?.message || 'A WebGL shader or rendering event was interrupted.'}
                        </p>
                        <button
                            onClick={() => {
                                this.setState({ hasError: false, error: null });
                                window.location.reload();
                            }}
                            className="px-4 py-2 bg-[#16a875] hover:bg-[#087f5b] text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs transition-colors"
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
