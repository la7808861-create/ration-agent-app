import { mkdir, copyFile, writeFile } from 'node:fs/promises';

await mkdir('dist/server', { recursive: true });
await mkdir('dist/.openai', { recursive: true });
await copyFile('.openai/hosting.json', 'dist/.openai/hosting.json');

await writeFile('dist/server/index.js', `
export default {
  async fetch(request, env) {
    if (env.ASSETS) {
      const url = new URL(request.url);
      let response = await env.ASSETS.fetch(request);
      if (response.status !== 404) return response;

      if (url.pathname === '/' || !url.pathname.includes('.')) {
        const indexUrl = new URL('/index.html', url.origin);
        response = await env.ASSETS.fetch(new Request(indexUrl, request));
        if (response.status !== 404) return response;
      }

      return response;
    }

    const url = new URL(request.url);
    return new Response(\`<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>وكيل البطاقة التموينية</title>
  </head>
  <body>
    <script>location.href = '/index.html' + location.search + location.hash;</script>
    <a href="/index.html">فتح التطبيق</a>
  </body>
</html>\`, {
      headers: { 'content-type': 'text/html; charset=utf-8' }
    });
  }
};
`);
