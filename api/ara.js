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
      method: req.method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': req.headers['accept'] || 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': parsedUrl.origin,
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      redirect: 'follow'
    });
    
    const contentType = response.headers.get('Content-Type') || '';
    const origin = parsedUrl.origin;
    
    // Binary içerik (resimler, fontlar, vb.) - ÖNCE KONTROL ET
    if (contentType.includes('image/') || 
        contentType.includes('font/') || 
        contentType.includes('video/') ||
        contentType.includes('audio/') ||
        contentType.includes('application/pdf') ||
        contentType.includes('application/octet-stream')) {
      const buffer = await response.arrayBuffer();
      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      return res.send(Buffer.from(buffer));
    }
    
    // HTML içeriği
    if (contentType.includes('text/html')) {
      let html = await response.text();
      
      // Proxy URL'leri oluştur
      const proxyUrl = (url) => {
        try {
          const absoluteUrl = new URL(url, targetUrl).href;
          return `/api/ara?site=${encodeURIComponent(absoluteUrl)}`;
        } catch {
          return url;
        }
      };
      
      // Tüm URL'leri düzelt (daha kapsamlı)
      html = html.replace(
        /(href|src|action|data|poster|background)\s*=\s*["']([^"']+)["']/gi,
        (match, attr, url) => {
          if (url.startsWith('data:') || url.startsWith('javascript:') || url.startsWith('mailto:') || url.startsWith('#')) {
            return match;
          }
          return `${attr}="${proxyUrl(url)}"`;
        }
      );
      
      // CSS içindeki url() - daha gelişmiş
      html = html.replace(
        /url\s*\(\s*["']?([^"')]+)["']?\s*\)/gi,
        (match, url) => {
          if (url.startsWith('data:')) return match;
          return `url("${proxyUrl(url)}")`;
        }
      );
      
      // srcset attribute'ları
      html = html.replace(
        /srcset\s*=\s*["']([^"']+)["']/gi,
        (match, srcset) => {
          const fixed = srcset.split(',').map(item => {
            const parts = item.trim().split(' ');
            if (parts[0]) {
              parts[0] = proxyUrl(parts[0]);
            }
            return parts.join(' ');
          }).join(', ');
          return `srcset="${fixed}"`;
        }
      );
      
      // Base tag ekle (önemli!)
      if (!html.includes('<base')) {
        html = html.replace(
          /<head[^>]*>/i,
          `$&\n<base href="${targetUrl}">`
        );
      }
      
      // CSP ve security header'ları kaldır
      html = html.replace(
        /<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi,
        ''
      );
      
      // Navigasyon çubuğu ekle
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
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif !important;
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            font-size: 14px !important;
            gap: 15px !important;
          }
          .adalet-nav * {
            margin: 0 !important;
            box-sizing: border-box !important;
          }
          .adalet-nav-left {
            display: flex !important;
            align-items: center !important;
            gap: 15px !important;
          }
          .adalet-nav a {
            color: white !important;
            text-decoration: none !important;
            font-weight: bold !important;
          }
          .adalet-nav-host {
            color: rgba(255,255,255,0.9) !important;
            font-size: 13px !important;
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
            outline: none !important;
          }
          .adalet-nav button {
            background: white !important;
            color: #667eea !important;
            border: none !important;
            padding: 8px 16px !important;
            border-radius: 5px !important;
            cursor: pointer !important;
            font-weight: bold !important;
            font-size: 13px !important;
          }
          .adalet-nav button:hover {
            background: #f0f0f0 !important;
          }
          .adalet-nav-home {
            background: rgba(255,255,255,0.2) !important;
            padding: 6px 12px !important;
            border-radius: 5px !important;
            white-space: nowrap !important;
          }
          .adalet-spacer {
            height: 50px !important;
            display: block !important;
          }
          @media (max-width: 768px) {
            .adalet-nav {
              flex-wrap: wrap !important;
              padding: 8px 10px !important;
            }
            .adalet-nav form {
              width: 100% !important;
              max-width: none !important;
            }
          }
        </style>
        <div class="adalet-nav">
          <div class="adalet-nav-left">
            <a href="/">🔍 Adalet</a>
            <span class="adalet-nav-host">📍 ${parsedUrl.hostname}</span>
          </div>
          <form action="/api/ara" method="GET">
            <input type="text" name="site" placeholder="Yeni site..." value="">
            <button type="submit">Git</button>
          </form>
          <a href="/" class="adalet-nav-home">Ana Sayfa</a>
        </div>
        <div class="adalet-spacer"></div>
      `;
      
      html = html.replace(/<body[^>]*>/i, `$&${navBar}`);
      
      // Response headers
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.removeHeader('Content-Security-Policy');
      res.removeHeader('X-Frame-Options');
      
      return res.send(html);
    }
    
    // CSS içeriği
    if (contentType.includes('text/css')) {
      let css = await response.text();
      
      css = css.replace(
        /url\s*\(\s*["']?([^"')]+)["']?\s*\)/gi,
        (match, url) => {
          if (url.startsWith('data:')) return match;
          try {
            const absoluteUrl = new URL(url, targetUrl).href;
            return `url("/api/ara?site=${encodeURIComponent(absoluteUrl)}")`;
          } catch {
            return match;
          }
        }
      );
      
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.send(css);
    }
    
    // JavaScript ve JSON
    if (contentType.includes('javascript') || contentType.includes('application/json')) {
      const content = await response.text();
      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.send(content);
    }
    
    // Diğer text içerikler
    if (contentType.includes('text/')) {
      const content = await response.text();
      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.send(content);
    }
    
    // Bilinmeyen binary içerik
    const buffer = await response.arrayBuffer();
    res.setHeader('Content-Type', contentType || 'application/octet-stream');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.send(Buffer.from(buffer));
    
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
            word-break: break-word;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 class="error">❌ Bağlantı Hatası</h1>
          <p>Site yüklenemedi: <strong>${targetUrl}</strong></p>
          <div class="details">
            <strong>Hata:</strong><br>
            ${error.message}
          </div>
          <p style="margin-top: 20px; color: #666; font-size: 14px;">
            <strong>Olası sebepler:</strong><br>
            • Site şu anda erişilebilir olmayabilir<br>
            • Bağlantı zaman aşımına uğradı<br>
            • Site proxy bağlantılarını engelliyor<br>
            • Cloudflare veya başka bir koruma aktif
          </p>
          <a href="/">← Ana Sayfaya Dön</a>
        </div>
      </body>
      </html>
    `);
  }
}
