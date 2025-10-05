import React, { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import OpenSeadragon from "openseadragon";
import {
  Container,
  Row,
  Col,
  Button,
  Card,
  Spinner,
  Alert,
  Navbar,
  Form,
  Badge,
} from "react-bootstrap";
import "./ImageViewer.css";

const ImageViewer = () => {
  const { imageName } = useParams();
  const imageSet = imageName.replace(".fits", "_fits").replace(".hdf", "_hdf");
  const [debugMode, setDebugMode] = useState(false);
  const [imageConfig, setImageConfig] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewerLoaded, setViewerLoaded] = useState(false);
  const [tileLabels, setTileLabels] = useState({});
  const tileLabelCache = useRef({});

  const tileUrl = debugMode
    ? `http://127.0.0.1:8000/tiles-debug/${imageSet}/`
    : `http://127.0.0.1:8000/tiles/${imageSet}/`;

  const viewerRef = useRef(null);
  const osdViewerRef = useRef();

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    setViewerLoaded(false);
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
      } finally {
        setIsLoading(false);
      }
    };
    fetchConfig();
  }, [imageSet]);

  // New: Overlay logic
  useEffect(() => {
    if (!imageConfig || !viewerRef.current) return;
    setViewerLoaded(false);
    const viewer = OpenSeadragon({
      element: viewerRef.current,
      prefixUrl: "https://openseadragon.github.io/openseadragon/images/",
      tileSources: {
        width: imageConfig.width,
        height: imageConfig.height,
        tileSize: imageConfig.tileSize,
        minLevel: 0,
        maxLevel: imageConfig.maxLevel,
        getTileUrl: (level, x, y) => `${tileUrl}${level}/${x}/${y}.png`,
      },
      showNavigator: true,
      animationTime: 1.2,
      blendTime: 0.1,
      springStiffness: 10,
    });

    osdViewerRef.current = viewer; // Save for later cleanup

    viewer.addHandler("open", () => {
      setViewerLoaded(true);
      // Clear overlays whenever a new image is opened
      viewer.clearOverlays();
      tileLabelCache.current = {};
      setTileLabels({});
    });

    // Main: Listen for *tile-drawn* events to overlay labels
    viewer.addHandler("tile-drawn", async (evt) => {
      const { level, x, y, tiledImage } = evt.tile;
      // Compose the absolute URL same as what backend expects
      const absUrl = `https://storage.googleapis.com/n-large/${imageSet}/${level}/${x}/${y}.png`;

      // Avoid duplicate requests/caching
      if (tileLabelCache.current[absUrl] !== undefined) {
        const label = tileLabelCache.current[absUrl];
        if (label) addLabelOverlay(viewer, evt, label);
        return;
      }

      try {
        const labelResp = await fetch(
          `http://127.0.0.1:8000/tile-label?file_path=${encodeURIComponent(
            absUrl
          )}`
        );
        if (labelResp.ok) {
          const labelData = await labelResp.json();
          tileLabelCache.current[absUrl] = labelData.value;
          addLabelOverlay(viewer, evt, labelData.value);
        } else {
          tileLabelCache.current[absUrl] = null;
        }
      } catch {
        tileLabelCache.current[absUrl] = null;
      }
    });

    return () => {
      viewer.destroy();
      osdViewerRef.current = null;
    };
    // Be careful: imageSet and tileUrl should be in dependencies!
  }, [imageConfig, tileUrl, imageSet]);

  function addLabelOverlay(viewer, evt, label) {
    // Overlay at tile's upper left (x, y in viewport image coords)
    const { x, y, size, tiledImage, level } = evt.tile;

    // Make a unique overlay id for this tile
    const overlayId = `tile-overlay-${level}-${x}-${y}`;
    let div = document.getElementById(overlayId);
    if (!div) {
      div = document.createElement("div");
      div.id = overlayId;
      div.className = "tile-label-overlay";
      div.innerText = label;
      viewer.addOverlay({
        element: div,
        location: new OpenSeadragon.Rect(x, y, size, 28), // fixed height overlay on the tile
      });
    } else {
      div.innerText = label;
    }
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return "N/A";
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  };

  if (error) {
    return (
      <Container
        fluid
        className="image-viewer-container bg-dark text-light min-vh-100"
      >
        <Navbar
          bg="dark"
          variant="dark"
          className="border-bottom border-secondary"
        >
          <Navbar.Brand as={Link} to="/" className="text-decoration-none">
            ← Back to Dashboard
          </Navbar.Brand>
        </Navbar>
        <Container className="py-5">
          <Alert variant="danger" className="text-center shadow-lg animate-pop">
            <Alert.Heading>Error Loading Image</Alert.Heading>
            <p>{error}</p>
            <Button
              as={Link}
              to="/"
              variant="outline-danger"
              className="mt-2 shimmer-btn"
              style={{ fontFamily: '"Alan Sans", sans-serif' }}
            >
              Return to Dashboard
            </Button>
          </Alert>
        </Container>
      </Container>
    );
  }

  return (
    <Container
      fluid
      className="image-viewer-container bg-dark text-light min-vh-100 p-0"
    >
      <Navbar
        bg="dark"
        variant="dark"
        className="border-bottom border-secondary px-3"
      >
        <Navbar.Brand
          as={Link}
          to="/"
          className="text-decoration-none d-flex align-items-center"
          style={{ fontFamily: '"Alan Sans", sans-serif' }}
        >
          <span className="me-2">←</span>
          Back to Dashboard
        </Navbar.Brand>
        <div className="d-flex align-items-center ms-auto">
          <Form.Check
            type="switch"
            id="debug-mode-switch"
            label={
              <Badge
                bg={debugMode ? "warning" : "secondary"}
                text={debugMode ? "dark" : "light"}
              >
                {debugMode ? "DEBUG MODE" : "NORMAL MODE"}
              </Badge>
            }
            checked={debugMode}
            onChange={(e) => setDebugMode(e.target.checked)}
            className="me-3 animate-fade"
          />
          {imageConfig && (
            <Badge
              bg="light"
              text="dark"
              className="fs-6 animate-fade shadow-sm px-3 py-2"
            >
              {imageName}
            </Badge>
          )}
        </div>
      </Navbar>

      <Row className="g-0 flex-grow-1">
        <Col lg={9} className="viewer-column position-relative">
          {isLoading ? (
            <div className="d-flex justify-content-center align-items-center min-vh-50">
              <div className="text-center animate-fade">
                <Spinner animation="border" variant="light" className="mb-3" />
                <p
                  className="text-muted"
                  style={{ fontFamily: '"Alan Sans", sans-serif' }}
                >
                  Loading image configuration...
                </p>
              </div>
            </div>
          ) : (
            <div
              id="openseadragon-viewer"
              ref={viewerRef}
              className={`viewer-main shadow-lg rounded ${
                viewerLoaded ? "loaded animate-fade" : ""
              }`}
            />
          )}
        </Col>
        {imageConfig && (
          <Col lg={3} className="sidebar bg-dark border-start border-secondary">
            <Card
              bg="dark"
              text="light"
              border="secondary"
              className="h-100 sidebar-card shadow-lg animate-pop"
            >
              <Card.Header className="bg-secondary bg-opacity-25 border-bottom border-secondary">
                <h5
                  className="mb-0"
                  style={{ fontFamily: '"Alan Sans", sans-serif' }}
                >
                  Image Details
                </h5>
              </Card.Header>
              <Card.Body className="p-3">
                <div className="mb-3">
                  <small
                    className="text-muted"
                    style={{ fontFamily: '"Alan Sans", sans-serif' }}
                  >
                    Filename
                  </small>
                  <p className="mb-2 text-truncate">{imageName}</p>
                </div>
                <Row className="g-2">
                  <Col xs={6}>
                    <small
                      className="text-muted"
                      style={{ fontFamily: '"Alan Sans", sans-serif' }}
                    >
                      Width
                    </small>
                    <p className="mb-2">
                      {imageConfig.width?.toLocaleString()} px
                    </p>
                  </Col>
                  <Col xs={6}>
                    <small
                      className="text-muted"
                      style={{ fontFamily: '"Alan Sans", sans-serif' }}
                    >
                      Height
                    </small>
                    <p className="mb-2">
                      {imageConfig.height?.toLocaleString()} px
                    </p>
                  </Col>
                </Row>
                <Row className="g-2">
                  <Col xs={6}>
                    <small
                      className="text-muted"
                      style={{ fontFamily: '"Alan Sans", sans-serif' }}
                    >
                      Tile Size
                    </small>
                    <p
                      className="mb-2"
                      style={{ fontFamily: '"Alan Sans", sans-serif' }}
                    >
                      {imageConfig.tileSize} px
                    </p>
                  </Col>
                  <Col xs={6}>
                    <small
                      className="text-muted"
                      style={{ fontFamily: '"Alan Sans", sans-serif' }}
                    >
                      Max Level
                    </small>
                    <p
                      className="mb-2"
                      style={{ fontFamily: '"Alan Sans", sans-serif' }}
                    >
                      {imageConfig.maxLevel}
                    </p>
                  </Col>
                </Row>
                {imageConfig.fileSize && (
                  <div className="mb-3">
                    <small
                      className="text-muted"
                      style={{ fontFamily: '"Alan Sans", sans-serif' }}
                    >
                      File Size
                    </small>
                    <p
                      className="mb-2"
                      style={{ fontFamily: '"Alan Sans", sans-serif' }}
                    >
                      {formatFileSize(imageConfig.fileSize)}
                    </p>
                  </div>
                )}
                {imageConfig.format && (
                  <div className="mb-3">
                    <small
                      className="text-muted"
                      style={{ fontFamily: '"Alan Sans", sans-serif' }}
                    >
                      Format
                    </small>
                    <p
                      className="mb-2 text-uppercase"
                      style={{ fontFamily: '"Alan Sans", sans-serif' }}
                    >
                      {imageConfig.format}
                    </p>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        )}
      </Row>
    </Container>
  );
};

export default ImageViewer;
