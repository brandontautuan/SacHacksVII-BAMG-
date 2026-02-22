import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { mockApiPlugin } from './src/server/mockApiPlugin';
export default defineConfig({
    plugins: [react(), mockApiPlugin()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
