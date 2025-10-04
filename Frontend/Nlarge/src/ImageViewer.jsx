import React, { useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import OpenSeadragon from 'openseadragon'; // Import the core library
import './ImageViewer.css';

const ImageViewer = () => {
  const { imageName } = useParams();
  const imageSet = imageName.replace('.', '_');
  const [debugMode, setDebugMode] = React.useState(true); // Start with debug mode on
  const tileUrl = debugMode 
    ? `http://127.0.0.1:8000/tiles-debug/${imageSet}/`
    : `http://127.0.0.1:8000/tiles/${imageSet}/`;
  
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
      
      // Test if we can reach the backend debug endpoint
      fetch(`${tileUrl}0/0/0.png`)
        .then(response => {
          console.log('Backend debug test response:', response.status);
          if (!response.ok) {
            console.error('Backend not responding correctly:', response.status);
          }
        })
        .catch(error => {
          console.error('Backend connection error:', error);
        });

      // Now implement the proper multi-level tile pyramid
      const osdOptions = {
        element: viewerRef.current,
        prefixUrl: 'https://openseadragon.github.io/openseadragon/images/',
        tileSources: {
          height: 11719,
          width: 11472,
          tileSize: 512,
          minLevel: 0,
          maxLevel: 6,
          getTileUrl: function(level, x, y) {
            const url = `${tileUrl}${level}/${x}/${y}.png`;
            console.log(`🎯 Level ${level}, X ${x}, Y ${y} -> ${url}`);
            return url;
          }
        },
        showNavigator: true,
        // Zoom settings to see all levels
        visibilityRatio: 1,
        minZoomLevel: 1,    // Very zoomed out to see level 0
        maxZoomLevel: 50,      // Very zoomed in to see level 4 details
        defaultZoomLevel: 0.5, // Start very zoomed out to see level 0
        // Smooth transitions between levels
        springStiffness: 6.5,
        animationTime: 1.2,
        blendTime: 0.1,
        alwaysBlend: false,
        // Force OpenSeadragon to use lower resolution levels when zoomed out
        immediateRender: false,
        wrapHorizontal: false,
        wrapVertical: false,
      };

      console.log('OpenSeadragon options:', osdOptions);
      const viewer = OpenSeadragon(osdOptions);
      
      // Store viewer globally so buttons can access it
      window.viewer = viewer;

      // Add event listeners for debugging
      viewer.addHandler('open', function() {
        console.log('✅ OpenSeadragon viewer opened successfully');
      });

      viewer.addHandler('open-failed', function(event) {
        console.error('❌ OpenSeadragon failed to open:', event);
      });

      viewer.addHandler('tile-load-failed', function(event) {
        console.error('❌ Tile load failed:', event);
      });

      // Add zoom change listener to see level switching
      viewer.addHandler('zoom', function(event) {
        const zoom = viewer.viewport.getZoom();
        console.log(`🔍 Zoom level: ${zoom.toFixed(2)}`);
      });

      // Add animation finish listener to see when new tiles are loaded
      viewer.addHandler('animation-finish', function(event) {
        console.log('🎬 Animation finished - new tiles should be loaded');
      });

      // Clean up the viewer when the component unmounts
      return () => {
        viewer.destroy();
      };
    }
  }, [imageSet, tileUrl, debugMode]);  // Rerun effect if the image or debug mode changes

  return (
    <div className="viewer-container">
      <Link to="/" className="back-link">
        &larr; Back to Dashboard
      </Link>
      <div className="viewer-header">
        <h1>{imageName}</h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            onClick={() => setDebugMode(!debugMode)}
            style={{
              padding: '8px 16px',
              backgroundColor: debugMode ? '#4CAF50' : '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {debugMode ? '🔍 Debug Mode ON' : '🖼️ Debug Mode OFF'}
          </button>
          
          <div style={{ color: 'white', fontSize: '14px' }}>
            Zoom to Level:
          </div>
          
          {[0, 1, 2, 3, 4].map(level => (
            <button
              key={level}
              onClick={() => {
                if (viewerRef.current && window.viewer) {
                  // Calculate zoom level for each tile level
                  const zoomLevels = [0.05, 0.1, 0.2, 0.5, 1.0];
                  window.viewer.viewport.zoomTo(zoomLevels[level]);
                }
              }}
              style={{
                padding: '4px 8px',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              L{level}
            </button>
          ))}
        </div>
      </div>
      
      {/* This div is the mount point for the OpenSeadragon viewer */}
      <div 
        id="openseadragon-viewer" 
        ref={viewerRef} 
        style={{
          flexGrow: 1, 
          width: '100%', 
          height: '600px', // Ensure minimum height
          backgroundColor: '#000',
          border: '2px solid red' // Temporary border to see if container is visible
        }}
      ></div>
    </div>
  );
};

export default ImageViewer;