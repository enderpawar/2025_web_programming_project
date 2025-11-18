import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './ThemeContext.jsx';
import Landing from './components/Landing.jsx';
import Rooms from './components/Rooms.jsx';
import RoomProblems from './components/RoomProblems.jsx';
import RoomCompiler from './components/RoomCompiler.jsx';
import Login from './components/Login.jsx';
import Signup from './components/Signup.jsx';

const Root = () => {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/rooms/:roomId/problems" element={<RoomProblems />} />
          <Route path="/rooms/:roomId/problems/:problemId" element={<RoomCompiler />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default Root;
