const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');

const app = express();
const PORT = Number(process.env.PORT || 10000);
const HOST = '0.0.0.0';
const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID ||
  '406190338800-aok5c0rj9294tkr073cb2q0mtp7rjurn.apps.googleusercontent.com';
const SESSION_SECRET = process.env.DBH_SESSION_SECRET;
const SESSION_COOKIE = 'dbh_session';
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const GOOGLE_SYNC_URI =
  process.env.GOOGLE_SYNC_URI ||
  'https://cpgajlsyuieeengdnamy.supabase.co/functions/v1/dbh-google-sync';

if (!SESSION_SECRET) {
  console.warn(
    'DBH_SESSION_SECRET is not set. Google sign-in will return an error until it is configured.'
  );
}

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

app.disable('x-powered-by');
app.set('trust proxy', 1);
const ALLOWED_ORIGINS=new Set([
  'https://dbanjushomes.online',
  'https://www.dbanjushomes.online',
  'https://dbanjushomes-com.onrender.com',
  'https://dbanjushomes-auth-xsm3.onrender.com'
]);
app.use((req,res,next)=>{
  const origin=req.headers.origin;
  if(origin&&ALLOWED_ORIGINS.has(origin)){
    res.setHeader('Access-Control-Allow-Origin',origin);
    res.setHeader('Vary','Origin');
    res.setHeader('Access-Control-Allow-Credentials','true');
    res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  }
  if(req.method==='OPTIONS')return res.sendStatus(204);
  next();
});
app.use(express.json({ limit: '16kb' }));

const rateBuckets = new Map();
function rateLimit(key, limit = 20, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const current = rateBuckets.get(key);
  if (!current || now >= current.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  current.count += 1;
  return current.count > limit;
}

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function signSession(payload) {
  if (!SESSION_SECRET) throw new Error('DBH_SESSION_SECRET is not configured.');
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  const unsigned = header + '.' + body;
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(unsigned)
    .digest('base64url');
  return unsigned + '.' + signature;
}

function verifySession(token) {
  if (!SESSION_SECRET || !token) return null;
  const parts = String(token).split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const unsigned = header + '.' + body;
  const expected = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(unsigned)
    .digest('base64url');

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload?.sub || !payload?.exp || payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function readCookies(req) {
  const header = req.headers.cookie || '';
  return Object.fromEntries(
    header
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf('=');
        if (index < 0) return [part, ''];
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      })
  );
}

function getSession(req) {
  const cookies = readCookies(req);
  const cookieSession = verifySession(cookies[SESSION_COOKIE]);
  if (cookieSession) return cookieSession;

  const authorization = String(req.headers.authorization || '');
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match ? verifySession(match[1].trim()) : null;
}

function publicUser(session) {
  if (!session) return null;
  return {
    id: session.sub,
    provider: session.provider || 'google',
    name: session.name || session.email?.split('@')[0] || 'DBH User',
    email: session.email || '',
    picture: session.picture || '',
    emailVerified: session.emailVerified === true
  };
}

function sessionCookieOptions(req) {
  const secure =
    process.env.NODE_ENV === 'production' ||
    req.headers['x-forwarded-proto'] === 'https' ||
    req.secure === true;

  return {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS * 1000
  };
}

async function syncGoogleUser(credential) {
  const response = await fetch(GOOGLE_SYNC_URI, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ credential })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.success || !data?.user?.id) {
    throw new Error(
      data?.message || 'Google account could not be synchronized with DBH.'
    );
  }
  return data.user;
}

function setSessionCookie(req, res, session) {
  res.cookie(SESSION_COOKIE, session, sessionCookieOptions(req));
}

function clearSessionCookie(req, res) {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure:
      process.env.NODE_ENV === 'production' ||
      req.headers['x-forwarded-proto'] === 'https' ||
      req.secure === true,
    sameSite: 'lax',
    path: '/'
  });
}

function requireSession(req, res, next) {
  const session = getSession(req);
  if (!session) {
    return res.status(401).json({
      success: false,
      error: 'unauthenticated',
      message: 'Please sign in to continue.'
    });
  }
  req.dbhSession = session;
  next();
}

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    service: 'dbh',
    auth: 'google',
    sessionConfigured: Boolean(SESSION_SECRET)
  });
});

app.post('/api/auth/google', async (req, res) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  if (rateLimit('google:' + ip)) {
    return res.status(429).json({
      success: false,
      error: 'too_many_requests',
      message: 'Too many sign-in attempts. Please try again later.'
    });
  }

  const credential = String(req.body?.credential || '').trim();
  if (!credential) {
    return res.status(400).json({
      success: false,
      error: 'missing_credential',
      message: 'Google did not return a sign-in credential.'
    });
  }

  if (!SESSION_SECRET) {
    return res.status(500).json({
      success: false,
      error: 'server_not_configured',
      message: 'DBH authentication is not configured yet. Add DBH_SESSION_SECRET in Render.'
    });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();

    if (!payload?.sub || !payload.email) {
      throw new Error('Google account information is incomplete.');
    }

    if (payload.email_verified !== true) {
      return res.status(403).json({
        success: false,
        error: 'email_not_verified',
        message: 'Your Google email address must be verified before you can create a DBH account.'
      });
    }

    const syncedUser = await syncGoogleUser(credential);
    const now = Math.floor(Date.now() / 1000);
    const session = signSession({
      sub: syncedUser.id,
      googleSub: payload.sub,
      provider: 'google',
      email: payload.email,
      emailVerified: payload.email_verified === true,
      name: payload.name || payload.email.split('@')[0],
      picture: payload.picture || '',
      iat: now,
      exp: now + SESSION_TTL_SECONDS
    });

    setSessionCookie(req, res, session);

    const user = publicUser(verifySession(session));
    return res.json({
      success: true,
      authenticated: true,
      user,
      sessionToken: session
    });
  } catch (error) {
    console.error('DBH Google verification failed:', error?.message || error);
    return res.status(401).json({
      success: false,
      error: 'invalid_google_credential',
      message: 'Google sign-in could not be verified. Please try again.'
    });
  }
});

app.get('/api/auth/session', (req, res) => {
  const session = getSession(req);
  if (!session) {
    return res.status(401).json({
      success: false,
      authenticated: false,
      user: null
    });
  }

  res.json({
    success: true,
    authenticated: true,
    user: publicUser(session),
    sessionToken: String(req.headers.authorization || '').replace(/^Bearer\s+/i, '') || readCookies(req)[SESSION_COOKIE] || null
  });
});

app.post('/api/auth/logout', (req, res) => {
  clearSessionCookie(req, res);
  res.json({ success: true });
});

app.get('/api/dashboard', requireSession, (req, res) => {
  const user = publicUser(req.dbhSession);

  res.json({
    success: true,
    data: {
      user,
      stats: {
        saved: 0,
        enquiries: 0,
        notifications: 0,
        listings: 0
      },
      recentActivity: []
    }
  });
});

// Serve the DBH website from this Web Service too.
// This keeps https://dbanjushomes-auth-xsm3.onrender.com/dashboard.html
// fully functional while the same repository is also deployed as a Static Site.

/*
 * Dynamic property social-preview route.
 * Social crawlers (WhatsApp, Facebook, Telegram, etc.) do not execute
 * property.html's browser JavaScript, so the property image/title must be
 * present in the HTML returned by the server.
 */
const DBH_SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://cpgajlsyuieeengdnamy.supabase.co';
const DBH_SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  'sb_publishable_fbcJT-QGKyZg0tDkpbDkOQ_CcQf2ugW';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function propertyPreviewUrl(req, property) {
  const base = 'https://dbanjushomes.online/property.html';
  if (property?.slug) return base + '?slug=' + encodeURIComponent(property.slug);
  if (property?.property_code) return base + '?id=' + encodeURIComponent(property.property_code);
  return base + '?id=' + encodeURIComponent(property?.id || '');
}

async function loadPropertyForPreview(req) {
  const id = String(req.query?.id || '').trim();
  const slug = String(req.query?.slug || '').trim();
  let filter = '';

  if (slug) {
    filter = 'slug=eq.' + encodeURIComponent(slug);
  } else if (id) {
    filter = id.toUpperCase().startsWith('DBH-')
      ? 'property_code=eq.' + encodeURIComponent(id)
      : 'id=eq.' + encodeURIComponent(id);
  } else {
    return null;
  }

  const url =
    DBH_SUPABASE_URL +
    '/rest/v1/properties?select=id,title,slug,property_code,description,seo_description,og_image_url,is_published,verification_status&' +
    filter +
    '&is_published=eq.true&limit=1';

  const response = await fetch(url, {
    headers: {
      apikey: DBH_SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + DBH_SUPABASE_ANON_KEY,
      Accept: 'application/json'
    }
  });

  if (!response.ok) return null;
  const rows = await response.json();
  const property = Array.isArray(rows) ? rows[0] || null : null;
  if (!property?.id) return null;

  // Fetch images separately so social previews still work even if the
  // nested PostgREST relationship is unavailable on the public API.
  const imagesResponse = await fetch(
    DBH_SUPABASE_URL +
      '/rest/v1/property_images?select=image_url,sort_order&property_id=eq.' +
      encodeURIComponent(property.id) +
      '&order=sort_order.asc',
    {
      headers: {
        apikey: DBH_SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + DBH_SUPABASE_ANON_KEY,
        Accept: 'application/json'
      }
    }
  );
  property.property_images = imagesResponse.ok
    ? await imagesResponse.json().catch(() => [])
    : [];
  return property;
}

app.get('/property.html', async (req, res, next) => {
  try {
    const file = path.join(__dirname, 'property.html');
    let html = require('fs').readFileSync(file, 'utf8');
    const property = await loadPropertyForPreview(req);

    if (!property) return res.send(html);

    const images = Array.isArray(property.property_images)
      ? property.property_images
          .slice()
          .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
          .map(item => item?.image_url)
          .filter(Boolean)
      : [];

    const image = images[0] || property.og_image_url || 'https://dbanjushomes.online/dbh-logo.jpg';
    const title = property.title
      ? property.title + ' | DBH — D Banjus Homes Nig Ltd'
      : 'Property | DBH — D Banjus Homes Nig Ltd';
    const description = String(
      property.seo_description || property.description || 'View this property on D Banjus Homes Nig Ltd.'
    ).replace(/\s+/g, ' ').trim().slice(0, 300);
    const shareUrl = propertyPreviewUrl(req, property);

    const replaceMeta = (id, attrs) => {
      const pattern = new RegExp('<meta id="' + id + '"[^>]*>', 'i');
      html = html.replace(pattern, '<meta id="' + id + '"' + attrs + '>');
    };

    replaceMeta('meta-description', ' name="description" content="' + escapeHtml(description) + '"');
    replaceMeta('og-title', ' property="og:title" content="' + escapeHtml(title) + '"');
    replaceMeta('og-description', ' property="og:description" content="' + escapeHtml(description) + '"');
    replaceMeta('og-image', ' property="og:image" content="' + escapeHtml(image) + '"');

    html = html.replace(
      /<link rel="canonical" id="canonical-url" href="[^"]*">/i,
      '<link rel="canonical" id="canonical-url" href="' + escapeHtml(shareUrl) + '">'
    );

    const socialTags =
      '<meta property="og:url" content="' + escapeHtml(shareUrl) + '">' +
      '<meta property="og:site_name" content="D Banjus Homes Nig Ltd">' +
      '<meta property="og:image:secure_url" content="' + escapeHtml(image) + '">' +
      '<meta property="og:image:alt" content="' + escapeHtml(title) + '">' +
      '<meta name="twitter:card" content="summary_large_image">' +
      '<meta name="twitter:title" content="' + escapeHtml(title) + '">' +
      '<meta name="twitter:description" content="' + escapeHtml(description) + '">' +
      '<meta name="twitter:image" content="' + escapeHtml(image) + '">';

    html = html.replace('</head>', socialTags + '</head>');
    return res.type('html').send(html);
  } catch (error) {
    console.error('DBH property social preview:', error?.message || error);
    return next();
  }
});

app.use(express.static(path.join(__dirname), {
  extensions: ['html'],
  maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0
}));

app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      error: 'not_found',
      message: 'DBH API endpoint not found.'
    });
  }

  res.status(404).sendFile(path.join(__dirname, '404.html'), (err) => {
    if (err) res.status(404).send('Page not found');
  });
});

app.listen(PORT, HOST, () => {
  console.log('DBH server listening on ' + HOST + ':' + PORT);
});
