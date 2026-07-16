import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import jwt from 'jsonwebtoken';
import { Client } from 'ldapts';

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 8787);
const allowedOrigin = process.env.ALLOWED_ORIGIN ?? 'http://127.0.0.1:5173';
const jwtSecret = process.env.JWT_SECRET;
const ldapUrl = process.env.LDAP_URL;
const ldapBaseDn = process.env.LDAP_BASE_DN;
const ldapBindDn = process.env.LDAP_BIND_DN;
const ldapBindPassword = process.env.LDAP_BIND_PASSWORD;
const ldapLoginDomain = process.env.LDAP_LOGIN_DOMAIN ?? 'aqma.com';
const rejectUnauthorized = process.env.LDAP_TLS_REJECT_UNAUTHORIZED !== 'false';

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

app.use(
  cors({
    origin: allowedOrigin,
    credentials: false,
  }),
);
app.use(express.json({ limit: '20kb' }));

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
    description: firstAttribute(entry.description),
    office: firstAttribute(entry.physicalDeliveryOfficeName),
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
        'description',
        'physicalDeliveryOfficeName',
      ],
      sizeLimit: 2,
    });

    return searchEntries[0] ?? null;
  } finally {
    await client.unbind().catch(() => {});
  }
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
  response.json({ ok: true });
});

app.post('/api/auth/login', async (request, response) => {
  const username = String(request.body?.username ?? '').trim();
  const password = String(request.body?.password ?? '');

  if (!username || !password) {
    response.status(400).json({ error: 'Username and password are required.' });
    return;
  }

  try {
    const user = await findUser(username);
    if (!user?.dn) {
      response.status(401).json({ error: 'Invalid username or password.' });
      return;
    }

    await authenticateUser(user.dn, password);
    const profile = toProfile(user);
    const token = jwt.sign(
      {
        sub: profile.dn,
        username: profile.username,
      },
      jwtSecret,
      { expiresIn: '8h' },
    );

    response.json({ token, profile });
  } catch (error) {
    console.error('LDAP login failed:', error?.message ?? error);
    response.status(401).json({ error: 'Invalid username or password.' });
  }
});

app.get('/api/auth/me', async (request, response) => {
  const header = request.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!token) {
    response.status(401).json({ error: 'Missing bearer token.' });
    return;
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    const user = await findUser(payload.username);

    if (!user) {
      response.status(404).json({ error: 'User not found.' });
      return;
    }

    response.json({ profile: toProfile(user) });
  } catch {
    response.status(401).json({ error: 'Invalid or expired token.' });
  }
});

app.listen(port, () => {
  console.log(`AQMA auth API listening on http://127.0.0.1:${port}`);
  console.log(`LDAP target: ${ldapUrl}`);
});
