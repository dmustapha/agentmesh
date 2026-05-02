import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx,css}'],
  theme: {
    extend: {
      colors: {
        mesh: {
          bg: '#050508',
          'bg-alt': '#080810',
          'bg-elevated': '#0C0C14',
          card: '#0E0E18',
          'card-hover': '#141420',
          border: '#1A1A2A',
          'border-light': '#2A2A3A',
          'border-glow': '#3A3A50',
          // Primary: neon green (security = green = safe/scanning)
          accent: '#00FF88',
          'accent-light': '#33FFaa',
          'accent-dim': '#00CC6A',
          'accent-bright': '#66FFcc',
          // Secondary: cyan (data streams, network)
          cyan: '#0EA5E9',
          'cyan-bright': '#38BDF8',
          'cyan-dim': '#0284C7',
          // Tertiary: gold (legacy brand, warnings)
          gold: '#D4A853',
          'gold-light': '#F0C060',
          'gold-dim': '#A87D2E',
          // Severity
          green: '#00FF88',
          'green-dim': '#00CC6A',
          red: '#FF3B3B',
          'red-dim': '#CC2E2E',
          yellow: '#FFB800',
          blue: '#0EA5E9',
          orange: '#FF6B2C',
          purple: '#A855F7',
          pink: '#EC4899',
          // Text
          muted: '#6B6B80',
          'muted-dim': '#4A4A5C',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-cormorant)', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'pulse-glow-fast': 'pulse-glow 1.2s ease-in-out infinite',
        'fade-in': 'fade-in 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in-up': 'fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slide-down 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slide-in-right 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scale-in 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
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
        'matrix-rain': 'matrix-rain 8s linear infinite',
        'hex-rotate': 'hex-rotate 30s linear infinite',
        'terminal-cursor': 'terminal-cursor 1s step-end infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(0, 255, 136, 0.2)' },
          '50%': { boxShadow: '0 0 25px rgba(0, 255, 136, 0.5), 0 0 50px rgba(0, 255, 136, 0.15)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          from: { opacity: '0', transform: 'translateY(-6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(-12px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.92)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'breathe': {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.03)' },
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
          '50%': { transform: 'scale(1.1)', opacity: '0.85' },
        },
        'particle-drift': {
          '0%': { transform: 'translateY(100vh) translateX(0)', opacity: '0' },
          '10%': { opacity: '1' },
          '90%': { opacity: '1' },
          '100%': { transform: 'translateY(-10vh) translateX(80px)', opacity: '0' },
        },
        'glow-pulse': {
          '0%, 100%': { filter: 'brightness(1) drop-shadow(0 0 2px currentColor)' },
          '50%': { filter: 'brightness(1.2) drop-shadow(0 0 6px currentColor)' },
        },
        'count-up': {
          from: { opacity: '0', transform: 'translateY(6px) scale(0.85)' },
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
        'matrix-rain': {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '10%': { opacity: '0.6' },
          '90%': { opacity: '0.6' },
          '100%': { transform: 'translateY(100vh)', opacity: '0' },
        },
        'hex-rotate': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(60deg)' },
        },
        'terminal-cursor': {
          '0%, 100%': { borderColor: 'rgba(0, 255, 136, 0.8)' },
          '50%': { borderColor: 'transparent' },
        },
      },
      backgroundImage: {
        'mesh-gradient': 'radial-gradient(ellipse at 50% 0%, rgba(0, 255, 136, 0.04) 0%, transparent 60%)',
        'mesh-gradient-2': 'radial-gradient(ellipse at 80% 20%, rgba(14, 165, 233, 0.03) 0%, transparent 50%)',
        'card-gradient': 'linear-gradient(135deg, rgba(0, 255, 136, 0.02) 0%, transparent 50%)',
        'card-gradient-hover': 'linear-gradient(135deg, rgba(0, 255, 136, 0.04) 0%, rgba(14, 165, 233, 0.02) 100%)',
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
