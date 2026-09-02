"use client";

interface PageLoadingProps {
  text?: string;
  subText?: string;
  fullScreen?: boolean;
}

export default function PageLoading({
  text = "Memuat Halaman",
  subText = "Menyiapkan data dan tampilan...",
  fullScreen = true,
}: PageLoadingProps) {
  return (
    <div
      className={
        fullScreen
          ? "fixed inset-0 z-[9999] flex items-center justify-center bg-white/80 backdrop-blur-sm"
          : "absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm"
      }
    >
      <div className="flex flex-col items-center px-6 text-center">
        {/* ICON */}
        <div className="relative mb-6 h-20 w-20">
          {/* Outer pulse */}
          <div className="absolute inset-0 rounded-2xl bg-[#15406A]/20 animate-ping" />

          {/* Icon container */}
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-[#15406A] shadow-xl shadow-[#15406A]/30">
            <svg
              className="h-10 w-10 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5H7a2 2 0 00-2 2v11a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"
              />

              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5a3 3 0 016 0v1H9V5z"
              />

              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 11h8M8 15h6"
              />
            </svg>
          </div>
        </div>

        {/* TEXT */}
        <h2 className="text-lg font-bold tracking-tight text-slate-800">
          {text}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {subText}
        </p>

        {/* PROGRESS */}
        <div className="mt-6 h-1.5 w-64 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full w-1/2 rounded-full bg-[#15406A] animate-pulse" />
        </div>

        {/* DOTS */}
        <div className="mt-5 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#15406A] animate-bounce [animation-delay:-0.3s]" />
          <span className="h-2 w-2 rounded-full bg-[#15406A] animate-bounce [animation-delay:-0.15s]" />
          <span className="h-2 w-2 rounded-full bg-[#15406A] animate-bounce" />
        </div>
      </div>
    </div>
  );
}