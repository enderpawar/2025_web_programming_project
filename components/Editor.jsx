import React from 'react';

const Editor = ({ code, setCode, onRun, isRunning }) => {
  return (
    <div className="editor-container">
      <div className="editor-header">
        <h2 className="editor-title">Code Editor</h2>
        <button
          onClick={onRun}
          disabled={isRunning}
          className="btn btn-primary"
        >
          {isRunning ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                style={{width: '1.25rem', height: '1.25rem', display: 'inline-block', marginRight: '0.5rem'}}
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Running...
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                style={{width: '1.25rem', height: '1.25rem', display: 'inline-block', marginRight: '0.5rem'}}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Run
            </>
          )}
        </button>
      </div>
      <div style={{flex: 1, padding: '0.25rem', position: 'relative'}}>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter your JavaScript code here..."
          className="code-textarea"
          spellCheck="false"
        />
      </div>
    </div>
  );
};

export default Editor;
