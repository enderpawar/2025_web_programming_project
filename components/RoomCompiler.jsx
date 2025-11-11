import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Editor from './Editor.jsx';
import Console from './Console.jsx';
import { OutputType } from '../types.js';
import { api } from '../api.js';
import { io } from 'socket.io-client';

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
    <div className="flex flex-col h-screen bg-gray-900 font-sans">
      <TopBar
        title={room.name}
        subtitle={`${room.groupName} • ${room.authorName}`}
        onBack={() => navigate(`/rooms/${roomId}/problems`)}
        onSave={save}
        saving={saving}
        savedAt={savedAt}
      />
      <div className="flex-grow grid grid-rows-[auto,1fr] md:grid-rows-1 md:grid-cols-3 overflow-hidden p-2 md:p-4 gap-4">
        <div className="bg-gray-800 rounded-lg border border-gray-700/50 p-4 overflow-y-auto text-gray-200">
          {problem && (
            <>
              <div className="text-lg font-semibold text-white/90 mb-1">{problem.title || 'Problem'}</div>
              {problem.difficulty && (
                <div className="text-xs inline-block px-2 py-0.5 rounded bg-white/10 mb-2">{problem.difficulty}</div>
              )}
              
              {/* Function Name */}
              {problem.functionName && (
                <div className="mt-3 mb-3">
                  <div className="text-xs font-semibold text-white/60 mb-1">Function Name</div>
                  <div className="bg-black/30 rounded px-3 py-2 font-mono text-sm text-blue-300">
                    {problem.functionName}
                  </div>
                </div>
              )}

              <div className="prose prose-invert max-w-none text-sm whitespace-pre-wrap leading-6">
                {problem.description || 'No description provided.'}
              </div>
              
              {/* Starter Code Preview */}
              {problem.starterCode && (
                <div className="mt-4">
                  <div className="font-semibold mb-2 text-white/80">Starter Code</div>
                  <pre className="bg-black/30 rounded p-3 text-xs font-mono text-gray-300 overflow-x-auto">
                    {problem.starterCode}
                  </pre>
                </div>
              )}

              {/* Sample Test Cases */}
              {Array.isArray(problem.samples) && problem.samples.length > 0 && (
                <div className="mt-4">
                  <div className="font-semibold mb-2 text-white/80">Sample Test Cases</div>
                  <div className="space-y-3">
                    {problem.samples.map((s, idx) => (
                      <div key={idx} className="bg-black/20 rounded p-3 border border-white/10">
                        <div className="text-xs font-semibold text-blue-400 mb-2">Sample {idx + 1}</div>
                        <div className="space-y-1">
                          <div>
                            <span className="text-white/50 text-xs">Input:</span>
                            <pre className="font-mono text-sm text-white/90 mt-1 bg-black/20 rounded px-2 py-1">
                              {JSON.stringify(s.input)}
                            </pre>
                          </div>
                          <div>
                            <span className="text-white/50 text-xs">Output:</span>
                            <pre className="font-mono text-sm text-green-400 mt-1 bg-black/20 rounded px-2 py-1">
                              {JSON.stringify(s.output)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hidden Test Cases Info */}
              {Array.isArray(problem.tests) && problem.tests.length > 0 && (
                <div className="mt-4">
                  <div className="font-semibold mb-2 text-white/80">Test Cases</div>
                  <div className="bg-black/20 rounded p-3 border border-white/10">
                    <div className="text-xs text-white/60">
                      {problem.tests.length} hidden test case{problem.tests.length !== 1 ? 's' : ''} will be used to evaluate your solution.
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="mt-4 flex gap-2">
            <button onClick={handleRunCode} disabled={isRunning} className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-sm">{isRunning ? 'Running…' : 'Run'}</button>
            {problem && (
              <>
                <button onClick={runTests} className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-sm">Run Tests</button>
                <button 
                  onClick={getAiHint} 
                  disabled={loadingHint}
                  className="px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 text-white text-sm flex items-center gap-1"
                >
                  {loadingHint ? (
                    <>
                      <span className="animate-spin">⚡</span>
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
            <div className="mt-4 bg-purple-900/30 border border-purple-700/40 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold text-purple-300 flex items-center gap-2">
                  <span>💡</span>
                  <span>AI Hint</span>
                </div>
                <button 
                  onClick={() => setShowHint(false)}
                  className="text-white/60 hover:text-white/90 text-sm"
                >
                  ✕
                </button>
              </div>
              <div className="text-sm text-white/90 whitespace-pre-wrap leading-relaxed">
                {loadingHint ? (
                  <div className="flex items-center gap-2 text-purple-300">
                    <span className="animate-pulse">Thinking...</span>
                  </div>
                ) : (
                  aiHint || 'Click "Get AI Hint" to receive guidance.'
                )}
              </div>
            </div>
          )}
          {problem && testResults && (
            <div className="mt-4 text-sm">
              {testResults.error && <div className="text-red-400">Error: {testResults.error}</div>}
              {!!testResults.results?.length && (
                <div className="space-y-2">
                  {testResults.results.map((r, i) => (
                    <div key={i} className={`rounded p-2 ${r.pass ? 'bg-green-900/30 border border-green-700/40' : 'bg-red-900/30 border border-red-700/40'}`}>
                      <div className="font-mono">Input: {JSON.stringify(r.input)}</div>
                      <div className="font-mono">Expected: {JSON.stringify(r.expected)}</div>
                      <div className="font-mono">Actual: {JSON.stringify(r.actual)}</div>
                      {r.error && <div className="text-red-300">{r.error}</div>}
                    </div>
                  ))}
                  <div className={`font-semibold ${testResults.passed ? 'text-green-400' : 'text-red-400'}`}>{testResults.passed ? 'All tests passed 🎉' : 'Some tests failed'}</div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="md:col-span-1 md:col-start-2 flex flex-col min-h-0">
          <Editor code={code} setCode={setCode} onRun={handleRunCode} isRunning={isRunning} />
        </div>
        <div className="md:col-span-1 flex flex-col min-h-0">
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
