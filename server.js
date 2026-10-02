const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const port = Number(process.env.PORT) || 3000;
const root = __dirname;
const sessions = new Map();

const driver = {
  id: 'DL-4471',
  name: 'Arun Prakash',
  mobile: '+91 98765 43210',
  password: 'password',
  online: true,
  earnings: 486,
  delivered: 7,
  rating: 4.9,
  acceptance: 98
};

const orders = [
  {
    id: 'PZ-2847', status: 'pickup', payout: 42,
    pickup: 'Printzoo Point - Anna Nagar', customer: 'Rahul K.'
  },
  {
    id: 'PZ-2849', status: 'new', payout: 55,
    pickup: 'Printzoo Point - Kilpauk', customer: 'Meera S.'
  }
];

function sendJson(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*'
  });
  response.end(JSON.stringify(body));
}

function sendFile(response, filePath) {
  const extension = path.extname(filePath);
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };
  response.writeHead(200, { 'Content-Type': types[extension] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(response);
}

function requireSession(request, response) {
  const token = request.headers.authorization?.replace('Bearer ', '');
  if (!token || !sessions.has(token)) {
    sendJson(response, 401, { error: 'Authentication required' });
    return null;
  }
  return sessions.get(token);
}

async function readBody(request) {
  let body = '';
  for await (const chunk of request) body += chunk;
  return body ? JSON.parse(body) : {};
}

async function handleApi(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === 'POST' && url.pathname === '/api/login') {
    const credentials = await readBody(request);
    if (credentials.mobile !== driver.mobile || credentials.password !== driver.password) {
      sendJson(response, 401, { error: 'Invalid mobile number or password' });
      return;
    }
    const token = crypto.randomUUID();
    sessions.set(token, driver.id);
    sendJson(response, 200, { token, driver: { ...driver, password: undefined } });
    return;
  }

  const driverId = requireSession(request, response);
  if (!driverId) return;

  if (request.method === 'GET' && url.pathname === '/api/dashboard') {
    sendJson(response, 200, { driver: { ...driver, password: undefined }, orders });
    return;
  }

  const orderMatch = url.pathname.match(/^\/api\/orders\/([^/]+)\/(accept|pickup|deliver)$/);
  if (request.method === 'POST' && orderMatch) {
    const order = orders.find(item => item.id === orderMatch[1]);
    if (!order) {
      sendJson(response, 404, { error: 'Order not found' });
      return;
    }
    const action = orderMatch[2];
    const nextStatus = { accept: 'pickup', pickup: 'deliver', deliver: 'done' }[action];
    if (order.status !== ({ accept: 'new', pickup: 'pickup', deliver: 'deliver' }[action])) {
      sendJson(response, 409, { error: `Order cannot be marked ${action} from its current state` });
      return;
    }
    order.status = nextStatus;
    if (action === 'deliver') {
      driver.earnings += order.payout;
      driver.delivered += 1;
    }
    sendJson(response, 200, { order, driver: { ...driver, password: undefined } });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/availability') {
    const body = await readBody(request);
    driver.online = Boolean(body.online);
    sendJson(response, 200, { online: driver.online });
    return;
  }

  sendJson(response, 404, { error: 'API route not found' });
}

const server = http.createServer(async (request, response) => {
  try {
    if (request.url.startsWith('/api/')) {
      await handleApi(request, response);
      return;
    }
    const requestedPath = new URL(request.url, `http://${request.headers.host}`).pathname;
    const filePath = path.join(root, requestedPath === '/' ? 'printzoo-delivery.html' : requestedPath);
    if (!filePath.startsWith(root) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }
    sendFile(response, filePath);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
  }
});

server.listen(port, () => {
  console.log(`Printzoo backend running at http://localhost:${port}`);
});
