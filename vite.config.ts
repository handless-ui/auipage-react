import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
    server: {
        port: 20000,
        host: "0.0.0.0",
        proxy: {
            '/api': {
                target: 'http://localhost:30000',
                changeOrigin: true,
            },
        },
    },
    resolve: {
        // 仅在 dev/test 时启用别名，避免影响 build 产物的外部依赖
        alias: command === 'serve'
            ? { "@auipage/react": fileURLToPath(new URL('./src/index.ts', import.meta.url)) }
            : undefined
    },
    plugins: [
        react({
            jsxRuntime: "classic"
        }),
    ],
    build: {
        rollupOptions: {
            external: ["react"],
            output: {
                globals: {
                    react: "React"
                }
            }
        },
        minify: false,
        sourcemap: true,
        cssCodeSplit: true,
        lib: {
            entry: "./src/index.ts",
            name: "AuipageReact",
            fileName: "auipage-react",
            formats: ["es", "umd", "iife"]
        }
    }
}));