import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken } from '../api.js';

const Landing = () => {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const who = await api.me();
        setMe(who);
      } catch {}
    })();
  }, []);

  return (
    <div className="landing-page">
      {/* Top navigation */}
      <header className="landing-header">
        <div className="landing-header-content">
          <div className="landing-brand">
            <div className="logo">JSC</div>
            <span className="landing-brand-text">JS Online Compiler</span>
          </div>
          <nav className="landing-nav">
            {/* <a href="#blog">Blog</a>
            <a href="#contact">Contact</a>
            <a href="#help">Help</a>
            <a href="#donate">Donate</a> */}
          </nav>
          <LandingRightMenu />
        </div>
      </header>

      {/* Hero */}
      <main className="landing-hero">
        {/* Background accents */}
        <div aria-hidden className="landing-bg-accents">
          <div className="landing-blob landing-blob-1 jsc-blob1" />
          <div className="landing-blob landing-blob-2 jsc-blob2" />
          <div className="landing-blob landing-blob-3 jsc-blob3" />
        </div>

        {/* Headline */}
        <section className="landing-headline">
          <TypingTitle pre="Turn your ideas into " highlight="code" />
          <p className="landing-subtitle">
            What will you create? The possibilities are endless.
          </p>
          <div className="landing-cta">
            <button
              onClick={() => navigate('/rooms')}
              className="landing-btn-primary"
            >
              Start studying
            </button>
          </div>
        </section>

        {/* Prompt-style panel */}
        <section className="landing-prompt-section">
          <div className="landing-prompt-panel">
            <div className="landing-prompt-buttons">
              <button className="landing-prompt-btn">Get suggestions</button>
              <button className="landing-prompt-btn">Write a prompt</button>
            </div>
            <div className="landing-prompt-text">
              <div className="landing-prompt-line">
                <span className="landing-prompt-label">Make me</span>
                <span className="landing-prompt-value"> an algorithm playground</span>
              </div>
              <div className="landing-prompt-line">
                <span className="landing-prompt-label">for</span>
                <span className="landing-prompt-value landing-prompt-value-emerald"> students</span>
              </div>
              <div className="landing-prompt-line">
                <span className="landing-prompt-label">that helps</span>
                <span className="landing-prompt-value landing-prompt-value-purple"> solve coding problems</span>
              </div>
              <div className="landing-prompt-line">
                <span className="landing-prompt-label">instantly</span>
              </div>
            </div>
            <div className="landing-prompt-action">
              <button
                onClick={() => navigate('/rooms')}
                className="landing-prompt-action-btn"
              >
                Start building with JSC →
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        (c) {new Date().getFullYear()} JSC. All rights reserved.
      </footer>
    </div>
  );
};

export default Landing;

const LandingRightMenu = () => {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const who = await api.me();
        setMe(who);
      } catch {}
    })();
  }, []);

  if (!me) {
    return (
      <div className="landing-menu">
        <button onClick={() => navigate('/login')} className="landing-menu-btn">Log In</button>
        <button onClick={() => navigate('/signup')} className="landing-menu-signup">SIGN UP</button>
      </div>
    );
  }

  return (
    <div className="landing-dropdown">
      <button
        onClick={() => setOpen((v) => !v)}
        className="landing-dropdown-trigger"
        aria-haspopup="true"
        aria-expanded={open}
      >
        Profile
      </button>
      {open && (
        <div className="landing-dropdown-menu">
          <div className="landing-dropdown-name">{me.name}</div>
          <div className="landing-dropdown-email">{me.email}</div>
          <div className="landing-dropdown-divider" />
          <button
            className="landing-dropdown-item"
            onClick={() => navigate('/rooms')}
          >
            My Group
          </button>
          <button
            className="landing-dropdown-item"
            onClick={() => { setToken(''); setMe(null); setOpen(false); }}
          >
            Log Out
          </button>
        </div>
      )}
    </div>
  );
};

// Title with left-to-right typing animation and gradient highlight for the last word
const TypingTitle = ({ pre = 'Turn your ideas into ', highlight = 'code' }) => {
  const full = pre + highlight;
  const preLen = pre.length;
  const fullLen = full.length;
  const [i, setI] = React.useState(0);

  React.useEffect(() => {
    let idx = 0;
    const speed = 50; // slowed ~25%
    const timer = setInterval(() => {
      idx += 1;
      setI(idx);
      if (idx >= fullLen) {
        clearInterval(timer);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [fullLen]);

  const typedPre = pre.slice(0, Math.min(i, preLen));
  const typedHi = i > preLen ? highlight.slice(0, i - preLen) : '';
  const done = i >= fullLen;

  return (
    <h1 className="landing-title">
      <span>{typedPre}</span>
      <span className="landing-title-highlight">{typedHi}</span>
      {!done && (
        <span
          aria-hidden="true"
          className="typing-cursor"
        />
      )}
      <span className="sr-only">{full}</span>
    </h1>
  );
};
