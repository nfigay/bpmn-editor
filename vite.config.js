import { defineConfig } from 'vite';

export default defineConfig({
  // Cette ligne est cruciale : elle indique à Vite que le projet est
  // hébergé dans le sous-dossier /bpmn-editor/ sur GitHub Pages.
  base: '/bpmn-editor/',
});