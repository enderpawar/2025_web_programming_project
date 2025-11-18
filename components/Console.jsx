import React, { useState } from 'react';
import { OutputType } from '../types.js';

const getIconForType = (type) => {
  switch (type) {
    case OutputType.LOG:
      return <span className="text-gray-400 mr-2 text-xs">◆</span>;
    case OutputType.ERROR:
      return <span className="text-red-400 mr-2 font-bold text-xs">✖</span>;
    case OutputType.INFO:
      return <span className="text-blue-400 mr-2 font-bold text-xs">ℹ</span>;
    case OutputType.WARN:
      return <span className="text-yellow-400 mr-2 font-bold text-xs">⚠</span>;
    case OutputType.SUCCESS:
      return <span className="text-green-400 mr-2 font-bold text-xs">✔</span>;
    default:
      return null;
  }
};

const getStyleForType = (type) => {
  switch (type) {
    case OutputType.ERROR:
      return 'text-red-400';
    case OutputType.SUCCESS:
      return 'text-green-400';
    case OutputType.WARN:
      return 'text-yellow-400';
    case OutputType.INFO:
      return 'text-blue-400 italic';
    default:
      return 'text-gray-200';
  }
};

const Console = ({ output, onClear, problem, code, onCustomTest, addOutput }) => {
  const [customInput, setCustomInput] = useState('');
  const [customTestResult, setCustomTestResult] = useState(null);
  const [showCustomTest, setShowCustomTest] = useState(false);

  const handleRunCustomTest = () => {
    if (!customInput.trim()) return;
    
    // Add info message to console
    if (addOutput) {
      addOutput({ type: OutputType.INFO, message: '🧪 Running custom test...' });
    }
    
    try {
      const parsedInput = JSON.parse(customInput);
      const inputArray = Array.isArray(parsedInput) ? parsedInput : [parsedInput];
      
      // Log input to console
      if (addOutput) {
        addOutput({ type: OutputType.LOG, message: `Input: ${JSON.stringify(parsedInput)}` });
      }
      
      const func = new Function(`return (${code})`)();
      if (typeof func !== 'function') {
        throw new Error('Code must define a function');
      }
      
      const result = func(...inputArray);
      
      // Log output to console
      if (addOutput) {
        addOutput({ type: OutputType.SUCCESS, message: `Output: ${JSON.stringify(result)}` });
      }
      
      setCustomTestResult({
        success: true,
        input: parsedInput,
        output: result
      });
      
      if (onCustomTest) {
        onCustomTest({ success: true, input: parsedInput, output: result });
      }
    } catch (e) {
      // Log error to console
      if (addOutput) {
        addOutput({ type: OutputType.ERROR, message: `Error: ${e.message}` });
      }
      
      setCustomTestResult({
        success: false,
        error: e.message
      });
      
      if (onCustomTest) {
        onCustomTest({ success: false, error: e.message });
      }
    }
  };

  return (
    <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
      <div className="console-tabs">
        <div className="console-tab console-tab-active">Console</div>
        <div className="editor-actions" style={{marginLeft: 'auto', display: 'flex', gap: '0.5rem'}}>
          {problem && (
            <button
              onClick={() => setShowCustomTest(!showCustomTest)}
              className="btn console-custom-test-btn"
              style={{backgroundColor: '#10b981'}}
            >
              {showCustomTest ? '✕ Close Test' : '🧪 Custom Test'}
            </button>
          )}
          <button
            onClick={onClear}
            className="btn console-custom-test-btn"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              style={{width: '1.25rem', height: '1.25rem', display: 'inline-block', marginRight: '0.5rem'}}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Clear
          </button>
        </div>
      </div>
      
      {/* Custom Test Section */}
      {showCustomTest && problem && (
        <div style={{padding: '0.75rem', backgroundColor: 'var(--color-bg-darker)', borderBottom: '1px solid var(--color-border)'}}>
          <div className="test-case-label" style={{color: '#10b981', marginBottom: '0.5rem'}}>🧪 Custom Test Input</div>
          <div className="test-case-label" style={{marginBottom: '0.5rem'}}>
            Enter input in JSON format (e.g., [[2,7,11,15],9])
          </div>
          <div style={{display: 'flex', gap: '0.5rem'}}>
            <input
              type="text"
              className="input"
              style={{flex: 1, fontFamily: 'monospace', fontSize: '0.875rem'}}
              placeholder='[[2,7,11,15],9]'
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRunCustomTest();
                }
              }}
            />
            <button
              onClick={handleRunCustomTest}
              disabled={!customInput.trim()}
              className="btn btn-primary"
              style={{backgroundColor: '#10b981', fontSize: '0.875rem'}}
            >
              Run
            </button>
          </div>
          
          {customTestResult && (
            <div className={`test-result-card ${customTestResult.success ? 'test-result-pass' : 'test-result-fail'}`} style={{marginTop: '0.75rem'}}>
              {customTestResult.success ? (
                <>
                  <div className="test-result-badge-pass">✓ Test Passed</div>
                  <div>
                    <div>
                      <span className="test-case-label">Input:</span>
                      <pre className="test-case-value">
                        {JSON.stringify(customTestResult.input)}
                      </pre>
                    </div>
                    <div>
                      <span className="test-case-label">Output:</span>
                      <pre className="test-case-value" style={{color: '#10b981'}}>
                        {JSON.stringify(customTestResult.output)}
                      </pre>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="test-result-badge-fail">✗ Error</div>
                  <div className="test-result-badge-fail">{customTestResult.error}</div>
                </>
              )}
            </div>
          )}
        </div>
      )}
      <div className="console-content">
        {output.length === 0 ? (
          <p className="console-output" style={{color: 'var(--color-text-muted)', fontStyle: 'italic'}}>Console output will appear here...</p>
        ) : (
          output.map((line, index) => (
            <div key={index} className={`console-output ${getStyleForType(line.type)}`} style={{display: 'flex', alignItems: 'flex-start'}}>
              <div style={{flexShrink: 0, marginTop: '0.125rem'}}>{getIconForType(line.type)}</div>
              <pre style={{whiteSpace: 'pre-wrap', flex: 1}}>{line.message}</pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Console;
