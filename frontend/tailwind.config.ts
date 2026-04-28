import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background:                    'hsl(var(--background))',
        surface:                       'hsl(var(--surface))',
        'surface-dim':                 'hsl(var(--surface-dim))',
        'surface-bright':              'hsl(var(--surface-bright))',
        'surface-container-lowest':    'hsl(var(--surface-container-lowest))',
        'surface-container-low':       'hsl(var(--surface-container-low))',
        'surface-container':           'hsl(var(--surface-container))',
        'surface-container-high':      'hsl(var(--surface-container-high))',
        'surface-container-highest':   'hsl(var(--surface-container-highest))',
        'on-surface':                  'hsl(var(--on-surface))',
        'on-surface-variant':          'hsl(var(--on-surface-variant))',
        outline:                       'hsl(var(--outline))',
        'outline-variant':             'hsl(var(--outline-variant))',
        primary:                       'hsl(var(--primary))',
        'primary-container':           'hsl(var(--primary-container))',
        'on-primary':                  'hsl(var(--on-primary))',
        'on-primary-container':        'hsl(var(--on-primary-container))',
        'primary-fixed':               'hsl(var(--primary-fixed))',
        'primary-fixed-dim':           'hsl(var(--primary-fixed-dim))',
        secondary:                     'hsl(var(--secondary))',
        'secondary-container':         'hsl(var(--secondary-container))',
        'on-secondary':                'hsl(var(--on-secondary))',
        'on-secondary-container':      'hsl(var(--on-secondary-container))',
        tertiary:                      'hsl(var(--tertiary))',
        'tertiary-container':          'hsl(var(--tertiary-container))',
        'on-tertiary':                 'hsl(var(--on-tertiary))',
        'on-tertiary-container':       'hsl(var(--on-tertiary-container))',
        error:                         'hsl(var(--error))',
        'error-container':             'hsl(var(--error-container))',
        'on-error':                    'hsl(var(--on-error))',
        'on-error-container':          'hsl(var(--on-error-container))',
      },
      fontFamily: {
        body:  ['var(--font-inter)', 'sans-serif'],
        label: ['var(--font-inter)', 'sans-serif'],
      },
      borderRadius: {
        sm:      '0.5rem',
        md:      '1rem',
        DEFAULT: '0.5rem',
        lg:      '2rem',
        xl:      '3rem',
        full:    '9999px',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

export default config;
