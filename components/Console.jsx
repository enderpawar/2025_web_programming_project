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
    <div className="flex flex-col h-full bg-gray-800 rounded-lg shadow-2xl overflow-hidden border border-gray-700/50">
      <div className="flex-shrink-0 flex justify-between items-center p-3 bg-gray-900/70 border-b border-gray-700/50">
        <h2 className="text-lg font-semibold text-gray-300">Console</h2>
        <div className="flex gap-2">
          {problem && (
            <button
              onClick={() => setShowCustomTest(!showCustomTest)}
              className="flex items-center px-3 py-2 bg-emerald-600 text-white font-semibold rounded-md hover:bg-emerald-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-opacity-75 text-sm"
            >
              {showCustomTest ? '✕ Close Test' : '🧪 Custom Test'}
            </button>
          )}
          <button
            onClick={onClear}
            className="flex items-center px-4 py-2 bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
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
        <div className="flex-shrink-0 p-3 bg-gray-900/50 border-b border-gray-700/50">
          <div className="text-xs font-semibold text-emerald-400 mb-2">🧪 Custom Test Input</div>
          <div className="text-xs text-gray-400 mb-2">
            Enter input in JSON format (e.g., [[2,7,11,15],9])
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white font-semibold rounded text-sm transition-all"
            >
              Run
            </button>
          </div>
          
          {customTestResult && (
            <div className={`mt-3 rounded p-3 text-sm ${customTestResult.success ? 'bg-green-900/30 border border-green-700/40' : 'bg-red-900/30 border border-red-700/40'}`}>
              {customTestResult.success ? (
                <>
                  <div className="text-xs font-semibold text-green-400 mb-2">✓ Test Passed</div>
                  <div className="space-y-1">
                    <div>
                      <span className="text-gray-400 text-xs">Input:</span>
                      <pre className="font-mono text-xs text-white mt-1">
                        {JSON.stringify(customTestResult.input)}
                      </pre>
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs">Output:</span>
                      <pre className="font-mono text-xs text-green-400 mt-1">
                        {JSON.stringify(customTestResult.output)}
                      </pre>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-xs font-semibold text-red-400 mb-2">✗ Error</div>
                  <div className="text-xs text-red-300">{customTestResult.error}</div>
                </>
              )}
            </div>
          )}
        </div>
      )}
      <div className="flex-grow p-4 overflow-y-auto font-mono text-sm leading-6 space-y-2">
        {output.length === 0 ? (
          <p className="text-gray-500 italic">Console output will appear here...</p>
        ) : (
          output.map((line, index) => (
            <div key={index} className={`flex items-start break-words ${getStyleForType(line.type)}`}>
              <div className="flex-shrink-0 mt-0.5">{getIconForType(line.type)}</div>
              <pre className="whitespace-pre-wrap flex-1">{line.message}</pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Console;
