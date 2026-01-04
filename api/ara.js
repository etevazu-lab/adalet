export default async function handler(req, res) {
  const { site } = req.query;
  
  if (!site) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Hata</title>
        <style>
          body { font-family: Arial; text-align: center; padding: 50px; }
          .error { color: red; }
          a { color: #0066cc; text-decoration: none; }
        </style>
      </head>
      <body>
        <h1 class="error">❌ Hata</h1>
        <p>Site adresi belirtilmedi!</p>
        <a href="/">← Ana Sayfaya Dön</a>
      </body>
      </html>
    `);
  }
  
  let targetUrl = site;
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
  }
  
  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrl);
  } catch (error) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Hata</title>
        <style>
          body { font-family: Arial; text-align: center; padding: 50px; }
          .error { color: red; }
          a { color: #0066cc; text-decoration: none; }
        </style>
      </head>
      <body>
        <h1 class="error">❌ Geçersiz URL</h1>
        <p>Girdiğiniz adres geçerli değil: ${site}</p>
        <a href="/">← Ana Sayfaya Dön</a>
      </body>
      </html>
    `);
  }
  
  try {
    const response = await fetch(targetUrl);
    const contentType = response.headers.get('Content-Type') || '';
    
    // Binary içerik - direkt döndür
    if (!contentType.includes('text/')) {
      const buffer = await response.arrayBuffer();
      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.send(Buffer.from(buffer));
    }
    
    // HTML için link düzeltme
    if (contentType.includes('text/html')) {
      let html = await response.text();
      const origin = parsedUrl.origin;
      
      // Mutlak URL'leri düzelt
      html = html.replace(
        /href=["'](https?:\/\/[^"']+)["']/gi,
        (match, fullUrl) => `href="/api/ara?site=${encodeURIComponent(fullUrl)}"`
      );
      
      // Göreceli URL'ler (/)
      html = html.replace(
        /href=["']\/([^"']+)["']/gi,
        (match, path) => `href="/api/ara?site=${encodeURIComponent(origin + '/' + path)}"`
      );
      
      // Göreceli URL'ler (başında / yok)
      html = html.replace(
        /href=["'](?!https?:\/\/|\/|#|javascript:)([^"']+)["']/gi,
        (match, path) => {
          const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
          return `href="/api/ara?site=${encodeURIComponent(baseUrl + path)}"`;
        }
      );
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.send(html);
    }
    
    // CSS, JS, diğer text
    const content = await response.text();
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.send(content);
    
  } catch (error) {
    return res.status(500).send('Site yüklenemedi');
  }
}
