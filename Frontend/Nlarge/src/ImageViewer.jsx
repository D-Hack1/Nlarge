// ./src/ImageViewer.jsx
import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { handleZoom } from '../context/zoomHandler';
import './ImageViewer.css';

const imageMap = {
  'blue.fits': '/blue_preview.png',
  'green.fits': '/green_preview.png',
};

const ImageViewer = () => {
  const { imageName } = useParams();
  const imageUrl = imageMap[imageName] || '/placeholder.png';

  // We'll use this state to display the current coordinates
  const [transformState, setTransformState] = useState({ z: 1, x: 0, y: 0 });

  // This function is called by the library every time the user pans or zooms
  const onTransformed = (state) => {
    const { scale, positionX, positionY } = state;
    setTransformState({ z: scale, x: positionX, y: positionY });
    handleZoom(scale, positionX, positionY);
  };

  return (
    <div className="viewer-container">
      <Link to="/" className="back-link">
        &larr; Back to Dashboard
      </Link>
      
      <TransformWrapper
        initialScale={1}
        onTransformed={onTransformed}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <div className="image-display-area">
              <TransformComponent
                wrapperStyle={{ width: '100%', height: '100%' }}
                contentStyle={{ width: '100%', height: '100%' }}
              >
                <img src={imageUrl} alt={imageName} className="fits-image" />
              </TransformComponent>
            </div>

            <div className="viewer-header">
              <h1>{imageName}</h1>
              <div className="coords-display">
                Z: {transformState.z.toFixed(2)}, X: {Math.round(transformState.x)}, Y: {Math.round(transformState.y)}
              </div>
            </div>
            
            <div className="zoom-controls">
              <button className="zoom-button" onClick={() => zoomOut()}>-</button>
              <button className="zoom-button" onClick={() => zoomIn()}>+</button>
            </div>
          </>
        )}
      </TransformWrapper>
    </div>
  );
};

export default ImageViewer;