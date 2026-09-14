tailwind.config = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        bg: '#09090b',
        surface: {
          DEFAULT: '#121215',
          elevated: '#18181b',
          card: '#141418',
          hover: '#1e1e24',
        },
        accent: {
          DEFAULT: '#6366f1',
          hover: '#4f46e5',
          glow: 'rgba(99, 102, 241, 0.15)',
        }
      }
    }
  }
};
