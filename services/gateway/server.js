const path = require('node:path');
const http = require('node:http');
const https = require('node:https');
const express = require('express');

const app = express();
const port = Number(process.env.PORT || 3000);
const publicOrigin = (process.env.PUBLIC_ORIGIN || 'https://bhoon.org').replace(/\/$/, '');
const peopleUpstream = process.env.PEOPLE_UPSTREAM || 'http://localhost:3001';
const stocksUpstream = process.env.STOCKS_UPSTREAM || 'http://localhost:8000';
const siteDir = path.resolve(__dirname, '../../apps/site');

app.disable('x-powered-by');
app.set('trust proxy', 1);

function requestHost(req) {
  return (req.get('x-forwarded-host') || req.get('host') || '')
    .split(',')[0]
    .trim()
    .split(':')[0]
    .toLowerCase();
}

function legacyRedirect(prefix) {
  return (req, res) => {
    const suffix = req.originalUrl === '/' ? '' : req.originalUrl;
    res.redirect(308, `${publicOrigin}${prefix}${suffix}`);
  };
}

app.use((req, res, next) => {
  const host = requestHost(req);
  if (host === 'people.bhoon.org' || host === 'peoplescience.bhoon.org') {
    return legacyRedirect('/people')(req, res);
  }
  if (host === 'stocks.bhoon.org') {
    return legacyRedirect('/stocks')(req, res);
  }
  if (host === 'www.bhoon.org') {
    return res.redirect(308, `${publicOrigin}${req.originalUrl}`);
  }
  next();
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
// Express treats a trailing slash as optional by default. Regex routes keep the
// canonical "add a slash" redirects from matching /people/ and /stocks/ too.
app.get(/^\/people$/, (_req, res) => res.redirect(308, '/people/'));
app.get(/^\/stocks$/, (_req, res) => res.redirect(308, '/stocks/'));

function proxyFor(target, prefix) {
  const upstream = new URL(target);
  const transport = upstream.protocol === 'https:' ? https : http;

  return (req, res) => {
    const forwardedPath = req.originalUrl.replace(new RegExp(`^${prefix}`), '') || '/';
    const headers = {
      ...req.headers,
      host: upstream.host,
      'x-forwarded-host': req.get('host'),
      'x-forwarded-proto': req.get('x-forwarded-proto') || req.protocol,
      'x-forwarded-prefix': prefix,
    };

    const proxyRequest = transport.request({
      protocol: upstream.protocol,
      hostname: upstream.hostname,
      port: upstream.port,
      method: req.method,
      path: `${upstream.pathname.replace(/\/$/, '')}${forwardedPath}`,
      headers,
    }, (proxyResponse) => {
      res.writeHead(proxyResponse.statusCode || 502, proxyResponse.headers);
      proxyResponse.pipe(res);
    });

    proxyRequest.on('error', (error) => {
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
      }
      res.end(JSON.stringify({ error: 'Application temporarily unavailable' }));
      console.error(`[gateway] ${prefix} proxy error:`, error.message);
    });

    req.pipe(proxyRequest);
  };
}

app.use('/people', proxyFor(peopleUpstream, '/people'));
app.use('/stocks', proxyFor(stocksUpstream, '/stocks'));

app.get('/index.html', (_req, res) => res.redirect(308, '/'));
app.get('/people.html', (_req, res) => res.redirect(308, '/people-architecture'));
app.get('/platforms.html', (_req, res) => res.redirect(308, '/platforms'));
app.use(express.static(siteDir, { extensions: ['html'] }));

app.use((_req, res) => {
  res.status(404).sendFile(path.join(siteDir, '404.html'));
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`bhoon.org gateway listening on port ${port}`);
  });
}

module.exports = { app, proxyFor, requestHost };
