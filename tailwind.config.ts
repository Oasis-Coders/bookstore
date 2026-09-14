import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ["'DM Serif Display'", 'Georgia', 'serif'],
        sans: ['Inter', "'Noto Sans SC'", 'system-ui', '-apple-system', "'Segoe UI'", 'sans-serif'],
      },
      colors: {
        // Brand palette derived from the COCM logos (2026-09-07 recolor):
        // red #e5444c = primary action, deep blue #2d2f92 = structure/nav.
        // Token names kept for compatibility; values now follow the logos.
        camp: {
          cream: '#faf7f0',
          forest: '#2d2f92',
          'forest-light': '#3f43a8',
          moss: '#5b5f94',
          sand: '#f2e9d2',
          ember: '#e5444c',
          'ember-dark': '#c23340',
          'ember-light': '#fbe4e5',
          sky: '#e3e4f8',
          border: 'rgba(45,47,146,0.10)',
        },
        bookstore: {
          cream: '#faf7f0',
          forest: '#2d2f92',
          ember: '#e5444c',
        },
      },
      boxShadow: {
        card: 'rgba(45,47,146,0.03) 0px 0px 0px 1px, rgba(45,47,146,0.05) 0px 2px 8px, rgba(45,47,146,0.10) 0px 8px 24px',
        'card-hover': 'rgba(45,47,146,0.08) 0px 4px 16px',
        panel: '0 18px 60px rgba(45, 47, 146, 0.14)',
        'ember-glow': '0 2px 8px rgba(229,68,76,0.25)',
      },
      borderRadius: {
        card: '20px',
        panel: '28px',
      },
    },
  },
  plugins: [],
};

export default config;
