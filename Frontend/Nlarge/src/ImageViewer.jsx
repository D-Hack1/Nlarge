// ./src/ImageViewer.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { handleZoom } from '../context/zoomHandler'; // Import your function
import './ImageViewer.css';

const imageMap = {
  'blue.fits': '/blue_preview.png',
  'green.fits': '/green_preview.png',
};

const ImageViewer = () => {
  const { imageName } = useParams();
  const imageUrl = imageMap[imageName] || '/placeholder.png';

  // State for zoom and position
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // This effect calls handleZoom whenever the zoom or position changes
  useEffect(() => {
    handleZoom(zoom, position.x, position.y);
  }, [zoom, position]);

  const zoomIn = () => setZoom(prev => prev * 1.2);
  const zoomOut = () => setZoom(prev => Math.max(0.5, prev / 1.2));
  
  // Simulate getting coordinates by clicking on the image
  const handleImageClick = (e) => {
    // Get click coordinates relative to the image element
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setPosition({ x, y });
  };

  return (
    <div className="viewer-container">
      <Link to="/" className="back-link">
        &larr; Back to Dashboard
      </Link>
      
      <div className="image-display-area">
        <img 
          src={imageUrl} 
          alt={imageName} 
          className="fits-image"
          style={{ transform: `scale(${zoom})` }} // Apply CSS zoom
          onClick={handleImageClick}
        />
      </div>

      <div className="viewer-header">
        <h1>{imageName}</h1>
        <div className="coords-display">
          Z: {zoom.toFixed(2)}, X: {Math.round(position.x)}, Y: {Math.round(position.y)}
        </div>
      </div>
      
      <div className="zoom-controls">
        <button className="zoom-button" onClick={zoomOut}>-</button>
        <button className="zoom-button" onClick={zoomIn}>+</button>
      </div>
    </div>
  );
};

export default ImageViewer;