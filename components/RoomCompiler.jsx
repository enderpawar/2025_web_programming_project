import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Editor from './Editor.jsx';
import Console from './Console.jsx';
import ThemeToggleButton from './ThemeToggleButton.jsx';
import { OutputType } from '../types.js';
import { api } from '../api.js';
import { io } from 'socket.io-client';
import '../styles/RoomCompiler.css';

const defaultCode = `// Room scoped JS file.\n// Write code here and click Run. Use Save to persist per room.\n\nfunction greet(name) {\n  return \`Hello, \${name}!\`;\n}\n\nconst message = greet('Room');\nconsole.log(message);`;

const TopBar = ({ title, subtitle, onBack, onSave, saving, savedAt }) => (
  <header className="compiler-header">
    <div className="compiler-header-content">
      <div className="compiler-title-section">
        <button onClick={onBack} className="compiler-back-btn">← Back</button>
        <div>
          <div className="compiler-title">{title}</div>
          <div className="compiler-subtitle">{subtitle}</div>
        </div>
      </div>
      <div className="compiler-actions">
        <ThemeToggleButton />
        {savedAt && <span>Saved {new Date(savedAt).toLocaleTimeString()}</span>}
        <button
          onClick={onSave}
          disabled={saving}
          className="btn btn-primary"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  </header>
);

const RoomCompiler = () => {
  const params = useParams();
  const navigate = useNavigate();
  const roomId = params.roomId;
  const problemId = params.problemId;
  const [room, setRoom] = useState(null);
  const [me, setMe] = useState(null);
  const [problem, setProblem] = useState(null);

  const [code, setCode] = useState('');
  const [output, setOutput] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [testResults, setTestResults] = useState(null);
  const [aiHint, setAiHint] = useState('');
  const [loadingHint, setLoadingHint] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Resizable panels state
  const [leftPanelWidth, setLeftPanelWidth] = useState(468);
  const [rightPanelWidth, setRightPanelWidth] = useState(400);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const who = await api.me();
        setMe(who);
        const r = await api.room(roomId);
        setRoom(r);
        const p = await api.problem(roomId, problemId);
        setProblem(p);
        const c = await api.getProblemCode(roomId, problemId);
        const starter = p?.starterCode;
        setCode(c?.code ?? starter ?? defaultCode);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [roomId, problemId]);

  // Realtime collaboration (basic): broadcast code changes, apply remote updates
  useEffect(() => {
    if (!roomId || !problemId) return;
    const socket = io(api.API_URL, { transports: ['websocket'] });
    const clientId = Math.random().toString(36).slice(2);
    socket.emit('join', { roomId: `${roomId}:${problemId}` });
    socket.on('code:remote', ({ code: remote, clientId: from }) => {
      if (from === clientId) return;
      setCode((curr) => (curr === remote ? curr : remote));
    });
    const onLocalChange = (value) => {
      socket.emit('code:change', { roomId: `${roomId}:${problemId}`, code: value, clientId });
    };
    // Patch Editor setCode to also broadcast by effect on code state
    // We'll attach a small observer
    let last = null;
    const interval = setInterval(() => {
      if (last !== code) {
        last = code;
        onLocalChange(code);
      }
    }, 600);
    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, [roomId, code]);

  const handleRunCode = useCallback(() => {
    setIsRunning(true);
    const newOutput = [];
    const originalConsole = { ...console };
    const customConsole = {
      log: (...args) => {
        newOutput.push({
          type: OutputType.LOG,
          message: args
            .map((arg) => {
              try {
                return JSON.stringify(arg, null, 2);
              } catch (e) {
                return String(arg);
              }
            })
            .join(' '),
        });
      },
      error: (...args) => {
        newOutput.push({
          type: OutputType.ERROR,
          message: args.map((arg) => (arg instanceof Error ? arg.message : String(arg))).join(' '),
        });
      },
      warn: (...args) => {
        newOutput.push({ type: OutputType.WARN, message: args.map((arg) => String(arg)).join(' ') });
      },
      info: (...args) => {
        newOutput.push({ type: OutputType.INFO, message: args.map((arg) => String(arg)).join(' ') });
      },
    };
    window.console.log = customConsole.log;
    window.console.error = customConsole.error;
    window.console.warn = customConsole.warn;
    window.console.info = customConsole.info;
    try {
      newOutput.push({ type: OutputType.INFO, message: 'Executing code...' });
      const result = new Function(code)();
      if (result !== undefined) {
        newOutput.push({ type: OutputType.LOG, message: `Return value: ${JSON.stringify(result, null, 2)}` });
      }
      newOutput.push({ type: OutputType.SUCCESS, message: 'Execution finished.' });
    } catch (error) {
      if (error instanceof Error) newOutput.push({ type: OutputType.ERROR, message: error.message });
      else newOutput.push({ type: OutputType.ERROR, message: String(error) });
    } finally {
      window.console = originalConsole;
      setOutput(newOutput);
      setIsRunning(false);
    }
  }, [code]);

  // Panel resize handlers
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isResizingLeft) {
        const newWidth = Math.max(300, Math.min(800, e.clientX));
        setLeftPanelWidth(newWidth);
      }
      if (isResizingRight) {
        const newWidth = Math.max(300, Math.min(800, window.innerWidth - e.clientX));
        setRightPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizingLeft(false);
      setIsResizingRight(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    if (isResizingLeft || isResizingRight) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingLeft, isResizingRight]);

  const handleClearConsole = useCallback(() => setOutput([]), []);

  const addOutput = useCallback((line) => {
    setOutput((prev) => [...prev, line]);
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await api.saveProblemCode(roomId, problemId, code);
      setSavedAt(Date.now());
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }, [roomId, problemId, code]);

  const runTests = useCallback(async () => {
    setTestResults(null);
    try {
      const res = await api.submitProblemSolution(roomId, problemId, code);
      setTestResults(res);
    } catch (e) {
      setTestResults({ passed: false, results: [], error: e.message });
    }
  }, [roomId, problemId, code]);

  const getAiHint = useCallback(async () => {
    if (!problem) return;
    setLoadingHint(true);
    setShowHint(true);
    setAiHint(''); // Clear previous hint
    try {
      const result = await api.getHint(
        problem.title,
        problem.description,
        code,
        problem.difficulty
      );
      setAiHint(result.hint);
    } catch (e) {
      console.error('AI Hint Error:', e);
      setAiHint(`❌ Error: ${e.message}\n\n자세한 내용은 브라우저 콘솔을 확인하세요.`);
    } finally {
      setLoadingHint(false);
    }
  }, [problem, code]);

  const [pTitle, setPTitle] = useState('두 수의 합');
  const [pDifficulty, setPDifficulty] = useState('쉬움');
  const [pFunctionName, setPFunctionName] = useState('solve');
  const [pDescription, setPDescription] = useState('정수 배열 nums와 목표값 target이 주어집니다. 배열에서 두 수를 더해서 target이 되는 두 수의 인덱스를 배열로 반환하세요.\n\n각 입력에는 정확히 하나의 해답만 존재하며, 같은 원소를 두 번 사용할 수 없습니다.\n\n예시:\n입력: nums = [2, 7, 11, 15], target = 9\n출력: [0, 1]\n설명: nums[0] + nums[1] = 2 + 7 = 9 이므로 [0, 1]을 반환합니다.');
  const [pStarter, setPStarter] = useState('function solve(nums, target) {\n  // 여기에 코드를 작성하세요\n  // nums: 정수 배열\n  // target: 목표값\n  // 반환: 두 수의 인덱스 [index1, index2]\n}');
  const [pSamples, setPSamples] = useState('[{"input":[[2,7,11,15],9],"output":[0,1]},{"input":[[3,2,4],6],"output":[1,2]}]');
  const [pTests, setPTests] = useState('[{"input":[[2,7,11,15],9],"output":[0,1]},{"input":[[3,2,4],6],"output":[1,2]},{"input":[[3,3],6],"output":[0,1]}]');
  const [perr, setPErr] = useState('');

  const createProblem = useCallback(async () => {
    setPErr('');
    try {
      const samples = pSamples ? JSON.parse(pSamples) : [];
      const tests = pTests ? JSON.parse(pTests) : [];
      const problem = {
        title: pTitle.trim() || 'Problem',
        description: pDescription,
        difficulty: pDifficulty.trim() || 'Easy',
        functionName: pFunctionName.trim() || 'solve',
        language: 'javascript',
        starterCode: pStarter,
        samples,
        tests,
      };
      const created = await api.createProblem(roomId, problem);
      setRoom((prev) => ({ ...prev, problem: created }));
      // If user code is empty/default, seed with starter
      setCode((curr) => (curr && curr !== defaultCode ? curr : (problem.starterCode || curr)));
    } catch (e) {
      setPErr('Invalid JSON in samples/tests or permission denied.');
    }
  }, [roomId, pTitle, pDescription, pDifficulty, pFunctionName, pStarter, pSamples, pTests]);

  if (!room) {
    return (
      <div className="min-h-screen bg-gray-900 text-white grid place-items-center">
        <div className="text-center space-y-4">
          <div className="text-xl">Room not found.</div>
          <button className="px-4 py-2 rounded bg-white/10 hover:bg-white/20" onClick={() => navigate('/rooms')}>
            Back to rooms
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="room-compiler-page">
      <TopBar
        title={room.name}
        subtitle={`${room.groupName} • ${room.authorName}`}
        onBack={() => navigate(`/rooms/${roomId}/problems`)}
        onSave={save}
        saving={saving}
        savedAt={savedAt}
      />
      <div className="compiler-main">
        <div className="compiler-left-panel" style={{ width: `${leftPanelWidth}px` }}>
          {problem && (
            <>
              <div className="problem-name">{problem.title || 'Problem'}</div>
              {problem.difficulty && (
                <div className="problem-difficulty">{problem.difficulty}</div>
              )}
              
              {/* Function Name */}
              {problem.functionName && (
                <div className="problem-section">
                  <div className="problem-section-title">Function Name</div>
                  <div className="problem-code-block">
                    {problem.functionName}
                  </div>
                </div>
              )}

              <div className="problem-description">
                {problem.description || 'No description provided.'}
              </div>
              
              {/* Starter Code Preview */}
              {problem.starterCode && (
                <div className="problem-section">
                  <div className="problem-section-title">Starter Code</div>
                  <pre className="problem-code-block">
                    {problem.starterCode}
                  </pre>
                </div>
              )}

              {/* Sample Test Cases */}
              {Array.isArray(problem.samples) && problem.samples.length > 0 && (
                <div className="problem-section">
                  <div className="problem-section-title">Sample Test Cases</div>
                  <div className="test-cases-list">
                    {problem.samples.map((s, idx) => {
                      // Format input arguments as readable strings
                      const formatInputArgs = (input) => {
                        if (!Array.isArray(input)) return String(input);
                        return input.map(arg => {
                          if (typeof arg === 'string') return `"${arg}"`;
                          if (typeof arg === 'object') return JSON.stringify(arg);
                          return String(arg);
                        }).join(', ');
                      };

                      const formatOutput = (output) => {
                        if (typeof output === 'string') return `"${output}"`;
                        if (typeof output === 'object') return JSON.stringify(output);
                        return String(output);
                      };

                      return (
                        <div key={idx} className="test-case-card">
                          <div className="test-case-header">Sample {idx + 1}</div>
                          <div className="test-case-content">
                            <div className="test-case-row">
                              <span className="test-case-label">Input:</span>
                              <div className="test-case-value">
                                {formatInputArgs(s.input)}
                              </div>
                            </div>
                            <div className="test-case-row">
                              <span className="test-case-label">Expected Output:</span>
                              <div className="test-case-value">
                                {formatOutput(s.output)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Model Solution (Professor Only) */}
              {me?.role === 'professor' && problem.solution && (
                <div className="problem-section">
                  <div className="problem-section-title" style={{color: '#fbbf24'}}>🔒 Model Solution (Professor Only)</div>
                  <div className="hint-panel">
                    <div className="hint-panel-content">
                      AI-generated reference solution for validation purposes
                    </div>
                    <pre className="hint-code-block">
                      {problem.solution}
                    </pre>
                  </div>
                </div>
              )}

              {/* Hidden Test Cases Info */}
              {Array.isArray(problem.tests) && problem.tests.length > 0 && (
                <div className="problem-section">
                  <div className="problem-section-title">Test Cases</div>
                  <div className="test-case-card">
                    <div className="test-case-label">
                      {problem.tests.length} hidden test case{problem.tests.length !== 1 ? 's' : ''} will be used to evaluate your solution.
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="problem-section compiler-action-buttons">
            <button onClick={handleRunCode} disabled={isRunning} className="btn btn-primary compiler-run-btn">{isRunning ? 'Running…' : 'Run'}</button>
            {problem && (
              <>
                <button onClick={runTests} className="btn btn-primary compiler-run-btn">Run Tests</button>
                <button 
                  onClick={getAiHint} 
                  disabled={loadingHint}
                  className="compiler-hint-btn"
                >
                  {loadingHint ? (
                    <>
                      <span>⚡</span>
                      <span>Loading...</span>
                    </>
                  ) : (
                    <>
                      <span>💡</span>
                      <span>Get AI Hint</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
          {showHint && (
            <div className="hint-panel">
              <div className="hint-panel-header">
                <span className="hint-panel-icon">💡</span>
                <span className="hint-panel-title">AI Hint</span>
                <button 
                  onClick={() => setShowHint(false)}
                  className="editor-action-btn"
                  style={{marginLeft: 'auto'}}
                >
                  ✕
                </button>
              </div>
              <div className="hint-panel-content">
                {loadingHint ? (
                  <div className="hint-loading">
                    <span>Thinking...</span>
                  </div>
                ) : (
                  aiHint || 'Click "Get AI Hint" to receive guidance.'
                )}
              </div>
            </div>
          )}
          {problem && testResults && (
            <div className="problem-section">
              {testResults.error && <div className="test-result-badge-fail">Error: {testResults.error}</div>}
              {!!testResults.results?.length && (
                <div className="test-cases-list">
                  {testResults.results.map((r, i) => (
                    <div key={i} className={`test-result-card ${r.pass ? 'test-result-pass' : 'test-result-fail'}`}>
                      <div className="test-result-badge">Test Case {i + 1}: {r.pass ? '✓ Passed' : '✗ Failed'}</div>
                      {r.error && <div className="test-result-badge-fail">{r.error}</div>}
                      {!r.pass && (
                        <div className="test-case-label">
                          Check your logic and try again. Use custom test to debug.
                        </div>
                      )}
                    </div>
                  ))}
                  <div className={`test-result-badge ${testResults.passed ? 'test-result-badge-pass' : 'test-result-badge-fail'}`}>
                    {testResults.passed ? 'All tests passed 🎉' : `${testResults.results.filter(r => r.pass).length} / ${testResults.results.length} tests passed`}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div 
          className="panel-resizer panel-resizer-left"
          onMouseDown={() => setIsResizingLeft(true)}
        />
        <div className="compiler-center-panel">
          <Editor code={code} setCode={setCode} onRun={handleRunCode} isRunning={isRunning} />
        </div>
        <div 
          className="panel-resizer panel-resizer-right"
          onMouseDown={() => setIsResizingRight(true)}
        />
        <div className="compiler-right-panel" style={{ width: `${rightPanelWidth}px` }}>
          <Console 
            output={output} 
            onClear={handleClearConsole} 
            problem={problem}
            code={code}
            addOutput={addOutput}
          />
        </div>
      </div>
    </div>
  );
};

export default RoomCompiler;
