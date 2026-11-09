// Injects the static, semantic reader (SEO / no-JS / print / low-end fallback) into index.html at build + dev time.
import type { Plugin } from 'vite';
import { renderReader } from '../src/reader/render';
import { content } from '../src/content';

export function readerPlugin(): Plugin {
  return {
    name: 'binasoy-reader',
    transformIndexHtml(html) {
      return html.replace('<!--READER-->', renderReader(content));
    },
  };
}
