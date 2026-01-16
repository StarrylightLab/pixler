import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// 使用 './' 作为 base 路径是最具兼容性的选择，它可以让应用在任何目录下运行
export default defineConfig({
  base: '/pixler', 
  plugins: [
    react(),
    // viteStaticCopy({
    //   targets: [
    //     {
    //       src: 'public',
    //       dest: '.'
    //     },{
    //       src: 'assets',
    //       dest: '.'
    //     },
    //     {
    //       src: 'manifest.json',
    //       dest: '.'
    //     },
    //     {
    //       src: 'sw.js',
    //       dest: '.'
    //     }
    //   ]
    // })
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
});