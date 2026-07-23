import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowLeft,
  Bell,
  ChartPie,
  ClipboardList,
  CalendarDays,
  Camera,
  ChartNoAxesColumnIncreasing,
  Check,
  ChevronRight,
  CircleUserRound,
  FolderKanban,
  Image as ImageIcon,
  KeyRound,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Mail,
  MessageSquareText,
  Moon,
  Phone,
  Palette,
  Search,
  Settings,
  Sun,
  Upload,
  User,
  UserRoundCog,
  X,
} from 'lucide-react';
import './styles.css';

const primaryMenus = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    title: 'Dashboard',
    subtitle: 'A calm overview surface for the selected workspace.',
    submenus: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
      { id: 'activity', label: 'Activity', icon: ChartPie },
    ],
  },
  {
    id: 'board',
    label: 'Project Board',
    icon: FolderKanban,
    title: 'Project Board',
    subtitle: 'Tasks, cards, and workflow columns will live here.',
    submenus: [
      { id: 'kanban', label: 'Kanban Board', icon: FolderKanban },
      { id: 'backlog', label: 'Backlog', icon: ClipboardList },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: ChartNoAxesColumnIncreasing,
    title: 'Analytics',
    subtitle: 'Charts and reporting open inside this main interface.',
    submenus: [
      { id: 'metrics', label: 'Metrics', icon: ChartNoAxesColumnIncreasing },
      { id: 'charts', label: 'Charts', icon: ChartPie },
    ],
  },
];

const profileTab = {
  id: 'profile',
  label: 'Profile',
  icon: CircleUserRound,
  title: 'Profile',
  subtitle: 'Account and team settings can use this panel.',
  submenus: [
    { id: 'profile-settings', label: 'Profile Settings', icon: CircleUserRound },
    { id: 'app-settings', label: 'Settings', icon: Settings },
  ],
};

const presetAvatars = [
  { id: 'blue', label: 'Blue', gradient: 'linear-gradient(145deg, #f8fbff, #9dc4ff 52%, #5c76ff)' },
  { id: 'mint', label: 'Mint', gradient: 'linear-gradient(145deg, #ffffff, #b7f6dd 48%, #42b89b)' },
  { id: 'rose', label: 'Rose', gradient: 'linear-gradient(145deg, #ffffff, #ffd1dc 48%, #f27aa0)' },
  { id: 'violet', label: 'Violet', gradient: 'linear-gradient(145deg, #ffffff, #d8c4ff 48%, #7a63ff)' },
];

const wallpapers = [
  { id: 'default', label: 'Soft blue', className: 'wallpaper-default' },
  { id: 'aurora', label: 'Aurora', className: 'wallpaper-aurora' },
  { id: 'mist', label: 'Mist', className: 'wallpaper-mist' },
];

const kanbanColumns = [
  {
    id: 'todo',
    title: 'To Do',
    cards: [],
  },
  {
    id: 'progress',
    title: 'In Progress',
    cards: [],
  },
  {
    id: 'assistance',
    title: 'Assistance',
    cards: [],
  },
  {
    id: 'blocked',
    title: 'Blocked',
    cards: [],
  },
  {
    id: 'done',
    title: 'Done',
    cards: [],
  },
];

const priorityOptions = ['Low', 'Medium', 'High'];
const epicOptions = [
  'TinyPilot Refactoring',
  'Automation Efforts 2026',
  'CLM Core Build',
  'CLM UI/UX',
  'PKI Infrastructure',
  'Frontend / UI',
  'Aqma Corp Website fixes',
  'Internal Management',
];
const taskTypeOptions = [
  'Backend',
  'Database',
  'Data Pipeline',
  'Frontend',
  'Feature / UI',
  'Security / Infrastructure',
  'UI/UX update',
  'Automation',
  'Migration',
  'Deployment',
  'PKI',
  'Monitoring',
];
const defaultActiveSubmenus = {
  dashboard: 'overview',
  board: 'kanban',
  analytics: 'metrics',
  profile: 'profile-settings',
};
const defaultUserPreferences = {
  theme: 'light',
  wallpaper: 'default',
  avatar: { type: 'preset', value: 'blue' },
  navigation: { activeTab: 'dashboard', activeSubmenus: defaultActiveSubmenus },
};
let boardStateCache = null;
const notificationLimit = 80;

const initialBacklogItems = [];

const defaultAuthApiBase = `${window.location.protocol}//${window.location.hostname}:8787`;
const authApiBase = import.meta.env.VITE_AUTH_API_URL ?? defaultAuthApiBase;
const localDevBypass = import.meta.env.VITE_LOCAL_DEV_BYPASS === 'true';
if (import.meta.env.PROD && localDevBypass) {
  throw new Error('VITE_LOCAL_DEV_BYPASS must be false in production builds.');
}
const authExpiredEventName = 'aqma-auth-expired';

function notifyAuthExpired() {
  window.dispatchEvent(new Event(authExpiredEventName));
}
const hiddenDirectoryUsernames = new Set(['administrator', 'guest', 'krbtgt', 'test']);
const seniorGraphNames = [
  { key: 'talha', match: ['talha'], fallbackName: 'Muhammad Talha' },
  { key: 'shaharyar', match: ['shaharyar', 'sheryiar', 'sheriyar'], fallbackName: 'Shaharyar Raza' },
  { key: 'waleed', match: ['waleed'], fallbackName: 'Waleed Ali' },
];

function normalizedUsername(value) {
  return String(value ?? '').trim().toLowerCase();
}

function userStorageKey(prefix, username) {
  return `${prefix}:${encodeURIComponent(normalizedUsername(username))}`;
}

function sanitizeUserPreferences(value) {
  const raw = value && typeof value === 'object' ? value : {};
  const activeTab = ['dashboard', 'board', 'analytics', 'profile'].includes(raw.navigation?.activeTab)
    ? raw.navigation.activeTab
    : 'dashboard';
  const submenuOptions = {
    dashboard: ['overview', 'activity'],
    board: ['kanban', 'backlog'],
    analytics: ['metrics', 'charts'],
    profile: ['profile-settings', 'app-settings'],
  };
  const activeSubmenus = Object.fromEntries(
    Object.entries(submenuOptions).map(([tab, options]) => [
      tab,
      options.includes(raw.navigation?.activeSubmenus?.[tab]) ? raw.navigation.activeSubmenus[tab] : defaultActiveSubmenus[tab],
    ]),
  );
  const avatar = raw.avatar?.type === 'preset' && presetAvatars.some((item) => item.id === raw.avatar.value)
    ? { type: 'preset', value: raw.avatar.value }
    : raw.avatar?.type === 'image' && /^data:image\/(png|jpeg|webp);base64,/i.test(raw.avatar.value ?? '')
      ? { type: 'image', value: raw.avatar.value }
      : defaultUserPreferences.avatar;

  return {
    theme: ['light', 'dark'].includes(raw.theme) ? raw.theme : 'light',
    wallpaper: wallpapers.some((item) => item.id === raw.wallpaper) ? raw.wallpaper : 'default',
    avatar,
    navigation: { activeTab, activeSubmenus },
  };
}

function readUserPreferences(username) {
  if (!username) return defaultUserPreferences;
  try {
    const raw = localStorage.getItem(userStorageKey('aqmaPreferences', username));
    return raw ? sanitizeUserPreferences(JSON.parse(raw)) : defaultUserPreferences;
  } catch {
    return defaultUserPreferences;
  }
}

function readLastUserPreferences() {
  try {
    const lastUsername = localStorage.getItem('aqmaLastUsername') ?? '';
    return readUserPreferences(lastUsername);
  } catch {
    return defaultUserPreferences;
  }
}

function writeUserPreferences(username, preferences) {
  if (!username) return;
  try {
    localStorage.setItem(userStorageKey('aqmaPreferences', username), JSON.stringify(sanitizeUserPreferences(preferences)));
  } catch {
    // The server remains authoritative when browser storage is unavailable or full.
  }
}

function buildBoardState(tickets, username) {
  const safeTickets = Array.isArray(tickets) ? tickets : [];
  return {
    username,
    columns: kanbanColumns.map((column) => ({
      ...column,
      cards: safeTickets
        .filter((ticket) => ticket.status === column.id)
        .map((ticket) => ({ ...ticket, columnId: column.id, status: column.title })),
    })),
    backlog: safeTickets
      .filter((ticket) => ticket.status === 'backlog')
      .map((ticket) => ({ ...ticket, columnId: 'backlog', status: 'Backlog' })),
    savedAt: Date.now(),
  };
}

function readBoardState(username) {
  if (boardStateCache?.username === username) return boardStateCache;
  if (!username) return null;
  try {
    const raw = sessionStorage.getItem(userStorageKey('aqmaBoard', username));
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed?.username !== username || !Array.isArray(parsed.columns) || !Array.isArray(parsed.backlog)) return null;
    boardStateCache = parsed;
    return parsed;
  } catch {
    return null;
  }
}

function writeBoardState(state) {
  boardStateCache = state;
  if (!state?.username) return;
  try {
    sessionStorage.setItem(userStorageKey('aqmaBoard', state.username), JSON.stringify(state));
  } catch {
    // In-memory cache still prevents navigation flashes within this session.
  }
}

function readNotifications(username) {
  if (!username) return [];
  try {
    const raw = localStorage.getItem(userStorageKey('aqmaNotifications', username));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, notificationLimit) : [];
  } catch {
    return [];
  }
}

function writeNotifications(username, notifications) {
  if (!username) return;
  try {
    localStorage.setItem(userStorageKey('aqmaNotifications', username), JSON.stringify(notifications.slice(0, notificationLimit)));
  } catch {
    // Notifications are helpful but should not block the application.
  }
}

function notificationId() {
  return `notification-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createNotification({ type = 'info', title, message, ticketId = '', ticketTitle = '', actor = '', createdAt = new Date().toISOString() }) {
  return {
    id: notificationId(),
    type,
    title,
    message,
    ticketId,
    ticketTitle,
    actor,
    createdAt,
    read: false,
  };
}

function mergeNotifications(existing, incoming) {
  const seen = new Set();
  return [...incoming, ...existing]
    .filter((item) => {
      const fingerprint = `${item.type}|${item.title}|${item.message}|${item.ticketId}|${item.createdAt}`;
      if (seen.has(fingerprint)) return false;
      seen.add(fingerprint);
      return true;
    })
    .slice(0, notificationLimit);
}

function ticketSnapshotForNotifications(ticket) {
  return {
    id: ticket.id,
    title: ticket.title ?? '',
    owner: ticket.owner ?? '',
    ownerUsername: ticket.ownerUsername ?? '',
    assignedTo: ticket.assignedTo ?? '',
    assignedToUsername: ticket.assignedToUsername ?? '',
    priority: ticket.priority ?? '',
    project: ticket.project ?? '',
    tag: ticket.tag ?? '',
    status: ticket.status ?? '',
    description: ticket.description ?? '',
    comments: Number(ticket.comments ?? ticket.commentList?.length ?? 0),
    files: Number(ticket.files?.length ?? 0),
    updatedAt: ticket.updatedAt ?? '',
  };
}

function isTicketRelevantToUser(ticketSnapshot, username) {
  const normalized = normalizedUsername(username);
  if (!normalized) return false;
  return normalizedUsername(ticketSnapshot?.ownerUsername) === normalized
    || normalizedUsername(ticketSnapshot?.assignedToUsername) === normalized;
}

function readTicketNotificationSnapshot(username) {
  if (!username) return null;
  try {
    const raw = localStorage.getItem(userStorageKey('aqmaTicketSnapshot', username));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeTicketNotificationSnapshot(username, tickets) {
  if (!username) return;
  try {
    const snapshot = Object.fromEntries((tickets ?? []).map((ticket) => [ticket.id, ticketSnapshotForNotifications(ticket)]));
    localStorage.setItem(userStorageKey('aqmaTicketSnapshot', username), JSON.stringify(snapshot));
  } catch {
    // Snapshot diffing is a notification enhancement only.
  }
}

function profileSnapshotForNotifications(profile) {
  return {
    name: profile.name ?? '',
    role: profile.role ?? '',
    email: profile.email ?? '',
    phone: profile.phone ?? '',
    department: profile.department ?? '',
    office: profile.office ?? '',
    managerDn: profile.managerDn ?? '',
  };
}

function createProfileDiffNotifications(username, nextProfile) {
  if (!username) return [];
  const key = userStorageKey('aqmaProfileSnapshot', username);
  const nextSnapshot = profileSnapshotForNotifications(nextProfile);
  let previousSnapshot = null;
  try {
    previousSnapshot = JSON.parse(localStorage.getItem(key) ?? 'null');
    localStorage.setItem(key, JSON.stringify(nextSnapshot));
  } catch {
    return [];
  }
  if (!previousSnapshot) return [];

  const labels = {
    name: 'name',
    role: 'role',
    email: 'email',
    phone: 'phone',
    department: 'department',
    office: 'office',
    managerDn: 'manager',
  };
  const changed = Object.keys(labels).filter((field) => previousSnapshot[field] !== nextSnapshot[field]);
  if (changed.length === 0) return [];
  return [
    createNotification({
      type: 'profile',
      title: 'Profile updated',
      message: `${changed.map((field) => labels[field]).slice(0, 2).join(', ')}${changed.length > 2 ? ` and ${changed.length - 2} more` : ''} changed for ${nextProfile.name}.`,
      actor: nextProfile.name,
    }),
  ];
}

function notificationLabelForTicketChange(key, previous, next) {
  const labels = {
    title: 'title',
    assignedTo: 'assignee',
    priority: 'priority',
    project: 'epic',
    tag: 'task type',
    status: 'status',
    description: 'description',
    comments: 'comments',
    files: 'supporting files',
  };
  if (key === 'comments' && next.comments > previous.comments) return 'new comment';
  if (key === 'files' && next.files > previous.files) return 'supporting file added';
  return `${labels[key] ?? key} changed`;
}

function createTicketDiffNotifications(username, tickets) {
  const previousSnapshot = readTicketNotificationSnapshot(username);
  writeTicketNotificationSnapshot(username, tickets);
  if (!previousSnapshot) return [];

  return (tickets ?? []).flatMap((ticket) => {
    const previous = previousSnapshot[ticket.id];
    const next = ticketSnapshotForNotifications(ticket);
    const relevant = isTicketRelevantToUser(next, username) || isTicketRelevantToUser(previous, username);
    if (!relevant) return [];
    if (!previous) {
      return [
        createNotification({
          type: 'ticket',
          title: 'New ticket added',
          message: `${next.title || ticket.id} is now on the board.`,
          ticketId: ticket.id,
          ticketTitle: next.title,
          actor: next.owner,
          createdAt: next.updatedAt || new Date().toISOString(),
        }),
      ];
    }

    const watchedFields = ['title', 'assignedTo', 'priority', 'project', 'tag', 'status', 'description', 'comments', 'files'];
    const changedFields = watchedFields.filter((key) => previous[key] !== next[key]);
    if (changedFields.length === 0) return [];

    const firstChange = notificationLabelForTicketChange(changedFields[0], previous, next);
    const remaining = changedFields.length > 1 ? ` and ${changedFields.length - 1} more update${changedFields.length - 1 === 1 ? '' : 's'}` : '';
    return [
      createNotification({
        type: 'ticket',
        title: 'Ticket updated',
        message: `${next.title || ticket.id}: ${firstChange}${remaining}.`,
        ticketId: ticket.id,
        ticketTitle: next.title,
        actor: next.assignedTo || next.owner,
        createdAt: next.updatedAt || new Date().toISOString(),
      }),
    ];
  });
}

function formatNotificationTime(value) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return '';
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.max(1, Math.round(diff / 60_000))}m ago`;
  if (diff < 86_400_000) return `${Math.max(1, Math.round(diff / 3_600_000))}h ago`;
  return `${Math.max(1, Math.round(diff / 86_400_000))}d ago`;
}

function isHiddenDirectoryUser(user) {
  const username = String(user?.username ?? '').trim().toLowerCase();
  const personText = normalizedPersonText(user).replace(/[\s_-]+/g, '');
  return hiddenDirectoryUsernames.has(username) || personText.includes('ldapbind');
}

function normalizedPersonText(user) {
  return `${user?.username ?? ''} ${user?.name ?? ''} ${user?.email ?? ''}`.toLowerCase();
}

function TopMenu({ activeTab, onSelectTab }) {
  return (
    <nav className="top-menu" aria-label="Primary navigation">
      {primaryMenus.map((tab) => {
        const Icon = tab.icon;
        const active = activeTab === tab.id;

        return (
          <button
            className={`top-menu-item ${active ? 'is-active' : ''}`}
            type="button"
            key={tab.id}
            aria-pressed={active}
            onClick={() => onSelectTab(tab.id)}
          >
            <Icon size={17} strokeWidth={2.05} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function Sidebar({ activeMenu, activeSubmenu, onSelectSubmenu }) {
  const submenus = activeMenu.submenus ?? [];

  return (
    <aside className="sidebar glass-panel" aria-label={`${activeMenu.label} subnavigation`}>
      {submenus.map((item) => {
        const Icon = item.icon;
        const active = activeSubmenu === item.id;

        return (
          <button
            className={`sidebar-tab ${active ? 'is-active' : ''}`}
            type="button"
            key={item.id}
            aria-label={item.label}
            title={item.label}
            aria-pressed={active}
            onClick={() => onSelectSubmenu(item.id)}
          >
            <Icon size={22} strokeWidth={2.05} />
          </button>
        );
      })}
    </aside>
  );
}

function AvatarView({ avatar, size = 24 }) {
  if (avatar?.type === 'image') {
    return <img src={avatar.value} alt="" />;
  }

  if (avatar?.type === 'preset') {
    const preset = presetAvatars.find((item) => item.id === avatar.value);

    return (
      <span className="avatar-preset-fill" style={{ background: preset?.gradient }}>
        <CircleUserRound size={size} strokeWidth={1.8} />
      </span>
    );
  }

  return <CircleUserRound size={size} strokeWidth={2.1} />;
}

function NotificationCenter({
  notifications,
  open,
  unreadCount,
  onToggle,
  onClose,
  onMarkAllRead,
  onMarkRead,
  onClear,
}) {
  const panelRef = useRef(null);
  const buttonLabel = unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications, none unread';

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event) {
      if (!event.target.closest('.notification-menu-wrap')) onClose();
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    requestAnimationFrame(() => panelRef.current?.focus());

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  return (
    <div className="notification-menu-wrap">
      <button
        className={`notification-button ${open ? 'is-open' : ''} ${unreadCount > 0 ? 'has-unread' : ''}`}
        type="button"
        aria-label={buttonLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="notification-center"
        onClick={onToggle}
      >
        <Bell size={20} strokeWidth={2.05} />
        {unreadCount > 0 && <span className="notification-badge" aria-hidden="true" />}
      </button>
      {open && (
        <section
          id="notification-center"
          className="notification-dropdown"
          role="dialog"
          aria-modal="false"
          aria-labelledby="notification-title"
          tabIndex={-1}
          ref={panelRef}
        >
          <header>
            <div>
              <h2 id="notification-title">Notifications</h2>
              <p>{unreadCount > 0 ? `${unreadCount} unread update${unreadCount === 1 ? '' : 's'}` : 'All caught up'}</p>
            </div>
            <div className="notification-actions">
              <button type="button" onClick={onMarkAllRead} disabled={unreadCount === 0}>Mark read</button>
              <button type="button" onClick={onClear} disabled={notifications.length === 0}>Clear</button>
            </div>
          </header>

          <div className="notification-list" aria-live="polite">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <Bell size={22} />
                <strong>No notifications</strong>
                <span>Ticket changes, assignments, comments, files, and profile updates will appear here.</span>
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  className={`notification-item ${notification.read ? '' : 'is-unread'}`}
                  type="button"
                  key={notification.id}
                  onClick={() => onMarkRead(notification.id)}
                  aria-label={`${notification.read ? 'Read' : 'Unread'} notification: ${notification.title}. ${notification.message}. ${formatNotificationTime(notification.createdAt)}`}
                >
                  <span className={`notification-dot notification-dot--${notification.type}`} aria-hidden="true" />
                  <span>
                    <strong>{notification.title}</strong>
                    <small>{notification.message}</small>
                    <em>{formatNotificationTime(notification.createdAt)}{notification.actor ? ` · ${notification.actor}` : ''}</em>
                  </span>
                </button>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function MainInterface({
  tab,
  submenu,
  profile,
  setProfile,
  theme,
  setTheme,
  wallpaper,
  setWallpaper,
  selectedPersonId,
  setSelectedPersonId,
  companyGraphOpen,
  setCompanyGraphOpen,
  pushHistory,
  authToken,
  localMode,
  onNotify,
  teamUsers,
}) {
  return (
    <main className="main-interface glass-panel" aria-live="polite">
      {tab.id === 'profile' ? (
        <ProfilePanel
          profile={profile}
          setProfile={setProfile}
          theme={theme}
          setTheme={setTheme}
          wallpaper={wallpaper}
          setWallpaper={setWallpaper}
          selectedSection={submenu?.id}
          selectedPersonId={selectedPersonId}
          setSelectedPersonId={setSelectedPersonId}
          companyGraphOpen={companyGraphOpen}
          setCompanyGraphOpen={setCompanyGraphOpen}
          pushHistory={pushHistory}
          authToken={authToken}
          localMode={localMode}
          onNotify={onNotify}
          teamUsers={teamUsers}
        />
      ) : (
        <DefaultPanel tab={tab} submenu={submenu} profile={profile} authToken={authToken} localMode={localMode} onNotify={onNotify} teamUsers={teamUsers} />
      )}
    </main>
  );
}

function DefaultPanel({ tab, submenu, profile, authToken, localMode, onNotify, teamUsers }) {
  if (tab.id === 'board') {
    return <ProjectBoardPanel submenu={submenu} profile={profile} authToken={authToken} localMode={localMode} onNotify={onNotify} initialTeamUsers={teamUsers} />;
  }

  const title = submenu ? submenu.label : tab.title;
  const subtitle = submenu ? `${tab.label} / ${submenu.label}` : tab.subtitle;

  return (
    <section className="panel-content">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </section>
  );
}

function ProjectBoardPanel({ submenu, profile, authToken, localMode, onNotify, initialTeamUsers = [] }) {
  const currentUserName = profile?.name || 'User';
  const currentUsername = profile?.username || '';
  const initialBoardState = readBoardState(currentUsername);
  const [boardColumns, setBoardColumns] = useState(() => initialBoardState?.columns ?? kanbanColumns);
  const [backlogItems, setBacklogItems] = useState(() => initialBoardState?.backlog ?? initialBacklogItems);
  const [boardError, setBoardError] = useState('');
  const [selectedUser, setSelectedUser] = useState('all');
  const [draggedTicket, setDraggedTicket] = useState(null);
  const [dropTargetColumn, setDropTargetColumn] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [createColumnId, setCreateColumnId] = useState(null);
  const ticketMutationVersionRef = useRef(new Map());
  const boardRevisionRef = useRef(0);
  const [teamUsers, setTeamUsers] = useState(() => (
    initialTeamUsers.length > 0
      ? initialTeamUsers
      : [{
          username: profile?.username || profile?.email || currentUserName,
          name: currentUserName,
          email: profile?.email || '',
          role: profile?.role || '',
        }]
  ));
  const users = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...teamUsers.filter((user) => !isHiddenDirectoryUser(user)).map((user) => user.name),
            ...boardColumns.flatMap((column) =>
              column.cards.flatMap((card) => [card.owner, card.assignedTo].filter(Boolean)),
            ),
          ].filter(Boolean),
        ),
      ).sort(),
    [boardColumns, teamUsers],
  );

  useEffect(() => {
    if (initialTeamUsers.length > 0) {
      setTeamUsers(initialTeamUsers);
    }
  }, [initialTeamUsers]);
  const nextTicketId = useMemo(() => {
    const ticketIds = [
      ...boardColumns.flatMap((column) => column.cards.map((card) => card.id)),
      ...backlogItems.map((item) => item.id),
    ];
    const maxId = ticketIds.reduce((max, id) => {
      const match = /^AQMA-(\d+)$/i.exec(String(id ?? ''));
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);

    return `AQMA-${String(maxId + 1).padStart(4, '0')}`;
  }, [boardColumns, backlogItems]);
  const boardRecordCount = useMemo(
    () => boardColumns.reduce((total, column) => total + column.cards.length, 0) + backlogItems.length,
    [boardColumns, backlogItems],
  );

  async function boardRequest(path, options = {}) {
    if (localMode) {
      throw new Error('Backend persistence is disabled in local mode.');
    }

    const response = await fetch(`${authApiBase}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        ...(authToken ? { 'X-CSRF-Token': authToken } : {}),
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers ?? {}),
      },
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401) notifyAuthExpired();
      throw new Error(data.error || 'Board request failed.');
    }

    return data;
  }

  function applyTickets(tickets) {
    const nextState = buildBoardState(tickets, currentUsername);
    setBoardColumns(nextState.columns);
    setBacklogItems(nextState.backlog);
  }

  function upsertLoadedTicket(ticket, { select = false } = {}) {
    if (ticket.status === 'backlog') {
      const backlogTicket = { ...ticket, columnId: 'backlog', status: 'Backlog' };
      setBacklogItems((current) => {
        const exists = current.some((item) => item.id === ticket.id);
        return exists ? current.map((item) => (item.id === ticket.id ? backlogTicket : item)) : [...current, backlogTicket];
      });
      setBoardColumns((current) =>
        current.map((column) => ({ ...column, cards: column.cards.filter((card) => card.id !== ticket.id) })),
      );
      setSelectedTicket((current) => (select || current?.id === ticket.id ? backlogTicket : current));
      return;
    }

    const targetColumn = kanbanColumns.find((column) => column.id === ticket.status) ?? kanbanColumns[0];
    const boardTicket = { ...ticket, columnId: targetColumn.id, status: targetColumn.title };

    setBacklogItems((current) => current.filter((item) => item.id !== ticket.id));
    setBoardColumns((current) =>
      current.map((column) => {
        const cards = column.cards.filter((card) => card.id !== ticket.id);
        return column.id === targetColumn.id ? { ...column, cards: [...cards, boardTicket] } : { ...column, cards };
      }),
    );
    setSelectedTicket((current) => (select || current?.id === ticket.id ? boardTicket : current));
  }

  useEffect(() => {
    writeBoardState({ username: currentUsername, columns: boardColumns, backlog: backlogItems, savedAt: Date.now() });
  }, [currentUsername, boardColumns, backlogItems]);

  useEffect(() => {
    if (!authToken || localMode) return;

    const controller = new AbortController();
    const loadRevision = boardRevisionRef.current;

    async function loadTickets() {
      setBoardError('');

      try {
        const data = await boardRequest('/api/tickets?includeFiles=true', { signal: controller.signal });
        if (!controller.signal.aborted && boardRevisionRef.current === loadRevision) {
          const loadedTickets = data.tickets ?? [];
          createTicketDiffNotifications(currentUsername, loadedTickets).forEach((notification) => notifyBoardChange(notification));
          applyTickets(loadedTickets);
        }
      } catch (error) {
        if (!controller.signal.aborted) setBoardError(error.message);
      }
    }

    loadTickets();

    return () => {
      controller.abort();
    };
  }, [authToken]);

  useEffect(() => {
    if (localMode) {
      setTeamUsers([
        {
          username: profile?.username || profile?.email || currentUserName,
          name: currentUserName,
          email: profile?.email || '',
          role: profile?.role || '',
        },
      ]);
      return;
    }
    if (!authToken) return;

    let cancelled = false;

    async function loadTeamUsers() {
      try {
        const data = await boardRequest('/api/team');
        if (!cancelled && Array.isArray(data.users) && data.users.length > 0) {
          setTeamUsers(data.users.filter((user) => !isHiddenDirectoryUser(user)));
        }
      } catch (error) {
        if (!cancelled && !String(error.message).toLowerCase().includes('directory listing is restricted')) {
          setBoardError(error.message);
        }
      }
    }

    loadTeamUsers();

    return () => {
      cancelled = true;
    };
  }, [authToken, localMode, profile?.username, currentUserName]);

  function updateTicket(ticketId, updater) {
    setBoardColumns((currentColumns) =>
      currentColumns.map((column) => ({
        ...column,
        cards: column.cards.map((card) => {
          if (card.id !== ticketId) return card;
          return updater(card, column);
        }),
      })),
    );
    setBacklogItems((current) => current.map((item) => (item.id === ticketId ? updater(item, { title: 'Backlog' }) : item)));
    setSelectedTicket((current) => {
      if (!current || current.id !== ticketId) return current;
      return updater(current, { title: current.status });
    });
  }

  function notifyBoardChange(payload) {
    if (payload?.selfAuthored) return;
    onNotify?.(payload);
  }

  function describeTicketChange(changes) {
    if (changes.columnId) return 'status changed';
    if (changes.assignedTo || changes.assignedToUsername) return 'assignee changed';
    if (changes.priority) return `priority changed to ${changes.priority}`;
    if (changes.project) return 'epic changed';
    if (changes.tag) return 'task type changed';
    if (changes.title) return 'title changed';
    if (changes.description) return 'description updated';
    return 'details updated';
  }

  async function createTicket(ticket) {
    boardRevisionRef.current += 1;
    const targetColumnId = ticket.columnId ?? 'todo';
    const missingFields = [
      [ticket.title, 'Card title'],
      [ticket.description, 'Card description'],
      [ticket.ownerUsername || ticket.owner, 'Opened by'],
      [ticket.assignedToUsername || ticket.assignedTo, 'Assigned to'],
      [ticket.priority, 'Priority'],
      [ticket.tag, 'Task type'],
      [ticket.project, 'Epic'],
      [targetColumnId, 'Status'],
    ]
      .filter(([value]) => !String(value ?? '').trim())
      .map(([, label]) => label);

    if (missingFields.length > 0) {
      setBoardError(`Missing required fields: ${missingFields.join(', ')}.`);
      return;
    }

    if (localMode) {
      const targetColumn = boardColumns.find((column) => column.id === targetColumnId);
      const nextCount = boardColumns.reduce((sum, column) => sum + column.cards.length, 0) + backlogItems.length + 1;
      const newTicket = {
        id: `LOCAL-${String(nextCount).padStart(3, '0')}`,
        title: ticket.title,
        tag: ticket.tag || '',
        project: ticket.project || '',
        owner: ticket.owner || currentUserName,
        ownerUsername: ticket.ownerUsername || currentUsername,
        assignedTo: ticket.assignedTo || '',
        assignedToUsername: ticket.assignedToUsername || '',
        priority: ticket.priority || '',
        description: ticket.description || '',
        due: 'Unscheduled',
        progress: targetColumn?.id === 'done' ? 100 : 0,
        comments: 0,
        commentList: [],
        files: [],
      };

      if (targetColumnId === 'backlog') {
        const backlogTicket = { ...newTicket, estimate: ticket.estimate || '', status: 'Backlog', columnId: 'backlog' };
        setBacklogItems((current) => [...current, backlogTicket]);
        setCreateColumnId(null);
        setSelectedTicket(backlogTicket);
        notifyBoardChange({
          type: 'ticket',
          title: 'Ticket created',
          message: `${backlogTicket.title} was added to Backlog.`,
          ticketId: backlogTicket.id,
          ticketTitle: backlogTicket.title,
          actor: currentUserName,
          selfAuthored: true,
        });
        return;
      }

      const safeTargetColumn = targetColumn ?? boardColumns[0];
      const boardTicket = { ...newTicket, status: safeTargetColumn.title, columnId: safeTargetColumn.id };

      setBoardColumns((currentColumns) =>
        currentColumns.map((column) =>
          column.id === safeTargetColumn.id ? { ...column, cards: [...column.cards, boardTicket] } : column,
        ),
      );
      setCreateColumnId(null);
      setSelectedTicket(boardTicket);
      notifyBoardChange({
        type: 'ticket',
        title: 'Ticket created',
        message: `${boardTicket.title} was added to ${safeTargetColumn.title}.`,
        ticketId: boardTicket.id,
        ticketTitle: boardTicket.title,
        actor: currentUserName,
        selfAuthored: true,
      });
      return;
    }

    try {
      const data = await boardRequest('/api/tickets', {
        method: 'POST',
        body: JSON.stringify({
          ...ticket,
          status: targetColumnId,
        }),
      });
      upsertLoadedTicket(data.ticket, { select: true });
      setCreateColumnId(null);
      setBoardError('');
      notifyBoardChange({
        type: 'ticket',
        title: 'Ticket created',
        message: `${data.ticket.title} was added to the board.`,
        ticketId: data.ticket.id,
        ticketTitle: data.ticket.title,
        actor: currentUserName,
        selfAuthored: true,
      });
    } catch (error) {
      throw error;
    }
  }

  async function addTicketComment(ticketId, text) {
    boardRevisionRef.current += 1;
    setBoardError('');
    if (localMode) {
      updateTicket(ticketId, (ticket) => {
        const commentList = ticket.commentList ?? [];
        const nextComment = {
          id: `${ticketId}-comment-${commentList.length + 1}`,
          author: currentUserName,
          text,
        };
        return {
          ...ticket,
          commentList: [...commentList, nextComment],
          comments: commentList.length + 1,
        };
      });
      notifyBoardChange({
        type: 'comment',
        title: 'Comment added',
        message: `You commented on ${ticketId}.`,
        ticketId,
        actor: currentUserName,
        selfAuthored: true,
      });
      return;
    }

    try {
      const data = await boardRequest(`/api/tickets/${encodeURIComponent(ticketId)}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      });
      updateTicket(ticketId, (ticket) => {
        const commentList = ticket.commentList ?? [];
        return {
          ...ticket,
          commentList: [...commentList, data.comment],
          comments: commentList.length + 1,
        };
      });
      setBoardError('');
      notifyBoardChange({
        type: 'comment',
        title: 'Comment added',
        message: `New comment added to ${ticketId}.`,
        ticketId,
        actor: currentUserName,
        selfAuthored: true,
      });
    } catch (error) {
      throw error;
    }
  }

  async function addTicketFiles(ticketId, files) {
    boardRevisionRef.current += 1;
    const selectedFiles = Array.from(files);
    if (selectedFiles.length === 0) return;

    if (localMode) {
      const uploadedFiles = selectedFiles.map((file) => ({
        id: `${ticketId}-file-${file.name}-${file.size}`,
        name: file.name,
        size: file.size,
        url: URL.createObjectURL(file),
      }));
      updateTicket(ticketId, (ticket) => ({ ...ticket, files: [...(ticket.files ?? []), ...uploadedFiles] }));
      notifyBoardChange({
        type: 'file',
        title: 'Supporting file added',
        message: `${uploadedFiles.length} file${uploadedFiles.length === 1 ? '' : 's'} uploaded to ${ticketId}.`,
        ticketId,
        actor: currentUserName,
        selfAuthored: true,
      });
      return;
    }

    try {
      for (const file of selectedFiles) {
        if (file.size > 8 * 1024 * 1024) throw new Error(`${file.name} exceeds the 8 MB file limit.`);
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error(`Unable to read ${file.name}.`));
          reader.readAsDataURL(file);
        });
        const data = await boardRequest(`/api/tickets/${encodeURIComponent(ticketId)}/files`, {
          method: 'POST',
          body: JSON.stringify({
            name: file.name,
            type: file.type || 'application/octet-stream',
            data: dataUrl.slice(dataUrl.indexOf(',') + 1),
          }),
        });
        updateTicket(ticketId, (ticket) => ({ ...ticket, files: [...(ticket.files ?? []), data.file] }));
      }
      setBoardError('');
      notifyBoardChange({
        type: 'file',
        title: 'Supporting file added',
        message: `${selectedFiles.length} file${selectedFiles.length === 1 ? '' : 's'} uploaded to ${ticketId}.`,
        ticketId,
        actor: currentUserName,
        selfAuthored: true,
      });
    } catch (error) {
      setBoardError(error.message);
      throw error;
    }
  }

  async function openTicket(ticket) {
    setSelectedTicket({ ...ticket, files: ticket.files ?? [], filesLoading: false });
    if (localMode || Array.isArray(ticket.files)) return;

    try {
      const data = await boardRequest(`/api/tickets/${encodeURIComponent(ticket.id)}/files`);
      updateTicket(ticket.id, (current) => ({ ...current, files: data.files ?? [], filesLoading: false }));
    } catch (error) {
      updateTicket(ticket.id, (current) => ({ ...current, filesLoading: false }));
      setBoardError(error.message);
    }
  }

  async function updateTicketData(ticketId, changes) {
    boardRevisionRef.current += 1;
    const mutationVersion = (ticketMutationVersionRef.current.get(ticketId) ?? 0) + 1;
    ticketMutationVersionRef.current.set(ticketId, mutationVersion);
    const previousColumns = boardColumns;
    const previousBacklog = backlogItems;
    const previousSelectedTicket = selectedTicket;
    const boardTicket = boardColumns.flatMap((column) => column.cards).find((card) => card.id === ticketId);
    const backlogTicket = backlogItems.find((item) => item.id === ticketId);
    const currentTicket = selectedTicket?.id === ticketId ? selectedTicket : boardTicket ?? backlogTicket;
    if (!currentTicket) return;

    const targetColumnId = changes.columnId ?? currentTicket.columnId ?? 'todo';
    const targetColumn = kanbanColumns.find((column) => column.id === targetColumnId);
    const optimisticTicket = {
      ...currentTicket,
      ...changes,
      columnId: targetColumnId,
      status: targetColumnId === 'backlog' ? 'Backlog' : targetColumn?.title ?? currentTicket.status,
    };

    setBoardColumns((current) =>
      current.map((column) => {
        const cards = column.cards.filter((card) => card.id !== ticketId);
        return column.id === targetColumnId ? { ...column, cards: [...cards, optimisticTicket] } : { ...column, cards };
      }),
    );
    setBacklogItems((current) => {
      const items = current.filter((item) => item.id !== ticketId);
      return targetColumnId === 'backlog' ? [...items, optimisticTicket] : items;
    });
    setSelectedTicket((current) => (current?.id === ticketId ? optimisticTicket : current));

    if (localMode) {
      notifyBoardChange({
        type: 'ticket',
        title: 'Ticket updated',
        message: `${optimisticTicket.title}: ${describeTicketChange(changes)}.`,
        ticketId,
        ticketTitle: optimisticTicket.title,
        actor: currentUserName,
        selfAuthored: true,
      });
      return;
    }

    try {
      const data = await boardRequest(`/api/tickets/${encodeURIComponent(ticketId)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...changes,
          status: changes.columnId,
        }),
      });
      if (ticketMutationVersionRef.current.get(ticketId) !== mutationVersion) return;
      upsertLoadedTicket(data.ticket);
      setBoardError('');
      notifyBoardChange({
        type: 'ticket',
        title: 'Ticket updated',
        message: `${data.ticket.title}: ${describeTicketChange(changes)}.`,
        ticketId,
        ticketTitle: data.ticket.title,
        actor: currentUserName,
        selfAuthored: true,
      });
    } catch (error) {
      if (ticketMutationVersionRef.current.get(ticketId) !== mutationVersion) return;
      setBoardColumns(previousColumns);
      setBacklogItems(previousBacklog);
      setSelectedTicket((current) => (current?.id === ticketId ? previousSelectedTicket : current));
      setBoardError(error.message);
    }
  }

  async function deleteTicket(ticketId) {
    if (localMode) {
      setBoardColumns((currentColumns) =>
        currentColumns.map((column) => ({
          ...column,
            cards: column.cards.filter((card) => card.id !== ticketId || !canOperateOnTicket(card, currentUserName, currentUsername)),
        })),
      );
      setBacklogItems((current) => current.filter((item) => item.id !== ticketId || !canOperateOnTicket(item, currentUserName, currentUsername)));
      setSelectedTicket(null);
      notifyBoardChange({
        type: 'ticket',
        title: 'Ticket deleted',
        message: `${ticketId} was removed from the board.`,
        ticketId,
        actor: currentUserName,
        selfAuthored: true,
      });
      return;
    }

    try {
      await fetch(`${authApiBase}/api/tickets/${encodeURIComponent(ticketId)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'X-CSRF-Token': authToken,
        },
      }).then(async (response) => {
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          if (response.status === 401) notifyAuthExpired();
          throw new Error(data.error || 'Unable to delete ticket.');
        }
      });
      setBoardColumns((currentColumns) =>
        currentColumns.map((column) => ({
          ...column,
          cards: column.cards.filter((card) => card.id !== ticketId),
        })),
      );
      setBacklogItems((current) => current.filter((item) => item.id !== ticketId));
      setSelectedTicket(null);
      setBoardError('');
      notifyBoardChange({
        type: 'ticket',
        title: 'Ticket deleted',
        message: `${ticketId} was removed from the board.`,
        ticketId,
        actor: currentUserName,
        selfAuthored: true,
      });
    } catch (error) {
      setBoardError(error.message);
    }
  }

  if (!localMode && !authToken) {
    return (
      <section className="panel-content">
        <h1>Session expired</h1>
        <p>Please sign in again.</p>
      </section>
    );
  }

  return (
    <section className="project-board-panel">
      <header className="board-header">
        <div>
          <p className="eyebrow">Progress Status</p>
          <h1>{submenu?.label ?? 'Kanban Board'}</h1>
          <span className="board-subtitle">
            {boardRecordCount === 0 ? 'No board records yet.' : `${boardRecordCount} ${boardRecordCount === 1 ? 'ticket' : 'tickets'}`}
          </span>
        </div>
        <button className="board-action" type="button" onClick={() => setCreateColumnId(submenu?.id === 'backlog' ? 'backlog' : 'todo')}>
          <ClipboardList size={18} />
          New ticket
        </button>
      </header>
      <div className="board-status" aria-live="polite">
        {boardError && <p className="auth-error">{boardError}</p>}
      </div>

      {submenu?.id !== 'backlog' && (
        <div className="board-user-filter" aria-label="Filter tickets by user">
          <button
            className={selectedUser === 'all' ? 'is-selected' : ''}
            type="button"
            onClick={() => setSelectedUser('all')}
          >
            All users
          </button>
          {users.map((user) => (
            <button
              className={selectedUser === user ? 'is-selected' : ''}
              type="button"
              key={user}
              onClick={() => setSelectedUser(user)}
            >
              <span>{user.slice(0, 1)}</span>
              {user}
            </button>
          ))}
        </div>
      )}

      {submenu?.id === 'backlog' ? (
        <BacklogBoard items={backlogItems} onOpenTicket={openTicket} />
      ) : (
        <KanbanBoard
          columns={boardColumns}
          currentUserName={currentUserName}
          currentUsername={currentUsername}
          selectedUser={selectedUser}
          draggedTicket={draggedTicket}
          setDraggedTicket={setDraggedTicket}
          dropTargetColumn={dropTargetColumn}
          setDropTargetColumn={setDropTargetColumn}
          onMoveTicket={updateTicketData}
          onOpenTicket={openTicket}
          onCreateTicket={setCreateColumnId}
        />
      )}
      {(selectedTicket || createColumnId) && (
        <TicketDialog
          ticket={selectedTicket}
          columns={boardColumns}
          backlogItems={backlogItems}
          defaultColumnId={createColumnId}
          nextTicketId={nextTicketId}
          currentUserName={currentUserName}
          currentUsername={currentUsername}
          teamUsers={teamUsers}
          onClose={() => {
            setSelectedTicket(null);
            setCreateColumnId(null);
          }}
          onCreate={createTicket}
          onAddComment={addTicketComment}
          onAddFiles={addTicketFiles}
          onUpdateTicket={updateTicketData}
          onDeleteTicket={deleteTicket}
        />
      )}
    </section>
  );
}

function columnsLabelFor(columns, columnId) {
  return columns.find((column) => column.id === columnId)?.title;
}

function canOperateOnTicket(ticket, currentUserName, currentUsername) {
  return (
    ticket?.ownerUsername === currentUsername ||
    ticket?.assignedToUsername === currentUsername ||
    ticket?.owner === currentUserName ||
    ticket?.assignedTo === currentUserName
  );
}

function KanbanBoard({
  columns,
  currentUserName,
  currentUsername,
  selectedUser,
  draggedTicket,
  setDraggedTicket,
  dropTargetColumn,
  setDropTargetColumn,
  onMoveTicket,
  onOpenTicket,
  onCreateTicket,
}) {
  const suppressCardOpenUntilRef = useRef(0);

  function moveTicket(targetColumnId) {
    if (!draggedTicket || draggedTicket.columnId === targetColumnId) {
      setDraggedTicket(null);
      setDropTargetColumn(null);
      return;
    }

    const sourceColumn = columns.find((column) => column.id === draggedTicket.columnId);
    const movedCard = sourceColumn?.cards.find((card) => card.id === draggedTicket.cardId);

    if (canOperateOnTicket(movedCard, currentUserName, currentUsername)) {
      onMoveTicket(draggedTicket.cardId, { columnId: targetColumnId });
    }

    setDraggedTicket(null);
    setDropTargetColumn(null);
  }

  return (
    <div className="kanban-grid" aria-label="Kanban columns">
      {columns.map((column) => {
        const cards =
          selectedUser === 'all'
            ? column.cards
            : column.cards.filter((card) => card.owner === selectedUser || card.assignedTo === selectedUser);

        return (
        <section
          className={`kanban-column kanban-column--${column.id} ${draggedTicket ? 'is-drop-ready' : ''} ${
            dropTargetColumn === column.id ? 'is-drop-target' : ''
          }`}
          key={column.id}
          onDragEnter={() => setDropTargetColumn(column.id)}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            if (dropTargetColumn !== column.id) setDropTargetColumn(column.id);
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setDropTargetColumn(null);
            }
          }}
          onDrop={() => moveTicket(column.id)}
        >
          <header>
            <div>
              <h2>
                <span className="status-dot" />
                {column.title}
              </h2>
              <span>{cards.length}</span>
            </div>
          </header>

          <div className="kanban-card-list">
            {cards.map((card) => (
              <article
                className={`kanban-card ${draggedTicket?.cardId === card.id ? 'is-dragging' : ''}`}
                key={card.id}
                draggable={canOperateOnTicket(card, currentUserName, currentUsername)}
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  if (event.detail === 0 || performance.now() < suppressCardOpenUntilRef.current) return;
                  onOpenTicket({ ...card, status: column.title, columnId: column.id });
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onOpenTicket({ ...card, status: column.title, columnId: column.id });
                  }
                }}
                onDragStart={(event) => {
                  if (!canOperateOnTicket(card, currentUserName, currentUsername)) {
                    event.preventDefault();
                    return;
                  }
                  event.dataTransfer.effectAllowed = 'move';
                  suppressCardOpenUntilRef.current = Number.POSITIVE_INFINITY;
                  setDraggedTicket({ cardId: card.id, columnId: column.id });
                }}
                onDragEnd={() => {
                  setDraggedTicket(null);
                  setDropTargetColumn(null);
                  suppressCardOpenUntilRef.current = performance.now() + 750;
                }}
              >
                <div className="card-topline">
                  <span className={`status-pill status-pill-${column.id}`}>{column.title}</span>
                  <span className={`priority priority-${card.priority.toLowerCase()}`}>{card.priority}</span>
                </div>
                <h3>{card.title}</h3>
                <div className="card-assignee">
                  <span className="owner-chip">{card.owner.slice(0, 1)}</span>
                  <strong>{card.owner}</strong>
                </div>
                <div className="card-meta">
                  {card.assignedTo && <span>{card.assignedTo}</span>}
                  <span>{card.project}</span>
                  <span>{card.tag}</span>
                </div>
                <footer>
                  <span>{card.id}</span>
                  <span><MessageSquareText size={13} /> {card.comments ?? card.commentList?.length ?? 0}</span>
                </footer>
              </article>
            ))}
            {cards.length === 0 && <div className="empty-column">No tickets for this user</div>}
            <button className="new-task-row" type="button" onClick={() => onCreateTicket(column.id)}>+ New task</button>
          </div>
        </section>
        );
      })}
    </div>
  );
}

function BacklogBoard({ items, onOpenTicket }) {
  return (
    <section className="backlog-board">
      <header>
        <div>
          <h2>Ready for planning</h2>
          <p>Queued work waiting for assignment, sizing, or priority review.</p>
        </div>
      </header>
      <div className="backlog-list">
        {items.map((item) => (
          <article
            className="backlog-item"
            key={item.id}
            role="button"
            tabIndex={0}
            onClick={() =>
              onOpenTicket({
                ...item,
                status: 'Backlog',
                project: 'Backlog planning',
                tag: 'Planning',
                comments: item.comments ?? 0,
                commentList: item.commentList ?? [],
                files: item.files ?? [],
              })
            }
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onOpenTicket({
                  ...item,
                  status: 'Backlog',
                  project: 'Backlog planning',
                  tag: 'Planning',
                  comments: item.comments ?? 0,
                  commentList: item.commentList ?? [],
                  files: item.files ?? [],
                });
              }
            }}
          >
            <span>{item.id}</span>
            <strong>{item.title}</strong>
            <small>{item.owner}</small>
            <small>{item.priority}</small>
            <small>{item.estimate}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function TicketDialog({
  ticket,
  columns,
  backlogItems,
  defaultColumnId,
  nextTicketId,
  currentUserName,
  currentUsername,
  teamUsers,
  onClose,
  onCreate,
  onAddComment,
  onAddFiles,
  onUpdateTicket,
  onDeleteTicket,
}) {
  const creating = !ticket;
  const defaultColumn = columns.find((column) => column.id === defaultColumnId) ?? columns[0];
  const [commentDraft, setCommentDraft] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [openPropertyMenu, setOpenPropertyMenu] = useState(null);
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const [formError, setFormError] = useState('');
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [fileUploadError, setFileUploadError] = useState('');
  const [filesUploading, setFilesUploading] = useState(false);
  const commentInputRef = useRef(null);
  const currentUser = teamUsers.find((user) => user.username === currentUsername || user.name === currentUserName) ?? teamUsers[0];
  const [draft, setDraft] = useState({
    ticketId: nextTicketId,
    title: '',
    description: '',
    owner: currentUser?.name ?? currentUserName,
    ownerUsername: currentUser?.username ?? currentUsername,
    assignedTo: '',
    assignedToUsername: '',
    priority: '',
    project: '',
    tag: '',
    columnId: defaultColumn?.id ?? 'todo',
  });

  useEffect(() => {
    if (!openPropertyMenu) return undefined;

    function closePropertyMenu(event) {
      if (!event.target.closest('.property-menu-wrap')) {
        setOpenPropertyMenu(null);
      }
    }

    document.addEventListener('pointerdown', closePropertyMenu);

    return () => {
      document.removeEventListener('pointerdown', closePropertyMenu);
    };
  }, [openPropertyMenu]);

  function togglePropertyMenuFromArrow(event, menuId) {
    const rect = event.currentTarget.getBoundingClientRect();
    const arrowHitWidth = 28;
    if (event.clientX < rect.right - arrowHitWidth) return;
    setOpenPropertyMenu((current) => (current === menuId ? null : menuId));
  }

  function togglePropertyMenuFromKeyboard(event, menuId) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    setOpenPropertyMenu((current) => (current === menuId ? null : menuId));
  }

  useEffect(() => {
    if (creating) {
      setDraft((current) => ({ ...current, ticketId: nextTicketId }));
    }
  }, [creating, nextTicketId]);

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
    setFormError('');
  }

  function chooseDraftProperty(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
    setOpenPropertyMenu(null);
  }

  async function submitTicket(event) {
    event.preventDefault();
    const missingFields = getMissingDraftFields();
    if (missingFields.length > 0) {
      setFormError(`Fill in: ${missingFields.join(', ')}.`);
      return;
    }

    setCreatingTicket(true);
    setFormError('');
    try {
      await onCreate({ ...draft, title: draft.title.trim() });
    } catch (error) {
      setFormError(error.message || 'Unable to create card.');
    } finally {
      setCreatingTicket(false);
    }
  }

  function chooseDraftUser(type, user) {
    setDraft((current) => ({
      ...current,
      ...(type === 'owner'
        ? { owner: user.name, ownerUsername: user.username }
        : { assignedTo: user.name, assignedToUsername: user.username }),
    }));
    setFormError('');
    setOpenPropertyMenu(null);
  }

  function getMissingDraftFields() {
    return [
      [draft.title, 'title'],
      [draft.description, 'description'],
      [draft.ownerUsername, 'opened by'],
      [draft.assignedToUsername, 'assigned to'],
      [draft.priority, 'priority'],
      [draft.tag, 'task type'],
      [draft.project, 'epic'],
      [draft.columnId, 'status'],
    ]
      .filter(([value]) => !String(value ?? '').trim())
      .map(([, label]) => label);
  }

  async function submitComment(event) {
    event.preventDefault();
    const text = commentDraft.trim();
    if (!ticket || !text || commentSubmitting) return;
    setCommentSubmitting(true);
    setCommentError('');
    try {
      await onAddComment(ticket.id, text);
      setCommentDraft('');
    } catch (error) {
      setCommentError(error.message || 'Unable to add comment.');
    } finally {
      setCommentSubmitting(false);
    }
  }

  function handleCommentKeyDown(event) {
    const shortcut = event.ctrlKey || event.metaKey;
    if (shortcut && event.key.toLowerCase() === 'b') {
      event.preventDefault();
      applyCommentMarkup('bold');
      return;
    }
    if (shortcut && event.key.toLowerCase() === 'i') {
      event.preventDefault();
      applyCommentMarkup('italic');
      return;
    }
    if (shortcut && event.shiftKey && (event.key === '7' || event.key === '&')) {
      event.preventDefault();
      applyCommentMarkup('number');
      return;
    }
    if (shortcut && event.shiftKey && (event.key === '8' || event.key === '*')) {
      event.preventDefault();
      applyCommentMarkup('bullet');
      return;
    }
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    submitComment(event);
  }

  function applyCommentMarkup(type) {
    const input = commentInputRef.current;
    if (!input) return;

    const start = input.selectionStart;
    const end = input.selectionEnd;
    if (start === end) return;

    const selected = commentDraft.slice(start, end);
    let replacement = selected;

    if (type === 'bold') replacement = `**${selected}**`;
    if (type === 'italic') replacement = `*${selected}*`;
    if (type === 'bullet') replacement = selected.split('\n').map((line) => `- ${line}`).join('\n');
    if (type === 'number') replacement = selected.split('\n').map((line, index) => `${index + 1}. ${line}`).join('\n');

    setCommentDraft(`${commentDraft.slice(0, start)}${replacement}${commentDraft.slice(end)}`);
    requestAnimationFrame(() => {
      input.focus();
      input.selectionStart = start;
      input.selectionEnd = start + replacement.length;
      input.style.height = 'auto';
      input.style.height = `${input.scrollHeight}px`;
    });
  }

  function renderCommentText(text) {
    return text.split('\n').map((line, lineIndex, lines) => (
      <React.Fragment key={`${line}-${lineIndex}`}>
        {renderInlineMarkdown(line)}
        {lineIndex < lines.length - 1 && <br />}
      </React.Fragment>
    ));
  }

  function renderInlineMarkdown(line) {
    const parts = [];
    const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
    let lastIndex = 0;
    let match;

    while ((match = pattern.exec(line)) !== null) {
      if (match.index > lastIndex) parts.push(line.slice(lastIndex, match.index));
      const token = match[0];
      parts.push(
        token.startsWith('**')
          ? <strong key={`${token}-${match.index}`}>{token.slice(2, -2)}</strong>
          : <em key={`${token}-${match.index}`}>{token.slice(1, -1)}</em>,
      );
      lastIndex = pattern.lastIndex;
    }

    if (lastIndex < line.length) parts.push(line.slice(lastIndex));
    return parts;
  }

  async function handleFiles(event) {
    if (!ticket) return;
    setFileUploadError('');
    setFilesUploading(true);
    try {
      await onAddFiles(ticket.id, event.target.files ?? []);
    } catch (error) {
      setFileUploadError(error.message || 'Unable to upload supporting files.');
    } finally {
      setFilesUploading(false);
    }
    event.target.value = '';
  }

  const ticketComments = ticket?.commentList ?? [];
  const ticketFiles = ticket?.files ?? [];
  const ticketFilesLoading = Boolean(ticket?.filesLoading);
  const canEditTicket = canOperateOnTicket(ticket, currentUserName, currentUsername);
  const [editDraft, setEditDraft] = useState(null);

  useEffect(() => {
    setCommentsExpanded(false);
    if (!ticket || !canEditTicket) {
      setEditDraft(null);
      return;
    }

    setEditDraft({
      title: ticket.title ?? '',
      owner: ticket.owner ?? '',
      ownerUsername: ticket.ownerUsername ?? '',
      priority: ticket.priority ?? '',
      project: ticket.project ?? '',
      tag: ticket.tag ?? '',
      assignedTo: ticket.assignedTo ?? '',
      assignedToUsername: ticket.assignedToUsername ?? '',
      columnId: ticket.columnId ?? columns.find((column) => column.title === ticket.status)?.id ?? defaultColumn?.id ?? 'todo',
    });
  }, [ticket?.id, currentUserName, currentUsername, canEditTicket]);

  function commitOwnerChange(changes) {
    if (!ticket || !canEditTicket) return;
    onUpdateTicket(ticket.id, changes);
  }

  function chooseTicketUser(user) {
    setEditDraft((current) => ({
      ...current,
      assignedTo: user.name,
      assignedToUsername: user.username,
    }));
    commitOwnerChange({ assignedTo: user.name, assignedToUsername: user.username });
    setOpenPropertyMenu(null);
  }

  const createDisabled = getMissingDraftFields().length > 0;

  function chooseProperty(field, value) {
    setEditDraft((current) => ({ ...current, [field]: value }));
    commitOwnerChange({ [field]: value });
    setOpenPropertyMenu(null);
  }

  function getStatusKey(status) {
    return String(status ?? 'todo').toLowerCase().replace(/\s+/g, '-');
  }

  function renderStatusMark(status) {
    const key = getStatusKey(status);
    if (key === 'done') return <Check size={22} />;
    if (key === 'blocked') return <X size={22} />;
    if (key === 'assistance') return <UserRoundCog size={22} />;
    if (key === 'in-progress') return <ChartNoAxesColumnIncreasing size={22} />;
    return <ClipboardList size={22} />;
  }

  return (
    <div
      className="ticket-modal ticket-modal--detail"
      role="dialog"
      aria-modal="true"
      aria-label={creating ? 'Create card' : 'Ticket details'}
    >
      <div className="ticket-dialog ticket-dialog--detail">
        <header>
          <div>
            <div className="ticket-title-row">
              {creating || !canEditTicket ? (
                <h2>{creating ? 'Create card' : ticket.title}</h2>
              ) : (
                <h2
                  className="ticket-title-editable"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(event) => {
                    const nextTitle = event.currentTarget.textContent?.trim() || ticket.title;
                    setEditDraft((current) => ({ ...current, title: nextTitle }));
                    commitOwnerChange({ title: nextTitle });
                  }}
                >
                  {ticket.title}
                </h2>
              )}
              {!creating && (
                <span className={`ticket-status-mark ticket-status-mark--${getStatusKey(ticket.status)}`}>
                  {renderStatusMark(ticket.status)}
                </span>
              )}
            </div>
          </div>
          <button type="button" aria-label="Close ticket dialog" onClick={onClose}>
            <X size={19} />
          </button>
        </header>

        {creating ? (
          <form className="ticket-form ticket-form--drawer" onSubmit={submitTicket}>
            <div className="ticket-detail-shell">
              <section className="ticket-detail-main create-card-main">
                <label className="create-title-field">
                  <span>Card title</span>
                  <input value={draft.title} onChange={(event) => updateDraft('title', event.target.value)} autoFocus />
                </label>
                <section className="ticket-description">
                  <h4>Card description</h4>
                  <textarea
                    className="create-description-input"
                    value={draft.description}
                    onChange={(event) => updateDraft('description', event.target.value)}
                    placeholder="Add card description..."
                    rows={5}
                  />
                </section>
                <footer>
                  {formError && <p className="auth-error">{formError}</p>}
                  <button className="dialog-secondary" type="button" onClick={onClose}>Cancel</button>
                  <button className="dialog-primary" type="submit" disabled={createDisabled || creatingTicket}>
                    {creatingTicket ? 'Creating...' : 'Create card'}
                  </button>
                </footer>
              </section>

              <aside className="ticket-properties">
                <h4>Properties</h4>
                <label className="property-row">
                  <span>Card</span>
                  <input className="property-chip property-chip--status" value={draft.ticketId} readOnly />
                </label>
                <label className="property-row">
                  <span>Opened by</span>
                  <strong className="property-person"><span className="owner-chip">{draft.owner.slice(0, 1)}</span>{draft.owner}</strong>
                </label>
                <label className="property-row">
                  <span>Assigned to</span>
                  <div className="property-menu-wrap">
                    <button
                      className="property-chip property-chip--user"
                      type="button"
                      onClick={(event) => togglePropertyMenuFromArrow(event, 'create-assigned')}
                      onKeyDown={(event) => togglePropertyMenuFromKeyboard(event, 'create-assigned')}
                    >
                      {draft.assignedTo || 'Select user'}
                    </button>
                    {openPropertyMenu === 'create-assigned' && (
                      <div className="property-menu">
                        {teamUsers.map((user) => (
                          <button type="button" key={user.username} onClick={() => chooseDraftUser('assigned', user)}>{user.name}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </label>
                <label className="property-row">
                  <span>Priority</span>
                  <div className="property-menu-wrap">
                    <button
                      className={`property-chip property-chip--priority priority-${draft.priority.toLowerCase() || 'unset'}`}
                      type="button"
                      onClick={(event) => togglePropertyMenuFromArrow(event, 'create-priority')}
                      onKeyDown={(event) => togglePropertyMenuFromKeyboard(event, 'create-priority')}
                    >
                      {draft.priority || 'Select priority'}
                    </button>
                    {openPropertyMenu === 'create-priority' && (
                      <div className="property-menu">
                        {priorityOptions.map((priority) => (
                          <button
                            type="button"
                            key={priority}
                            onClick={() => chooseDraftProperty('priority', priority)}
                          >
                            {priority}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </label>
                <label className="property-row">
                  <span>Task type</span>
                  <div className="property-menu-wrap">
                    <button
                      className="property-chip property-chip--type"
                      type="button"
                      onClick={(event) => togglePropertyMenuFromArrow(event, 'create-task-type')}
                      onKeyDown={(event) => togglePropertyMenuFromKeyboard(event, 'create-task-type')}
                    >
                      {draft.tag || 'Select task type'}
                    </button>
                    {openPropertyMenu === 'create-task-type' && (
                      <div className="property-menu property-menu--wide property-menu--up">
                        {taskTypeOptions.map((taskType) => (
                          <button type="button" key={taskType} onClick={() => chooseDraftProperty('tag', taskType)}>{taskType}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </label>
                <label className="property-row">
                  <span>Epic</span>
                  <div className="property-menu-wrap">
                    <button
                      className="property-chip property-chip--epic"
                      type="button"
                      onClick={(event) => togglePropertyMenuFromArrow(event, 'create-epic')}
                      onKeyDown={(event) => togglePropertyMenuFromKeyboard(event, 'create-epic')}
                    >
                      {draft.project || 'Select epic'}
                    </button>
                    {openPropertyMenu === 'create-epic' && (
                      <div className="property-menu property-menu--wide property-menu--up">
                        {epicOptions.map((epic) => (
                          <button type="button" key={epic} onClick={() => chooseDraftProperty('project', epic)}>{epic}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </label>
                <label className="property-row">
                  <span>Status</span>
                  <div className="property-menu-wrap">
                    <button
                      className={`property-chip property-chip--status status-pill-${draft.columnId}`}
                      type="button"
                      onClick={(event) => togglePropertyMenuFromArrow(event, 'create-column')}
                      onKeyDown={(event) => togglePropertyMenuFromKeyboard(event, 'create-column')}
                    >
                      {draft.columnId === 'backlog' ? 'Backlog' : columns.find((column) => column.id === draft.columnId)?.title}
                    </button>
                    {openPropertyMenu === 'create-column' && (
                      <div className="property-menu property-menu--up">
                        <button type="button" onClick={() => chooseDraftProperty('columnId', 'backlog')}>Backlog</button>
                        {columns.map((column) => (
                          <button type="button" key={column.id} onClick={() => chooseDraftProperty('columnId', column.id)}>{column.title}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </label>
              </aside>
            </div>
          </form>
        ) : (
          <div className="ticket-detail-shell">
            <section className="ticket-detail-main">
              <section className="ticket-comments">
                <h4>Comments</h4>
                <div className={`comment-thread ${commentsExpanded ? 'is-expanded' : ''}`}>
                  {ticketComments.length === 0 ? (
                    <p className="empty-detail-copy">No comments yet.</p>
                  ) : commentsExpanded || ticketComments.length <= 2 ? (
                    ticketComments.map((comment) => (
                      <article key={comment.id}>
                        <span className="owner-chip">{comment.author.slice(0, 1)}</span>
                        <div>
                          <strong>{comment.author}</strong>
                          <p>{renderCommentText(comment.text)}</p>
                        </div>
                      </article>
                    ))
                  ) : (
                    <>
                      <article key={ticketComments[0].id}>
                        <span className="owner-chip">{ticketComments[0].author.slice(0, 1)}</span>
                        <div>
                          <strong>{ticketComments[0].author}</strong>
                          <p>{renderCommentText(ticketComments[0].text)}</p>
                        </div>
                      </article>
                      <button className="show-replies-button" type="button" onClick={() => setCommentsExpanded(true)}>
                        Show {ticketComments.length - 2} {ticketComments.length - 2 === 1 ? 'reply' : 'replies'}
                      </button>
                      <article key={ticketComments[ticketComments.length - 1].id}>
                        <span className="owner-chip">{ticketComments[ticketComments.length - 1].author.slice(0, 1)}</span>
                        <div>
                          <strong>{ticketComments[ticketComments.length - 1].author}</strong>
                          <p>{renderCommentText(ticketComments[ticketComments.length - 1].text)}</p>
                        </div>
                      </article>
                    </>
                  )}
                </div>
                <form className="comment-composer" onSubmit={submitComment}>
                  <textarea
                    ref={commentInputRef}
                    value={commentDraft}
                    onChange={(event) => {
                      setCommentDraft(event.target.value);
                      event.currentTarget.style.height = 'auto';
                      event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`;
                    }}
                    onKeyDown={handleCommentKeyDown}
                    placeholder="Add a comment..."
                    maxLength={5000}
                    rows={3}
                  />
                  {commentError && <p className="auth-error">{commentError}</p>}
                  <button className="dialog-primary" type="submit" disabled={!commentDraft.trim() || commentSubmitting}>
                    {commentSubmitting ? 'Adding...' : 'Add comment'}
                  </button>
                </form>
              </section>

              <section className="ticket-description">
                <h4>Task description</h4>
                <p>
                  {ticket.description || 'No description.'}
                </p>
              </section>

              <section className="ticket-files">
                <h4>Supporting files</h4>
                {ticketFilesLoading ? (
                  <div className="file-loading-placeholder" aria-label="Loading supporting files" aria-busy="true">
                    <span />
                    <span />
                    <span />
                  </div>
                ) : ticketFiles.length === 0 ? (
                  <p className="empty-detail-copy">No supporting files uploaded.</p>
                ) : (
                  ticketFiles.map((file) => (
                    <div key={file.id}>
                      <a href={file.url} target="_blank" rel="noreferrer">{file.name}</a>
                      <span>{Math.max(1, Math.round(file.size / 1024))} KB</span>
                    </div>
                  ))
                )}
                {fileUploadError && <p className="auth-error">{fileUploadError}</p>}
                <label className="file-upload-row">
                  {canEditTicket ? (
                    <>
                      <Upload size={18} />
                      <span>{filesUploading ? 'Uploading...' : 'Upload supporting files'}</span>
                      <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.webp" multiple onChange={handleFiles} disabled={filesUploading} />
                    </>
                  ) : (
                    <span>Only the opener or assignee can add supporting files.</span>
                  )}
                </label>
              </section>
            </section>

            <aside className="ticket-properties">
              <h4>Properties</h4>
              <div className="property-row">
                <span>Opened by</span>
                <strong className="property-person"><span className="owner-chip">{ticket.owner.slice(0, 1)}</span>{ticket.owner}</strong>
              </div>
              <div className="property-row">
                <span>Assigned to</span>
                {canEditTicket ? (
                  <div className="property-menu-wrap">
                    <button
                      className="property-chip property-chip--priority"
                      type="button"
                      onClick={(event) => togglePropertyMenuFromArrow(event, 'assigned')}
                      onKeyDown={(event) => togglePropertyMenuFromKeyboard(event, 'assigned')}
                    >
                      {editDraft?.assignedTo ?? ticket.assignedTo}
                    </button>
                    {openPropertyMenu === 'assigned' && (
                      <div className="property-menu">
                        {teamUsers.map((user) => (
                          <button type="button" key={user.username} onClick={() => chooseTicketUser(user)}>{user.name}</button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <strong className="property-chip property-chip--user">{ticket.assignedTo ?? ''}</strong>
                )}
              </div>
              <div className="property-row">
                <span>Priority</span>
                {canEditTicket ? (
                  <div className="property-menu-wrap">
                    <button
                      className={`property-chip property-chip--priority priority-${String(editDraft?.priority ?? ticket.priority).toLowerCase()}`}
                      type="button"
                      onClick={(event) => togglePropertyMenuFromArrow(event, 'priority')}
                      onKeyDown={(event) => togglePropertyMenuFromKeyboard(event, 'priority')}
                    >
                      {editDraft?.priority ?? ticket.priority}
                    </button>
                    {openPropertyMenu === 'priority' && (
                      <div className="property-menu">
                        {priorityOptions.map((priority) => (
                          <button
                            type="button"
                            key={priority}
                            onClick={() => chooseProperty('priority', priority)}
                          >
                            {priority}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <strong className={`property-chip property-chip--priority priority-${ticket.priority.toLowerCase()}`}>{ticket.priority}</strong>
                )}
              </div>
              <div className="property-row">
                <span>Task type</span>
                {canEditTicket ? (
                  <div className="property-menu-wrap">
                    <button
                      className="property-chip property-chip--type"
                      type="button"
                      onClick={(event) => togglePropertyMenuFromArrow(event, 'task-type')}
                      onKeyDown={(event) => togglePropertyMenuFromKeyboard(event, 'task-type')}
                    >
                      {editDraft?.tag ?? ticket.tag}
                    </button>
                    {openPropertyMenu === 'task-type' && (
                      <div className="property-menu property-menu--wide property-menu--up">
                        {taskTypeOptions.map((taskType) => (
                          <button type="button" key={taskType} onClick={() => chooseProperty('tag', taskType)}>{taskType}</button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <strong className="property-chip property-chip--type">{ticket.tag}</strong>
                )}
              </div>
              <div className="property-row">
                <span>Epic</span>
                {canEditTicket ? (
                  <div className="property-menu-wrap">
                    <button
                      className="property-chip property-chip--epic"
                      type="button"
                      onClick={(event) => togglePropertyMenuFromArrow(event, 'epic')}
                      onKeyDown={(event) => togglePropertyMenuFromKeyboard(event, 'epic')}
                    >
                      {editDraft?.project ?? ticket.project}
                    </button>
                    {openPropertyMenu === 'epic' && (
                      <div className="property-menu property-menu--wide property-menu--up">
                        {epicOptions.map((epic) => (
                          <button type="button" key={epic} onClick={() => chooseProperty('project', epic)}>{epic}</button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <strong className="property-chip property-chip--epic">{ticket.project}</strong>
                )}
              </div>
              <div className="property-row">
                <span>Status</span>
                {canEditTicket ? (
                  <div className="property-menu-wrap">
                    <button
                      className={`property-chip property-chip--status status-pill-${getStatusKey(ticket.status)}`}
                      type="button"
                      onClick={(event) => togglePropertyMenuFromArrow(event, 'status')}
                      onKeyDown={(event) => togglePropertyMenuFromKeyboard(event, 'status')}
                    >
                      {ticket.status}
                    </button>
                    {openPropertyMenu === 'status' && (
                      <div className="property-menu property-menu--up">
                        {columns.map((column) => (
                          <button type="button" key={column.id} onClick={() => chooseProperty('columnId', column.id)}>
                            {column.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <strong className={`property-chip property-chip--status status-pill-${getStatusKey(ticket.status)}`}>{ticket.status}</strong>
                )}
              </div>
              <div className="property-row"><span>Ticket</span><strong>{ticket.id}</strong></div>
              <div className="property-row"><span>Comments</span><strong>{ticket.comments ?? ticketComments.length}</strong></div>
              <div className="property-row"><span>Files</span><strong>{ticketFiles.length}</strong></div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfilePanel({
  profile,
  setProfile,
  theme,
  setTheme,
  wallpaper,
  setWallpaper,
  selectedSection = 'profile-settings',
  selectedPersonId,
  setSelectedPersonId,
  companyGraphOpen,
  setCompanyGraphOpen,
  pushHistory,
  authToken,
  localMode,
}) {
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [avatarUploadError, setAvatarUploadError] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [directoryUsers, setDirectoryUsers] = useState([]);

  const stats = [];

  useEffect(() => {
    if (!authToken || localMode) {
      setDirectoryUsers([]);
      return;
    }

    let cancelled = false;

    async function loadDirectoryUsers() {
      try {
        const response = await fetch(`${authApiBase}/api/team`, {
          credentials: 'include',
          headers: {
            ...(authToken ? { 'X-CSRF-Token': authToken } : {}),
          },
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          if (response.status === 401) notifyAuthExpired();
          throw new Error(data.error || 'Unable to load reporting structure.');
        }
        if (!cancelled) setDirectoryUsers((data.users ?? []).filter((user) => !isHiddenDirectoryUser(user)));
      } catch {
        if (!cancelled) setDirectoryUsers([]);
      }
    }

    loadDirectoryUsers();

    return () => {
      cancelled = true;
    };
  }, [authToken, localMode]);

  function managerNameFromDn(managerDn) {
    return String(managerDn ?? '').match(/^CN=([^,]+)/)?.[1] ?? '';
  }

  function userMatchesAny(user, matches) {
    const searchText = normalizedPersonText(user);
    return matches.some((match) => searchText.includes(match));
  }

  function fallbackGraphPerson(key, name, role, managerName = '') {
    return {
      username: key,
      name,
      email: '',
      phone: '',
      role,
      employeeId: '',
      department: '',
      company: '',
      office: '',
      description: '',
      managerDn: managerName ? `CN=${managerName}` : '',
    };
  }

  function graphPerson(key, name, matches, role, managerName = '') {
    const directoryUser = directoryUsers.find((user) => userMatchesAny(user, matches));
    return directoryUser
      ? { ...directoryUser, name, role, managerDn: managerName ? `CN=${managerName}` : '' }
      : fallbackGraphPerson(key, name, role, managerName);
  }

  const asadGraphUser = graphPerson('asad-ali', 'Asad Ali', ['asad'], 'Chief Executive Officer');

  const graphSeniorUsers = seniorGraphNames.map((senior) => {
    return graphPerson(senior.key, senior.fallbackName, senior.match, 'Senior PKI Engineer', asadGraphUser.name);
  });
  const graphEngineerUsers = [
    graphPerson('asim-shabbir', 'Asim Shabbir', ['asim shabbir', 'asim'], 'PKI Engineer', 'Shaharyar Raza'),
    graphPerson('danish-ali', 'Danish Ali', ['danish ali', 'danish'], 'PKI Engineer', 'Muhammad Talha'),
    graphPerson('muhammad-raza', 'Muhammad Raza', ['muhammad raza'], 'PKI Engineer', 'Waleed Ali'),
  ];
  const graphJuniorUsers = [
    graphPerson('daniel-ali', 'Daniel Ali', ['daniel ali', 'daniel'], 'Junior PKI Engineer', 'Danish Ali'),
    graphPerson('qasim-ali', 'Qasim Ali', ['qasim ali', 'qasim'], 'Junior PKI Engineer', 'Asim Shabbir'),
  ];

  const directoryByName = useMemo(
    () => new Map(directoryUsers.map((user) => [String(user.name).toLowerCase(), user])),
    [directoryUsers],
  );

  const currentDirectoryUser =
    directoryUsers.find((user) => user.username === profile.username) ??
    directoryUsers.find((user) => user.email === profile.email) ??
    directoryUsers.find((user) => user.name === profile.name) ??
    null;

  function toHierarchyPerson(user, relation) {
    return {
      id: user.username,
      name: user.name,
      role: user.role || '',
      relation,
      email: user.email || '',
      phone: user.phone || '',
      employeeId: user.employeeId || '',
      department: user.department || '',
      office: user.office || '',
      manager: managerNameFromDn(user.managerDn),
      tickets: '0',
      completed: '0',
      note: user.description || '',
    };
  }

  const managerName = managerNameFromDn(currentDirectoryUser?.managerDn ?? profile.managerDn);
  const managerUser = managerName ? directoryByName.get(managerName.toLowerCase()) : null;
  const directReports = currentDirectoryUser
    ? directoryUsers.filter((user) => managerNameFromDn(user.managerDn).toLowerCase() === currentDirectoryUser.name.toLowerCase())
    : [];
  const coworkers = managerName
    ? directoryUsers.filter(
        (user) =>
          user.username !== currentDirectoryUser?.username &&
          managerNameFromDn(user.managerDn).toLowerCase() === managerName.toLowerCase(),
      )
    : [];

  const hierarchy = [
    {
      title: 'Reports to',
      people: managerUser ? [toHierarchyPerson(managerUser, 'Manager')] : [],
    },
    {
      title: 'Works with',
      people: coworkers.map((user) => toHierarchyPerson(user, 'Colleague')),
    },
    {
      title: 'Can assign to',
      people: directReports.map((user) => toHierarchyPerson(user, 'Direct report')),
    },
  ];

  const currentPerson = {
    id: profile.username || 'current-user',
    name: profile.name || 'User',
    role: profile.role || '',
    relation: 'Current user',
    email: profile.email || '',
    phone: profile.phone || '',
    tickets: '0',
    completed: '0',
    note: profile.description || '',
  };

  const graphUsers = [asadGraphUser, ...graphSeniorUsers, ...graphEngineerUsers, ...graphJuniorUsers];
  const selectedDirectoryUser = graphUsers.find((user) => user.username === selectedPersonId);
  const selectedRelation =
    selectedPersonId === asadGraphUser.username
      ? 'Manager'
      : selectedPersonId === managerUser?.username
      ? 'Manager'
      : graphSeniorUsers.some((user) => user.username === selectedPersonId) ||
          directReports.some((user) => user.username === selectedPersonId)
        ? 'Direct report'
        : coworkers.some((user) => user.username === selectedPersonId)
          ? 'Colleague'
          : 'Team member';
  const selectedPerson =
    selectedPersonId === currentPerson.id
      ? currentPerson
      : selectedDirectoryUser
        ? toHierarchyPerson(selectedDirectoryUser, selectedRelation)
        : null;

  async function handleAvatarFile(event) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    setAvatarUploadError('');

    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setAvatarUploadError('Choose a PNG, JPG, or WebP image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setAvatarUploadError('Choose an image smaller than 10 MB.');
      return;
    }

    setAvatarUploading(true);
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      const outputSize = 320;
      const sourceSize = Math.min(bitmap.width, bitmap.height);
      const sourceX = Math.max(0, (bitmap.width - sourceSize) / 2);
      const sourceY = Math.max(0, (bitmap.height - sourceSize) / 2);
      const canvas = document.createElement('canvas');
      canvas.width = outputSize;
      canvas.height = outputSize;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Image processing is unavailable.');
      context.drawImage(bitmap, sourceX, sourceY, sourceSize, sourceSize, 0, 0, outputSize, outputSize);
      bitmap.close();

      const avatarValue = canvas.toDataURL('image/webp', 0.86);
      if (!/^data:image\/(png|jpeg|webp);base64,/i.test(avatarValue) || avatarValue.length > 700_000) {
        throw new Error('The processed image is too large.');
      }
      setProfile((current) => ({
        ...current,
        avatar: { type: 'image', value: avatarValue },
      }));
      setAvatarPickerOpen(false);
    } catch (error) {
      setAvatarUploadError(error.message || 'Unable to process this image.');
    } finally {
      setAvatarUploading(false);
    }
  }

  if (selectedSection === 'app-settings') {
    return (
      <section className="profile-panel profile-panel--settings">
        <div className="app-settings-panel">
          <header className="app-settings-header">
            <div>
              <p>Workspace</p>
              <h1>App Settings</h1>
            </div>
          </header>

          <div className="settings-grid">
            <section className="settings-card">
              <div className="preference-block">
                <h3>Theme</h3>
                <div className="segmented-control" role="group" aria-label="Theme">
                  <button className={theme === 'light' ? 'is-selected' : ''} type="button" onClick={() => setTheme('light')}>
                    <Sun size={17} /> Light
                  </button>
                  <button className={theme === 'dark' ? 'is-selected' : ''} type="button" onClick={() => setTheme('dark')}>
                    <Moon size={17} /> Dark
                  </button>
                </div>
              </div>
            </section>

            <section className="settings-card settings-card--wide">
              <div className="preference-block">
                <h3>Wallpaper</h3>
                <div className="wallpaper-grid">
                  {wallpapers.map((item) => (
                    <button
                      className={`wallpaper-swatch ${item.className} ${wallpaper === item.id ? 'is-selected' : ''}`}
                      type="button"
                      key={item.id}
                      onClick={() => setWallpaper(item.id)}
                      aria-label={item.label}
                    >
                      <span>{item.label}</span>
                      {wallpaper === item.id && <Check size={17} />}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="profile-panel">
      <div className="profile-layout">
        <aside className="profile-summary-card">
          <div className="profile-photo profile-photo--large">
            <AvatarView avatar={profile.avatar} size={72} />
          </div>
          <button className="change-avatar" type="button" onClick={() => setAvatarPickerOpen(true)}>
            <Camera size={18} />
            <span>Change avatar</span>
          </button>

          <div className="profile-identity">
            <div className="directory-field">
              <span>Name</span>
              <strong>{profile.name || 'User'}</strong>
            </div>
            <div className="directory-field">
              <span>Role</span>
              <strong>{profile.role || ''}</strong>
            </div>
          </div>

          {stats.length > 0 && (
            <div className="profile-stat-grid" aria-label="Ticket stats">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>
          )}

          <div className="profile-contact-mini">
            <div className="directory-field">
              <span><Mail size={15} /> Email</span>
              <strong>{profile.email || ''}</strong>
            </div>
            <div className="directory-field">
              <span><Phone size={15} /> Phone</span>
              <strong>{profile.phone || ''}</strong>
            </div>
            <div className="directory-field">
              <span>Employee ID</span>
              <strong>{profile.employeeId || ''}</strong>
            </div>
            <div className="directory-field">
              <span>Department</span>
              <strong>{profile.department || ''}</strong>
            </div>
            <div className="directory-field">
              <span>Office</span>
              <strong>{profile.office || ''}</strong>
            </div>
            <div className="directory-field">
              <span>Manager</span>
              <strong>{profile.managerDn ? profile.managerDn.match(/^CN=([^,]+)/)?.[1] ?? profile.managerDn : ''}</strong>
            </div>
          </div>

        </aside>

        <section className={`hierarchy-detail-card ${selectedPerson ? '' : 'is-empty'}`}>
          {selectedPerson ? (
            <>
              <div className="detail-hero">
                <span className="detail-avatar">
                  {selectedPerson.id === profile.username ? <AvatarView avatar={profile.avatar} size={44} /> : selectedPerson.name.slice(0, 1)}
                </span>
                <div>
                  <p>{selectedPerson.relation}</p>
                  <h1>{selectedPerson.name}</h1>
                  <span className="detail-role">{selectedPerson.role}</span>
                </div>
              </div>

              <div className="detail-stat-row">
                <div>
                  <strong>{selectedPerson.tickets}</strong>
                  <span>Assigned</span>
                </div>
                <div>
                  <strong>{selectedPerson.completed}</strong>
                  <span>Completed</span>
                </div>
                <div>
                  <strong>{Number(selectedPerson.tickets) - Number(selectedPerson.completed)}</strong>
                  <span>Open</span>
                </div>
              </div>

              <div className="detail-info-grid">
                <article>
                  <h2>Contact</h2>
                  <p>{selectedPerson.email}</p>
                  <p>{selectedPerson.phone}</p>
                  {selectedPerson.office && <p>{selectedPerson.office}</p>}
                </article>
                <article>
                  <h2>Profile</h2>
                  {selectedPerson.employeeId && <p>{selectedPerson.employeeId}</p>}
                  {selectedPerson.department && <p>{selectedPerson.department}</p>}
                  {selectedPerson.manager && <p>Reports to {selectedPerson.manager}</p>}
                  <p>{selectedPerson.note}</p>
                </article>
              </div>

              <div className="assignment-panel">
                <div>
                  <h2>{selectedPerson.relation === 'Direct report' ? 'Assignable work' : 'Collaboration focus'}</h2>
                  <p>
                    {selectedPerson.relation === 'Direct report'
                      ? `This person can receive tasks from ${currentPerson.name} inside the Project Board workflow.`
                      : 'Use this detail pane to understand reporting context, ownership, and escalation paths.'}
                  </p>
                </div>
                <button className="secondary-action" type="button">
                  {selectedPerson.relation === 'Direct report' ? 'Assign task' : 'View tickets'}
                </button>
              </div>
            </>
          ) : (
            <div className="empty-hierarchy-detail">
              <ChartPie size={42} />
              <h1>Reporting Structure</h1>
              <p>Open the reporting structure and select a teammate to preview their hierarchy details here.</p>
              <button
                className="secondary-action"
                type="button"
                onClick={() => {
                  pushHistory();
                  setCompanyGraphOpen(true);
                }}
              >
                Open reporting structure
              </button>
            </div>
          )}
        </section>
      </div>

      {avatarPickerOpen && (
        <div className="avatar-modal" role="dialog" aria-modal="true" aria-label="Choose avatar">
          <div className="avatar-modal-card">
            <header>
              <h2>Change avatar</h2>
              <button type="button" aria-label="Close avatar picker" onClick={() => setAvatarPickerOpen(false)} disabled={avatarUploading}>
                <X size={19} />
              </button>
            </header>
            <div className="avatar-choice-grid">
              {presetAvatars.map((avatar) => (
                <button
                  className="avatar-choice"
                  type="button"
                  key={avatar.id}
                  disabled={avatarUploading}
                  onClick={() => {
                    setProfile((current) => ({ ...current, avatar: { type: 'preset', value: avatar.id } }));
                    setAvatarPickerOpen(false);
                  }}
                >
                  <span style={{ background: avatar.gradient }}>
                    <CircleUserRound size={28} />
                  </span>
                  <small>{avatar.label}</small>
                </button>
              ))}
              <label className={`avatar-upload ${avatarUploading ? 'is-loading' : ''}`}>
                <Upload size={22} />
                <span>{avatarUploading ? 'Preparing image...' : 'Choose from system'}</span>
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarFile} disabled={avatarUploading} />
              </label>
            </div>
            {avatarUploadError && <p className="avatar-upload-error" role="alert">{avatarUploadError}</p>}
          </div>
        </div>
      )}

      {companyGraphOpen && (
        <div className="avatar-modal" role="dialog" aria-modal="true" aria-label="Company reporting graph">
          <div className="company-graph-card">
            <header>
              <h2>Company Graph</h2>
              <button
                type="button"
                aria-label="Close company graph"
                onClick={() => setCompanyGraphOpen(false)}
              >
                <X size={19} />
              </button>
            </header>
            <div className="company-graph">
              {(() => {
                const graphTiers = [
                  { key: 'executive', users: [asadGraphUser] },
                  { key: 'senior', users: graphSeniorUsers },
                  { key: 'engineer', users: graphEngineerUsers },
                  { key: 'junior', users: graphJuniorUsers },
                ];

                return (
                  <>
                    {graphTiers.map((tier, tierIndex) => (
                      <React.Fragment key={tier.key}>
                        {tierIndex > 0 && (
                          <div
                            className="graph-connector graph-connector--down"
                            style={{ width: `${Math.max(tier.users.length - 1, 0) * 166}px` }}
                            aria-hidden="true"
                          >
                            <span className="graph-connector-trunk" />
                            <span className="graph-connector-bus" />
                            {tier.users.map((person, index) => (
                              <span
                                className="graph-connector-branch"
                                key={person.username}
                                style={{ left: `${tier.users.length === 1 ? 50 : (index / (tier.users.length - 1)) * 100}%` }}
                              />
                            ))}
                          </div>
                        )}
                        <div className={`graph-tier graph-tier--${tier.key}`}>
                          {tier.users.map((person) => (
                            <button type="button" key={person.username} onClick={() => { setSelectedPersonId(person.username); setCompanyGraphOpen(false); }}>
                              <span>{person.name.slice(0, 1)}</span>
                              <strong>{person.name}</strong>
                              <small>{person.role}</small>
                            </button>
                          ))}
                        </div>
                      </React.Fragment>
                    ))}
                  </>
                );
              })()}
              </div>
            </div>
          </div>
      )}
    </section>
  );
}

function AuthPage({ onAuthenticated, wallpaperClass }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [wallpaperReady, setWallpaperReady] = useState(wallpaperClass !== 'wallpaper-default');

  useEffect(() => {
    if (wallpaperClass !== 'wallpaper-default') {
      setWallpaperReady(true);
      return undefined;
    }

    let cancelled = false;
    setWallpaperReady(false);
    const image = new Image();
    image.onload = () => {
      if (!cancelled) setWallpaperReady(true);
    };
    image.onerror = () => {
      if (!cancelled) setWallpaperReady(false);
    };
    image.src = '/Assests/ikhlas-Bkc-f-l8P-M-unsplash.jpg';

    return () => {
      cancelled = true;
    };
  }, [wallpaperClass]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!username.trim() || !password) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      if (localDevBypass) {
        const localUser = username.trim();
        await onAuthenticated(
          {
            username: localUser,
            firstName: localUser.split('@')[0] || 'Local',
            displayName: localUser,
            email: localUser.includes('@') ? localUser : '',
            phone: '',
            role: '',
            description: '',
            office: '',
          },
          'local-dev-token',
        );
        return;
      }

      const response = await fetch(`${authApiBase}/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Unable to sign in.');
      }

        await onAuthenticated(data.profile, data.csrfToken);
      setPassword('');
    } catch (error) {
      setErrorMessage(error.message || 'Unable to sign in.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-shell" aria-label="AQMA sign in">
      <div className={`auth-background ${wallpaperClass} ${wallpaperReady ? 'is-ready' : ''}`} />
      <section className="auth-card glass-panel">
        <div className="auth-brand">
          <h1>Sign in</h1>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            <span>Email or username</span>
            <div className="auth-input">
              <User size={18} strokeWidth={2.1} />
              <input
                autoComplete="username"
                autoFocus
                placeholder="Enter email or username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>
          </label>

          <label>
            <span>Password</span>
            <div className="auth-input">
              <LockKeyhole size={18} strokeWidth={2.1} />
              <input
                autoComplete="current-password"
                placeholder="Enter password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
          </label>

          <button className="auth-submit" type="submit" disabled={!username.trim() || !password || isSubmitting}>
            <KeyRound size={18} strokeWidth={2.2} />
            {isSubmitting ? 'Checking access' : 'Sign in'}
          </button>
          {errorMessage && <p className="auth-error">{errorMessage}</p>}
        </form>
      </section>
    </main>
  );
}

function App() {
  const initialPreferences = useMemo(() => readLastUserPreferences(), []);
  const [authToken, setAuthToken] = useState('');
  const [authPhase, setAuthPhase] = useState(() => (localDevBypass || sessionStorage.getItem('aqmaSessionActive') ? 'hydrating' : 'signed-out'));
  const [activeTab, setActiveTab] = useState(initialPreferences.navigation.activeTab);
  const [activeSubmenus, setActiveSubmenus] = useState(initialPreferences.navigation.activeSubmenus);
  const [theme, setTheme] = useState(initialPreferences.theme);
  const [wallpaper, setWallpaper] = useState(initialPreferences.wallpaper);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [directoryUsers, setDirectoryUsers] = useState([]);
  const [selectedPersonId, setSelectedPersonId] = useState(null);
  const [companyGraphOpen, setCompanyGraphOpen] = useState(false);
  const [navigationHistory, setNavigationHistory] = useState([]);
  const preferenceSaveTimerRef = useRef(null);
  const preferencesApiAvailableRef = useRef(true);
  const [preferenceError, setPreferenceError] = useState('');
  const [profile, setProfile] = useState({
    username: localDevBypass ? 'local-user' : '',
    name: localDevBypass ? 'Local User' : 'User',
    role: '',
    email: '',
    phone: '',
    employeeId: '',
    department: '',
    company: '',
    description: '',
    office: '',
    managerDn: '',
    avatar: { type: 'preset', value: 'blue' },
  });

  function getFirstNameFromLogin(value) {
    const accountName = value.includes('\\') ? value.split('\\').at(-1) : value;
    const localName = accountName.split('@')[0] ?? accountName;
    return localName.split(/[._\-\s]+/).filter(Boolean)[0] || localName || 'User';
  }

  function directoryProfileToAppProfile(directoryProfile) {
    const profileName =
      directoryProfile?.displayName ||
      directoryProfile?.firstName ||
      getFirstNameFromLogin(directoryProfile?.email || directoryProfile?.username || '');
    return {
      username: directoryProfile?.username || '',
      name: profileName,
      role: directoryProfile?.role || '',
      email: directoryProfile?.email || '',
      phone: directoryProfile?.phone || '',
      employeeId: directoryProfile?.employeeId || '',
      department: directoryProfile?.department || '',
      company: directoryProfile?.company || '',
      description: directoryProfile?.description || '',
      office: directoryProfile?.office || '',
      managerDn: directoryProfile?.managerDn || '',
      avatar: defaultUserPreferences.avatar,
    };
  }

  async function authenticatedRequest(path, token = '', options = {}) {
    const response = await fetch(`${authApiBase}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        ...(token ? { 'X-CSRF-Token': token } : {}),
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers ?? {}),
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) notifyAuthExpired();
      const error = new Error(data.error || 'Request failed.');
      error.code = data.code;
      throw error;
    }
    return data;
  }

  async function hydrateAuthenticatedUser(directoryProfile, token, localMode = false) {
    setPreferenceError('');
    const nextProfile = directoryProfileToAppProfile(directoryProfile);
    const username = nextProfile.username || directoryProfile?.username || 'local-user';
    try {
      localStorage.setItem('aqmaLastUsername', username);
    } catch {
      // Last-user hint is only used to avoid signed-out wallpaper flicker.
    }
    const fallbackPreferences = readUserPreferences(username);
    let preferences = fallbackPreferences;
    let nextNotifications = readNotifications(username);
    nextNotifications = mergeNotifications(nextNotifications, createProfileDiffNotifications(username, nextProfile));

    if (!localMode) {
      const [preferenceResult, ticketResult, teamResult] = await Promise.allSettled([
        authenticatedRequest('/api/preferences', token),
        authenticatedRequest('/api/tickets?includeFiles=true', token),
        authenticatedRequest('/api/team', token),
      ]);
      if (preferenceResult.status === 'fulfilled') {
        preferencesApiAvailableRef.current = true;
        preferences = preferenceResult.value.preferences
          ? sanitizeUserPreferences(preferenceResult.value.preferences)
          : fallbackPreferences;
        writeUserPreferences(username, preferences);
      } else if (preferenceResult.reason?.code === 'PREFERENCES_UNAVAILABLE') {
        preferencesApiAvailableRef.current = false;
      } else {
        setPreferenceError('Settings could not be synchronized. Local preferences are still active.');
      }
      if (ticketResult.status === 'fulfilled') {
        const loadedTickets = ticketResult.value.tickets ?? [];
        const diffNotifications = createTicketDiffNotifications(username, loadedTickets);
        nextNotifications = mergeNotifications(nextNotifications, diffNotifications);
        writeNotifications(username, nextNotifications);
        writeBoardState(buildBoardState(loadedTickets, username));
      }
      if (teamResult.status === 'fulfilled') {
        setDirectoryUsers((teamResult.value.users ?? []).filter((user) => !isHiddenDirectoryUser(user)));
      } else {
        setDirectoryUsers([]);
      }
    }

    writeNotifications(username, nextNotifications);
    setNotifications(nextNotifications);
    setProfile({ ...nextProfile, avatar: preferences.avatar });
    setTheme(preferences.theme);
    setWallpaper(preferences.wallpaper);
    setActiveTab(preferences.navigation.activeTab);
    setActiveSubmenus(preferences.navigation.activeSubmenus);
    setNavigationHistory([]);
    setAuthPhase('ready');
  }

  async function handleAuthenticated(directoryProfile, token) {
    setAuthPhase('hydrating');
    if (token) {
      sessionStorage.setItem('aqmaSessionActive', 'true');
      setAuthToken(token);
    }
    await hydrateAuthenticatedUser(directoryProfile, token, localDevBypass);
  }

  async function handleLogout() {
    setUserMenuOpen(false);
    if (!localDevBypass && authToken) {
      await authenticatedRequest('/api/auth/logout', authToken, { method: 'POST' }).catch(() => {});
    }
    sessionStorage.removeItem('aqmaSessionActive');
    sessionStorage.removeItem(userStorageKey('aqmaBoard', profile.username));
    boardStateCache = null;
    setAuthToken('');
    setDirectoryUsers([]);
    setProfile({
      username: '', name: 'User', role: '', email: '', phone: '', employeeId: '', department: '',
      company: '', description: '', office: '', managerDn: '', avatar: defaultUserPreferences.avatar,
    });
    setAuthPhase('signed-out');
  }

  function expireSession() {
    sessionStorage.removeItem('aqmaSessionActive');
    sessionStorage.removeItem(userStorageKey('aqmaBoard', profile.username));
    boardStateCache = null;
    setAuthToken('');
    setSelectedPersonId(null);
    setCompanyGraphOpen(false);
    setDirectoryUsers([]);
    setUserMenuOpen(false);
    setNotificationOpen(false);
    setProfile({
      username: '', name: 'User', role: '', email: '', phone: '', employeeId: '', department: '',
      company: '', description: '', office: '', managerDn: '', avatar: defaultUserPreferences.avatar,
    });
    setAuthPhase('signed-out');
  }

  useEffect(() => {
    window.addEventListener(authExpiredEventName, expireSession);
    return () => window.removeEventListener(authExpiredEventName, expireSession);
  }, [profile.username]);

  useEffect(() => {
    if (!localDevBypass && authPhase === 'ready' && !authToken) {
      expireSession();
    }
  }, [authPhase, authToken]);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      if (localDevBypass) {
        await hydrateAuthenticatedUser({ username: 'local-user', displayName: 'Local User' }, '', true);
        return;
      }
      const sessionActive = sessionStorage.getItem('aqmaSessionActive') === 'true';
      if (!sessionActive) {
        setAuthPhase('signed-out');
        return;
      }

      try {
        const data = await authenticatedRequest('/api/auth/me');
        if (!cancelled) {
          setAuthToken(data.csrfToken ?? '');
          await hydrateAuthenticatedUser(data.profile, data.csrfToken ?? '');
        }
      } catch {
        if (!cancelled) {
          sessionStorage.removeItem('aqmaSessionActive');
          setAuthToken('');
          setAuthPhase('signed-out');
        }
      }
    }

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (authPhase !== 'ready' || !profile.username) return undefined;
    const preferences = sanitizeUserPreferences({
      theme,
      wallpaper,
      avatar: profile.avatar,
      navigation: { activeTab, activeSubmenus },
    });
    writeUserPreferences(profile.username, preferences);

    if (localDevBypass || !authToken || !preferencesApiAvailableRef.current) return undefined;
    clearTimeout(preferenceSaveTimerRef.current);
    preferenceSaveTimerRef.current = setTimeout(() => {
      authenticatedRequest('/api/preferences', authToken, {
        method: 'PUT',
        body: JSON.stringify({ preferences }),
      }).catch((error) => {
        if (error.code === 'PREFERENCES_UNAVAILABLE') {
          preferencesApiAvailableRef.current = false;
        } else {
          setPreferenceError('Settings could not be synchronized. Local preferences are still active.');
          console.error('Preference save failed:', error.message);
        }
      });
    }, 350);

    return () => clearTimeout(preferenceSaveTimerRef.current);
  }, [authPhase, authToken, profile.username, profile.avatar, theme, wallpaper, activeTab, activeSubmenus]);

  const tab = useMemo(() => {
    if (activeTab === 'profile') return profileTab;
    return primaryMenus.find((item) => item.id === activeTab) ?? primaryMenus[0];
  }, [activeTab]);
  const activeSubmenu = activeSubmenus[tab.id] ?? tab.submenus?.[0]?.id;
  const submenu = tab.submenus?.find((item) => item.id === activeSubmenu);
  const wallpaperClass = wallpapers.find((item) => item.id === wallpaper)?.className ?? 'wallpaper-default';

  function getNavigationSnapshot() {
    return {
      activeTab,
      activeSubmenus,
      selectedPersonId,
      companyGraphOpen,
    };
  }

  function pushHistory() {
    const snapshot = getNavigationSnapshot();
    setNavigationHistory((history) => [...history, snapshot]);
  }

  function restoreSnapshot(snapshot) {
    setActiveTab(snapshot.activeTab);
    setActiveSubmenus(snapshot.activeSubmenus);
    setSelectedPersonId(snapshot.selectedPersonId);
    setCompanyGraphOpen(snapshot.companyGraphOpen);
    setUserMenuOpen(false);
  }

  function goBack() {
    setNavigationHistory((history) => {
      const previous = history.at(-1);
      if (!previous) return history;
      restoreSnapshot(previous);
      return history.slice(0, -1);
    });
  }

  function openProfileSection(section) {
    pushHistory();
    setActiveSubmenus((current) => ({ ...current, profile: section === 'preferences' ? 'app-settings' : 'profile-settings' }));
    setSelectedPersonId(null);
    setCompanyGraphOpen(false);
    setActiveTab('profile');
    setUserMenuOpen(false);
  }

  function selectMainTab(id) {
    if (activeTab !== id) {
      pushHistory();
    }
    setActiveTab(id);
    setSelectedPersonId(null);
    setCompanyGraphOpen(false);
    setUserMenuOpen(false);
  }

  function selectSubmenu(id) {
    if (activeSubmenus[tab.id] !== id) {
      pushHistory();
    }
    setSelectedPersonId(null);
    setCompanyGraphOpen(false);
    setActiveSubmenus((current) => ({ ...current, [tab.id]: id }));
  }

  const unreadNotificationCount = notifications.filter((notification) => !notification.read).length;

  function persistNotifications(nextNotifications, username = profile.username) {
    const bounded = nextNotifications.slice(0, notificationLimit);
    setNotifications(bounded);
    writeNotifications(username, bounded);
  }

  function addNotification(payload) {
    if (!profile.username) return;
    const notification = createNotification(payload);
    setNotifications((current) => {
      const next = mergeNotifications(current, [notification]);
      writeNotifications(profile.username, next);
      return next;
    });
  }

  function markNotificationRead(notificationId) {
    persistNotifications(notifications.map((notification) =>
      notification.id === notificationId ? { ...notification, read: true } : notification,
    ));
  }

  function markAllNotificationsRead() {
    persistNotifications(notifications.map((notification) => ({ ...notification, read: true })));
  }

  function clearNotifications() {
    persistNotifications([]);
  }

  if (authPhase === 'hydrating') {
    return (
      <main className="app-hydration" aria-busy="true">
        <div className={`background-image ${wallpaperClass}`} />
        <span className="app-hydration-mark" />
      </main>
    );
  }

  if (authPhase !== 'ready') {
    return <AuthPage onAuthenticated={handleAuthenticated} wallpaperClass={wallpaperClass} />;
  }

  return (
    <div className={`app-shell theme-${theme}`}>
      <div className={`background-image ${wallpaperClass}`} />
      {preferenceError && <p className="app-global-error" role="alert">{preferenceError}</p>}
      <header className="page-header" aria-label="User header">
        <label className="top-search">
          <Search size={17} strokeWidth={2} />
          <input aria-label="Search" placeholder="Search" />
        </label>
        <NotificationCenter
          notifications={notifications}
          open={notificationOpen}
          unreadCount={unreadNotificationCount}
          onToggle={() => {
            setNotificationOpen((open) => !open);
            setUserMenuOpen(false);
          }}
          onClose={() => setNotificationOpen(false)}
          onMarkAllRead={markAllNotificationsRead}
          onMarkRead={markNotificationRead}
          onClear={clearNotifications}
        />
        <div className="profile-menu-wrap">
          <button
            className="profile-header-group"
            type="button"
            aria-haspopup="menu"
            aria-expanded={userMenuOpen}
            onClick={() => {
              setUserMenuOpen((open) => !open);
              setNotificationOpen(false);
            }}
          >
            <span className="user-name">{profile.name || 'User'}</span>
            <span className="profile-avatar profile-avatar--page" aria-hidden="true">
              {profile.avatar?.type === 'image' ? <AvatarView avatar={profile.avatar} size={24} /> : <CircleUserRound size={24} strokeWidth={2.1} />}
            </span>
          </button>
          {userMenuOpen && (
            <div className="profile-dropdown" role="menu">
              <button type="button" role="menuitem" onClick={() => openProfileSection('personal')}>
                <CircleUserRound size={18} />
                <span>Profile</span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </header>
      <TopMenu
        activeTab={activeTab}
        onSelectTab={selectMainTab}
      />
      <div className="side-stack">
        <Sidebar
          activeMenu={tab}
          activeSubmenu={activeSubmenu}
          onSelectSubmenu={selectSubmenu}
        />
        {activeTab === 'profile' && navigationHistory.length > 0 && (
          <button className="back-button" type="button" aria-label="Back" onClick={goBack}>
            <ArrowLeft size={21} strokeWidth={2.1} />
          </button>
        )}
      </div>
      <MainInterface
        tab={tab}
        submenu={submenu}
        profile={profile}
        setProfile={setProfile}
        theme={theme}
        setTheme={setTheme}
        wallpaper={wallpaper}
        setWallpaper={setWallpaper}
        selectedPersonId={selectedPersonId}
        setSelectedPersonId={setSelectedPersonId}
        companyGraphOpen={companyGraphOpen}
        setCompanyGraphOpen={setCompanyGraphOpen}
        pushHistory={pushHistory}
        authToken={authToken}
        localMode={localDevBypass}
        onNotify={addNotification}
        teamUsers={directoryUsers}
      />
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
