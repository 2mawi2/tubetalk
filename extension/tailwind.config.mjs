export default {
  content: [
    "./src/**/*.{js,jsx,ts,tsx,html}",
  ],
  theme: {
    extend: {
      colors: {
        'yt-light': '#ffffff',
        'yt-dark': '#0f0f0f',
        'yt-text-light': '#333333',
        'yt-text-dark': '#ffffff',
        'yt-blue': '#4285F4',
        'yt-blue-hover': '#3367D6',
        'yt-border-light': '#e0e0e0',
        'yt-border-dark': '#444444',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        serif: ['Merriweather', 'serif'],
      },
    },
  },
  plugins: [
    forms,
  ],
};
