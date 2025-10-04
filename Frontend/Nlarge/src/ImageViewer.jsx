// ./src/ImageViewer.jsx
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import './ImageViewer.css'; // We'll add styles here

// A simple mapping from the FITS filename to our preview image
const imageMap = {
  'blue.fits': '/blue_preview.png',
  'green.fits': '/green_preview.png', // For when you convert the green one
};

const ImageViewer = () => {
  const { imageName } = useParams();
  const imageUrl = imageMap[imageName] || '/placeholder.png'; // Fallback image

  return (
    <div className="viewer-container">
      <Link to="/" className="back-link">
        &larr; Back to Dashboard
      </Link>
      
      <div className="image-display-area">
        <img src={imageUrl} alt={imageName} className="fits-image" />
      </div>

      <div className="viewer-header">
        <h1>{imageName}</h1>
      </div>
    </div>
  );
};

export default ImageViewer;