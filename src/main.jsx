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
  ShieldCheck,
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
    cards: [
      {
        id: 'AQMA-108',
        title: 'Confirm intake checklist for new site audits',
        tag: 'Audit setup',
        project: 'CLM Core Build',
        owner: 'Waleed',
        priority: 'High',
        due: 'Today',
        progress: 20,
        comments: 1,
      },
      {
        id: 'AQMA-116',
        title: 'Prepare evidence folder template',
        tag: 'Documentation',
        project: 'AQMA Internal Management',
        owner: 'Sara',
        priority: 'Medium',
        due: 'Jul 17',
        progress: 10,
        comments: 0,
      },
      {
        id: 'AQMA-124',
        title: 'Review backlog labels and escalation tags',
        tag: 'Workflow',
        project: 'CLM Core Build',
        owner: 'Ethan',
        priority: 'Low',
        due: 'Jul 20',
        progress: 0,
        comments: 1,
      },
    ],
  },
  {
    id: 'progress',
    title: 'In Progress',
    cards: [
      {
        id: 'AQMA-097',
        title: 'Update Kanban rules for field coordinators',
        tag: 'Board policy',
        project: 'AQMA Internal Management',
        owner: 'Leo',
        priority: 'High',
        due: 'Tomorrow',
        progress: 62,
        comments: 4,
      },
      {
        id: 'AQMA-103',
        title: 'Map reporting metrics to dashboard cards',
        tag: 'Analytics',
        project: 'Automation Efforts 2026',
        owner: 'Nina',
        priority: 'Medium',
        due: 'Jul 18',
        progress: 48,
        comments: 3,
      },
    ],
  },
  {
    id: 'assistance',
    title: 'Assistance',
    cards: [
      {
        id: 'AQMA-112',
        title: 'Need PKI team input on certificate renewal flow',
        tag: 'PKI Infrastructure',
        project: 'Security / Infrastructure',
        owner: 'Omar',
        priority: 'Medium',
        due: 'Jul 18',
        progress: 35,
        comments: 6,
      },
    ],
  },
  {
    id: 'blocked',
    title: 'Blocked',
    cards: [
      {
        id: 'AQMA-089',
        title: 'Validate completed ticket quality sample',
        tag: 'Quality',
        project: 'CLM Core Build',
        owner: 'Maya',
        priority: 'High',
        due: 'Jul 16',
        progress: 86,
        comments: 2,
      },
      {
        id: 'AQMA-101',
        title: 'Approve notification copy for overdue work',
        tag: 'Comms',
        project: 'AQMA Internal Management',
        owner: 'Omar',
        priority: 'Medium',
        due: 'Jul 19',
        progress: 74,
        comments: 1,
      },
    ],
  },
  {
    id: 'done',
    title: 'Done',
    cards: [
      {
        id: 'AQMA-081',
        title: 'Publish first AQMA board structure',
        tag: 'Release',
        project: 'Cert Dashboard',
        owner: 'Waleed',
        priority: 'Medium',
        due: 'Jul 12',
        progress: 100,
        comments: 38,
      },
      {
        id: 'AQMA-084',
        title: 'Connect profile settings to local state',
        tag: 'Account',
        project: 'Automation Efforts 2026',
        owner: 'Waleed',
        priority: 'Low',
        due: 'Jul 14',
        progress: 100,
        comments: 16,
      },
    ],
  },
];

const initialBacklogItems = [
  { id: 'AQMA-128', title: 'Add saved board filters', owner: 'Nina', priority: 'Medium', estimate: '3 pts' },
  { id: 'AQMA-129', title: 'Create ticket detail drawer', owner: 'Ethan', priority: 'High', estimate: '5 pts' },
  { id: 'AQMA-130', title: 'Add attachment preview state', owner: 'Sara', priority: 'Low', estimate: '2 pts' },
  { id: 'AQMA-131', title: 'Define audit export fields', owner: 'Omar', priority: 'Medium', estimate: '3 pts' },
];

const authApiBase = import.meta.env.VITE_AUTH_API_URL ?? 'http://127.0.0.1:8787';

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
        />
      ) : (
        <DefaultPanel tab={tab} submenu={submenu} />
      )}
    </main>
  );
}

function DefaultPanel({ tab, submenu }) {
  if (tab.id === 'board') {
    return <ProjectBoardPanel submenu={submenu} />;
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

function ProjectBoardPanel({ submenu }) {
  const [boardColumns, setBoardColumns] = useState(kanbanColumns);
  const [backlogItems, setBacklogItems] = useState(initialBacklogItems);
  const [selectedUser, setSelectedUser] = useState('all');
  const [draggedTicket, setDraggedTicket] = useState(null);
  const [dropTargetColumn, setDropTargetColumn] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [createColumnId, setCreateColumnId] = useState(null);
  const users = useMemo(
    () => Array.from(new Set(boardColumns.flatMap((column) => column.cards.map((card) => card.owner)))).sort(),
    [boardColumns],
  );
  const nextTicketId = useMemo(() => {
    const nextCount = boardColumns.reduce((sum, column) => sum + column.cards.length, 0) + backlogItems.length + 1;
    return `AQMA-${String(130 + nextCount).padStart(3, '0')}`;
  }, [boardColumns, backlogItems.length]);

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
    setSelectedTicket((current) => {
      if (!current || current.id !== ticketId) return current;
      return updater(current, { title: current.status });
    });
  }

  function createTicket(ticket) {
    const targetColumnId = ticket.columnId ?? 'todo';
    const targetColumn = boardColumns.find((column) => column.id === targetColumnId);
    const newTicket = {
      id: ticket.ticketId || nextTicketId,
      title: ticket.title,
      tag: ticket.tag || 'General',
      project: ticket.project || 'AQMA Internal Management',
      owner: ticket.owner || 'Waleed',
      priority: ticket.priority || 'Medium',
      description: ticket.description || '',
      due: 'Unscheduled',
      progress: targetColumn.id === 'done' ? 100 : 0,
      comments: 0,
      commentList: [],
      files: [],
    };

    if (targetColumnId === 'backlog') {
      const backlogTicket = {
        ...newTicket,
        estimate: ticket.estimate || '3 pts',
      };
      setBacklogItems((current) => [...current, backlogTicket]);
      setCreateColumnId(null);
      setSelectedTicket({ ...backlogTicket, status: 'Backlog', columnId: 'backlog' });
      return;
    }

    const safeTargetColumn = targetColumn ?? boardColumns[0];

    setBoardColumns((currentColumns) =>
      currentColumns.map((column) =>
        column.id === safeTargetColumn.id ? { ...column, cards: [...column.cards, newTicket] } : column,
      ),
    );
    setCreateColumnId(null);
    setSelectedTicket({ ...newTicket, status: safeTargetColumn.title, columnId: safeTargetColumn.id });
  }

  function addTicketComment(ticketId, text) {
    updateTicket(ticketId, (ticket) => {
      const commentList = ticket.commentList ?? [];
      const nextComment = {
        id: `${ticketId}-comment-${commentList.length + 1}`,
        author: 'Waleed',
        text,
      };
      return {
        ...ticket,
        commentList: [...commentList, nextComment],
        comments: (ticket.comments ?? 0) + 1,
      };
    });
  }

  function addTicketFiles(ticketId, files) {
    const uploadedFiles = Array.from(files).map((file) => ({
      id: `${ticketId}-file-${file.name}-${file.size}`,
      name: file.name,
      size: file.size,
      url: URL.createObjectURL(file),
    }));

    if (uploadedFiles.length === 0) return;

    updateTicket(ticketId, (ticket) => ({
      ...(ticket.owner === 'Waleed'
        ? { ...ticket, files: [...(ticket.files ?? []), ...uploadedFiles] }
        : ticket),
    }));
  }

  function updateTicketData(ticketId, changes) {
    const targetColumnId = changes.columnId;
    let updatedTicket = null;

    setBoardColumns((currentColumns) => {
      const sourceColumn = currentColumns.find((column) => column.cards.some((card) => card.id === ticketId));
      const currentTicket = sourceColumn?.cards.find((card) => card.id === ticketId);

      if (!sourceColumn || !currentTicket || currentTicket.owner !== 'Waleed') return currentColumns;

      const nextTicket = {
        ...currentTicket,
        title: changes.title || currentTicket.title,
        priority: changes.priority || currentTicket.priority,
        project: changes.project || currentTicket.project,
        tag: changes.tag || currentTicket.tag,
      };
      updatedTicket = nextTicket;

      return currentColumns.map((column) => {
        if (column.id === sourceColumn.id && column.id !== targetColumnId) {
          return { ...column, cards: column.cards.filter((card) => card.id !== ticketId) };
        }

        if (column.id === sourceColumn.id) {
          return { ...column, cards: column.cards.map((card) => (card.id === ticketId ? nextTicket : card)) };
        }

        if (column.id === targetColumnId) {
          return { ...column, cards: [...column.cards, nextTicket] };
        }

        return column;
      });
    });

    if (updatedTicket) {
      const status = columnsLabelFor(boardColumns, targetColumnId) ?? changes.status;
      setSelectedTicket({ ...updatedTicket, status, columnId: targetColumnId });
    }
  }

  function deleteTicket(ticketId) {
    let removed = false;
    setBoardColumns((currentColumns) =>
      currentColumns.map((column) => {
        const ticket = column.cards.find((card) => card.id === ticketId);
        if (!ticket || ticket.owner !== 'Waleed') return column;
        removed = true;
        return { ...column, cards: column.cards.filter((card) => card.id !== ticketId) };
      }),
    );

    if (removed) {
      setSelectedTicket(null);
    }
  }

  return (
    <section className="project-board-panel">
      <header className="board-header">
        <div>
          <p className="eyebrow">Progress Status</p>
          <h1>{submenu?.label ?? 'Kanban Board'}</h1>
          <span className="board-subtitle">AQMA progress portal for CLM and operational tracks.</span>
        </div>
        <button className="board-action" type="button" onClick={() => setCreateColumnId(submenu?.id === 'backlog' ? 'backlog' : 'todo')}>
          <ClipboardList size={18} />
          New ticket
        </button>
      </header>

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
        <BacklogBoard items={backlogItems} onOpenTicket={setSelectedTicket} />
      ) : (
        <KanbanBoard
          columns={boardColumns}
          selectedUser={selectedUser}
          draggedTicket={draggedTicket}
          setDraggedTicket={setDraggedTicket}
          dropTargetColumn={dropTargetColumn}
          setDropTargetColumn={setDropTargetColumn}
          setColumns={setBoardColumns}
          onOpenTicket={setSelectedTicket}
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

function KanbanBoard({
  columns,
  selectedUser,
  draggedTicket,
  setDraggedTicket,
  dropTargetColumn,
  setDropTargetColumn,
  setColumns,
  onOpenTicket,
  onCreateTicket,
}) {
  function moveTicket(targetColumnId) {
    if (!draggedTicket || draggedTicket.columnId === targetColumnId) {
      setDraggedTicket(null);
      setDropTargetColumn(null);
      return;
    }

    setColumns((currentColumns) => {
      const sourceColumn = currentColumns.find((column) => column.id === draggedTicket.columnId);
      const movedCard = sourceColumn?.cards.find((card) => card.id === draggedTicket.cardId);

      if (!movedCard || movedCard.owner !== 'Waleed') return currentColumns;

      return currentColumns.map((column) => {
        if (column.id === draggedTicket.columnId) {
          return { ...column, cards: column.cards.filter((card) => card.id !== draggedTicket.cardId) };
        }

        if (column.id === targetColumnId) {
          return { ...column, cards: [...column.cards, movedCard] };
        }

        return column;
      });
    });
    setDraggedTicket(null);
    setDropTargetColumn(null);
  }

  return (
    <div className="kanban-grid" aria-label="Kanban columns">
      {columns.map((column) => {
        const cards = selectedUser === 'all' ? column.cards : column.cards.filter((card) => card.owner === selectedUser);

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
                draggable={card.owner === 'Waleed'}
                role="button"
                tabIndex={0}
                onClick={() => onOpenTicket({ ...card, status: column.title, columnId: column.id })}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onOpenTicket({ ...card, status: column.title, columnId: column.id });
                  }
                }}
                onDragStart={(event) => {
                  if (card.owner !== 'Waleed') {
                    event.preventDefault();
                    return;
                  }
                  event.dataTransfer.effectAllowed = 'move';
                  setDraggedTicket({ cardId: card.id, columnId: column.id });
                }}
                onDragEnd={() => {
                  setDraggedTicket(null);
                  setDropTargetColumn(null);
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
  const [editingTicket, setEditingTicket] = useState(false);
  const [openPropertyMenu, setOpenPropertyMenu] = useState(null);
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const commentInputRef = useRef(null);
  const [draft, setDraft] = useState({
    ticketId: nextTicketId,
    title: '',
    description: '',
    owner: 'Waleed',
    priority: 'Medium',
    project: 'AQMA Internal Management',
    tag: 'General',
    columnId: defaultColumn?.id ?? 'todo',
  });

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function chooseDraftProperty(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
    setOpenPropertyMenu(null);
  }

  function submitTicket(event) {
    event.preventDefault();
    if (!draft.title.trim()) return;
    onCreate({ ...draft, title: draft.title.trim() });
  }

  function submitComment(event) {
    event.preventDefault();
    const text = commentDraft.trim();
    if (!ticket || !text) return;
    onAddComment(ticket.id, text);
    setCommentDraft('');
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

  function handleFiles(event) {
    if (!ticket) return;
    onAddFiles(ticket.id, event.target.files ?? []);
    event.target.value = '';
  }

  const ticketComments = ticket?.commentList ?? [];
  const ticketFiles = ticket?.files ?? [];
  const isOwnedByCurrentUser = ticket?.owner === 'Waleed';
  const [editDraft, setEditDraft] = useState(null);

  useEffect(() => {
    setCommentsExpanded(false);
    if (!ticket || ticket.owner !== 'Waleed') {
      setEditDraft(null);
      return;
    }

    setEditDraft({
      title: ticket.title ?? '',
      priority: ticket.priority ?? 'Medium',
      project: ticket.project ?? '',
      tag: ticket.tag ?? '',
      columnId: ticket.columnId ?? columns.find((column) => column.title === ticket.status)?.id ?? defaultColumn?.id ?? 'todo',
    });
  }, [ticket?.id]);

  function commitOwnerChange(changes) {
    if (!ticket || !isOwnedByCurrentUser) return;
    onUpdateTicket(ticket.id, {
      title: changes.title ?? editDraft.title,
      priority: changes.priority ?? editDraft.priority,
      project: changes.project ?? editDraft.project,
      tag: changes.tag ?? editDraft.tag,
      columnId: changes.columnId ?? editDraft.columnId,
    });
  }

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
              {creating || !isOwnedByCurrentUser ? (
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
                  <button className="dialog-secondary" type="button" onClick={onClose}>Cancel</button>
                  <button className="dialog-primary" type="submit">Create card</button>
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
                  <div className="property-menu-wrap">
                    <button className="property-chip property-chip--priority" type="button" onClick={() => setOpenPropertyMenu(openPropertyMenu === 'create-owner' ? null : 'create-owner')}>
                      {draft.owner}
                    </button>
                    {openPropertyMenu === 'create-owner' && (
                      <div className="property-menu">
                        {['Waleed', 'Ethan', 'Leo', 'Maya', 'Nina', 'Omar', 'Sara'].map((user) => (
                          <button type="button" key={user} onClick={() => chooseDraftProperty('owner', user)}>{user}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </label>
                <label className="property-row">
                  <span>Priority</span>
                  <div className="property-menu-wrap">
                    <button className="property-chip property-chip--priority" type="button" onClick={() => setOpenPropertyMenu(openPropertyMenu === 'create-priority' ? null : 'create-priority')}>
                      {draft.priority}
                    </button>
                    {openPropertyMenu === 'create-priority' && (
                      <div className="property-menu">
                        {['High', 'Medium', 'Low'].map((option) => (
                          <button type="button" key={option} onClick={() => chooseDraftProperty('priority', option)}>{option}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </label>
                <label className="property-row">
                  <span>Task type</span>
                  <div className="property-menu-wrap">
                    <button className="property-chip property-chip--type" type="button" onClick={() => setOpenPropertyMenu(openPropertyMenu === 'create-tag' ? null : 'create-tag')}>
                      {draft.tag}
                    </button>
                    {openPropertyMenu === 'create-tag' && (
                      <div className="property-menu">
                        {['General', 'Board policy', 'Quality', 'Documentation', 'Release'].map((option) => (
                          <button type="button" key={option} onClick={() => chooseDraftProperty('tag', option)}>{option}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </label>
                <label className="property-row">
                  <span>Epic</span>
                  <div className="property-menu-wrap">
                    <button className="property-chip property-chip--epic" type="button" onClick={() => setOpenPropertyMenu(openPropertyMenu === 'create-project' ? null : 'create-project')}>
                      {draft.project}
                    </button>
                    {openPropertyMenu === 'create-project' && (
                      <div className="property-menu">
                        {['AQMA Internal Management', 'CLM Core Build', 'Cert Dashboard', 'Automation Efforts 2026', 'Security / Infrastructure'].map((option) => (
                          <button type="button" key={option} onClick={() => chooseDraftProperty('project', option)}>{option}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </label>
                <label className="property-row">
                  <span>Destination</span>
                  <div className="property-menu-wrap">
                    <button className={`property-chip property-chip--status status-pill-${draft.columnId}`} type="button" onClick={() => setOpenPropertyMenu(openPropertyMenu === 'create-column' ? null : 'create-column')}>
                      {draft.columnId === 'backlog' ? 'Backlog' : columns.find((column) => column.id === draft.columnId)?.title}
                    </button>
                    {openPropertyMenu === 'create-column' && (
                      <div className="property-menu">
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
                    rows={3}
                  />
                  <button className="dialog-primary" type="submit">Add comment</button>
                </form>
              </section>

              <section className="ticket-description">
                <h4>Task description</h4>
                <p>
                  {ticket.description || `Track work for ${ticket.project}. Current focus is ${ticket.tag.toLowerCase()} with priority marked as ${ticket.priority.toLowerCase()}.`}
                </p>
              </section>

              <section className="ticket-files">
                <h4>Supporting files</h4>
                {ticketFiles.length === 0 ? (
                  <p className="empty-detail-copy">No supporting files uploaded.</p>
                ) : (
                  ticketFiles.map((file) => (
                    <div key={file.id}>
                      <a href={file.url} target="_blank" rel="noreferrer">{file.name}</a>
                      <span>{Math.max(1, Math.round(file.size / 1024))} KB</span>
                    </div>
                  ))
                )}
                <label className="file-upload-row">
                  {isOwnedByCurrentUser ? (
                    <>
                      <Upload size={18} />
                      <span>Upload supporting files</span>
                      <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,image/*" multiple onChange={handleFiles} />
                    </>
                  ) : (
                    <span>Only the ticket owner can add supporting files.</span>
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
                <span>Priority</span>
                {isOwnedByCurrentUser ? (
                  <div className="property-menu-wrap">
                    <button
                      className="property-chip property-chip--priority"
                      type="button"
                      onClick={() => setOpenPropertyMenu(openPropertyMenu === 'priority' ? null : 'priority')}
                    >
                      {editDraft?.priority ?? ticket.priority}
                    </button>
                    {openPropertyMenu === 'priority' && (
                      <div className="property-menu">
                        {['High', 'Medium', 'Low'].map((option) => (
                          <button type="button" key={option} onClick={() => chooseProperty('priority', option)}>
                            {option}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <strong className="property-chip property-chip--priority">{ticket.priority}</strong>
                )}
              </div>
              <div className="property-row">
                <span>Task type</span>
                {isOwnedByCurrentUser ? (
                  <input
                    className="property-chip property-chip--type"
                    value={editDraft?.tag ?? ticket.tag}
                    onChange={(event) => setEditDraft((current) => ({ ...current, tag: event.target.value }))}
                    onBlur={() => commitOwnerChange({ tag: editDraft?.tag || ticket.tag })}
                  />
                ) : (
                  <strong className="property-chip property-chip--type">{ticket.tag}</strong>
                )}
              </div>
              <div className="property-row">
                <span>Epic</span>
                {isOwnedByCurrentUser ? (
                  <input
                    className="property-chip property-chip--epic"
                    value={editDraft?.project ?? ticket.project}
                    onChange={(event) => setEditDraft((current) => ({ ...current, project: event.target.value }))}
                    onBlur={() => commitOwnerChange({ project: editDraft?.project || ticket.project })}
                  />
                ) : (
                  <strong className="property-chip property-chip--epic">{ticket.project}</strong>
                )}
              </div>
              <div className="property-row">
                <span>Status</span>
                {isOwnedByCurrentUser ? (
                  <div className="property-menu-wrap">
                    <button
                      className={`property-chip property-chip--status status-pill-${getStatusKey(ticket.status)}`}
                      type="button"
                      onClick={() => setOpenPropertyMenu(openPropertyMenu === 'status' ? null : 'status')}
                    >
                      {ticket.status}
                    </button>
                    {openPropertyMenu === 'status' && (
                      <div className="property-menu">
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
}) {
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);

  const stats = [
    { label: 'Assigned tickets', value: '42' },
    { label: 'Completed', value: '31' },
    { label: 'Open', value: '11' },
  ];

  const hierarchy = [
    {
      title: 'Reports to',
      people: [
        {
          id: 'maya',
          name: 'Maya Chen',
          role: 'Program Director',
          relation: 'Manager',
          email: 'maya.chen@example.com',
          phone: '+1 (555) 310-2244',
          tickets: '18',
          completed: '16',
          note: 'Owns delivery strategy and approves priority changes.',
        },
        {
          id: 'omar',
          name: 'Omar Khalid',
          role: 'Operations Lead',
          relation: 'Lead reviewer',
          email: 'omar.khalid@example.com',
          phone: '+1 (555) 812-4419',
          tickets: '24',
          completed: '20',
          note: 'Reviews AQMA workflow quality and unblock decisions.',
        },
      ],
    },
    {
      title: 'Works with',
      people: [
        {
          id: 'nina',
          name: 'Nina Patel',
          role: 'Data Analyst',
          relation: 'Colleague',
          email: 'nina.patel@example.com',
          phone: '+1 (555) 472-1188',
          tickets: '29',
          completed: '23',
          note: 'Maintains monitoring data and reporting inputs.',
        },
        {
          id: 'leo',
          name: 'Leo Martin',
          role: 'Field Coordinator',
          relation: 'Colleague',
          email: 'leo.martin@example.com',
          phone: '+1 (555) 674-9021',
          tickets: '21',
          completed: '15',
          note: 'Coordinates field checks and follow-up evidence.',
        },
      ],
    },
    {
      title: 'Can assign to',
      people: [
        {
          id: 'sara',
          name: 'Sara Lee',
          role: 'Junior Reviewer',
          relation: 'Direct report',
          email: 'sara.lee@example.com',
          phone: '+1 (555) 226-7308',
          tickets: '13',
          completed: '9',
          note: 'Handles first-pass task review and documentation cleanup.',
        },
        {
          id: 'ethan',
          name: 'Ethan Brooks',
          role: 'Support Analyst',
          relation: 'Direct report',
          email: 'ethan.brooks@example.com',
          phone: '+1 (555) 534-6177',
          tickets: '16',
          completed: '12',
          note: 'Supports backlog grooming and ticket validation.',
        },
      ],
    },
  ];

  const currentPerson = {
    id: 'waleed',
    name: profile.name || 'Waleed',
    role: profile.role || 'AQMA Coordinator',
    relation: 'Current user',
    email: profile.email || 'waleed@example.com',
    phone: profile.phone || '+1 (555) 019-2846',
    tickets: '42',
    completed: '31',
    note: profile.description || 'Responsible for coordinating AQMA board execution, assignments, and review flow.',
  };

  const selectedPerson =
    selectedPersonId === 'waleed'
      ? currentPerson
      : hierarchy.flatMap((group) => group.people).find((person) => person.id === selectedPersonId) ?? null;

  function handleAvatarFile(event) {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = () => {
      setProfile((current) => ({
        ...current,
        avatar: { type: 'image', value: String(reader.result) },
      }));
      setAvatarPickerOpen(false);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
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
              <strong>{profile.role || 'AQMA Coordinator'}</strong>
            </div>
          </div>

          <div className="profile-stat-grid" aria-label="Ticket stats">
            {stats.map((stat) => (
              <div key={stat.label}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>

          <div className="profile-contact-mini">
            <div className="directory-field">
              <span><Mail size={15} /> Email</span>
              <strong>{profile.email || 'Not available'}</strong>
            </div>
            <div className="directory-field">
              <span><Phone size={15} /> Phone</span>
              <strong>{profile.phone || 'Not available'}</strong>
            </div>
            <div className="directory-field">
              <span>Office</span>
              <strong>{profile.office || 'Not available'}</strong>
            </div>
            <div className="directory-field">
              <span>Description</span>
              <strong>{profile.description || 'Not available'}</strong>
            </div>
          </div>

        </aside>

        <section className={`hierarchy-detail-card ${selectedPerson ? '' : 'is-empty'}`}>
          {selectedPerson ? (
            <>
              <div className="detail-hero">
                <span className="detail-avatar">
                  {selectedPerson.id === 'waleed' ? <AvatarView avatar={profile.avatar} size={44} /> : selectedPerson.name.slice(0, 1)}
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
                </article>
                <article>
                  <h2>Responsibility</h2>
                  <p>{selectedPerson.note}</p>
                </article>
              </div>

              <div className="assignment-panel">
                <div>
                  <h2>{selectedPerson.relation === 'Direct report' ? 'Assignable work' : 'Collaboration focus'}</h2>
                  <p>
                    {selectedPerson.relation === 'Direct report'
                      ? 'This person can receive tasks from Waleed inside the Project Board workflow.'
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
              <button type="button" aria-label="Close avatar picker" onClick={() => setAvatarPickerOpen(false)}>
                <X size={19} />
              </button>
            </header>
            <div className="avatar-choice-grid">
              {presetAvatars.map((avatar) => (
                <button
                  className="avatar-choice"
                  type="button"
                  key={avatar.id}
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
              <label className="avatar-upload">
                <Upload size={22} />
                <span>Choose from system</span>
                <input type="file" accept="image/*" onChange={handleAvatarFile} />
              </label>
            </div>
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
              <div className="graph-tier">
                {hierarchy[0].people.map((person) => (
                  <button type="button" key={person.id} onClick={() => { setSelectedPersonId(person.id); setCompanyGraphOpen(false); }}>
                    <span>{person.name.slice(0, 1)}</span>
                    <strong>{person.name}</strong>
                    <small>{person.role}</small>
                  </button>
                ))}
              </div>
              <div className="graph-tier graph-tier--self">
                <button type="button" onClick={() => { setSelectedPersonId('waleed'); setCompanyGraphOpen(false); }}>
                  <span><AvatarView avatar={profile.avatar} size={24} /></span>
                  <strong>{profile.name || 'Waleed'}</strong>
                  <small>{profile.role || 'AQMA Coordinator'}</small>
                </button>
              </div>
              <div className="graph-tier">
                {hierarchy[2].people.map((person) => (
                  <button type="button" key={person.id} onClick={() => { setSelectedPersonId(person.id); setCompanyGraphOpen(false); }}>
                    <span>{person.name.slice(0, 1)}</span>
                    <strong>{person.name}</strong>
                    <small>{person.role}</small>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function AuthPage({ onAuthenticated }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (!username.trim() || !password) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await fetch(`${authApiBase}/api/auth/login`, {
        method: 'POST',
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

      onAuthenticated(data.profile, data.token);
      setPassword('');
    } catch (error) {
      setErrorMessage(error.message || 'Unable to sign in.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-shell" aria-label="AQMA sign in">
      <div className="auth-background wallpaper-default" />
      <section className="auth-card glass-panel">
        <div className="auth-brand">
          <span className="auth-brand-mark" aria-hidden="true">
            <ShieldCheck size={34} strokeWidth={1.9} />
          </span>
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
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(sessionStorage.getItem('aqmaAuthToken')));
  const [authToken, setAuthToken] = useState(() => sessionStorage.getItem('aqmaAuthToken') ?? '');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeSubmenus, setActiveSubmenus] = useState({
    dashboard: 'overview',
    board: 'kanban',
    analytics: 'metrics',
    profile: 'profile-settings',
  });
  const [theme, setTheme] = useState('light');
  const [wallpaper, setWallpaper] = useState('default');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState(null);
  const [companyGraphOpen, setCompanyGraphOpen] = useState(false);
  const [navigationHistory, setNavigationHistory] = useState([]);
  const [profile, setProfile] = useState({
    name: 'Waleed',
    role: 'AQMA Coordinator',
    email: 'waleed@example.com',
    phone: '+1 (555) 019-2846',
    description: '',
    office: '',
    avatar: { type: 'preset', value: 'blue' },
  });

  function getFirstNameFromLogin(value) {
    const accountName = value.includes('\\') ? value.split('\\').at(-1) : value;
    const localName = accountName.split('@')[0] ?? accountName;
    return localName.split(/[._\-\s]+/).filter(Boolean)[0] || localName || 'User';
  }

  function applyDirectoryProfile(directoryProfile) {
    const firstName = directoryProfile?.firstName || getFirstNameFromLogin(directoryProfile?.email || directoryProfile?.username || '');
    setProfile((current) => ({
      ...current,
      name: firstName,
      role: directoryProfile?.role || current.role,
      email: directoryProfile?.email || current.email,
      phone: directoryProfile?.phone || 'Not available',
      description: directoryProfile?.description || '',
      office: directoryProfile?.office || '',
    }));
  }

  function handleAuthenticated(directoryProfile, token) {
    applyDirectoryProfile(directoryProfile);
    if (token) {
      sessionStorage.setItem('aqmaAuthToken', token);
      setAuthToken(token);
    }
    setIsAuthenticated(true);
  }

  useEffect(() => {
    if (!authToken) return;

    let cancelled = false;

    async function refreshProfile() {
      try {
        const response = await fetch(`${authApiBase}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.error || 'Session expired.');
        }

        if (!cancelled) {
          applyDirectoryProfile(data.profile);
          setIsAuthenticated(true);
        }
      } catch {
        if (!cancelled) {
          sessionStorage.removeItem('aqmaAuthToken');
          setAuthToken('');
          setIsAuthenticated(false);
        }
      }
    }

    refreshProfile();

    return () => {
      cancelled = true;
    };
  }, [authToken]);

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

  if (!isAuthenticated) {
    return <AuthPage onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className={`app-shell theme-${theme}`}>
      <div className={`background-image ${wallpaperClass}`} />
      <header className="page-header" aria-label="User header">
        <label className="top-search">
          <Search size={17} strokeWidth={2} />
          <input aria-label="Search" placeholder="Search" />
        </label>
        <button className="notification-button has-notification" type="button" aria-label="Notifications">
          <Bell size={20} strokeWidth={2.05} />
        </button>
        <div className="profile-menu-wrap">
          <button
            className="profile-header-group"
            type="button"
            aria-haspopup="menu"
            aria-expanded={userMenuOpen}
            onClick={() => setUserMenuOpen((open) => !open)}
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
                onClick={() => {
                  setUserMenuOpen(false);
                  sessionStorage.removeItem('aqmaAuthToken');
                  setAuthToken('');
                  setIsAuthenticated(false);
                }}
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
      />
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
