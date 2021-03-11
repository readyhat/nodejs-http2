const HTTPS_PORT = 3000;
const HTTP2_PORT = 3001;

// libs
const Prometheus = require('prom-client')
const fs = require('fs');
const express = require('express');
const http = require('http');

// HTTP/2 components
const http2 = require('spdy');
// const http2 = require('http2');

Prometheus.collectDefaultMetrics();

const requestHistogram = new Prometheus.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['code', 'handler', 'method'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5]
})

const requestTimer = (req, res, next) => {
  const path = new URL(req.url, `http://${req.hostname}`).pathname
  const stop = requestHistogram.startTimer({
    method: req.method,
    handler: path
  })
  res.on('finish', () => {
    stop({
      code: res.statusCode
    })
  })
  next()
}

// Load the certificates
const options = {
  key: fs.readFileSync(__dirname + '/certs-bak/server.key'),
  cert: fs.readFileSync(__dirname + '/certs-bak/server.crt')
};

const app = express();

// See: http://expressjs.com/en/4x/api.html#app.settings.table
const PRODUCTION = app.get('env') === 'production';

// Administrative routes are not timed or logged, but for non-admin routes, pino
// overhead is included in timing.
app.get('/ready', (req, res) => res.status(200).json({status:"ok"}));
app.get('/live', (req, res) => res.status(200).json({status:"ok"}));
app.get('/metrics', (req, res, next) => {
  res.set('Content-Type', Prometheus.register.contentType)
  res.end(Prometheus.register.metrics())
})

// Time routes after here.
app.use(requestTimer);

// Log routes after here.
const pino = require('pino')({
  level: PRODUCTION ? 'info' : 'debug',
});
app.use(require('pino-http')({logger: pino}));

app.get('/http2', (req, res) => {
  res.status(200).json({ message: 'ok' });
});

app.get('/', (req, res) => {	
  // Use req.log (a `pino` instance) to log JSON:	
  req.log.info({message: 'Hello from Node.js Starter Application!'});		
  res.send('Hello from Node.js Starter Application!');	
});	

app.get('*', (req, res) => {
  res.status(404).send("Not Found");
});

// Listen and serve.
http.createServer(app).listen(HTTPS_PORT, () => {
  console.log(`HTTP/1 started on PORT ${HTTPS_PORT}`);
});

http2.createServer(options, app).listen(HTTP2_PORT, (error) => {
  if (error) {
    console.error(error);
    return process.exit(1);
  } else {
    console.log(`HTTP/2 started on PORT ${HTTP2_PORT}`);
  }
})
