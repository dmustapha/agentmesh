import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx,css}'],
  theme: {
    extend: {
      colors: {
        mesh: {
          bg: '#06060b',
          'bg-alt': '#0a0a16',
          'bg-elevated': '#0d0d1f',
          card: '#0f0f1a',
          'card-hover': '#141428',
          border: '#1a1a2e',
          'border-light': '#252545',
          'border-glow': '#3b3b6e',
          accent: '#6366f1',
          'accent-light': '#818cf8',
          'accent-dim': '#4f46e5',
          'accent-bright': '#a5b4fc',
          green: '#22c55e',
          'green-dim': '#16a34a',
          red: '#ef4444',
          'red-dim': '#dc2626',
          yellow: '#eab308',
          blue: '#3b82f6',
          orange: '#f97316',
          purple: '#a855f7',
          cyan: '#06b6d4',
          'cyan-bright': '#22d3ee',
          pink: '#ec4899',
          muted: '#64748b',
          'muted-dim': '#475569',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'pulse-glow-fast': 'pulse-glow 1.2s ease-in-out infinite',
        'fade-in': 'fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in-up': 'fade-in-up 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slide-down 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slide-in-right 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scale-in 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'scan-line': 'scan-line 4s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 10s ease-in-out infinite',
        'breathe': 'breathe 4s ease-in-out infinite',
        'breathe-slow': 'breathe 8s ease-in-out infinite',
        'shimmer': 'shimmer 3s linear infinite',
        'rotate-slow': 'rotate-slow 20s linear infinite',
        'border-flow': 'border-flow 4s linear infinite',
        'data-flow': 'data-flow 2s linear infinite',
        'node-pulse': 'node-pulse 2s ease-in-out infinite',
        'particle-drift': 'particle-drift 15s linear infinite',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
        'count-up': 'count-up 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        'typing': 'typing 1.5s steps(20) 1',
        'blink': 'blink 1s step-end infinite',
        'ripple': 'ripple 0.6s ease-out',
        'status-pulse': 'status-pulse 2s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 8s ease-in-out infinite',
        'reveal-left': 'reveal-left 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(99, 102, 241, 0.3)' },
          '50%': { boxShadow: '0 0 25px rgba(99, 102, 241, 0.6), 0 0 50px rgba(99, 102, 241, 0.2)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(-16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.9)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'breathe': {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'rotate-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'border-flow': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'data-flow': {
          '0%': { strokeDashoffset: '20' },
          '100%': { strokeDashoffset: '0' },
        },
        'node-pulse': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.15)', opacity: '0.8' },
        },
        'particle-drift': {
          '0%': { transform: 'translateY(100vh) translateX(0)', opacity: '0' },
          '10%': { opacity: '1' },
          '90%': { opacity: '1' },
          '100%': { transform: 'translateY(-10vh) translateX(100px)', opacity: '0' },
        },
        'glow-pulse': {
          '0%, 100%': { filter: 'brightness(1) drop-shadow(0 0 2px currentColor)' },
          '50%': { filter: 'brightness(1.3) drop-shadow(0 0 8px currentColor)' },
        },
        'count-up': {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.8)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'typing': {
          from: { width: '0' },
          to: { width: '100%' },
        },
        'blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        'ripple': {
          '0%': { transform: 'scale(0)', opacity: '0.6' },
          '100%': { transform: 'scale(2.5)', opacity: '0' },
        },
        'status-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 currentColor' },
          '50%': { boxShadow: '0 0 0 4px transparent' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'reveal-left': {
          from: { clipPath: 'inset(0 100% 0 0)' },
          to: { clipPath: 'inset(0 0 0 0)' },
        },
      },
      backgroundImage: {
        'mesh-gradient': 'radial-gradient(ellipse at 50% 0%, rgba(99, 102, 241, 0.12) 0%, transparent 60%)',
        'mesh-gradient-2': 'radial-gradient(ellipse at 80% 20%, rgba(6, 182, 212, 0.08) 0%, transparent 50%)',
        'card-gradient': 'linear-gradient(135deg, rgba(99, 102, 241, 0.06) 0%, transparent 50%)',
        'card-gradient-hover': 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(6, 182, 212, 0.04) 100%)',
        'shimmer-gradient': 'linear-gradient(90deg, transparent 0%, rgba(99, 102, 241, 0.06) 50%, transparent 100%)',
        'border-gradient': 'linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(6, 182, 212, 0.15), rgba(99, 102, 241, 0.1))',
      },
      backdropBlur: {
        xs: '2px',
      },
      transitionTimingFunction: {
        'bounce-out': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  safelist: [
    'bg-mesh-card', 'bg-mesh-card/80', 'bg-mesh-card-hover', 'bg-mesh-bg', 'bg-mesh-bg/80',
    'bg-mesh-bg-elevated', 'bg-mesh-bg-alt', 'bg-mesh-border',
    'border-mesh-border', 'border-mesh-border-light', 'border-mesh-border-glow',
    'text-mesh-muted', 'text-mesh-accent', 'text-mesh-accent-light', 'text-mesh-cyan',
    'bg-mesh-accent', 'bg-mesh-accent/10', 'bg-mesh-accent/20',
  ],
  plugins: [],
};

export default config;
