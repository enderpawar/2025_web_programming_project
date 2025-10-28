import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken } from '../api.js';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0f2135] text-white flex flex-col">
      {/* Top navigation */}
      <header className="w-full border-b border-white/10 bg-[#0e1c2d]/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-teal-300 font-extrabold tracking-widest text-xl">JSC</div>
            <span className="text-white/50 hidden sm:inline">JS Online Compiler</span>
          </div>
          <nav className="hidden md:flex items-center space-x-6 text-sm text-white/80">
            <a className="hover:text-white/100" href="#blog">Blog</a>
            <a className="hover:text-white/100" href="#contact">Contact</a>
            <a className="hover:text-white/100" href="#help">Help</a>
            <a className="hover:text-white/100" href="#donate">Donate</a>
          </nav>
          <LandingRightMenu />
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="max-w-4xl mx-auto px-4 pt-20 md:pt-28 text-center">
          <div className="w-8 mx-auto border-t-2 border-white/50 mb-8" />
          <h1 className="text-2xl md:text-3xl font-semibold text-white/90">
            Stop wasting time producing a report.
          </h1>
          <p className="mt-3 text-white/70">
            We give you an instant IDE to learn and study group.
          </p>
          <div className="mt-8">
            <button
              onClick={() => navigate('/rooms')}
              className="px-6 py-3 rounded-md bg-sky-500 hover:bg-sky-400 text-white font-semibold shadow-lg shadow-sky-500/20"
            >
              STUDY
            </button>
          </div>
        </section>

        {/* Terminal preview */}
        <section className="max-w-5xl mx-auto px-4 mt-14">
          <div className="relative mx-auto max-w-3xl">
            <div className="rounded-t-xl bg-gray-700/30 border border-white/10 p-2 flex space-x-1 w-full">
              <span className="w-3 h-3 rounded-full bg-red-400" />
              <span className="w-3 h-3 rounded-full bg-yellow-400" />
              <span className="w-3 h-3 rounded-full bg-green-500" />
              <span className="ml-auto text-xs text-white/60 pr-2">guest@JSC: ~</span>
            </div>
            <div className="rounded-b-xl bg-[#0b1a2a] border-x border-b border-white/10 p-4 font-mono text-sm text-white/80">
                  <pre className="whitespace-pre-wrap">{
                    "Welcome to JSC main page. - Type help for a list of supported commands.\n$ help\nSupported commands: about, experience, education, skills, contact\n$ _"
                  }</pre>
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
        <div className="absolute right-0 mt-2 w-64 bg-[#202a3a] text-white rounded-lg border border-white/10 shadow-xl p-4 space-y-2 z-10">
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
