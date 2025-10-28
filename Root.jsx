import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './components/Landing.jsx';
import Rooms from './components/Rooms.jsx';
import RoomCompiler from './components/RoomCompiler.jsx';
import Login from './components/Login.jsx';
import Signup from './components/Signup.jsx';

const Root = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/rooms" element={<Rooms />} />
        <Route path="/rooms/:roomId" element={<RoomCompiler />} />
  <Route path="/login" element={<Login />} />
  <Route path="/signup" element={<Signup />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default Root;
