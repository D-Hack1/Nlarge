import React from 'react';
import ImageCard from './ImageCard'; // <-- IMPORT THE NEW COMPONENT
import './Dashboard.css';

// The BurgerIcon remains the same
const BurgerIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
        <path fillRule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/>
    </svg>
);

const Dashboard = () => {
  // Sample data for our images
  const images = [
    { title: 'blue.fits', description: 'Antennae Galaxies (Blue Channel)', filterColor: '#60a5fa' },
    { title: 'green.fits', description: 'Antennae Galaxies (Green Channel)', filterColor: '#4ade80' },
    { title: 'red_placeholder.fits', description: 'Antennae Galaxies (Red Channel)', filterColor: '#f87171' },
    { title: 'earth_composite.hdf', description: 'Global VIIRS Composite', filterColor: '#38bdf8' },
  ];

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <button style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
          <BurgerIcon />
        </button>
        <input
          type="text"
          placeholder="Search images..."
          className="search-box"
        />
      </header>
      <main>
        <div className="card-grid">
          {images.map((image) => (
            <ImageCard
              key={image.title}
              title={image.title}
              description={image.description}
              filterColor={image.filterColor}
            />
          ))}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;