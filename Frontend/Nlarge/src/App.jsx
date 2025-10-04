// ./src/App.jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Dashboard from './Dashboard';
import ImageViewer from './ImageViewer'; // We will create this next
import './App.css';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/viewer/:imageName" element={<ImageViewer />} />
    </Routes>
  );
}

export default App;