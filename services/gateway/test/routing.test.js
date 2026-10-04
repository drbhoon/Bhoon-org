const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

process.env.PUBLIC_ORIGIN = 'https://bhoon.org';
const express = require('express');
const { app, proxyFor } = require('../server');

let server;
let port;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      port = server.address().port;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

function request(pathname, host, targetPort = port) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port: targetPort, path: pathname, headers: { host } }, resolve);
    req.on('error', reject);
  });
}

function responseBody(response) {
  return new Promise((resolve, reject) => {
    let body = '';
    response.setEncoding('utf8');
    response.on('data', (chunk) => { body += chunk; });
    response.on('end', () => resolve(body));
    response.on('error', reject);
  });
}

test('redirects the legacy People subdomain to the canonical path', async () => {
  const response = await request('/dashboard?tab=latest', 'people.bhoon.org');
  assert.equal(response.statusCode, 308);
  assert.equal(response.headers.location, 'https://bhoon.org/people/dashboard?tab=latest');
  response.resume();
});

test('redirects the legacy Stocks subdomain to the canonical path', async () => {
  const response = await request('/', 'stocks.bhoon.org');
  assert.equal(response.statusCode, 308);
  assert.equal(response.headers.location, 'https://bhoon.org/stocks');
  response.resume();
});

test('normalizes canonical app roots with trailing slashes', async () => {
  const people = await request('/people', 'bhoon.org');
  assert.equal(people.statusCode, 308);
  assert.equal(people.headers.location, '/people/');
  people.resume();

  const stocks = await request('/stocks', 'bhoon.org');
  assert.equal(stocks.statusCode, 308);
  assert.equal(stocks.headers.location, '/stocks/');
  stocks.resume();
});

test('strips the canonical prefix when proxying to an application', async () => {
  const upstream = http.createServer((req, res) => {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ path: req.url }));
  });
  await new Promise((resolve) => upstream.listen(0, '127.0.0.1', resolve));

  const proxyApp = express();
  proxyApp.use('/people', proxyFor(`http://127.0.0.1:${upstream.address().port}`, '/people'));
  const proxyServer = await new Promise((resolve) => {
    const instance = proxyApp.listen(0, '127.0.0.1', () => resolve(instance));
  });

  try {
    const response = await request('/people/api/health?full=1', 'bhoon.org', proxyServer.address().port);
    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(await responseBody(response)), { path: '/api/health?full=1' });
  } finally {
    await new Promise((resolve) => proxyServer.close(resolve));
    await new Promise((resolve) => upstream.close(resolve));
  }
});
