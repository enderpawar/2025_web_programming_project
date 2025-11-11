import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken } from '../api.js';
import AuthModal from './AuthModal.jsx';

const PillInput = ({ placeholder, value, onChange }) => (
  <input
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className="rooms-search-input"
  />
);

const Avatar = ({ logoUrl, title }) => {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={title}
        className="room-avatar-img"
      />
    );
  }
  const initials = (title || '?')
    .split(' ')
    .map((t) => t[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="room-avatar-placeholder">
      {initials}
    </div>
  );
};

const RoomCard = ({ room, onClick, canDelete, onDelete }) => (
  <div className="card room-card-flex">
    <button
      onClick={onClick}
      className="room-card-button"
    >
      <Avatar logoUrl={room.logoUrl} title={room.name} />
      <div className="room-card-info">
        <div className="room-card-name">{room.name}</div>
        <div className="room-card-author">{room.authorName}</div>
        <div className="room-card-group">{room.groupName}</div>
      </div>
      <div className="room-card-arrow">›</div>
    </button>
    {canDelete && (
      <button
        title="Delete room"
        aria-label="Delete room"
        onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
        className="btn-ghost btn-sm"
      >
        X
      </button>
    )}
  </div>
);


const CreateRoomModal = ({ open, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [groupName, setGroupName] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [makePublic, setMakePublic] = useState(true);

  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-content modal-content-wide">
        <h3 className="modal-title">Create Room</h3>
        <div className="modal-form">
          <input className="input" placeholder="Room Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input" placeholder="Group Name" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
          <input className="input" placeholder="Author Name" value={authorName} onChange={(e) => setAuthorName(e.target.value)} />
          <input className="input" placeholder="Logo URL (optional)" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
          <label className="checkbox-label">
            <input type="checkbox" className="checkbox-input" checked={makePublic} onChange={(e)=>setMakePublic(e.target.checked)} /> Make Public
          </label>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={() => {
              if (!name.trim()) return;
              onCreate({
                name: name.trim(),
                groupName: groupName.trim(),
                authorName: authorName.trim(),
                logoUrl: logoUrl.trim() || undefined,
                makePublic,
              });
            }}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

const Rooms = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ room: '', group: '', author: '' });
  const [rooms, setRooms] = useState([]);
  const [open, setOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [me, setMe] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const who = await api.me();
        setMe(who);
        const list = await api.rooms();
        setRooms(list);
      } catch (e) {
        // Not logged in
        setAuthOpen(true);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const r = filters.room.toLowerCase();
    const g = filters.group.toLowerCase();
    const a = filters.author.toLowerCase();
    return rooms.filter((x) =>
      (!r || x.name.toLowerCase().includes(r)) &&
      (!g || x.groupName.toLowerCase().includes(g)) &&
      (!a || x.authorName.toLowerCase().includes(a))
    );
  }, [rooms, filters]);

  return (
    <div className="rooms-page">
      {/* Top bar */}
      <header className="header">
        <div className="header-container">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="logo focus:outline-none"
            aria-label="Go to main"
            title="Go to main"
          >
            JSC
          </button>
          {me && me.role === 'professor' && (
            <button className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
              CREATE
            </button>
          )}
        </div>
      </header>

      {/* Filters */}
      <div className="rooms-filters-container">
        <PillInput placeholder="Room Name" value={filters.room} onChange={(v) => setFilters((s) => ({ ...s, room: v }))} />
        <PillInput placeholder="Group Name" value={filters.group} onChange={(v) => setFilters((s) => ({ ...s, group: v }))} />
        <PillInput placeholder="Author Name" value={filters.author} onChange={(v) => setFilters((s) => ({ ...s, author: v }))} />
      </div>

      {/* Rooms list */}
      <div className="rooms-list-container">
        {filtered.map((room) => (
          <RoomCard
            key={room.id}
            room={room}
            onClick={() => navigate(`/rooms/${room.id}/problems`)}
            canDelete={me && me.id === room.ownerId}
            onDelete={async () => {
              const ok = confirm('Delete this room and all its problems and codes? This action cannot be undone.');
              if (!ok) return;
              try {
                await api.deleteRoom(room.id);
                setRooms((prev) => prev.filter((r) => r.id !== room.id));
              } catch (e) {
                alert(e.message);
              }
            }}
          />
        ))}
        {filtered.length === 0 && (
          <div className="rooms-empty-state">No rooms found. Try creating one.</div>
        )}
      </div>

      <CreateRoomModal
        open={open}
        onClose={() => setOpen(false)}
        onCreate={(payload) => {
          (async () => {
            try {
              const created = await api.createRoom(payload);
              setRooms((prev) => [created, ...prev]);
              setOpen(false);
            } catch (e) {
              alert(e.message);
            }
          })();
        }}
      />

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onAuthed={async () => {
          try {
            const who = await api.me();
            setMe(who);
            const list = await api.rooms();
            setRooms(list);
          } catch (e) {
            console.error(e);
          }
        }}
      />
    </div>
  );
};

export default Rooms;
