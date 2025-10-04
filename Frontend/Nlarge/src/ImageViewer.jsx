import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import OpenSeadragon from 'openseadragon';
import './ImageViewer.css';

const ImageViewer = () => {
  const { imageName } = useParams();
  const imageSet = imageName.replace('.fits', '_fits').replace('.hdf', '_hdf');
  const [debugMode, setDebugMode] = useState(false);
  
  // State to hold the configuration fetched from the backend
  const [imageConfig, setImageConfig] = useState(null);
  const [error, setError] = useState(null);
  
  const tileUrl = debugMode 
    ? `http://127.0.0.1:8000/tiles-debug/${imageSet}/`
    : `http://127.0.0.1:8000/tiles/${imageSet}/`;
  
  const viewerRef = useRef(null);

  // Effect 1: Fetch the configuration data when the component mounts
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch(`http://127.0.0.1:8000/info/${imageSet}`);
        if (!response.ok) {
          throw new Error(`Configuration not found for ${imageSet}`);
        }
        const data = await response.json();
        setImageConfig(data);
      } catch (err) {
        setError(err.message);
      }
    };
    fetchConfig();
  }, [imageSet]);

  // Effect 2: Initialize OpenSeadragon AFTER the config is loaded
  useEffect(() => {
    if (!imageConfig || !viewerRef.current) {
      // Don't initialize until we have the config and the div is ready
      return;
    }

    const viewer = OpenSeadragon({
      element: viewerRef.current,
      prefixUrl: 'https://openseadragon.github.io/openseadragon/images/',
      tileSources: {
        width: imageConfig.width,
        height: imageConfig.height,
        tileSize: imageConfig.tileSize,
        minLevel: 0,
        maxLevel: imageConfig.maxLevel,
        getTileUrl: function(level, x, y) {
          return `${tileUrl}${level}/${x}/${y}.png`;
        }
      },
      showNavigator: true,
      animationTime: 1.2,
      blendTime: 0.1,
      springStiffness: 10,
    });

    return () => {
      viewer.destroy();
    };
  }, [imageConfig, tileUrl]); // Re-run only when config or tileUrl changes

  // --- Render logic ---
  if (error) {
    return <div className="viewer-container">Error: {error}</div>;
  }

  if (!imageConfig) {
    return <div className="viewer-container">Loading image configuration...</div>;
  }

  return (
    <div className="viewer-container">
      <Link to="/" className="back-link">
        &larr; Back to Dashboard
      </Link>
      <div className="viewer-header">
        <h1>{imageName}</h1>
        <button onClick={() => setDebugMode(!debugMode)}>
          {debugMode ? 'Debug ON' : 'Debug OFF'}
        </button>
      </div>
      
      <div id="openseadragon-viewer" ref={viewerRef} style={{flexGrow: 1, width: '100%', backgroundColor: '#000'}}></div>
    </div>
  );
};

export default ImageViewer;
