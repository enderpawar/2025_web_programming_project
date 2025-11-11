import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';

const ProblemCard = ({ problem, onClick, canDelete, onDelete, onEdit }) => {
  const [showMenu, setShowMenu] = useState(false);
  
  return (
    <div style={{ marginBottom: '12px' }}>
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
            title="Options"
            aria-label="Toggle options"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="problem-card-delete-btn"
            style={{ 
              fontSize: '18px',
              transform: showMenu ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s ease'
            }}
          >
            ▼
          </button>
        )}
      </div>
      
      {/* Slide-down menu */}
      {canDelete && problem.id !== 'legacy' && (
        <div 
          style={{
            maxHeight: showMenu ? '60px' : '0',
            overflow: 'hidden',
            transition: 'max-height 0.3s ease',
            background: 'linear-gradient(to bottom, #1f2937, #111827)',
            borderRadius: showMenu ? '0 0 12px 12px' : '0',
            marginTop: showMenu ? '0' : '0',
            border: showMenu ? '1px solid #374151' : 'none',
            borderTop: 'none'
          }}
        >
          <div style={{
            display: 'flex',
            gap: '8px',
            padding: '10px 16px',
            justifyContent: 'flex-end',
            alignItems: 'center'
          }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(false);
                onEdit?.();
              }}
              style={{
                padding: '8px 16px',
                background: '#1e40af',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s',
                minWidth: '100px'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#2563eb';
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#1e40af';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              <span>✏️</span>
              <span>수정하기</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(false);
                onDelete?.();
              }}
              style={{
                padding: '8px 16px',
                background: '#dc2626',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s',
                minWidth: '100px'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#ef4444';
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#dc2626';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              <span>🗑️</span>
              <span>삭제하기</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const CreateProblemModal = ({ open, onClose, onCreate, roomId, onGenerateComplete, editMode, initialProblem }) => {
  const [title, setTitle] = useState(editMode && initialProblem ? initialProblem.title : 'Two Sum');
  const [difficulty, setDifficulty] = useState(editMode && initialProblem ? initialProblem.difficulty : 'Easy');
  const [functionName, setFunctionName] = useState(editMode && initialProblem ? initialProblem.functionName : 'solve');
  const [description, setDescription] = useState(editMode && initialProblem ? initialProblem.description : '정수 배열과 타겟이 주어졌을 때, 타겟에 합산되는 두 수의 인덱스를 반환하는 함수를 작성하세요.');
  const [starterCode, setStarterCode] = useState(editMode && initialProblem ? initialProblem.starterCode : 'function solve(nums, target) {\n  // TODO\n}');
  
  const initSamplePairs = () => {
    if (editMode && initialProblem && Array.isArray(initialProblem.samples) && initialProblem.samples.length > 0) {
      return initialProblem.samples.map(s => ({
        input: JSON.stringify(s.input),
        output: JSON.stringify(s.output)
      }));
    }
    return [{ input: '[[2,7,11,15],9]', output: '[0,1]' }];
  };
  
  const initTestPairs = () => {
    if (editMode && initialProblem && Array.isArray(initialProblem.tests) && initialProblem.tests.length > 0) {
      return initialProblem.tests.map(t => ({
        input: JSON.stringify(t.input),
        output: JSON.stringify(t.output)
      }));
    }
    return [{ input: '[[2,7,11,15],9]', output: '[0,1]' }];
  };
  
  const [samplePairs, setSamplePairs] = useState(initSamplePairs());
  const [testPairs, setTestPairs] = useState(initTestPairs());
  const [err, setErr] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [generating, setGenerating] = useState(false);
  
  // Reset form when editMode or initialProblem changes
  useEffect(() => {
    if (open) {
      if (editMode && initialProblem) {
        setTitle(initialProblem.title || 'Two Sum');
        setDifficulty(initialProblem.difficulty || 'Easy');
        setFunctionName(initialProblem.functionName || 'solve');
        setDescription(initialProblem.description || '');
        setStarterCode(initialProblem.starterCode || 'function solve() {\n  // TODO\n}');
        setSamplePairs(initSamplePairs());
        setTestPairs(initTestPairs());
      } else {
        setTitle('Two Sum');
        setDifficulty('Easy');
        setFunctionName('solve');
        setDescription('정수 배열과 타겟이 주어졌을 때, 타겟에 합산되는 두 수의 인덱스를 반환하는 함수를 작성하세요.');
        setStarterCode('function solve(nums, target) {\n  // TODO\n}');
        setSamplePairs([{ input: '[[2,7,11,15],9]', output: '[0,1]' }]);
        setTestPairs([{ input: '[[2,7,11,15],9]', output: '[0,1]' }]);
      }
      setErr('');
      setPdfFile(null);
    }
  }, [open, editMode, initialProblem]);
  
  if (!open) return null;
  return (
    <div className="modal-overlay" style={{ overflowY: 'auto', display: 'flex', alignItems: 'flex-start', paddingTop: '40px', paddingBottom: '40px' }}>
      <div className="modal-content create-problem-modal" style={{ margin: '0 auto', maxHeight: 'none' }}>
        <h3 className="modal-title">{editMode ? 'Edit Problem' : 'Create Problem'}</h3>
        {!editMode && (
          <div style={{ marginBottom: 12 }}>
            <input type="file" accept="application/pdf" onChange={(e)=>setPdfFile(e.target.files?.[0]||null)} />
          </div>
        )}
        <div className="create-problem-form">
          <input className="input" placeholder="Title" value={title} onChange={(e)=>setTitle(e.target.value)} />
          <div className="form-row">
            <input className="input" placeholder="Difficulty" value={difficulty} onChange={(e)=>setDifficulty(e.target.value)} />
            <input className="input" placeholder="Function Name" value={functionName} onChange={(e)=>setFunctionName(e.target.value)} />
          </div>
          <textarea className="input form-textarea" placeholder="Description" value={description} onChange={(e)=>setDescription(e.target.value)} />
          <textarea className="input form-code-textarea" placeholder="Starter Code" value={starterCode} onChange={(e)=>setStarterCode(e.target.value)} />
          
          {/* Sample Test Cases */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontWeight: 600 }}>Sample Test Cases</label>
              <button 
                type="button"
                className="btn btn-ghost"
                style={{ padding: '4px 12px', fontSize: '14px' }}
                onClick={() => setSamplePairs([...samplePairs, { input: '', output: '' }])}
              >
                + Add Sample
              </button>
            </div>
            {samplePairs.map((pair, idx) => (
              <div key={idx} style={{ marginBottom: 12, padding: 12, border: '1px solid #444', borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontWeight: 500, color: '#60a5fa' }}>Sample {idx + 1}</span>
                  {samplePairs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setSamplePairs(samplePairs.filter((_, i) => i !== idx))}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px' }}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: '14px', color: '#9ca3af' }}>Input</label>
                  <textarea
                    className="input"
                    placeholder="e.g., [[2,7,11,15],9]"
                    value={pair.input}
                    onChange={(e) => {
                      const newPairs = [...samplePairs];
                      newPairs[idx].input = e.target.value;
                      setSamplePairs(newPairs);
                    }}
                    style={{ minHeight: '60px', fontFamily: 'monospace' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: '14px', color: '#9ca3af' }}>Output</label>
                  <textarea
                    className="input"
                    placeholder="e.g., [0,1]"
                    value={pair.output}
                    onChange={(e) => {
                      const newPairs = [...samplePairs];
                      newPairs[idx].output = e.target.value;
                      setSamplePairs(newPairs);
                    }}
                    style={{ minHeight: '60px', fontFamily: 'monospace' }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Hidden Test Cases */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontWeight: 600 }}>Hidden Test Cases</label>
              <button 
                type="button"
                className="btn btn-ghost"
                style={{ padding: '4px 12px', fontSize: '14px' }}
                onClick={() => setTestPairs([...testPairs, { input: '', output: '' }])}
              >
                + Add Test
              </button>
            </div>
            {testPairs.map((pair, idx) => (
              <div key={idx} style={{ marginBottom: 12, padding: 12, border: '1px solid #444', borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontWeight: 500, color: '#60a5fa' }}>Test {idx + 1}</span>
                  {testPairs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setTestPairs(testPairs.filter((_, i) => i !== idx))}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px' }}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: '14px', color: '#9ca3af' }}>Input</label>
                  <textarea
                    className="input"
                    placeholder="e.g., [[2,7,11,15],9]"
                    value={pair.input}
                    onChange={(e) => {
                      const newPairs = [...testPairs];
                      newPairs[idx].input = e.target.value;
                      setTestPairs(newPairs);
                    }}
                    style={{ minHeight: '60px', fontFamily: 'monospace' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: '14px', color: '#9ca3af' }}>Output</label>
                  <textarea
                    className="input"
                    placeholder="e.g., [0,1]"
                    value={pair.output}
                    onChange={(e) => {
                      const newPairs = [...testPairs];
                      newPairs[idx].output = e.target.value;
                      setTestPairs(newPairs);
                    }}
                    style={{ minHeight: '60px', fontFamily: 'monospace' }}
                  />
                </div>
              </div>
            ))}
          </div>

          {err && <div className="error-message">{err}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          {!editMode && (
            <button
              className="btn btn-secondary"
              disabled={!pdfFile || generating}
              onClick={async ()=>{
                if (!pdfFile || !roomId) return setErr('PDF 파일과 roomId가 필요합니다');
                try{
                  setGenerating(true);
                  const res = await api.generateProblemsFromPdf(roomId, pdfFile);
                  // res should contain { problems: [...] }
                  if (res && Array.isArray(res.problems) && res.problems.length) {
                    onGenerateComplete?.(res.problems);
                    setGenerating(false);
                    onClose();
                  } else {
                    setErr('생성된 문제가 없습니다');
                    setGenerating(false);
                  }
                }catch(e){ setErr(e.message); setGenerating(false); }
              }}
            >{generating ? 'Generating...' : 'Generate from PDF'}</button>
          )}
          <button className="btn btn-primary" onClick={()=>{
            try{
              // Convert input/output pairs to JSON format
              const s = samplePairs.map(pair => ({
                input: JSON.parse(pair.input),
                output: JSON.parse(pair.output)
              }));
              const t = testPairs.map(pair => ({
                input: JSON.parse(pair.input),
                output: JSON.parse(pair.output)
              }));
              const problemData = { 
                title, 
                difficulty, 
                functionName, 
                description, 
                language:'javascript', 
                starterCode, 
                samples:s, 
                tests:t 
              };
              if (editMode && initialProblem) {
                problemData.id = initialProblem.id;
              }
              onCreate(problemData);
            }catch(e){ 
              setErr('Invalid JSON format in input/output fields. Please check your syntax.'); 
            }
          }}>{editMode ? 'Update' : 'Create'}</button>
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
  const [editMode, setEditMode] = useState(false);
  const [editingProblem, setEditingProblem] = useState(null);

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
              onEdit={()=>{
                setEditingProblem(p);
                setEditMode(true);
                setOpen(true);
              }}
              onDelete={async (e)=>{
                e?.stopPropagation();
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
      <CreateProblemModal 
        open={open} 
        onClose={()=>{
          setOpen(false);
          setEditMode(false);
          setEditingProblem(null);
        }} 
        roomId={roomId} 
        editMode={editMode}
        initialProblem={editingProblem}
        onGenerateComplete={(generated)=>{
          // prepend generated problems to list
          setProblems((prev)=>[...generated, ...prev]);
          setOpen(false);
          setEditMode(false);
          setEditingProblem(null);
        }} 
        onCreate={async (payload)=>{
          try{
            if (editMode && payload.id) {
              // Update existing problem
              const updated = await api.updateProblem(roomId, payload.id, payload);
              setProblems((prev)=>prev.map(p => p.id === payload.id ? updated : p));
            } else {
              // Create new problem
              const created = await api.createProblem(roomId, payload);
              setProblems((prev)=>[created, ...prev]);
            }
            setOpen(false);
            setEditMode(false);
            setEditingProblem(null);
          }catch(e){ alert(e.message); }
        }} 
      />
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
