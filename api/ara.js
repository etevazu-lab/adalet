export default async function handler(req, res) {
  const { site } = req.query;
  
  // Site adresi kontrolü
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
  
  // URL'yi düzenle
  let targetUrl = site;
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
  }
  
  // URL'yi doğrula
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
        <p>Girdiğiniz adres geçerli bir URL değil: ${site}</p>
        <a href="/">← Ana Sayfaya Dön</a>
      </body>
      </html>
    `);
  }
  
  try {
    // Fetch isteği
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': req.headers['accept'] || '*/*',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': parsedUrl.origin
      },
      redirect: 'follow'
    });
    
    const contentType = response.headers.get('Content-Type') || '';
    const origin = parsedUrl.origin;
    const baseUrl = targetUrl;
    
    // HTML içeriği ise linkleri düzelt
    if (contentType.includes('text/html')) {
      let html = await response.text();
      
      // Base tag ekle
      html = html.replace(
        '<head>',
        `<head><base href="${baseUrl}">`
      );
      
      // Mutlak URL'leri proxy üzerinden yönlendir (href)
      html = html.replace(
        /href\s*=\s*["']https?:\/\/([^"']+)["']/gi,
        (match, url) => `href="/api/ara?site=https://${url}"`
      );
      
      // Mutlak URL'leri proxy üzerinden yönlendir (src)
      html = html.replace(
        /src\s*=\s*["']https?:\/\/([^"']+)["']/gi,
        (match, url) => `src="/api/ara?site=https://${url}"`
      );
      
      // Göreceli URL'leri düzelt (href ile başlayanlar)
      html = html.replace(
        /href\s*=\s*["']\/([^"']+)["']/gi,
        (match, path) => `href="/api/ara?site=${origin}/${path}"`
      );
      
      // Göreceli URL'leri düzelt (src ile başlayanlar)
      html = html.replace(
        /src\s*=\s*["']\/([^"']+)["']/gi,
        (match, path) => `src="/api/ara?site=${origin}/${path}"`
      );
      
      // CSS içindeki url() referanslarını düzelt
      html = html.replace(
        /url\(["']?https?:\/\/([^"')]+)["']?\)/gi,
        (match, url) => `url("/api/ara?site=https://${url}")`
      );
      
      html = html.replace(
        /url\(["']?\/([^"')]+)["']?\)/gi,
        (match, path) => `url("/api/ara?site=${origin}/${path}")`
      );
      
      // JavaScript içindeki location ve window.location değişimlerini engelle
      html = html.replace(
        /(window\.)?location\s*=\s*["']([^"']+)["']/gi,
        (match, prefix, url) => {
          if (url.startsWith('http')) {
            return `${prefix || ''}location="/api/ara?site=${url}"`;
          } else if (url.startsWith('/')) {
            return `${prefix || ''}location="/api/ara?site=${origin}${url}"`;
          }
          return match;
        }
      );
      
      // Form action'larını düzelt
      html = html.replace(
        /action\s*=\s*["']https?:\/\/([^"']+)["']/gi,
        (match, url) => `action="/api/ara?site=https://${url}"`
      );
      
      html = html.replace(
        /action\s*=\s*["']\/([^"']+)["']/gi,
        (match, path) => `action="/api/ara?site=${origin}/${path}"`
      );
      
      // Meta refresh yönlendirmelerini düzelt
      html = html.replace(
        /<meta[^>]+http-equiv=["']refresh["'][^>]+content=["'][^"]*url=([^"']+)["'][^>]*>/gi,
        (match, url) => {
          const cleanUrl = url.trim();
          if (cleanUrl.startsWith('http')) {
            return match.replace(cleanUrl, `/api/ara?site=${cleanUrl}`);
          } else if (cleanUrl.startsWith('/')) {
            return match.replace(cleanUrl, `/api/ara?site=${origin}${cleanUrl}`);
          }
          return match;
        }
      );
      
      // Üst kısma navigasyon çubuğu ekle
      const navBar = `
        <div style="position: fixed; top: 0; left: 0; right: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.2); z-index: 999999; font-family: Arial, sans-serif; display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 15px;">
            <a href="/" style="color: white; text-decoration: none; font-weight: bold; font-size: 18px;">🔍 Adalet</a>
            <span style="color: rgba(255,255,255,0.8); font-size: 14px;">📍 ${parsedUrl.hostname}</span>
          </div>
          <form action="/api/ara" method="GET" style="display: flex; gap: 8px; flex: 1; max-width: 500px; margin: 0 20px;">
            <input type="text" name="site" placeholder="Yeni adres..." value="${parsedUrl.hostname}" style="flex: 1; padding: 8px 12px; border: none; border-radius: 5px; font-size: 14px;">
            <button type="submit" style="background: white; color: #667eea; border: none; padding: 8px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 14px;">Git</button>
          </form>
          <a href="/" style="color: white; text-decoration: none; font-size: 14px; background: rgba(255,255,255,0.2); padding: 8px 15px; border-radius: 5px;">← Ana Sayfa</a>
        </div>
        <div style="height: 60px;"></div>
      `;
      
      html = html.replace('<body>', '<body>' + navBar);
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      return res.status(response.status).send(html);
    }
    
    // CSS içeriği ise linkleri düzelt
    if (contentType.includes('text/css')) {
      let css = await response.text();
      
      // CSS içindeki url() referanslarını düzelt
      css = css.replace(
        /url\(["']?https?:\/\/([^"')]+)["']?\)/gi,
        (match, url) => `url("/api/ara?site=https://${url}")`
      );
      
      css = css.replace(
        /url\(["']?\/([^"')]+)["']?\)/gi,
        (match, path) => `url("/api/ara?site=${origin}/${path}")`
      );
      
      res.setHeader('Content-Type', 'text/css');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(response.status).send(css);
    }
    
    // JavaScript içeriği
    if (contentType.includes('javascript') || contentType.includes('application/json')) {
      const jsContent = await response.text();
      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(response.status).send(jsContent);
    }
    
    // Binary içerik (resimler, fontlar, vb.)
    if (contentType.includes('image/') || 
        contentType.includes('font/') || 
        contentType.includes('application/octet-stream')) {
      const buffer = await response.arrayBuffer();
      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      return res.status(response.status).send(Buffer.from(buffer));
    }
    
    // Diğer içerikler
    const textContent = await response.text();
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(response.status).send(textContent);
    
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Bağlantı Hatası</title>
        <style>
          body { 
            font-family: Arial; 
            text-align: center; 
            padding: 50px;
            background: #f5f5f5;
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            max-width: 600px;
            margin: 0 auto;
          }
          .error { color: #d32f2f; }
          a { 
            display: inline-block;
            margin-top: 20px;
            color: white;
            background: #0066cc;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 5px;
          }
          .details {
            margin-top: 20px;
            padding: 15px;
            background: #fff3cd;
            border-radius: 5px;
            font-size: 14px;
            color: #856404;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 class="error">❌ Bağlantı Hatası</h1>
          <p>Site yüklenemedi: <strong>${targetUrl}</strong></p>
          <div class="details">
            <strong>Hata detayı:</strong><br>
            ${error.message}
          </div>
          <p style="margin-top: 20px; color: #666; font-size: 14px;">
            Olası sebepler:<br>
            • Site erişilebilir olmayabilir<br>
            • Bağlantı zaman aşımına uğramış olabilir<br>
            • Site proxy bağlantılarını engelliyor olabilir
          </p>
          <a href="/">← Ana Sayfaya Dön</a>
        </div>
      </body>
      </html>
    `);
  }
}
