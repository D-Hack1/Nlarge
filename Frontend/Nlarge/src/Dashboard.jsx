import React, { useState } from "react";
import {
  Container,
  Row,
  Col,
  Form,
  Navbar,
  Card,
  Button,
  InputGroup,
  Badge,
  Dropdown,
} from "react-bootstrap";
import ImageCard from "./ImageCard";
import "./Dashboard.css";

// Enhanced BurgerIcon with more modern styling
const BurgerIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    fill="currentColor"
    viewBox="0 0 16 16"
  >
    <path
      fillRule="evenodd"
      d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"
    />
  </svg>
);

// Search icon for the search bar
const SearchIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    fill="currentColor"
    viewBox="0 0 16 16"
  >
    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
  </svg>
);

// Filter icon for dropdown
const FilterIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    fill="currentColor"
    viewBox="0 0 16 16"
  >
    <path d="M6 10.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z" />
  </svg>
);

const Dashboard = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name");

  // Sample data for our images
  const images = [
    {
      title: "blue.fits",
      description: "Antennae Galaxies (Blue Channel)",
      filterColor: "#60a5fa",
      fileSize: "2.4 MB",
      dateAdded: "2024-01-15",
      dimensions: "4096×4096",
    },
    {
      title: "green.fits",
      description: "Antennae Galaxies (Green Channel)",
      filterColor: "#4ade80",
      fileSize: "2.4 MB",
      dateAdded: "2024-01-15",
      dimensions: "4096×4096",
    },
    {
      title: "red_placeholder.fits",
      description: "Antennae Galaxies (Red Channel)",
      filterColor: "#f87171",
      fileSize: "2.4 MB",
      dateAdded: "2024-01-15",
      dimensions: "4096×4096",
    },
    {
      title: "star_birth",
      description: "Global VIIRS Composite",
      filterColor: "#38bdf8",
      fileSize: "1.8 MB",
      dateAdded: "2024-01-10",
      dimensions: "2048×2048",
    },
    {
      title: "nebula_composite.fits",
      description: "Orion Nebula Multi-spectral",
      filterColor: "#c084fc",
      fileSize: "3.2 MB",
      dateAdded: "2024-01-18",
      dimensions: "8192×8192",
    },
    {
      title: "deep_field.hdf",
      description: "Hubble Ultra Deep Field",
      filterColor: "#fbbf24",
      fileSize: "4.1 MB",
      dateAdded: "2024-01-12",
      dimensions: "8192×8192",
    },
  ];

  // Filter images based on search query
  const filteredImages = images.filter(
    (image) =>
      image.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      image.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Container
      fluid
      className="dashboard-container bg-dark text-light min-vh-100 p-0"
    >
      {/* Header */}
      <Navbar
        bg="dark"
        variant="dark"
        className="dashboard-navbar border-bottom border-secondary px-4 py-3"
      >
        <div className="d-flex align-items-center w-100">
          {/* Left section - Menu and Title */}
          <div className="d-flex align-items-center me-4">
            <Button
              variant="outline-light"
              size="sm"
              className="me-3 border-0 rounded-circle d-flex align-items-center justify-content-center"
              style={{ width: "40px", height: "40px" }}
            >
              <BurgerIcon />
            </Button>
            <div>
              <h4 className="mb-0 fw-bold">NLarge</h4>
              <small className="text-muted">Scientific Image Repository</small>
            </div>
          </div>

          {/* Center section - Search */}
          <div className="flex-grow-1 mx-4" style={{ maxWidth: "500px" }}>
            <InputGroup className="search-input-group">
              <InputGroup.Text className="bg-dark border-secondary text-muted">
                <SearchIcon />
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Search images by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-dark border-secondary text-light search-input"
              />
            </InputGroup>
          </div>

          {/* Right section - Filters and Stats */}
          <div className="d-flex align-items-center">
            <Dropdown className="me-3">
              <Dropdown.Toggle
                variant="outline-light"
                size="sm"
                className="border-secondary d-flex align-items-center"
              >
                <FilterIcon />
                <span className="ms-2">Sort: {sortBy}</span>
              </Dropdown.Toggle>
              <Dropdown.Menu className="bg-dark border-secondary">
                <Dropdown.Item
                  className="text-light"
                  onClick={() => setSortBy("name")}
                >
                  Name
                </Dropdown.Item>
                <Dropdown.Item
                  className="text-light"
                  onClick={() => setSortBy("date")}
                >
                  Date Added
                </Dropdown.Item>
                <Dropdown.Item
                  className="text-light"
                  onClick={() => setSortBy("size")}
                >
                  File Size
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>

            <Badge bg="outline-light" text="light" className="fs-6">
              {filteredImages.length} images
            </Badge>
          </div>
        </div>
      </Navbar>

      {/* Main Content */}
      <Container fluid className="dashboard-main py-4 px-4">
        {/* Welcome Card */}
        <Card className="mb-4 bg-dark border-secondary welcome-card">
          <Card.Body className="p-4">
            <Row className="align-items-center">
              <Col md={8} className="bg-dark text-white p-4 rounded shadow-lg">
                <h3 className="fw-bold mb-2" style={{fontFamily: '"Alan Sans", sans-serif'}}>Welcome to NLarge</h3>
                <p className="mb-0" style={{fontFamily: '"Alan Sans", sans-serif'}}>
                  Explore high-resolution astronomical images and datasets.
                  Click on any image card to view in full detail with our
                  advanced viewer.
                </p>
              </Col>

              <Col md={4} className="text-end">
                <Badge bg="primary" className="fs-6 px-3 py-2">
                  {images.length} Total Images
                </Badge>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Image Grid */}
        <Row className="g-4">
          {filteredImages.map((image, index) => (
            <Col key={image.title} xl={3} lg={4} md={6} className="image-col">
              <ImageCard
                title={image.title}
                description={image.description}
                filterColor={image.filterColor}
                fileSize={image.fileSize}
                dateAdded={image.dateAdded}
                dimensions={image.dimensions}
                index={index}
              />
            </Col>
          ))}
        </Row>

        {/* Empty State */}
        {filteredImages.length === 0 && (
          <Card className="text-center bg-dark border-secondary empty-state">
            <Card.Body className="p-5">
              <div className="mb-3" style={{ fontSize: "3rem", opacity: 0.5 }}>
                🔭
              </div>
              <h5 className="text-muted">No images found</h5>
              <p className="text-muted mb-0">
                Try adjusting your search terms or browse all images.
              </p>
            </Card.Body>
          </Card>
        )}
      </Container>
    </Container>
  );
};

export default Dashboard;
