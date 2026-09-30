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

if (!SESSION_SECRET) {
  console.warn(
    'DBH_SESSION_SECRET is not set. Google sign-in will return an error until it is configured.'
  );
}

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

app.disable('x-powered-by');
app.set('trust proxy', 1);
const ALLOWED_ORIGINS=new Set([
  'https://dbanjushomes.com',
  'https://www.dbanjushomes.com',
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
  const match = authorization.match(/^Bearer\\s+(.+)$/i);
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

    const now = Math.floor(Date.now() / 1000);
    const session = signSession({
      sub: 'google:' + payload.sub,
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
    user: publicUser(session)
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
