/**
 * AGENDA DA PT - AION 2 | SERVIDOR NODE.JS NATIVO AUTOMÁTICO
 * Não precisa de npm install! Roda diretamente com `node server.js`
 * Oferece hospedagem local, API REST, Server-Sent Events (SSE) e persistência em database.json
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'database.json');

// Estrutura inicial do banco de dados
const defaultDb = {
  members: {
    kharnoxy: { id: 'kharnoxy', name: 'Kharnoxy', class: 'Templário (Tank)', password: '1234', avatar: '🛡️' },
    ciroc: { id: 'ciroc', name: 'CIROC', class: 'Mago (DPS)', password: '1234', avatar: '🔮' },
    hell: { id: 'hell', name: 'Hell', class: 'Healer (Suporte)', password: '1234', avatar: '🌿' },
    rafax: { id: 'rafax', name: 'Rafaxdwar', class: 'Guerreiro (DPS/Flex)', password: '1234', avatar: '⚔️' }
  },
  presence: {},
  dungeons: {},
  announcements: [
    '⚔️ Quarta-feira focar em terminar as chaves da DG 1 antes das 22h (Horário do Hell).',
    '🔮 Drop de arma mágica tem prioridade para CIROC.',
    '🛡️ Escudos e armaduras pesadas para Kharnoxy (Main Tank).',
    '🌿 Segundas e Terças: Rotação de alts às 19h pontual!'
  ]
};

// Carregar ou criar database.json
function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.error('Erro ao ler database.json, usando padrão:', e);
  }
  saveDb(defaultDb);
  return defaultDb;
}

function saveDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Erro ao salvar database.json:', e);
  }
}

// Lista de clientes conectados para Realtime via SSE (Server-Sent Events)
let sseClients = [];

function broadcastEvent(eventType, payload) {
  const msg = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
  sseClients.forEach(res => {
    try {
      res.write(msg);
    } catch (e) {}
  });
}

// MIME Types
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Utilitário para parsear corpo JSON de requisições POST
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
  });
}

// Obter IP da rede local
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // -------------------------------------------------------------
  // ROTAS DA API
  // -------------------------------------------------------------
  if (pathname.startsWith('/api/')) {
    const db = loadDb();

    // 1. SSE Realtime Stream
    if (pathname === '/api/stream') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });
      res.write(': connected\n\n');
      sseClients.push(res);
      req.on('close', () => {
        sseClients = sseClients.filter(c => c !== res);
      });
      return;
    }

    // 2. Obter Dados Completos (GET /api/data)
    if (pathname === '/api/data' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(db));
      return;
    }

    // 3. Atualizar Presença (POST /api/presence)
    if (pathname === '/api/presence' && req.method === 'POST') {
      try {
        const payload = await parseJsonBody(req);
        const { date, player_id, status, note } = payload;
        if (!date || !player_id) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Dados incompletos' }));
          return;
        }

        if (!db.presence[date]) db.presence[date] = {};
        db.presence[date][player_id] = {
          status: status || 'ready',
          note: note || '',
          updated_at: new Date().toISOString()
        };
        saveDb(db);
        broadcastEvent('presence_update', { date, player_id, data: db.presence[date][player_id] });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, presence: db.presence[date] }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'JSON inválido' }));
      }
      return;
    }

    // 4. Atualizar Dungeons (POST /api/dungeons)
    if (pathname === '/api/dungeons' && req.method === 'POST') {
      try {
        const payload = await parseJsonBody(req);
        db.dungeons = payload.dungeons || {};
        saveDb(db);
        broadcastEvent('dungeons_update', db.dungeons);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, dungeons: db.dungeons }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Erro ao processar' }));
      }
      return;
    }

    // 5. Adicionar Aviso (POST /api/announcements)
    if (pathname === '/api/announcements' && req.method === 'POST') {
      try {
        const payload = await parseJsonBody(req);
        if (payload.content) {
          db.announcements.unshift(payload.content.trim());
          saveDb(db);
          broadcastEvent('announcements_update', db.announcements);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, announcements: db.announcements }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Erro ao processar' }));
      }
      return;
    }

    // 6. Deletar Aviso (DELETE /api/announcements/:index)
    if (pathname.startsWith('/api/announcements/') && req.method === 'DELETE') {
      const idx = parseInt(pathname.split('/').pop(), 10);
      if (!isNaN(idx) && idx >= 0 && idx < db.announcements.length) {
        db.announcements.splice(idx, 1);
        saveDb(db);
        broadcastEvent('announcements_update', db.announcements);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, announcements: db.announcements }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Rota não encontrada' }));
    return;
  }

  // -------------------------------------------------------------
  // SERVIR ARQUIVOS ESTÁTICOS
  // -------------------------------------------------------------
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Arquivo Não Encontrado');
      } else {
        res.writeHead(500);
        res.end(`Erro no servidor: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  const localIp = getLocalIp();
  console.log('====================================================');
  console.log('⚔️  AGENDA DA PT - AION 2 | SERVIDOR ONLINE!');
  console.log('====================================================');
  console.log(`💻 Acesso Local no seu PC : http://localhost:${PORT}`);
  console.log(`🌐 Acesso para os amigos  : http://${localIp}:${PORT}`);
  console.log('⚡ Sincronização em tempo real e banco de dados ATIVOS!');
  console.log('====================================================');
});
