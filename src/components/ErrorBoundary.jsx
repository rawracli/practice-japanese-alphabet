import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary] Caught an uncaught exception:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReturnHome = () => {
    try {
      localStorage.removeItem("kana_practice_interrupted_session");
    } catch {}
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070a13] text-slate-100 flex flex-col items-center justify-center p-6 select-none font-sans relative overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-rose-500/5 blur-[120px] pointer-events-none" />
          
          <div className="w-full max-w-md p-8 rounded-3xl border border-rose-500/20 bg-slate-900/60 backdrop-blur-md shadow-[0_0_50px_rgba(239,68,68,0.15)] text-center space-y-6 z-10">
            <div className="space-y-2">
              <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-500 text-3xl">
                ⚠️
              </div>
              <h2 className="text-2xl font-black text-slate-100 tracking-tight">Oops! Something went wrong</h2>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                An unexpected component crash occurred. Your progress is protected, and we can safely recover below!
              </p>
            </div>

            {this.state.error && (
              <div className="p-3.5 rounded-xl border border-slate-950 bg-slate-950/40 text-left text-[10px] font-mono text-rose-400 overflow-x-auto max-h-32">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              <button
                onClick={this.handleReload}
                type="button"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-400 hover:to-red-400 text-slate-950 font-black text-xs transition-all duration-300 shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] cursor-pointer"
              >
                Reload Application
              </button>
              <button
                onClick={this.handleReturnHome}
                type="button"
                className="w-full py-3 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900 text-xs font-bold text-slate-300 transition-all duration-200 cursor-pointer"
              >
                Clear Session & Return Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
