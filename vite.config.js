import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

const generateIndex = () => {
  const dataDir = path.resolve(__dirname, 'public/data');
  if (fs.existsSync(dataDir)) {
    const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json') && f !== 'index.json');
    fs.writeFileSync(path.join(dataDir, 'index.json'), JSON.stringify(files));
  }
  
  const matchupsDir = path.resolve(__dirname, 'public/data/matchups');
  if (fs.existsSync(matchupsDir)) {
    const files = fs.readdirSync(matchupsDir).filter(f => f.endsWith('.json') && f !== 'index.json');
    fs.writeFileSync(path.join(matchupsDir, 'index.json'), JSON.stringify(files));
  }
};

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'data-indexer',
      configureServer(server) {
        generateIndex(); // Run once on startup
        server.watcher.add(path.resolve(__dirname, 'public/data'));
        server.watcher.on('all', (event, filePath) => {
          if (filePath.includes('public/data') && filePath.endsWith('.json') && !filePath.endsWith('index.json')) {
            generateIndex();
          }
        });
      },
      buildStart() {
        generateIndex();
      }
    }
  ],
})
