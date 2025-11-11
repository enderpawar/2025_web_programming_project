import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken } from '../api.js';
import AuthModal from './AuthModal.jsx';

const PillInput = ({ placeholder, value, onChange }) => (
  <input
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className="w-full max-w-sm bg-transparent border-b border-white/20 focus:border-white/40 outline-none px-2 py-2 text-white placeholder-white/40"
  />
);

const Avatar = ({ logoUrl, title }) => {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={title}
        className="w-14 h-14 rounded-lg object-cover ring-1 ring-white/10 bg-white/5"
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
    <div className="w-14 h-14 rounded-lg bg-white/10 grid place-items-center text-white/80 font-bold">
      {initials}
    </div>
  );
};

const RoomCard = ({ room, onClick, canDelete, onDelete }) => (
  <div className="w-full bg-white/5 hover:bg-white/10 transition rounded-xl border border-white/10 p-4 flex items-center gap-4">
    <button
      onClick={onClick}
      className="flex-1 text-left flex items-center gap-4"
    >
      <Avatar logoUrl={room.logoUrl} title={room.name} />
      <div className="flex-1 overflow-hidden">
        <div className="text-lg font-semibold text-white/90 truncate">{room.name}</div>
        <div className="text-sm text-white/70 truncate">{room.authorName}</div>
        <div className="text-xs text-white/50 truncate">{room.groupName}</div>
      </div>
      <div className="text-white/30">›</div>
    </button>
    {canDelete && (
      <button
        title="Delete room"
        aria-label="Delete room"
        onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
        className="px-2 py-1 rounded bg-transparent hover:bg-white/10 text-white/70 text-xs"
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
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#0f2135] rounded-xl border border-white/10 p-6 text-white">
        <h3 className="text-lg font-semibold mb-4">Create Room</h3>
        <div className="space-y-3">
          <input className="w-full bg-white/5 rounded-lg px-3 py-2 outline-none border border-white/10" placeholder="Room Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="w-full bg-white/5 rounded-lg px-3 py-2 outline-none border border-white/10" placeholder="Group Name" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
          <input className="w-full bg-white/5 rounded-lg px-3 py-2 outline-none border border-white/10" placeholder="Author Name" value={authorName} onChange={(e) => setAuthorName(e.target.value)} />
          <input className="w-full bg-white/5 rounded-lg px-3 py-2 outline-none border border-white/10" placeholder="Logo URL (optional)" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
          <label className="flex items-center gap-2 text-sm text-white/80">
            <input type="checkbox" className="accent-teal-500" checked={makePublic} onChange={(e)=>setMakePublic(e.target.checked)} /> Make Public
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="px-3 py-2 rounded-md bg-white/10 hover:bg-white/20" onClick={onClose}>Cancel</button>
          <button
            className="px-3 py-2 rounded-md bg-teal-500 hover:bg-teal-400 text-black font-semibold"
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
    <div className="min-h-screen bg-[#0f2135] text-white">
      {/* Top bar */}
      <header className="border-b border-white/10 bg-[#0e1c2d]/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-teal-300 font-extrabold tracking-widest text-xl hover:opacity-90 focus:outline-none"
            aria-label="Go to main"
            title="Go to main"
          >
            JSC
          </button>
          {me && me.role === 'professor' && (
            <button className="px-3 py-1.5 rounded-md text-sm bg-teal-500 hover:bg-teal-400 text-black font-semibold" onClick={() => setOpen(true)}>
              CREATE
            </button>
          )}
        </div>
      </header>

      {/* Filters */}
      <div className="max-w-6xl mx-auto px-4 py-8 grid md:grid-cols-3 gap-6">
        <PillInput placeholder="Room Name" value={filters.room} onChange={(v) => setFilters((s) => ({ ...s, room: v }))} />
        <PillInput placeholder="Group Name" value={filters.group} onChange={(v) => setFilters((s) => ({ ...s, group: v }))} />
        <PillInput placeholder="Author Name" value={filters.author} onChange={(v) => setFilters((s) => ({ ...s, author: v }))} />
      </div>

      {/* Rooms list */}
      <div className="max-w-6xl mx-auto px-4 space-y-6 pb-12">
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
          <div className="text-white/60 text-center py-16">No rooms found. Try creating one.</div>
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
