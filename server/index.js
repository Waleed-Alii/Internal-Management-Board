import cors from 'cors';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import express from 'express';
import jwt from 'jsonwebtoken';
import { Client } from 'ldapts';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const nodeEnv = process.env.NODE_ENV ?? 'development';
const isProduction = nodeEnv === 'production';
const port = Number(process.env.PORT ?? 8787);
const allowedOrigins = (process.env.ALLOWED_ORIGIN ?? 'http://127.0.0.1:5173,http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const jwtSecret = process.env.JWT_SECRET;
const ldapUrl = process.env.LDAP_URL;
const ldapBaseDn = process.env.LDAP_BASE_DN;
const ldapBindDn = process.env.LDAP_BIND_DN;
const ldapBindPassword = process.env.LDAP_BIND_PASSWORD;
const ldapLoginDomain = process.env.LDAP_LOGIN_DOMAIN ?? 'aqma.com';
const rejectUnauthorized = process.env.LDAP_TLS_REJECT_UNAUTHORIZED !== 'false';
const allowInsecureLdap = process.env.LDAP_ALLOW_INSECURE === 'true' && !isProduction;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sessionCookieName = process.env.SESSION_COOKIE_NAME ?? 'aqma_session';
const csrfHeaderName = 'x-csrf-token';
const sessionTtlSeconds = Number(process.env.SESSION_TTL_SECONDS ?? 8 * 60 * 60);
const sessionCookieSecure = process.env.SESSION_COOKIE_SECURE
  ? process.env.SESSION_COOKIE_SECURE === 'true'
  : isProduction;
const sessionCookieSameSite = process.env.SESSION_COOKIE_SAMESITE ?? 'Lax';
const appAccessGroupDns = parseDnSet(process.env.APP_ACCESS_GROUP_DN);
const adminGroupDns = parseDnSet(process.env.ADMIN_LDAP_GROUP_DN);
const directoryReadGroupDns = parseDnSet(process.env.DIRECTORY_READ_GROUP_DN ?? process.env.ADMIN_LDAP_GROUP_DN);
const supabaseConfigured = Boolean(
  supabaseUrl
  && supabaseServiceRoleKey
  && !supabaseUrl.includes('your-project-ref')
  && !supabaseServiceRoleKey.startsWith('replace-'),
);
const hiddenDirectoryUsernames = new Set(['administrator', 'guest', 'krbtgt', 'test']);
const authProfileCache = new Map();
const authProfileCacheTtlMs = 5 * 60 * 1000;
const authProfileCacheMaxEntries = 500;
const loginAttempts = new Map();
const loginWindowMs = 15 * 60 * 1000;
const loginMaxAttempts = 8;
const loginAttemptMaxEntries = 2000;
const maxFileBytes = 8 * 1024 * 1024;
const maxCommentLength = 5000;
const maxTicketTextLengths = {
  title: 200,
  description: 20000,
  owner: 200,
  assigned_to: 200,
  priority: 20,
  project: 120,
  tag: 80,
  due: 80,
  estimate: 80,
};
const allowedTicketStatuses = new Set(['todo', 'progress', 'assistance', 'blocked', 'done', 'backlog']);
const allowedPriorities = new Set(['low', 'medium', 'high']);
const blockedUploadExtensions = new Set(['.bat', '.cmd', '.com', '.exe', '.hta', '.html', '.htm', '.js', '.mjs', '.ps1', '.scr', '.svg', '.vbs']);
const blockedUploadMimeTypes = new Set(['image/svg+xml', 'text/html', 'application/javascript', 'text/javascript']);
const allowedUploadMimeTypes = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
]);
const allowedPreferenceThemes = new Set(['light', 'dark']);
const allowedPreferenceWallpapers = new Set(['default', 'aurora', 'mist']);
const allowedNavigationTabs = new Set(['dashboard', 'board', 'analytics', 'profile']);
const allowedNavigationSubmenus = {
  dashboard: new Set(['overview', 'activity']),
  board: new Set(['kanban', 'backlog']),
  analytics: new Set(['metrics', 'charts']),
  profile: new Set(['profile-settings', 'app-settings']),
};
let supportsAssignedToUsername = true;
let supportsAtomicTicketIds = true;

function parseDnSet(value) {
  return new Set(
    String(value ?? '')
      .split(';')
      .map((dn) => dn.trim().toLowerCase())
      .filter(Boolean),
  );
}

function isHiddenDirectoryProfile(profile) {
  const username = String(profile?.username ?? '').trim().toLowerCase();
  const identity = `${profile?.username ?? ''} ${profile?.displayName ?? ''} ${profile?.email ?? ''}`
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
  return hiddenDirectoryUsernames.has(username) || identity.includes('ldapbind');
}
const supabase = supabaseConfigured
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

const requiredEnv = {
  JWT_SECRET: jwtSecret,
  LDAP_URL: ldapUrl,
  LDAP_BASE_DN: ldapBaseDn,
  LDAP_BIND_DN: ldapBindDn,
  LDAP_BIND_PASSWORD: ldapBindPassword,
};

for (const [name, value] of Object.entries(requiredEnv)) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}
if (jwtSecret.length < 32 || jwtSecret.startsWith('replace-')) {
  throw new Error('JWT_SECRET must contain at least 32 random characters.');
}
if (!Number.isInteger(sessionTtlSeconds) || sessionTtlSeconds < 300 || sessionTtlSeconds > 86_400) {
  throw new Error('SESSION_TTL_SECONDS must be an integer between 300 and 86400.');
}
if (!['Strict', 'Lax', 'None'].includes(sessionCookieSameSite)) {
  throw new Error('SESSION_COOKIE_SAMESITE must be Strict, Lax, or None.');
}
if (isProduction && !ldapUrl.startsWith('ldaps://')) {
  throw new Error('LDAP_URL must use ldaps:// in production.');
}
if (!isProduction && !ldapUrl.startsWith('ldaps://') && !allowInsecureLdap) {
  console.warn('LDAP_URL is not using ldaps://. This is allowed only outside production.');
}
if (isProduction && !sessionCookieSecure) {
  throw new Error('SESSION_COOKIE_SECURE must be true in production.');
}
if (sessionCookieSameSite === 'None' && !sessionCookieSecure) {
  throw new Error('SESSION_COOKIE_SAMESITE=None requires SESSION_COOKIE_SECURE=true.');
}
if (Boolean(supabaseUrl) !== Boolean(supabaseServiceRoleKey)) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured together.');
}

app.use((request, response, next) => {
  request.id = crypto.randomUUID();
  response.set('X-Request-ID', request.id);
  next();
});
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '12mb' }));
app.disable('x-powered-by');
app.use((_request, response, next) => {
  response.set({
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
  });
  next();
});

const ticketFilesBucket = 'ticket-files';
let ticketFilesBucketPromise = null;

function normalizeUsername(value) {
  return String(value ?? '').trim().toLowerCase();
}

function setCachedProfile(username, profile) {
  const key = normalizeUsername(username);
  if (!key) return;
  const now = Date.now();
  for (const [cachedUsername, cached] of authProfileCache) {
    if (cached.expiresAt <= now) authProfileCache.delete(cachedUsername);
  }
  if (!authProfileCache.has(key) && authProfileCache.size >= authProfileCacheMaxEntries) {
    authProfileCache.delete(authProfileCache.keys().next().value);
  }
  authProfileCache.set(key, { profile, expiresAt: now + authProfileCacheTtlMs });
}

function loginAttemptKey(request, username) {
  return `${request.ip ?? request.socket?.remoteAddress ?? 'unknown'}:${normalizeUsername(username)}`;
}

function requestIp(request) {
  return request.ip ?? request.socket?.remoteAddress ?? 'unknown';
}

function audit(request, event, details = {}) {
  const actor = request.auth?.username ?? details.username ?? 'anonymous';
  console.log(JSON.stringify({
    level: 'info',
    type: 'audit',
    event,
    requestId: request.id,
    actor,
    ip: requestIp(request),
    method: request.method,
    path: request.originalUrl,
    time: new Date().toISOString(),
    ...details,
  }));
}

const rateLimitBuckets = new Map();

function rateLimit({ windowMs, max, keyPrefix, message }) {
  return (request, response, next) => {
    const key = `${keyPrefix}:${requestIp(request)}:${request.auth?.username ?? ''}`;
    const now = Date.now();
    for (const [bucketKey, bucket] of rateLimitBuckets) {
      if (bucket.resetAt <= now) rateLimitBuckets.delete(bucketKey);
    }
    const bucket = rateLimitBuckets.get(key) ?? { count: 0, resetAt: now + windowMs };
    bucket.count += 1;
    rateLimitBuckets.set(key, bucket);
    response.set({
      'RateLimit-Limit': String(max),
      'RateLimit-Remaining': String(Math.max(0, max - bucket.count)),
      'RateLimit-Reset': String(Math.ceil(bucket.resetAt / 1000)),
    });
    if (bucket.count > max) {
      response.set('Retry-After', String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
      audit(request, 'rate_limit_blocked', { keyPrefix });
      response.status(429).json({ error: message ?? 'Too many requests. Try again later.' });
      return;
    }
    next();
  };
}

const generalApiRateLimit = rateLimit({
  windowMs: 60_000,
  max: Number(process.env.API_RATE_LIMIT_PER_MINUTE ?? 240),
  keyPrefix: 'api',
});
const uploadRateLimit = rateLimit({
  windowMs: 60_000,
  max: Number(process.env.UPLOAD_RATE_LIMIT_PER_MINUTE ?? 20),
  keyPrefix: 'upload',
  message: 'Too many uploads. Try again later.',
});
app.use('/api', generalApiRateLimit);

function getLoginAttemptState(key) {
  const now = Date.now();
  for (const [attemptKey, state] of loginAttempts) {
    if (state.resetAt <= now) loginAttempts.delete(attemptKey);
  }
  if (loginAttempts.size >= loginAttemptMaxEntries && !loginAttempts.has(key)) {
    loginAttempts.delete(loginAttempts.keys().next().value);
  }
  return loginAttempts.get(key);
}

function recordFailedLogin(key) {
  const now = Date.now();
  const current = getLoginAttemptState(key);
  loginAttempts.set(key, current
    ? { count: current.count + 1, resetAt: current.resetAt }
    : { count: 1, resetAt: now + loginWindowMs });
}

function requireTicketId(request, response) {
  const ticketId = String(request.params.ticketId ?? '').trim().toUpperCase();
  if (!/^AQMA-\d{4,}$/.test(ticketId)) {
    response.status(400).json({ error: 'Invalid ticket ID.' });
    return null;
  }
  return ticketId;
}

function isMissingRow(error) {
  return error?.code === 'PGRST116';
}

function isMissingAssignedToUsernameColumn(error) {
  const message = String(error?.message ?? '').toLowerCase();
  return error?.code === 'PGRST204' && message.includes('assigned_to_username')
    || message.includes("'assigned_to_username' column")
    || message.includes('column tickets.assigned_to_username does not exist');
}

function isMissingAtomicTicketIdFunction(error) {
  const message = String(error?.message ?? '').toLowerCase();
  return error?.code === 'PGRST202' || message.includes('allocate_aqma_ticket_id');
}

function validateTicketPayload(ticket) {
  const issues = [];
  for (const [field, limit] of Object.entries(maxTicketTextLengths)) {
    if (String(ticket[field] ?? '').length > limit) issues.push(`${field} exceeds ${limit} characters`);
  }
  if (!allowedTicketStatuses.has(ticket.status)) issues.push('status is invalid');
  if (!allowedPriorities.has(String(ticket.priority).toLowerCase())) issues.push('priority is invalid');
  if (!Number.isFinite(ticket.progress) || ticket.progress < 0 || ticket.progress > 100) issues.push('progress must be between 0 and 100');
  return issues;
}

function sanitizePreferences(value) {
  const raw = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const rawNavigation = raw.navigation && typeof raw.navigation === 'object' ? raw.navigation : {};
  const activeTab = allowedNavigationTabs.has(rawNavigation.activeTab) ? rawNavigation.activeTab : 'dashboard';
  const activeSubmenus = {};
  for (const [tab, allowed] of Object.entries(allowedNavigationSubmenus)) {
    const candidate = rawNavigation.activeSubmenus?.[tab];
    activeSubmenus[tab] = allowed.has(candidate) ? candidate : allowed.values().next().value;
  }

  let avatar = { type: 'preset', value: 'blue' };
  if (raw.avatar?.type === 'preset' && ['blue', 'mint', 'rose', 'violet'].includes(raw.avatar.value)) {
    avatar = { type: 'preset', value: raw.avatar.value };
  } else if (
    raw.avatar?.type === 'image'
    && typeof raw.avatar.value === 'string'
    && /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(raw.avatar.value)
    && raw.avatar.value.length <= 750_000
  ) {
    avatar = { type: 'image', value: raw.avatar.value };
  }

  return {
    theme: allowedPreferenceThemes.has(raw.theme) ? raw.theme : 'light',
    wallpaper: allowedPreferenceWallpapers.has(raw.wallpaper) ? raw.wallpaper : 'default',
    avatar,
    navigation: {
      activeTab,
      activeSubmenus,
    },
  };
}

function isMissingPreferencesTable(error) {
  const message = String(error?.message ?? '').toLowerCase();
  return error?.code === '42P01' || error?.code === 'PGRST205' || message.includes('user_preferences');
}

function requireSupabase(response) {
  if (supabase) return true;

  response.status(503).json({
    error: 'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the backend.',
  });
  return false;
}

function ensureTicketFilesBucket() {
  if (!ticketFilesBucketPromise) {
    ticketFilesBucketPromise = (async () => {
      const { data } = await supabase.storage.getBucket(ticketFilesBucket);
      if (data) return;
      const { error } = await supabase.storage.createBucket(ticketFilesBucket, {
        public: false,
        fileSizeLimit: 8 * 1024 * 1024,
      });
      if (error && !error.message.toLowerCase().includes('already exists')) throw error;
    })().catch((error) => {
      ticketFilesBucketPromise = null;
      throw error;
    });
  }
  return ticketFilesBucketPromise;
}

function originalStorageFileName(storageName) {
  const separator = storageName.indexOf('--');
  const encodedName = separator >= 0 ? storageName.slice(separator + 2) : storageName;
  try {
    return decodeURIComponent(encodedName);
  } catch {
    return encodedName;
  }
}

async function storageFileToCard(ticketId, file) {
  const path = `${ticketId}/${file.name}`;
  const { data, error } = await supabase.storage.from(ticketFilesBucket).createSignedUrl(path, 15 * 60);
  if (error) throw error;
  return {
    id: path,
    name: originalStorageFileName(file.name),
    size: Number(file.metadata?.size ?? 0),
    type: file.metadata?.mimetype ?? 'application/octet-stream',
    url: data.signedUrl,
  };
}

async function loadTicketFileCards(ticketId) {
  await ensureTicketFilesBucket();
  const { data, error } = await supabase.storage.from(ticketFilesBucket).list(ticketId, {
    limit: 100,
    sortBy: { column: 'created_at', order: 'asc' },
  });
  if (error) throw error;
  return Promise.all((data ?? []).filter((file) => file.name).map((file) => storageFileToCard(ticketId, file)));
}

function parseCookies(header) {
  return Object.fromEntries(
    String(header ?? '')
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf('=');
        if (separator < 0) return [part, ''];
        return [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
      }),
  );
}

function cookieAttributes({ maxAge = sessionTtlSeconds } = {}) {
  return [
    'HttpOnly',
    'Path=/',
    `SameSite=${sessionCookieSameSite}`,
    sessionCookieSecure ? 'Secure' : '',
    maxAge === 0 ? 'Max-Age=0' : `Max-Age=${maxAge}`,
  ].filter(Boolean).join('; ');
}

function setSessionCookie(response, token) {
  response.set('Set-Cookie', `${sessionCookieName}=${encodeURIComponent(token)}; ${cookieAttributes()}`);
}

function clearSessionCookie(response) {
  response.set('Set-Cookie', `${sessionCookieName}=; ${cookieAttributes({ maxAge: 0 })}`);
}

function createSessionToken(profile) {
  const csrfToken = crypto.randomBytes(32).toString('base64url');
  const token = jwt.sign(
    {
      sub: profile.dn,
      username: profile.username,
      csrf: csrfToken,
    },
    jwtSecret,
    { expiresIn: sessionTtlSeconds },
  );
  return { token, csrfToken };
}

function getSessionToken(request) {
  const cookies = parseCookies(request.get('cookie'));
  if (cookies[sessionCookieName]) return cookies[sessionCookieName];
  const header = request.get('authorization') ?? '';
  return header.startsWith('Bearer ') ? header.slice(7) : '';
}

function requiresCsrf(request) {
  return !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
}

function isGroupMember(profile, groupDns) {
  if (groupDns.size === 0) return false;
  const userGroups = new Set((profile?.groups ?? []).map((dn) => String(dn).trim().toLowerCase()));
  return Array.from(groupDns).some((dn) => userGroups.has(dn));
}

function canAccessApp(profile) {
  return appAccessGroupDns.size === 0 || isGroupMember(profile, appAccessGroupDns) || canReadAllTickets({ profile });
}

function canReadAllTickets(actor) {
  return isGroupMember(actor?.profile, adminGroupDns);
}

function canReadDirectory(actor) {
  return Boolean(actor?.username) || isGroupMember(actor?.profile, directoryReadGroupDns) || canReadAllTickets(actor);
}

function canReadTicket(ticket, actor) {
  return Boolean(actor?.username) || canReadAllTickets(actor) || canOperateOnTicket(ticket, actor);
}

async function requireAuth(request, response, next) {
  const token = getSessionToken(request);

  if (!token) {
    response.status(401).json({ error: 'Missing session.' });
    return;
  }

  try {
    const payload = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
    if (typeof payload !== 'object' || typeof payload.username !== 'string' || !payload.username.trim()) {
      throw new Error('Invalid token payload.');
    }
    if (requiresCsrf(request) && request.get(csrfHeaderName) !== payload.csrf) {
      audit(request, 'csrf_rejected', { username: payload.username });
      response.status(403).json({ error: 'Invalid CSRF token.' });
      return;
    }
    const cacheKey = normalizeUsername(payload.username);
    const cached = authProfileCache.get(cacheKey);
    let profile = cached?.expiresAt > Date.now() ? cached.profile : null;

    if (!profile) {
      const user = await findUser(payload.username);
      if (!user) {
        response.status(404).json({ error: 'User not found.' });
        return;
      }
      profile = toProfile(user);
      if (isHiddenDirectoryProfile(profile)) {
        response.status(403).json({ error: 'Account is not allowed to access this application.' });
        return;
      }
      if (!canAccessApp(profile)) {
        response.status(403).json({ error: 'Account is not authorized for this application.' });
        return;
      }
      setCachedProfile(payload.username, profile);
    }

    request.auth = {
      username: payload.username,
      profile,
      csrfToken: payload.csrf,
    };
    next();
  } catch {
    response.status(401).json({ error: 'Invalid or expired token.' });
  }
}

function ticketRowToCard(row) {
  const comments = row.ticket_comments ?? [];

  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    owner: row.owner,
    ownerUsername: row.owner_username,
    assignedTo: row.assigned_to ?? '',
    assignedToUsername: row.assigned_to_username ?? '',
    priority: row.priority ? `${String(row.priority).charAt(0).toUpperCase()}${String(row.priority).slice(1).toLowerCase()}` : '',
    project: row.project ?? '',
    tag: row.tag ?? '',
    status: row.status,
    due: row.due ?? 'Unscheduled',
    progress: row.progress ?? 0,
    estimate: row.estimate ?? '',
    comments: comments.length,
    commentList: comments.map((comment) => ({
      id: comment.id,
      author: comment.author,
      text: comment.body,
      createdAt: comment.created_at,
    })),
    files: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function sanitizeTicketPayload(body, actor, existing = {}) {
  const status = String(body?.status ?? body?.columnId ?? existing.status ?? 'todo').trim().toLowerCase() || 'todo';

  return {
    id: String(body?.id ?? body?.ticketId ?? existing.id ?? '').trim(),
    title: String(body?.title ?? existing.title ?? '').trim(),
    description: String(body?.description ?? existing.description ?? '').trim(),
    owner: String(body?.owner ?? existing.owner ?? actor.profile.displayName ?? actor.username).trim(),
    owner_username: String(existing.owner_username ?? actor.username).trim(),
    assigned_to: String(body?.assignedTo ?? body?.assigned_to ?? existing.assigned_to ?? '').trim(),
    assigned_to_username: String(body?.assignedToUsername ?? body?.assigned_to_username ?? existing.assigned_to_username ?? '').trim(),
    priority: String(body?.priority ?? existing.priority ?? '').trim().toLowerCase(),
    project: String(body?.project ?? existing.project ?? '').trim(),
    tag: String(body?.tag ?? existing.tag ?? '').trim(),
    status,
    due: String(body?.due ?? existing.due ?? 'Unscheduled').trim(),
    progress: status === 'done' ? 100 : Number(body?.progress ?? existing.progress ?? 0),
    estimate: String(body?.estimate ?? existing.estimate ?? '').trim(),
    created_by: String(existing.created_by ?? actor.username),
  };
}

function validateRequiredTicketFields(ticket) {
  const requiredFields = [
    ['title', 'Card title'],
    ['description', 'Card description'],
    ['owner', 'Opened by'],
    ['owner_username', 'Opened by'],
    ['assigned_to', 'Assigned to'],
    ['priority', 'Priority'],
    ['tag', 'Task type'],
    ['project', 'Epic'],
    ['status', 'Status'],
  ];
  const missing = requiredFields
    .filter(([field]) => !String(ticket[field] ?? '').trim())
    .map(([, label]) => label);

  return Array.from(new Set(missing));
}

function sniffMimeType(bytes) {
  if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return 'application/pdf';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (
    bytes.length >= 8
    && bytes[0] === 0x89
    && bytes[1] === 0x50
    && bytes[2] === 0x4e
    && bytes[3] === 0x47
    && bytes[4] === 0x0d
    && bytes[5] === 0x0a
    && bytes[6] === 0x1a
    && bytes[7] === 0x0a
  ) return 'image/png';
  if (
    bytes.length >= 12
    && bytes.slice(0, 4).toString('ascii') === 'RIFF'
    && bytes.slice(8, 12).toString('ascii') === 'WEBP'
  ) return 'image/webp';
  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) return 'application/zip';
  if (bytes.every((byte) => byte === 0x09 || byte === 0x0a || byte === 0x0d || (byte >= 0x20 && byte !== 0x7f))) return 'text/plain';
  return 'application/octet-stream';
}

function isAllowedUploadContent(bytes, claimedType, extension) {
  if (!allowedUploadMimeTypes.has(claimedType)) return false;
  const detectedType = sniffMimeType(bytes);
  if (claimedType === 'text/plain') return detectedType === 'text/plain';
  if (claimedType.startsWith('image/') || claimedType === 'application/pdf') return detectedType === claimedType;
  if (extension === '.docx' || extension === '.xlsx' || extension === '.pptx') return detectedType === 'application/zip';
  return false;
}

function canOperateOnTicket(ticket, actor) {
  const actorName = String(actor.profile?.displayName ?? actor.profile?.firstName ?? '').trim().toLowerCase();
  const assignedName = String(ticket.assigned_to ?? '').trim().toLowerCase();
  return (
    normalizeUsername(ticket.owner_username) === normalizeUsername(actor.username) ||
    normalizeUsername(ticket.assigned_to_username) === normalizeUsername(actor.username) ||
    Boolean(actorName && assignedName && actorName === assignedName)
  );
}

function nextTicketIdFromRows(rows) {
  const maxId = rows.reduce((max, row) => {
    const match = /^AQMA-(\d+)$/i.exec(row.id);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);

  return `AQMA-${String(maxId + 1).padStart(4, '0')}`;
}

async function insertTicketWithGeneratedId(ticket) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    let allocatedId = '';
    if (supportsAtomicTicketIds) {
      const { data, error } = await supabase.rpc('allocate_aqma_ticket_id');
      if (error && isMissingAtomicTicketIdFunction(error)) {
        supportsAtomicTicketIds = false;
      } else if (error) {
        throw error;
      } else {
        allocatedId = String(data ?? '');
      }
    }
    if (!allocatedId) {
      const { data: existingRows, error: idError } = await supabase.from('tickets').select('id');
      if (idError) throw idError;
      allocatedId = nextTicketIdFromRows(existingRows ?? []);
    }

    const insertPayload = {
      ...ticket,
      id: allocatedId,
    };
    if (!supportsAssignedToUsername) delete insertPayload.assigned_to_username;
    let { data, error } = await supabase
      .from('tickets')
      .insert(insertPayload)
      .select('*, ticket_comments(id, author, author_username, body, created_at)')
      .single();

    if (isMissingAssignedToUsernameColumn(error)) {
      supportsAssignedToUsername = false;
      const compatiblePayload = { ...insertPayload };
      delete compatiblePayload.assigned_to_username;
      ({ data, error } = await supabase
        .from('tickets')
        .insert(compatiblePayload)
        .select('*, ticket_comments(id, author, author_username, body, created_at)')
        .single());
    }

    if (!error) {
      return {
        data,
        assignedToUsername: insertPayload.assigned_to_username,
      };
    }

    if (error.code !== '23505') throw error;
  }

  throw new Error('Unable to allocate a unique card number.');
}

function normalizeEpicName(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

async function ensureEpicName(project) {
  const name = normalizeEpicName(project);
  if (!name) return '';

  const { data: existingEpics, error: loadError } = await supabase
    .from('epics')
    .select('id, name');

  if (loadError) {
    console.error('Supabase epic load failed:', loadError.message);
    throw new Error('Unable to check epics.');
  }

  const existing = (existingEpics ?? []).find((epic) => epic.name.trim().toLowerCase() === name.toLowerCase());
  if (existing) return existing.name;

  const { data, error } = await supabase
    .from('epics')
    .insert({ name })
    .select('name')
    .single();

  if (error?.code === '23505') {
    const { data: concurrentEpic, error: concurrentLoadError } = await supabase
      .from('epics')
      .select('name')
      .ilike('name', name)
      .limit(1)
      .single();
    if (!concurrentLoadError && concurrentEpic) return concurrentEpic.name;
  }

  if (error) {
    console.error('Supabase epic create failed:', error.message);
    throw new Error('Unable to create epic.');
  }

  return data.name;
}

function createLdapClient() {
  const options = {
    url: ldapUrl,
    timeout: 8000,
    connectTimeout: 8000,
  };

  if (ldapUrl.startsWith('ldaps://')) {
    options.tlsOptions = {
      rejectUnauthorized,
    };
  }

  return new Client(options);
}

function escapeLdapFilter(value) {
  return String(value).replace(/[\\*()\0]/g, (char) => {
    const escapes = {
      '\\': '\\5c',
      '*': '\\2a',
      '(': '\\28',
      ')': '\\29',
      '\0': '\\00',
    };
    return escapes[char];
  });
}

function normalizeLogin(input) {
  const raw = String(input ?? '').trim();
  const withoutDomain = raw.includes('\\') ? raw.split('\\').at(-1) : raw;
  const account = withoutDomain.includes('@') ? withoutDomain.split('@')[0] : withoutDomain;

  return {
    raw,
    account,
    upn: withoutDomain.includes('@') ? withoutDomain : `${account}@${ldapLoginDomain}`,
  };
}

function firstAttribute(value) {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

function toProfile(entry) {
  const givenName = firstAttribute(entry.givenName);
  const displayName = firstAttribute(entry.displayName);
  const accountName = firstAttribute(entry.sAMAccountName);
  const firstName =
    givenName ||
    displayName.split(/\s+/).filter(Boolean)[0] ||
    accountName ||
    'User';

  return {
    id: firstAttribute(entry.objectGUID) || entry.dn,
    dn: entry.dn,
    username: accountName,
    firstName,
    lastName: firstAttribute(entry.sn),
    displayName: displayName || firstName,
    email: firstAttribute(entry.mail) || firstAttribute(entry.userPrincipalName),
    phone: firstAttribute(entry.telephoneNumber),
    role: firstAttribute(entry.title),
    employeeId: firstAttribute(entry.employeeID),
    department: firstAttribute(entry.department),
    company: firstAttribute(entry.company),
    description: firstAttribute(entry.description),
    office: firstAttribute(entry.physicalDeliveryOfficeName),
    managerDn: firstAttribute(entry.manager),
    groups: Array.isArray(entry.memberOf)
      ? entry.memberOf.map(String)
      : firstAttribute(entry.memberOf)
        ? [String(firstAttribute(entry.memberOf))]
        : [],
  };
}

async function findUser(login) {
  const client = createLdapClient();
  const normalized = normalizeLogin(login);
  const raw = escapeLdapFilter(normalized.raw);
  const account = escapeLdapFilter(normalized.account);
  const upn = escapeLdapFilter(normalized.upn);

  try {
    await client.bind(ldapBindDn, ldapBindPassword);
    const { searchEntries } = await client.search(ldapBaseDn, {
      scope: 'sub',
      filter: `(&(objectCategory=person)(objectClass=user)(|(sAMAccountName=${account})(userPrincipalName=${upn})(userPrincipalName=${raw})(mail=${raw})))`,
      attributes: [
        'dn',
        'objectGUID',
        'sAMAccountName',
        'userPrincipalName',
        'givenName',
        'sn',
        'displayName',
        'mail',
        'telephoneNumber',
        'title',
        'employeeID',
        'department',
        'company',
        'description',
        'physicalDeliveryOfficeName',
        'manager',
        'memberOf',
      ],
      sizeLimit: 2,
    });

    return searchEntries[0] ?? null;
  } finally {
    await client.unbind().catch(() => {});
  }
}

async function findTeamUsers() {
  const client = createLdapClient();

  try {
    await client.bind(ldapBindDn, ldapBindPassword);
    const { searchEntries } = await client.search(ldapBaseDn, {
      scope: 'sub',
      filter: '(&(objectCategory=person)(objectClass=user))',
      attributes: [
        'dn',
        'objectGUID',
        'sAMAccountName',
        'userPrincipalName',
        'givenName',
        'sn',
        'displayName',
        'mail',
        'telephoneNumber',
        'title',
        'employeeID',
        'department',
        'company',
        'description',
        'physicalDeliveryOfficeName',
        'manager',
        'memberOf',
      ],
      sizeLimit: 500,
    });

    return searchEntries
      .map(toProfile)
      .filter((profile) => profile.username && !isHiddenDirectoryProfile(profile))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  } finally {
    await client.unbind().catch(() => {});
  }
}

async function resolveTicketUser(value, label) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    throw new Error(`${label} is required.`);
  }

  const user = await findUser(raw);
  if (!user) {
    throw new Error(`${label} must be an LDAP user.`);
  }

  const profile = toProfile(user);
  return {
    name: profile.displayName || profile.firstName || profile.username,
    username: profile.username,
  };
}

async function authenticateUser(userDn, password) {
  const client = createLdapClient();

  try {
    await client.bind(userDn, password);
    return true;
  } finally {
    await client.unbind().catch(() => {});
  }
}

app.get('/api/health', (_request, response) => {
  response.json({ ok: true, persistenceConfigured: Boolean(supabase) });
});

app.post('/api/auth/login', async (request, response) => {
  const username = String(request.body?.username ?? '').trim();
  const password = String(request.body?.password ?? '');

  if (!username || !password) {
    response.status(400).json({ error: 'Username and password are required.' });
    return;
  }
  if (username.length > 254 || password.length > 1024) {
    response.status(400).json({ error: 'Username or password is too long.' });
    return;
  }

  const attemptKey = loginAttemptKey(request, username);
  const attemptState = getLoginAttemptState(attemptKey);
  if (attemptState?.count >= loginMaxAttempts) {
    response.set('Retry-After', String(Math.max(1, Math.ceil((attemptState.resetAt - Date.now()) / 1000))));
    response.status(429).json({ error: 'Too many sign-in attempts. Try again later.' });
    return;
  }

  try {
    const user = await findUser(username);
    const profile = user ? toProfile(user) : null;
    if (!user?.dn || isHiddenDirectoryProfile(profile)) {
      recordFailedLogin(attemptKey);
      audit(request, 'login_failed', { username });
      response.status(401).json({ error: 'Invalid username or password.' });
      return;
    }
    if (!canAccessApp(profile)) {
      recordFailedLogin(attemptKey);
      audit(request, 'login_denied', { username: profile.username });
      response.status(403).json({ error: 'Account is not authorized for this application.' });
      return;
    }

    await authenticateUser(user.dn, password);
    loginAttempts.delete(attemptKey);
    setCachedProfile(profile.username, profile);
    const { token, csrfToken } = createSessionToken(profile);
    setSessionCookie(response, token);
    audit(request, 'login_succeeded', { username: profile.username });

    response.json({ csrfToken, profile });
  } catch (error) {
    recordFailedLogin(attemptKey);
    console.error('LDAP login failed:', error?.message ?? error);
    audit(request, 'login_failed', { username });
    response.status(401).json({ error: 'Invalid username or password.' });
  }
});

app.get('/api/auth/me', async (request, response) => {
  await requireAuth(request, response, () => {
    response.json({ csrfToken: request.auth.csrfToken, profile: request.auth.profile });
  });
});

app.post('/api/auth/logout', requireAuth, (request, response) => {
  audit(request, 'logout');
  clearSessionCookie(response);
  response.status(204).end();
});

app.get('/api/team', requireAuth, async (request, response) => {
  try {
    const users = await findTeamUsers();
    audit(request, 'directory_read', { count: users.length });
    response.json({
      users: users.map((user) => ({
        username: user.username,
        name: user.displayName || user.firstName || user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        employeeId: user.employeeId,
        department: user.department,
        company: user.company,
        office: user.office,
        description: user.description,
        managerDn: user.managerDn,
      })),
    });
  } catch (error) {
    console.error('LDAP team load failed:', error?.message ?? error);
    response.status(500).json({ error: 'Unable to load LDAP team users.' });
  }
});

app.get('/api/preferences', requireAuth, async (request, response) => {
  if (!requireSupabase(response)) return;
  const username = normalizeUsername(request.auth.username);
  const { data, error } = await supabase
    .from('user_preferences')
    .select('preferences, updated_at')
    .eq('username', username)
    .maybeSingle();

  if (error) {
    if (isMissingPreferencesTable(error)) {
      response.status(503).json({ error: 'Preference persistence is not available.', code: 'PREFERENCES_UNAVAILABLE' });
      return;
    }
    console.error('Supabase preference load failed:', error.message);
    response.status(500).json({ error: 'Unable to load preferences.' });
    return;
  }

  response.json({
    preferences: data ? sanitizePreferences(data.preferences) : null,
    updatedAt: data?.updated_at ?? null,
  });
});

app.put('/api/preferences', requireAuth, async (request, response) => {
  if (!requireSupabase(response)) return;
  const username = normalizeUsername(request.auth.username);
  const preferences = sanitizePreferences(request.body?.preferences);
  const serialized = JSON.stringify(preferences);
  if (Buffer.byteLength(serialized, 'utf8') > 800_000) {
    response.status(413).json({ error: 'Preferences are too large.' });
    return;
  }

  const { data, error } = await supabase
    .from('user_preferences')
    .upsert({ username, preferences, updated_at: new Date().toISOString() }, { onConflict: 'username' })
    .select('preferences, updated_at')
    .single();

  if (error) {
    if (isMissingPreferencesTable(error)) {
      response.status(503).json({ error: 'Preference persistence is not available.', code: 'PREFERENCES_UNAVAILABLE' });
      return;
    }
    console.error('Supabase preference save failed:', error.message);
    response.status(500).json({ error: 'Unable to save preferences.' });
    return;
  }

  response.json({ preferences: sanitizePreferences(data.preferences), updatedAt: data.updated_at });
});

app.get('/api/tickets', requireAuth, async (request, response) => {
  if (!requireSupabase(response)) return;

  const { data, error } = await supabase
    .from('tickets')
    .select('*, ticket_comments(id, author, author_username, body, created_at)')
    .order('created_at', { ascending: true })
    .order('created_at', { referencedTable: 'ticket_comments', ascending: true })
    .limit(2000);

  if (error) {
    console.error('Supabase ticket load failed:', error.message);
    response.status(500).json({ error: 'Unable to load tickets.' });
    return;
  }

  const readableRows = canReadAllTickets(request.auth)
    ? data
    : data.filter((ticket) => canReadTicket(ticket, request.auth));
  const tickets = readableRows.map(ticketRowToCard);
  const includeFiles = ['1', 'true', 'yes'].includes(String(request.query?.includeFiles ?? '').toLowerCase());
  audit(request, 'tickets_read', { count: tickets.length, readAll: canReadAllTickets(request.auth) });

  if (includeFiles && tickets.length > 0) {
    try {
      const filesByTicket = await Promise.all(tickets.map(async (ticket) => [ticket.id, await loadTicketFileCards(ticket.id)]));
      const fileMap = new Map(filesByTicket);
      response.json({ tickets: tickets.map((ticket) => ({ ...ticket, files: fileMap.get(ticket.id) ?? [] })) });
      return;
    } catch (error) {
      console.error('Supabase ticket preload file load failed:', error.message);
      response.status(500).json({ error: 'Unable to preload supporting files.' });
      return;
    }
  }

  response.json({ tickets });
});

app.post('/api/tickets', requireAuth, async (request, response) => {
  if (!requireSupabase(response)) return;

  const ticket = sanitizeTicketPayload(request.body, request.auth);
  ticket.id = '';

  try {
    const assignee = await resolveTicketUser(request.body?.assignedToUsername ?? request.body?.assignedTo ?? request.body?.assigned_to, 'Assigned to');
    ticket.owner = request.auth.profile.displayName || request.auth.profile.firstName || request.auth.username;
    ticket.owner_username = request.auth.username;
    ticket.assigned_to = assignee.name;
    ticket.assigned_to_username = assignee.username;
  } catch (error) {
    response.status(400).json({ error: error.message || 'Ticket users are invalid.' });
    return;
  }

  const missingFields = validateRequiredTicketFields(ticket);
  if (missingFields.length > 0) {
    response.status(400).json({ error: `Missing required fields: ${missingFields.join(', ')}.` });
    return;
  }
  const payloadIssues = validateTicketPayload(ticket);
  if (payloadIssues.length > 0) {
    response.status(400).json({ error: `Invalid ticket: ${payloadIssues.join(', ')}.` });
    return;
  }

  try {
    ticket.project = await ensureEpicName(ticket.project);
  } catch (error) {
    response.status(500).json({ error: error.message || 'Unable to create epic.' });
    return;
  }

  let inserted;
  try {
    inserted = await insertTicketWithGeneratedId(ticket);
  } catch (error) {
    console.error('Supabase ticket create failed:', error.message);
    response.status(500).json({ error: 'Unable to create ticket.' });
    return;
  }

  response.status(201).json({
    ticket: ticketRowToCard({
      ...inserted.data,
      assigned_to_username: inserted.data.assigned_to_username ?? inserted.assignedToUsername,
    }),
  });
  audit(request, 'ticket_created', { ticketId: inserted.data.id });
});

app.patch('/api/tickets/:ticketId', requireAuth, async (request, response) => {
  if (!requireSupabase(response)) return;
  const ticketId = requireTicketId(request, response);
  if (!ticketId) return;

  const { data: existing, error: findError } = await supabase
    .from('tickets')
    .select('*')
    .eq('id', ticketId)
    .single();

  if (isMissingRow(findError) || (!findError && !existing)) {
    response.status(404).json({ error: 'Ticket not found.' });
    return;
  }
  if (findError) {
    console.error('Supabase ticket lookup failed:', findError.message);
    response.status(500).json({ error: 'Unable to update ticket.' });
    return;
  }

  if (!canOperateOnTicket(existing, request.auth)) {
    response.status(403).json({ error: 'Only the opener or assignee can update this ticket.' });
    return;
  }

  const nextTicket = sanitizeTicketPayload(request.body, request.auth, existing);
  nextTicket.owner = existing.owner;
  nextTicket.owner_username = existing.owner_username;

  try {
    if (request.body?.assignedTo || request.body?.assignedToUsername || request.body?.assigned_to) {
      const assignee = await resolveTicketUser(
        request.body?.assignedToUsername ?? request.body?.assignedTo ?? request.body?.assigned_to,
        'Assigned to',
      );
      nextTicket.assigned_to = assignee.name;
      nextTicket.assigned_to_username = assignee.username;
    }
  } catch (error) {
    response.status(400).json({ error: error.message || 'Ticket users are invalid.' });
    return;
  }

  const missingFields = validateRequiredTicketFields(nextTicket);
  if (missingFields.length > 0) {
    response.status(400).json({ error: `Missing required fields: ${missingFields.join(', ')}.` });
    return;
  }
  const payloadIssues = validateTicketPayload(nextTicket);
  if (payloadIssues.length > 0) {
    response.status(400).json({ error: `Invalid ticket: ${payloadIssues.join(', ')}.` });
    return;
  }

  if (Object.prototype.hasOwnProperty.call(request.body ?? {}, 'project')) {
    try {
      nextTicket.project = await ensureEpicName(nextTicket.project);
    } catch (error) {
      response.status(500).json({ error: error.message || 'Unable to create epic.' });
      return;
    }
  }

  delete nextTicket.id;
  delete nextTicket.created_by;

  let updatePayload = nextTicket;
  if (!supportsAssignedToUsername) {
    updatePayload = { ...nextTicket };
    delete updatePayload.assigned_to_username;
  }
  let { data, error } = await supabase
    .from('tickets')
    .update(updatePayload)
    .eq('id', ticketId)
    .select('*, ticket_comments(id, author, author_username, body, created_at)')
    .single();

  if (isMissingAssignedToUsernameColumn(error)) {
    supportsAssignedToUsername = false;
    updatePayload = { ...nextTicket };
    delete updatePayload.assigned_to_username;
    ({ data, error } = await supabase
      .from('tickets')
      .update(updatePayload)
      .eq('id', ticketId)
      .select('*, ticket_comments(id, author, author_username, body, created_at)')
      .single());
  }

  if (error) {
    console.error('Supabase ticket update failed:', error.message);
    response.status(500).json({ error: 'Unable to update ticket.' });
    return;
  }

  response.json({
    ticket: ticketRowToCard({
      ...data,
      assigned_to_username: data.assigned_to_username ?? nextTicket.assigned_to_username,
    }),
  });
  audit(request, 'ticket_updated', { ticketId });
});

app.get('/api/tickets/:ticketId/files', requireAuth, async (request, response) => {
  if (!requireSupabase(response)) return;
  const ticketId = requireTicketId(request, response);
  if (!ticketId) return;

  try {
    const { data: ticket, error: ticketError } = await supabase.from('tickets').select('*').eq('id', ticketId).single();
    if (isMissingRow(ticketError) || (!ticketError && !ticket)) {
      response.status(404).json({ error: 'Ticket not found.' });
      return;
    }
    if (ticketError) throw ticketError;
    if (!canReadTicket(ticket, request.auth)) {
      response.status(403).json({ error: 'You are not allowed to read this ticket.' });
      return;
    }
    const files = await loadTicketFileCards(ticketId);
    response.json({ files });
  } catch (error) {
    console.error('Supabase ticket file load failed:', error.message);
    response.status(500).json({ error: 'Unable to load supporting files.' });
  }
});

app.post('/api/tickets/:ticketId/files', requireAuth, uploadRateLimit, async (request, response) => {
  if (!requireSupabase(response)) return;
  const ticketId = requireTicketId(request, response);
  if (!ticketId) return;

  const name = String(request.body?.name ?? '').trim().replace(/[\\/]/g, '_');
  const type = String(request.body?.type ?? 'application/octet-stream').trim().toLowerCase() || 'application/octet-stream';
  const encodedData = String(request.body?.data ?? '').replace(/\s/g, '');
  if (!name || !encodedData) {
    response.status(400).json({ error: 'File name and data are required.' });
    return;
  }
  if (name.length > 180 || /[\u0000-\u001f\u007f]/.test(name)) {
    response.status(400).json({ error: 'File name is invalid or too long.' });
    return;
  }
  const extension = name.includes('.') ? `.${name.split('.').at(-1).toLowerCase()}` : '';
  if (blockedUploadExtensions.has(extension) || blockedUploadMimeTypes.has(type)) {
    response.status(400).json({ error: 'This file type is not allowed.' });
    return;
  }
  if (encodedData.length > Math.ceil(maxFileBytes / 3) * 4 + 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(encodedData)) {
    response.status(400).json({ error: 'File data is invalid or exceeds the 8 MB limit.' });
    return;
  }

  const bytes = Buffer.from(encodedData, 'base64');
  if (bytes.length === 0 || bytes.length > maxFileBytes || bytes.toString('base64').replace(/=+$/, '') !== encodedData.replace(/=+$/, '')) {
    response.status(400).json({ error: 'Supporting files must be between 1 byte and 8 MB.' });
    return;
  }
  if (!isAllowedUploadContent(bytes, type, extension)) {
    response.status(400).json({ error: 'File content does not match an allowed file type.' });
    return;
  }

  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .select('*')
    .eq('id', ticketId)
    .single();
  if (isMissingRow(ticketError) || (!ticketError && !ticket)) {
    response.status(404).json({ error: 'Ticket not found.' });
    return;
  }
  if (ticketError) {
    console.error('Supabase ticket lookup failed:', ticketError.message);
    response.status(500).json({ error: 'Unable to upload supporting file.' });
    return;
  }
  if (!canOperateOnTicket(ticket, request.auth)) {
    response.status(403).json({ error: 'Only the opener or assignee can upload supporting files.' });
    return;
  }

  try {
    await ensureTicketFilesBucket();
    const { data: existingFiles, error: listError } = await supabase.storage.from(ticketFilesBucket).list(ticketId, { limit: 100 });
    if (listError) throw listError;
    if ((existingFiles ?? []).length >= 100) {
      response.status(409).json({ error: 'This ticket already has the maximum of 100 supporting files.' });
      return;
    }
    const storageName = `${Date.now()}-${crypto.randomUUID()}--${encodeURIComponent(name)}`;
    const path = `${ticketId}/${storageName}`;
    const { data, error } = await supabase.storage.from(ticketFilesBucket).upload(path, bytes, {
      contentType: type,
      upsert: false,
    });
    if (error) throw error;
    const file = await storageFileToCard(ticketId, {
      name: storageName,
      metadata: { size: bytes.length, mimetype: type },
    });
    response.status(201).json({ file: { ...file, id: data.path } });
    audit(request, 'ticket_file_uploaded', { ticketId, fileName: name, size: bytes.length, mimeType: type });
  } catch (error) {
    console.error('Supabase ticket file upload failed:', error.message);
    response.status(500).json({ error: 'Unable to upload supporting file.' });
  }
});

app.delete('/api/tickets/:ticketId', requireAuth, async (request, response) => {
  if (!requireSupabase(response)) return;
  const ticketId = requireTicketId(request, response);
  if (!ticketId) return;

  const { data: existing, error: findError } = await supabase
    .from('tickets')
    .select('*')
    .eq('id', ticketId)
    .single();

  if (isMissingRow(findError) || (!findError && !existing)) {
    response.status(404).json({ error: 'Ticket not found.' });
    return;
  }
  if (findError) {
    console.error('Supabase ticket lookup failed:', findError.message);
    response.status(500).json({ error: 'Unable to delete ticket.' });
    return;
  }

  if (!canOperateOnTicket(existing, request.auth)) {
    response.status(403).json({ error: 'Only the opener or assignee can delete this ticket.' });
    return;
  }

  const { error } = await supabase.from('tickets').delete().eq('id', ticketId);

  if (error) {
    console.error('Supabase ticket delete failed:', error.message);
    response.status(500).json({ error: 'Unable to delete ticket.' });
    return;
  }

  try {
    await ensureTicketFilesBucket();
    const { data: files, error: listError } = await supabase.storage.from(ticketFilesBucket).list(ticketId, { limit: 100 });
    if (listError) throw listError;
    const paths = (files ?? []).filter((file) => file.name).map((file) => `${ticketId}/${file.name}`);
    if (paths.length > 0) {
      const { error: removeError } = await supabase.storage.from(ticketFilesBucket).remove(paths);
      if (removeError) throw removeError;
    }
  } catch (cleanupError) {
    console.error('Supabase ticket file cleanup failed:', cleanupError.message);
  }

  response.status(204).end();
  audit(request, 'ticket_deleted', { ticketId });
});

app.post('/api/tickets/:ticketId/comments', requireAuth, async (request, response) => {
  if (!requireSupabase(response)) return;
  const ticketId = requireTicketId(request, response);
  if (!ticketId) return;

  const body = String(request.body?.text ?? '').trim();

  if (!body) {
    response.status(400).json({ error: 'Comment text is required.' });
    return;
  }
  if (body.length > maxCommentLength) {
    response.status(400).json({ error: `Comments cannot exceed ${maxCommentLength} characters.` });
    return;
  }

  const { data: ticket, error: ticketError } = await supabase.from('tickets').select('*').eq('id', ticketId).single();
  if (isMissingRow(ticketError) || (!ticketError && !ticket)) {
    response.status(404).json({ error: 'Ticket not found.' });
    return;
  }
  if (ticketError) {
    console.error('Supabase ticket lookup failed:', ticketError.message);
    response.status(500).json({ error: 'Unable to add comment.' });
    return;
  }
  if (!canReadTicket(ticket, request.auth)) {
    response.status(403).json({ error: 'You are not allowed to comment on this ticket.' });
    return;
  }

  const { data, error } = await supabase
    .from('ticket_comments')
    .insert({
      ticket_id: ticketId,
      author: request.auth.profile.displayName || request.auth.username,
      author_username: request.auth.username,
      body,
    })
    .select('id, author, author_username, body, created_at')
    .single();

  if (error) {
    console.error('Supabase comment create failed:', error.message);
    response.status(500).json({ error: 'Unable to add comment.' });
    return;
  }

  response.status(201).json({
    comment: {
      id: data.id,
      author: data.author,
      text: data.body,
      createdAt: data.created_at,
    },
  });
  audit(request, 'ticket_comment_created', { ticketId, commentId: data.id });
});

app.use((error, _request, response, _next) => {
  if (String(error?.message ?? '').startsWith('Origin not allowed by CORS:')) {
    response.status(403).json({ error: 'Origin is not allowed.' });
    return;
  }
  if (error?.type === 'entity.too.large') {
    response.status(413).json({ error: 'Request body is too large.' });
    return;
  }
  if (error instanceof SyntaxError && error.status === 400) {
    response.status(400).json({ error: 'Request body must contain valid JSON.' });
    return;
  }
  console.error('Unhandled API error:', error?.message ?? error);
  response.status(500).json({ error: 'Internal server error.' });
});

const server = app.listen(port, '127.0.0.1', () => {
  console.log(`AQMA auth API listening on http://127.0.0.1:${port}`);
});
server.requestTimeout = 30_000;
server.headersTimeout = 35_000;
server.keepAliveTimeout = 5_000;

function shutdown(signal) {
  console.log(`${signal} received; shutting down AQMA API.`);
  server.close((error) => {
    if (error) {
      console.error('AQMA API shutdown failed:', error.message);
      process.exitCode = 1;
    }
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
