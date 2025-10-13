#!/usr/bin/env node
import { request } from 'node:http';

const url = process.env.HEALTHCHECK_URL || 'http://localhost:3000/api/health';

const req = request(url, (res) => {
  const chunks = [];
  res.on('data', (chunk) => chunks.push(chunk));
  res.on('end', () => {
    try {
      const body = JSON.parse(Buffer.concat(chunks).toString());
      if (body?.ok) {
        console.log('Healthcheck passed');
        process.exit(0);
      }
    } catch (error) {
      console.error('Failed to parse healthcheck response:', error);
    }
    process.exit(1);
  });
});

req.on('error', (error) => {
  console.error('Healthcheck request failed:', error);
  process.exit(1);
});

req.end();
