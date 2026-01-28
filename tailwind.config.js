const { themeColors } = require("./theme.config");
const plugin = require("tailwindcss/plugin");

const tailwindColors = Object.fromEntries(
  Object.entries(themeColors).map(([name, swatch]) => [
    name,
    {
      DEFAULT: `var(--color-${name})`,
      light: swatch.light,
      dark: swatch.dark,
    },
  ]),
);

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./app/**/*.{js,ts,tsx}", "./components/**/*.{js,ts,tsx}", "./lib/**/*.{js,ts,tsx}", "./hooks/**/*.{js,ts,tsx}"],

  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ...tailwindColors,
        // Extended cyberpunk palette
        cyan: {
          DEFAULT: '#00F0FF',
          glow: '#00F0FF40',
        },
        magenta: {
          DEFAULT: '#FF00E5',
          glow: '#FF00E540',
        },
        neon: {
          DEFAULT: '#39FF14',
          glow: '#39FF1440',
        },
      },
      fontFamily: {
        mono: ['SpaceMono', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(0, 240, 255, 0.5)',
        'glow-magenta': '0 0 20px rgba(255, 0, 229, 0.5)',
        'glow-neon': '0 0 20px rgba(57, 255, 20, 0.5)',
      },
    },
  },
  plugins: [
    plugin(({ addVariant }) => {
      addVariant("light", ':root:not([data-theme="dark"]) &');
      addVariant("dark", ':root[data-theme="dark"] &');
    }),
  ],
};
