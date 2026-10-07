// @ts-check
import { defineConfig } from 'astro/config';

// GitHub Pages（https://y177649.github.io/Text-Site/）で配信する
export default defineConfig({
  site: 'https://y177649.github.io',
  base: '/Text-Site',
  trailingSlash: 'always',
  build: { inlineStylesheets: 'always' },
});
