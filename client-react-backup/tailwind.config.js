/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        chain: '#2563EB',
        carbon: '#111827',
        alloy: '#64748B',
        ceramic: '#F8FAFC',
        signal: '#F59E0B',
        service: '#10B981'
      },
      boxShadow: {
        panel: '0 18px 55px rgba(15, 23, 42, 0.08)'
      }
    }
  },
  plugins: []
};
