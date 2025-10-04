// ./src/ImageCard.jsx
import React from 'react';
import { Link } from 'react-router-dom'; // Import Link
import './ImageCard.css';

const ImageCard = ({ title, description, filterColor }) => {
  return (
    // Wrap the whole card in a Link.
    // The `to` prop creates the URL, e.g., "/viewer/blue.fits".
    <Link to={`/viewer/${title}`} className="card-link-wrapper">
      <div className="image-card">
        <div>
          <h3 className="card-title">
            <span className="card-filter-dot" style={{ backgroundColor: filterColor }}></span>
            {title}
          </h3>
          <p className="card-description">{description}</p>
        </div>
        <div className="card-link">Open Viewer</div>
      </div>
    </Link>
  );
};

export default ImageCard;