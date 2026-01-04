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
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const contentType = response.headers.get('Content-Type') || '';
    const origin = parsedUrl.origin;
    
    // Binary içerik (resimler, fontlar, vb.)
    if (!contentType.includes('text/html') && 
        !contentType.includes('text/css') && 
        !contentType.includes('javascript')) {
      const buffer = await response.arrayBuffer();
      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      return res.send(Buffer.from(buffer));
    }
    
    // HTML içeriği
    if (contentType.includes('text/html')) {
      let html = await response.text();
      
      // Proxy URL oluştur
      const proxyUrl = (url) => {
        try {
          const absoluteUrl = new URL(url, targetUrl).href;
          return `/api/ara?site=${encodeURIComponent(absoluteUrl)}`;
        } catch {
          return url;
        }
      };
      
      // Sadece href ve action attribute'larını düzelt (src'ye dokunma)
      html = html.replace(
        /(href|action)\s*=\s*["']([^"']+)["']/gi,
        (match, attr, url) => {
          if (url.startsWith('data:') || url.startsWith('javascript:') || url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('#')) {
            return match;
          }
          return `${attr}="${proxyUrl(url)}"`;
        }
      );
      
      // Base tag ekle
      if (!html.includes('<base')) {
        html = html.replace(
          /<head[^>]*>/i,
          `$&\n<base href="${targetUrl}">`
        );
      }
      
      // Navigasyon çubuğu
      const navBar = `
        <style>
          .adalet-nav {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
            color: white !important;
            padding: 10px 20px !important;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3) !important;
            z-index: 2147483647 !important;
            font-family: Arial, sans-serif !important;
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            font-size: 14px !important;
            gap: 15px !important;
          }
          .adalet-nav a {
            color: white !important;
            text-decoration: none !important;
            font-weight: bold !important;
          }
          .adalet-nav form {
            display: flex !important;
            gap: 8px !important;
            flex: 1 !important;
            max-width: 400px !important;
          }
          .adalet-nav input {
            flex: 1 !important;
            padding: 8px 12px !important;
            border: none !important;
            border-radius: 5px !important;
            font-size: 13px !important;
          }
          .adalet-nav button {
            background: white !important;
            color: #667eea !important;
            border: none !important;
            padding: 8px 16px !important;
            border-radius: 5px !important;
            cursor: pointer !important;
            font-weight: bold !important;
          }
          .adalet-spacer {
            height: 50px !important;
          }
        </style>
        <div class="adalet-nav">
          <a href="/">🔍 Adalet</a>
          <form action="/api/ara">
            <input type="text" name="site" placeholder="Yeni site...">
            <button type="submit">Git</button>
          </form>
        </div>
        <div class="adalet-spacer"></div>
      `;
      
      html = html.replace(/<body[^>]*>/i, `$&${navBar}`);
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.send(html);
    }
    
    // CSS ve JS
    const content = await response.text();
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.send(content);
    
  } catch (error) {
    return res.status(500).send(`
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
        <h1 class="error">❌ Bağlantı Hatası</h1>
        <p>Site yüklenemedi: ${targetUrl}</p>
        <p style="color: #666;">${error.message}</p>
        <a href="/">← Ana Sayfaya Dön</a>
      </body>
      </html>
    `);
  }
}
