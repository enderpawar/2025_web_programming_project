import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';

const ProblemCard = ({ problem, onClick, canDelete, onDelete }) => (
  <div className="problem-card">
    <button onClick={onClick} className="problem-card-button">
      <div className="problem-card-icon">
        {problem.difficulty?.[0]?.toUpperCase() || 'P'}
      </div>
      <div className="problem-card-info">
        <div className="problem-card-title">{problem.title}</div>
        <div className="problem-card-meta">{problem.difficulty} • {problem.functionName || 'solve'}</div>
      </div>
    </button>
    {canDelete && problem.id !== 'legacy' && (
      <button
        title="Delete problem"
        aria-label="Delete problem"
        onClick={onDelete}
        className="problem-card-delete-btn"
      >
        X
      </button>
    )}
  </div>
);

const CreateProblemModal = ({ open, onClose, onCreate }) => {
  const [title, setTitle] = useState('Two Sum');
  const [difficulty, setDifficulty] = useState('Easy');
  const [functionName, setFunctionName] = useState('solve');
  const [description, setDescription] = useState('Given an array of numbers and a target, return indices of the two numbers that add up to target.');
  const [starterCode, setStarterCode] = useState('function solve(nums, target) {\n  // TODO\n}');
  const [samples, setSamples] = useState('[{"input":[[2,7,11,15],9],"output":[0,1]}]');
  const [tests, setTests] = useState('[{"input":[[2,7,11,15],9],"output":[0,1]}]');
  const [err, setErr] = useState('');
  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-content create-problem-modal">
        <h3 className="modal-title">Create Problem</h3>
        <div className="create-problem-form">
          <input className="input" placeholder="Title" value={title} onChange={(e)=>setTitle(e.target.value)} />
          <div className="form-row">
            <input className="input" placeholder="Difficulty" value={difficulty} onChange={(e)=>setDifficulty(e.target.value)} />
            <input className="input" placeholder="Function Name" value={functionName} onChange={(e)=>setFunctionName(e.target.value)} />
          </div>
          <textarea className="input form-textarea" placeholder="Description" value={description} onChange={(e)=>setDescription(e.target.value)} />
          <textarea className="input form-code-textarea" placeholder="Starter Code" value={starterCode} onChange={(e)=>setStarterCode(e.target.value)} />
          <textarea className="input form-code-textarea" placeholder='Samples JSON' value={samples} onChange={(e)=>setSamples(e.target.value)} />
          <textarea className="input form-code-textarea" placeholder='Tests JSON' value={tests} onChange={(e)=>setTests(e.target.value)} />
          {err && <div className="error-message">{err}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={()=>{
            try{
              const s = samples ? JSON.parse(samples) : [];
              const t = tests ? JSON.parse(tests) : [];
              onCreate({ title, difficulty, functionName, description, language:'javascript', starterCode, samples:s, tests:t });
            }catch(e){ setErr('Invalid JSON in samples/tests'); }
          }}>Create</button>
        </div>
      </div>
    </div>
  );
};

const InviteMemberModal = ({ open, onClose, roomId, ownerId }) => {
  const [users, setUsers] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState('');
  const [message, setMessage] = useState('');

  const fetchMembers = async () => {
    try {
      const allUsers = await api.getAllUsers();
      const roomMembers = await api.getRoomMembers(roomId);
      setUsers(allUsers);
      setMembers(roomMembers);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (open) {
      fetchMembers();
    }
  }, [open, roomId]);

  const availableUsers = users.filter(u => !members.some(m => m.id === u.id));

  const handleRemoveMember = async (userId) => {
    const member = members.find(m => m.id === userId);
    if (!member) return;
    
    const confirmRemove = confirm(`"${member.name}"을(를) 그룹에서 제거하시겠습니까?`);
    if (!confirmRemove) return;

    try {
      await api.removeMember(roomId, userId);
      setMessage(`${member.name}을(를) 제거했습니다.`);
      await fetchMembers();
      setTimeout(() => setMessage(''), 3000);
    } catch (e) {
      setMessage(`오류: ${e.message}`);
    }
  };

  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content invite-modal">
        <h3 className="modal-title">멤버 관리</h3>
        
        <div className="invite-members-section">
          <label className="form-label">현재 멤버 ({members.length}명)</label>
          <div className="invite-members-list">
            {members.map(m => (
              <div key={m.id} className="invite-member-item">
                <div className="invite-member-info">
                  <span className="invite-member-name">{m.name}</span>
                  <span className="invite-member-email">{m.email}</span>
                </div>
                {m.id !== ownerId && (
                  <button 
                    className="remove-member-btn"
                    onClick={() => handleRemoveMember(m.id)}
                    title="멤버 제거"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="invite-select-section">
          <label className="form-label">초대할 사용자 선택</label>
          <select 
            className="invite-user-select"
            value={selectedEmail}
            onChange={(e) => setSelectedEmail(e.target.value)}
          >
            <option value="">-- 사용자 선택 --</option>
            {availableUsers.map(u => (
              <option key={u.id} value={u.email}>
                {u.name} ({u.email}) - {u.role}
              </option>
            ))}
          </select>
        </div>

        {message && (
          <div className={`invite-message ${message.includes('성공') || message.includes('제거') ? 'invite-message-success' : 'invite-message-error'}`}>
            {message}
          </div>
        )}

        <div className="modal-footer">
          <button 
            className="btn btn-ghost" 
            onClick={onClose}
          >
            닫기
          </button>
          <button 
            className="btn btn-primary"
            disabled={!selectedEmail}
            onClick={async () => {
              try {
                await api.inviteMember(roomId, selectedEmail);
                setMessage('초대 성공!');
                await fetchMembers();
                setSelectedEmail('');
                setTimeout(() => setMessage(''), 3000);
              } catch (e) {
                setMessage(`오류: ${e.message}`);
              }
            }}
          >
            초대하기
          </button>
        </div>
      </div>
    </div>
  );
};

const RoomProblems = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [problems, setProblems] = useState([]);
  const [open, setOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [me, setMe] = useState(null);

  useEffect(() => {
    (async () => {
      try{
        const who = await api.me();
        setMe(who);
        const r = await api.room(roomId);
        setRoom(r);
        const list = await api.problems(roomId);
        setProblems(list);
      }catch(e){ console.error(e); }
    })();
  }, [roomId]);

  return (
    <div className="room-problems-page">
      <header className="room-problems-header-bar">
        <div className="room-problems-header-content">
          <button onClick={()=>navigate('/rooms')} className="logo">JSC</button>
          <div className="room-problems-actions">
            <button onClick={()=>navigate('/rooms')} className="btn btn-ghost btn-sm">Back</button>
            {room && me && me.id === room.ownerId && me.role === 'professor' && (
              <>
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={()=>setInviteOpen(true)}
                >
                  멤버 관리
                </button>
                <button className="btn btn-primary btn-sm" onClick={()=>setOpen(true)}>CREATE PROBLEM</button>
              </>
            )}
          </div>
        </div>
      </header>
      <div className="room-problems-container">
        <div className="room-problems-title">{room?.name || 'Room'}</div>
        <div className="problems-list">
          {problems.map((p) => (
            <ProblemCard
              key={p.id}
              problem={p}
              onClick={()=>navigate(`/rooms/${roomId}/problems/${p.id}`)}
              canDelete={me && room && me.id === room.ownerId}
              onDelete={async (e)=>{
                e.stopPropagation();
                const ok = confirm(`Delete problem "${p.title}"? This cannot be undone.`);
                if (!ok) return;
                try{
                  await api.deleteProblem(roomId, p.id);
                  setProblems((prev)=>prev.filter((x)=>x.id!==p.id));
                }catch(err){ alert(err.message); }
              }}
            />
          ))}
          {problems.length===0 && (
            <div className="problems-empty-state">No problems yet. Create one.</div>
          )}
        </div>
      </div>
      <CreateProblemModal open={open} onClose={()=>setOpen(false)} onCreate={async (payload)=>{
        try{
          const created = await api.createProblem(roomId, payload);
          setProblems((prev)=>[created, ...prev]);
          setOpen(false);
        }catch(e){ alert(e.message); }
      }} />
      <InviteMemberModal 
        open={inviteOpen} 
        onClose={()=>setInviteOpen(false)} 
        roomId={roomId}
        ownerId={room?.ownerId}
      />
    </div>
  );
};

export default RoomProblems;
