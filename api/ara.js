export default async function handler(req, res) {
  const { site } = req.query;
  
  if (!site) {
    return res.status(400).send('Site adresi gerekli');
  }
  
  let siteUrl = site;
  
  // https:// yoksa ekle
  if (!siteUrl.startsWith('http')) {
    siteUrl = 'https://' + siteUrl;
  }
  
  try {
    const response = await fetch(siteUrl, {
      headers: {
        'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0'
      }
    });
    
    const contentType = response.headers.get('Content-Type') || 'text/html';
    let data = await response.text();
    
    // HTML ise linkleri düzelt
    if (contentType.includes('text/html')) {
      // Mutlak URL'leri proxy üzerinden yönlendir
      data = data.replace(
        /(href|src)="https?:\/\/([^"]+)"/gi,
        (match, attr, url) => `${attr}="/api/ara?site=https://${url}"`
      );
      
      // Göreceli URL'leri düzelt
      const baseUrl = new URL(siteUrl);
      data = data.replace(
        /(href|src)="\/([^"]+)"/gi,
        (match, attr, path) => `${attr}="/api/ara?site=${baseUrl.origin}/${path}"`
      );
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(response.status).send(data);
    
  } catch (error) {
    res.status(500).send(`
      <html>
        <body>
          <h2>Hata Oluştu</h2>
          <p>${error.message}</p>
          <a href="/">Geri Dön</a>
        </body>
      </html>
    `);
  }
}
