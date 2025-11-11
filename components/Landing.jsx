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
    <div className="min-h-screen bg-[#0f2135] text-white flex flex-col">
      {/* Top navigation */}
  <header className="relative z-30 w-full border-b border-white/10 bg-[#0e1c2d]/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-teal-300 font-extrabold tracking-widest text-xl">JSC</div>
            <span className="text-white/50 hidden sm:inline">JS Online Compiler</span>
          </div>
          <nav className="hidden md:flex items-center space-x-6 text-sm text-white/80">
            {/* <a className="hover:text-white/100" href="#blog">Blog</a>
            <a className="hover:text-white/100" href="#contact">Contact</a>
            <a className="hover:text-white/100" href="#help">Help</a>
            <a className="hover:text-white/100" href="#donate">Donate</a> */}
          </nav>
          <LandingRightMenu />
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 relative overflow-hidden">
        {/* Background accents */}
  <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full bg-sky-500/10 blur-3xl jsc-blob1" />
          <div className="absolute top-40 -right-24 w-[520px] h-[520px] rounded-full bg-purple-500/10 blur-3xl jsc-blob2" />
          <div className="absolute -bottom-24 left-1/3 w-[360px] h-[360px] rounded-full bg-teal-400/10 blur-3xl jsc-blob3" />
        </div>

        {/* Headline */}
  <section className="relative z-10 max-w-5xl mx-auto px-4 pt-20 md:pt-28 text-center">
          <TypingTitle pre="Turn your ideas into " highlight="code" />
          <p className="mt-4 text-base md:text-lg text-white/70">
            What will you create? The possibilities are endless.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              onClick={() => navigate('/rooms')}
              className="px-5 md:px-6 py-3 rounded-md bg-sky-500 hover:bg-sky-400 text-white font-semibold shadow-lg shadow-sky-500/20"
            >
              Start studying
            </button>
            {!me && (
              <button
                onClick={() => navigate('/signup')}
                className="px-5 md:px-6 py-3 rounded-md border border-white/20 hover:border-white/40 text-white/90"
              >
                Sign up
              </button>
            )}
          </div>
        </section>

        {/* Prompt-style panel */}
  <section className="relative z-10 max-w-5xl mx-auto px-4 mt-10 md:mt-14">
          <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-[#0c1e32]/80 backdrop-blur md:p-6 p-4 shadow-2xl shadow-black/30">
            <div className="flex flex-wrap items-center gap-2 text-xs text-white/70">
              <button className="px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/15">Get suggestions</button>
              <button className="px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/15">Write a prompt</button>
            </div>
            <div className="mt-4 md:mt-5 text-left text-xl md:text-2xl leading-relaxed text-white/90">
              <div>
                <span className="text-white/70">Make me</span>
                <span className="underline decoration-sky-400/60 decoration-2 underline-offset-4 ml-2 text-white"> an algorithm playground</span>
              </div>
              <div>
                <span className="text-white/70">for</span>
                <span className="underline decoration-emerald-400/60 decoration-2 underline-offset-4 ml-2 text-white"> students</span>
              </div>
              <div>
                <span className="text-white/70">that helps</span>
                <span className="underline decoration-purple-400/60 decoration-2 underline-offset-4 ml-2 text-white"> solve coding problems</span>
              </div>
              <div>
                <span className="text-white/70">instantly</span>
              </div>
            </div>
            <div className="mt-5">
              <button
                onClick={() => navigate('/rooms')}
                className="w-full md:w-auto px-5 py-3 rounded-lg bg-teal-500 hover:bg-teal-400 text-black font-semibold"
              >
                Start building with JSC →
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-12 py-6 text-center text-xs text-white/40">
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
      <div className="flex items-center space-x-2">
        <button onClick={() => navigate('/login')} className="px-3 py-1.5 rounded-md text-sm bg-white/10 hover:bg-white/20">Log In</button>
        <button onClick={() => navigate('/signup')} className="px-3 py-1.5 rounded-md text-sm bg-teal-500 hover:bg-teal-400 text-black font-semibold">SIGNUP</button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="px-3 py-1.5 rounded-md text-sm bg-white/10 hover:bg-white/20"
        aria-haspopup="true"
        aria-expanded={open}
      >
        Profile
      </button>
      {open && (
  <div className="absolute right-0 mt-2 w-64 bg-[#202a3a] text-white rounded-lg border border-white/10 shadow-xl p-4 space-y-2 z-50">
          <div className="font-semibold">{me.name}</div>
          <div className="text-white/70 text-sm">{me.email}</div>
          <div className="h-px bg-white/10 my-2" />
          <button
            className="w-full text-left px-3 py-2 rounded bg-white/5 hover:bg-white/10"
            onClick={() => navigate('/rooms')}
          >
            My Group
          </button>
          <button
            className="w-full text-left px-3 py-2 rounded bg-white/5 hover:bg-white/10"
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
    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white">
      <span className="text-white/90">{typedPre}</span>
      <span className="bg-gradient-to-r from-sky-300 via-cyan-200 to-emerald-200 bg-clip-text text-transparent">{typedHi}</span>
      {!done && (
        <span
          aria-hidden="true"
          className="align-middle ml-1 inline-block w-[2px] h-8 md:h-12 bg-white/80 animate-pulse"
        />
      )}
      <span className="sr-only">{full}</span>
    </h1>
  );
};
