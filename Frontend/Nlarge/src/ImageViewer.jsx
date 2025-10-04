// ./src/ImageViewer.jsx
import React, { useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import OpenSeadragon from 'openseadragon'; // Import the core library
import './ImageViewer.css';

const ImageViewer = () => {
  const { imageName } = useParams();
  const imageSet = imageName.replace('.', '_');
  const tileUrl = `http://127.0.0.1:8000/tiles/${imageSet}/`;
  
  // A ref to hold the viewer element
  const viewerRef = useRef(null);

  // This effect will run once when the component mounts
  // This effect will run once when the component mounts
  useEffect(() => {
    // Check if the ref is attached to an element
    if (viewerRef.current) {
      const osdOptions = {
        element: viewerRef.current,
        prefixUrl: 'https://openseadragon.github.io/openseadragon/images/',
        tileSources: {
          type: 'legacy-image-pyramid',
          tileSize: 256, // This line is now active
          levels: [
            { url: `${tileUrl}0/0/0.png`, width: 110, height: 94 },
            { url: `${tileUrl}1/0/0.png`, width: 220, height: 188 },
            { url: `${tileUrl}2/0/0.png`, width: 440, height: 377 },
            { url: `${tileUrl}3/0/0.png`, width: 880, height: 754 },
            { url: `${tileUrl}4/0/0.png`, width: 1760, height: 1508 }
          ],
          getTileUrl: function(level, x, y) {
            return `${tileUrl}${level}/${x}/${y}.png`;
          }
        },
        showNavigator: true,
      };

      const viewer = OpenSeadragon(osdOptions);

      // Clean up the viewer when the component unmounts
      return () => {
        viewer.destroy();
      };
    }
  }, [imageSet, tileUrl]);  // Rerun effect if the image changes

  return (
    <div className="viewer-container">
      <Link to="/" className="back-link">
        &larr; Back to Dashboard
      </Link>
      <div className="viewer-header">
        <h1>{imageName}</h1>
      </div>
      
      {/* This div is the mount point for the OpenSeadragon viewer */}
      <div id="openseadragon-viewer" ref={viewerRef} style={{flexGrow: 1, width: '100%', backgroundColor: '#000'}}></div>
    </div>
  );
};

export default ImageViewer;