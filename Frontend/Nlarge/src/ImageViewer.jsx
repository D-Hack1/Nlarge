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
  const tileLabelCache = useRef({});
  const currentZoomLevel = useRef(null);
  const viewerInstance = useRef(null);

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

  const viewerRef = useRef(null);

  useEffect(() => {
    if (!imageConfig || !viewerRef.current) return;
    setViewerLoaded(false);

    const tileSourceUrl = debugMode
      ? `http://127.0.0.1:8000/tiles-debug/${imageSet}/`
      : imageConfig.tileSourceUrl + "/";

    const viewer = OpenSeadragon({
      element: viewerRef.current,
      prefixUrl: "https://openseadragon.github.io/openseadragon/images/",
      tileSources: {
        width: imageConfig.width,
        height: imageConfig.height,
        tileSize: imageConfig.tileSize,
        minLevel: 0,
        maxLevel: imageConfig.maxLevel,
        getTileUrl: (level, x, y) => `${tileSourceUrl}${level}/${x}/${y}.png`,
      },
      showNavigator: true,
      animationTime: 1.2,
      blendTime: 0.1,
      springStiffness: 10,
      drawer: "canvas",
    });

    viewerInstance.current = viewer;

    viewer.addHandler("open", () => {
      setViewerLoaded(true);
      viewer.clearOverlays();
      tileLabelCache.current = {};
    });

    let pendingLabels = [];
    let batchTimer = null;

    const sendBatch = async () => {
      if (pendingLabels.length === 0) return;
      const currentPending = [...pendingLabels];
      pendingLabels = [];
      const urls = currentPending.map((p) => p.absUrl);

      console.log("Sending batch request with URLs:", urls);
      try {
        const response = await fetch(`http://127.0.0.1:8000/batch-tile-labels`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file_paths: urls }),
        });
        if (response.ok) {
          const labelData = await response.json();
          console.log("Batch response received:", labelData);
          currentPending.forEach(({ evt, absUrl }) => {
            const label = labelData[absUrl] || null;
            tileLabelCache.current[absUrl] = label;
            if (label && evt.tile.level === currentZoomLevel.current) {
              addLabelOverlay(viewer, evt, label);
            }
          });
        } else {
          const errorText = await response.text();
          console.error("Batch request failed with status", response.status, ":", errorText);
          // Fallback to individual requests if batch fails
          for (const { evt, absUrl } of currentPending) {
            try {
              const singleResponse = await fetch(`http://127.0.0.1:8000/tile-label?file_path=${encodeURIComponent(absUrl)}`);
              if (singleResponse.ok) {
                const labelData = await singleResponse.json();
                tileLabelCache.current[absUrl] = labelData.value;
                if (labelData.value && evt.tile.level === currentZoomLevel.current) {
                  addLabelOverlay(viewer, evt, labelData.value);
                }
              } else {
                tileLabelCache.current[absUrl] = null;
              }
            } catch (e) {
              console.error("Single label fetch failed for", absUrl, ":", e);
              tileLabelCache.current[absUrl] = null;
            }
          }
        }
      } catch (e) {
        console.error("Failed to fetch batch tile labels:", e);
        currentPending.forEach(({ absUrl }) => {
          tileLabelCache.current[absUrl] = null;
        });
      }
    };

    viewer.addHandler("tile-drawn", (evt) => {
      const { level, x, y } = evt.tile;
      const absUrl = `https://storage.googleapis.com/n-large/${imageSet}/${level}/${x}/${y}.png`;

      if (tileLabelCache.current[absUrl] !== undefined) {
        const label = tileLabelCache.current[absUrl];
        if (label && level === currentZoomLevel.current) {
          addLabelOverlay(viewer, evt, label);
        }
        return;
      }

      pendingLabels.push({ evt, absUrl });

      if (batchTimer) clearTimeout(batchTimer);
      batchTimer = setTimeout(sendBatch, 100);

      if (pendingLabels.length >= 10) {
        clearTimeout(batchTimer);
        sendBatch();
        batchTimer = null;
      }
    });

    // Track zoom level changes
    viewer.addHandler("zoom", () => {
      const newZoomLevel = Math.round(viewer.viewport.getZoom() * imageConfig.maxLevel);
      if (currentZoomLevel.current !== newZoomLevel) {
        currentZoomLevel.current = newZoomLevel;
        viewer.clearOverlays(); // Remove all existing overlays
        // Reapply overlays for the current zoom level
        Object.entries(tileLabelCache.current).forEach(([absUrl, label]) => {
          const [_, set, level, x, y] = absUrl.split("/").slice(-5);
          if (label && parseInt(level) === currentZoomLevel.current) {
            const tile = viewer.world.getTileAtPoint(new OpenSeadragon.Point(x, y), currentZoomLevel.current);
            if (tile) {
              addLabelOverlay(viewer, { tile }, label);
            }
          }
        });
      }
    });

    return () => {
      if (batchTimer) clearTimeout(batchTimer);
      if (viewer) viewer.destroy();
    };
  }, [imageConfig, debugMode, imageSet]);

  function addLabelOverlay(viewer, evt, label) {
    const { x, y, level, bounds } = evt.tile;
    const overlayId = `tile-overlay-${level}-${x}-${y}`;

    let div = document.getElementById(overlayId);
    if (!div) {
      div = document.createElement("div");
      div.id = overlayId;
      div.className = "tile-label-overlay";
      div.style.position = "absolute";
      div.style.padding = "2px 5px";
      div.style.background = "rgba(0, 0, 0, 0.7)";
      div.style.color = "white";
      div.style.fontSize = "12px";
      div.style.pointerEvents = "none";
      div.innerText = label;

      viewer.addOverlay({
        element: div,
        location: bounds,
      });
    } else if (div.innerText !== label) {
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
      <Container fluid className="image-viewer-container bg-dark text-light min-vh-100">
        <Navbar bg="dark" variant="dark" className="border-bottom border-secondary">
          <Navbar.Brand as={Link} to="/" className="text-decoration-none">
            ← Back to Dashboard
          </Navbar.Brand>
        </Navbar>
        <Container className="py-5">
          <Alert variant="danger" className="text-center shadow-lg animate-pop">
            <Alert.Heading>Error Loading Image</Alert.Heading>
            <p>{error}</p>
            <Button as={Link} to="/" variant="outline-danger" className="mt-2 shimmer-btn">
              Return to Dashboard
            </Button>
          </Alert>
        </Container>
      </Container>
    );
  }

  return (
    <Container fluid className="image-viewer-container bg-dark text-light min-vh-100 p-0">
      <Navbar bg="dark" variant="dark" className="border-bottom border-secondary px-3">
        <Navbar.Brand as={Link} to="/" className="text-decoration-none d-flex align-items-center">
          <span className="me-2">←</span>
          Back to Dashboard
        </Navbar.Brand>
        <div className="d-flex align-items-center ms-auto">
          <Form.Check
            type="switch"
            id="debug-mode-switch"
            label={
              <Badge bg={debugMode ? "warning" : "secondary"} text={debugMode ? "dark" : "light"}>
                {debugMode ? "DEBUG MODE" : "NORMAL MODE"}
              </Badge>
            }
            checked={debugMode}
            onChange={(e) => setDebugMode(e.target.checked)}
            className="me-3 animate-fade"
          />
          {imageConfig && (
            <Badge bg="light" text="dark" className="fs-6 animate-fade shadow-sm px-3 py-2">
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
                <p className="text-muted">Loading image configuration...</p>
              </div>
            </div>
          ) : (
            <div
              id="openseadragon-viewer"
              ref={viewerRef}
              className={`viewer-main shadow-lg rounded ${viewerLoaded ? "loaded animate-fade" : ""}`}
            />
          )}
        </Col>
        {imageConfig && (
          <Col lg={3} className="sidebar bg-dark border-start border-secondary">
            <Card bg="dark" text="light" border="secondary" className="h-100 sidebar-card shadow-lg animate-pop">
              <Card.Header className="bg-secondary bg-opacity-25 border-bottom border-secondary">
                <h5 className="mb-0">Image Details</h5>
              </Card.Header>
              <Card.Body className="p-3">
                <div className="mb-3">
                  <small className="text-muted">Filename</small>
                  <p className="mb-2 text-truncate">{imageName}</p>
                </div>
                <Row className="g-2">
                  <Col xs={6}>
                    <small className="text-muted">Width</small>
                    <p className="mb-2">{imageConfig.width?.toLocaleString()} px</p>
                  </Col>
                  <Col xs={6}>
                    <small className="text-muted">Height</small>
                    <p className="mb-2">{imageConfig.height?.toLocaleString()} px</p>
                  </Col>
                </Row>
                <Row className="g-2">
                  <Col xs={6}>
                    <small className="text-muted">Tile Size</small>
                    <p className="mb-2">{imageConfig.tileSize} px</p>
                  </Col>
                  <Col xs={6}>
                    <small className="text-muted">Max Level</small>
                    <p className="mb-2">{imageConfig.maxLevel}</p>
                  </Col>
                </Row>
                {imageConfig.fileSize && (
                  <div className="mb-3">
                    <small className="text-muted">File Size</small>
                    <p className="mb-2">{formatFileSize(imageConfig.fileSize)}</p>
                  </div>
                )}
                {imageConfig.format && (
                  <div className="mb-3">
                    <small className="text-muted">Format</small>
                    <p className="mb-2 text-uppercase">{imageConfig.format}</p>
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