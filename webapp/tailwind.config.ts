import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Lägg till egna teman här om det behövs
      // colors: {
      //   primary: '#0000ff', // Exempel på accentfärg
      // },
    },
  },
  plugins: [],
};
export default config; 