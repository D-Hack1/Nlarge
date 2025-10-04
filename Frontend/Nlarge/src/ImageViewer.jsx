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

  // Debug logging
  console.log('ImageViewer - imageName:', imageName);
  console.log('ImageViewer - imageSet:', imageSet);
  console.log('ImageViewer - tileUrl:', tileUrl);

  // This effect will run once when the component mounts
  useEffect(() => {
    // Check if the ref is attached to an element
    if (viewerRef.current) {
      console.log('Setting up OpenSeadragon viewer...');
      
      // Test if we can reach the backend
      fetch(`${tileUrl}0/0/0.png`)
        .then(response => {
          console.log('Backend test response:', response.status);
          if (!response.ok) {
            console.error('Backend not responding correctly:', response.status);
          }
        })
        .catch(error => {
          console.error('Backend connection error:', error);
        });

      const osdOptions = {
        element: viewerRef.current,
        prefixUrl: 'https://openseadragon.github.io/openseadragon/images/',
        tileSources: {
          height: 1508,
          width: 1760,
          tileSize: 256,
          minLevel: 0,
          maxLevel: 4,
          getTileUrl: function(level, x, y) {
            const url = `${tileUrl}${level}/${x}/${y}.png`;
            console.log('Requesting tile:', url);
            return url;
          }
        },
        showNavigator: true,
        debugMode: true, // Enable OpenSeadragon debug mode
      };

      console.log('OpenSeadragon options:', osdOptions);
      const viewer = OpenSeadragon(osdOptions);

      // Add event listeners for debugging
      viewer.addHandler('open', function() {
        console.log('OpenSeadragon viewer opened successfully');
      });

      viewer.addHandler('open-failed', function(event) {
        console.error('OpenSeadragon failed to open:', event);
      });

      viewer.addHandler('tile-load-failed', function(event) {
        console.error('Tile load failed:', event);
      });

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