import type { Config } from 'tailwindcss';

/**
 * Plinth dashboard theme — see DESIGN.md (source of truth).
 *
 * Two layers:
 * 1. Semantic tokens (canvas/card/ink/jade/…) backed by CSS vars — use these in
 *    new/refreshed code.
 * 2. Bridge remaps of the stock ramps (indigo→jade, gray+slate→warm neutrals,
 *    emerald→jade) so legacy inline classes inherit the brand until each page
 *    gets its hand-polish pass.
 */

const warmNeutral = {
  50: '#f9f9f7',
  100: '#f0f0ed',
  200: '#e9e9e5',
  300: '#d6d6d1',
  400: '#a3a39e',
  500: '#71716c',
  600: '#52524e',
  700: '#3d3d3a',
  800: '#262624',
  900: '#171716',
  950: '#0c0c0b',
};

const jadeRamp = {
  50: '#effaf6',
  100: '#dff3ec',
  200: '#bfe7d9',
  300: '#8fd6c0',
  400: '#3bc0a1',
  500: '#14ad89',
  600: '#0fa37f',
  700: '#0c8a6b',
  800: '#0b6b54',
  900: '#0a5745',
  950: '#052e25',
};

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── semantic tokens ──────────────────────────────────────────────
        canvas: 'var(--canvas)',
        card: 'var(--card)',
        soft: 'var(--soft)',
        line: 'var(--line)',
        ink: 'var(--ink)',
        body: 'var(--body)',
        mid: 'var(--mid)',
        faint: 'var(--faint)',
        jade: {
          DEFAULT: 'var(--jade)',
          deep: 'var(--jade-deep)',
          tint: 'var(--jade-tint)',
          lite: 'var(--jade-lite)',
        },
        warn: { DEFAULT: 'var(--warn)', bar: 'var(--warn-bar)', tint: 'var(--warn-tint)' },
        danger: { DEFAULT: 'var(--danger)', bar: 'var(--danger-bar)', tint: 'var(--danger-tint)' },
        info: { DEFAULT: 'var(--info)', tint: 'var(--info-tint)' },
        hero: { ink: 'var(--hero-ink)', mut: 'var(--hero-mut)' },
        // ── bridge remaps for legacy inline classes ──────────────────────
        indigo: jadeRamp,
        emerald: jadeRamp,
        gray: warmNeutral,
        slate: warmNeutral,
      },
      fontFamily: {
        sans: ['"Satoshi"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Clash Display"', '"Satoshi"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        lg: '10px', // buttons, inputs
        xl: '14px', // cards
        '2xl': '20px', // hero, modals
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        pop: 'var(--shadow-pop)',
      },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.32, 0.72, 0, 1)',
        brand: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
      letterSpacing: {
        tightest: '-0.04em',
        tighter: '-0.03em',
      },
    },
  },
  plugins: [],
};

export default config;
