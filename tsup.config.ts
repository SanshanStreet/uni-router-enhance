import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  dts: {
    compilerOptions: {
      moduleResolution: 'node',
      target: 'es2020',
      skipLibCheck: true,
    },
  },
  sourcemap: true,
  clean: true,
  format: ['esm', 'cjs'], // 想只要一种格式可以改成 ['esm']
  minify: false,
  target: 'esnext',
  splitting: false,
});