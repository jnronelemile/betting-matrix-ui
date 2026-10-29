import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

function scanTitaniumV2() {
  const baseDir = path.resolve(__dirname, 'public/data/titanium_v2');
  const manifest = {
    predictions: [],
    matches: [],
    seriesRuns: [],
    seriesFlatLeagues: [],
    footballIntelligence: [],
    tickets: {
      assembled: null,
      finals: null,
      leagues: []
    }
  };

  if (!fs.existsSync(baseDir)) return manifest;

  const predDir = path.join(baseDir, 'predictions');
  if (fs.existsSync(predDir)) {
    manifest.predictions = fs.readdirSync(predDir).filter(f => f.endsWith('.json'));
  }

  const matchesDir = path.join(baseDir, 'matches');
  if (fs.existsSync(matchesDir)) {
    manifest.matches = fs.readdirSync(matchesDir).filter(f => f.endsWith('.json'));
  }

  const seriesDir = path.join(baseDir, 'series');
  if (fs.existsSync(seriesDir)) {
    const seriesDirs = fs.readdirSync(seriesDir).filter(f => {
      try {
        return fs.statSync(path.join(seriesDir, f)).isDirectory();
      } catch (e) {
        return false;
      }
    });
    manifest.seriesRuns = seriesDirs.filter(d => /^Run_/i.test(d));
    manifest.seriesFlatLeagues = seriesDirs.filter(d => !/^Run_/i.test(d));
  }

  const ticketsDir = path.join(baseDir, 'tickets');
  if (fs.existsSync(ticketsDir)) {
    const tFiles = fs.readdirSync(ticketsDir).filter(f => f.endsWith('.json'));
    if (tFiles.includes('TICKETS_ASSEMBLES.json')) {
      manifest.tickets.assembled = '/data/titanium_v2/tickets/TICKETS_ASSEMBLES.json';
    }
  }

  const auxDir = path.join(baseDir, 'tickets', 'auxiliary');
  if (fs.existsSync(auxDir)) {
    if (fs.existsSync(path.join(auxDir, 'CHOIX_FINAUX.json'))) {
      manifest.tickets.finals = '/data/titanium_v2/tickets/auxiliary/CHOIX_FINAUX.json';
    }
    const liguesDir = path.join(auxDir, 'LIGUES');
    if (fs.existsSync(liguesDir)) {
      manifest.tickets.leagues = fs.readdirSync(liguesDir).filter(f => f.endsWith('.json'));
    }
  }

  const fiDir = path.join(baseDir, 'football_intelligence');
  if (fs.existsSync(fiDir)) {
    const collectFiFiles = (dir, relPrefix = '') => {
      let entries = [];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch (e) {
        return;
      }
      for (const entry of entries) {
        const relPath = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          collectFiFiles(fullPath, relPath);
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          manifest.footballIntelligence.push(`/data/titanium_v2/football_intelligence/${relPath}`);
        }
      }
    };
    collectFiFiles(fiDir);
    manifest.footballIntelligence.sort();
  }

  return manifest;
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'titanium-manifest',
      resolveId(id) {
        if (id === 'virtual:titanium-manifest') {
          return '\0virtual:titanium-manifest';
        }
      },
      load(id) {
        if (id === '\0virtual:titanium-manifest') {
          const manifest = scanTitaniumV2();
          return `export default ${JSON.stringify(manifest)};`;
        }
      }
    }
  ],
})
