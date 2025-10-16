import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Button,
  Image as RBImage,
  Row,
  Col,
  Modal,
  Spinner,
  ListGroup,
} from "react-bootstrap";
import Cropper from "react-easy-crop";
import { useNavigate } from "react-router-dom";

function UploadPhotos({ user, setUser }) {
  const [photos, setPhotos] = useState([]);
  const [showResize, setShowResize] = useState(false);
  const [resizeIndex, setResizeIndex] = useState(null);
  const [resizePreview, setResizePreview] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [loading, setLoading] = useState(false);
  const [videoUrls, setVideoUrls] = useState([]);
  const [previewVideo, setPreviewVideo] = useState(null);
  const navigate = useNavigate();
  const canvasRef = useRef();

  // 🔹 Fetch video filenames and convert to full URLs
  useEffect(() => {
    async function fetchVideos() {
      try {
        const res = await fetch(
          `http://43.230.201.125:60025/videos?user_id=${user.id}`
        );
        const data = await res.json();
        if (Array.isArray(data.video_urls)) {
          const urls = data.video_urls.map(
            (filename) =>
              `http://43.230.201.125:60025/download/${user.id}/${filename}`
          );
          setVideoUrls(urls);
        }
      } catch (err) {
        console.error("Error fetching video URLs:", err);
      }
    }
    fetchVideos();
  }, [user.id]);

  // 🔹 Handle single file upload
  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (photos.length >= 30) {
      alert("You can upload up to 30 photos only");
      return;
    }

    const newPhoto = {
      file,
      preview: URL.createObjectURL(file),
    };

    // Add photo temporarily
    const updatedPhotos = [...photos, newPhoto];
    setPhotos(updatedPhotos);

    // Immediately open resize for this new photo
    setResizeIndex(updatedPhotos.length - 1);
    setResizePreview(newPhoto.preview);
    setShowResize(true);
    setCrop({ x: 0, y: 0 });
    setZoom(1);

    e.target.value = null; // reset input
  }

  // 🔹 Open resize manually
  function openResize(index) {
    setResizeIndex(index);
    setResizePreview(photos[index].preview);
    setShowResize(true);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  }

  // 🔹 Remove photo
  function removePhoto(index) {
    const updated = [...photos];
    URL.revokeObjectURL(updated[index].preview);
    updated.splice(index, 1);
    setPhotos(updated);
  }

  // 🔹 Crop helpers
  const onCropComplete = useCallback((_, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url) =>
    new Promise((resolve, reject) => {
      const image = new window.Image();
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", (err) => reject(err));
      image.src = url;
    });

  const getCroppedImg = useCallback(async () => {
    const image = await createImage(resizePreview);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const { width, height, x, y } = croppedAreaPixels;
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(image, x, y, width, height, 0, 0, width, height);
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg");
    });
  }, [resizePreview, croppedAreaPixels]);

  // 🔹 Save cropped version
  async function handleResize() {
    const blob = await getCroppedImg();
    const updated = [...photos];
    URL.revokeObjectURL(updated[resizeIndex].preview);
    updated[resizeIndex] = {
      file: new File([blob], updated[resizeIndex].file.name, {
        type: "image/jpeg",
      }),
      preview: URL.createObjectURL(blob),
    };
    setPhotos(updated);
    setShowResize(false);
  }

  // 🔹 Upload photos
  async function handleSubmit() {
    setLoading(true);
    const formData = new FormData();
    formData.append("user_id", user.id);
    photos.forEach((photo) => {
      formData.append("photos", photo.file, photo.file.name);
    });

    try {
      const res = await fetch("http://43.230.201.125:60025/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      alert(
        "Your photos are successfully uploaded.\nOnce approved, you will see the video in 'Your Videos' section."
      );
    } catch (err) {
      alert("Upload failed");
    } 
    setLoading(false);
  }

  // 🔹 Video preview + download
  function handleVideoClick(url) {
    setPreviewVideo(url);
  }

  function handleDownload(url) {
    const a = document.createElement("a");
    a.href = url;
    a.download = url.split("/").pop();
    a.click();
  }

  // 🔹 Logout
  function navigateme(screen) {
    if (screen === "logout") {
      setUser(null);
      navigate("/");
    }
  }

  return (
    <div>
      {/* Header */}
      <header
        style={{
          background: "goldenrod",
          color: "white",
          height: "10.5vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
        }}
      >
        <div className="flex justify-center mb-4">
          <img
            src="./assets/react.svg" // your logo path
            alt="Logo"
            className="h-16 w-auto object-contain"
          />
        </div>
        <Button
          variant="outline-light"
          size="sm"
          onClick={() => navigateme("logout")}
          style={{ borderRadius: "20px", fontWeight: "bold" }}
        >
          Logout
        </Button>
      </header>

      <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
        {/* Left Section */}
        <div style={{ flex: 5 }}>
          <h3>Hello, {user.first_name}. Upload 1 photo at a time:</h3>
          <h4 style={{ color: "red" }}>
            Note: Only upload photos of people with focused, clear and up-close faces
          </h4>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={photos.length >= 30 || loading}
          />

          <Row className="mt-3">
            {photos.map((photo, index) => (
              <Col xs={4} md={3} lg={2} key={index} className="mb-3 text-center">
                <RBImage
                  src={photo.preview}
                  rounded
                  thumbnail
                  style={{ height: "100px", objectFit: "cover" }}
                />
                <div className="mt-1">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => removePhoto(index)}
                    disabled={loading}
                  >
                    Remove
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="ms-1"
                    onClick={() => openResize(index)}
                    disabled={loading}
                  >
                    Resize
                  </Button>
                </div>
              </Col>
            ))}
          </Row>

          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={photos.length === 0 || loading}
            className="mt-3"
          >
            {loading ? <Spinner animation="border" size="sm" /> : "Submit"}
          </Button>
        </div>

        {/* Right Section */}
        <div
          style={{
            flex: 2,
            background: "#f8f9fa",
            borderRadius: "8px",
            padding: "15px",
            maxHeight: "600px",
            overflowY: "auto",
          }}
        >
          <h5 className="mb-3 text-center">Your Videos</h5>
          {videoUrls.length === 0 ? (
            <p className="text-muted text-center">No videos yet</p>
          ) : (
            <ListGroup>
              {videoUrls.map((url, i) => (
                <ListGroup.Item
                  key={i}
                  className="d-flex justify-content-between align-items-center"
                >
                  <span
                    style={{
                      cursor: "pointer",
                      color: "#007bff",
                      textDecoration: "underline",
                    }}
                    onClick={() => handleVideoClick(url)}
                  >
                    {url.split("/").pop()}
                  </span>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => handleDownload(url)}
                  >
                    Download
                  </Button>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </div>
      </div>

      {/* Crop / Resize Modal */}
      <Modal show={showResize} onHide={() => setShowResize(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Resize / Crop Photo</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "400px",
              background: "#333",
            }}
          >
            <Cropper
              image={resizePreview}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              cropShape="round"
              showGrid={false}
              restrictPosition={false}
            />
          </div>
          <style>
            {`
              .reactEasyCrop_CropArea {
                border: 9px solid red !important;
                box-shadow: 0 0 0 9999em rgba(0, 0, 0, 0.5) !important;
                border-radius: 50% !important;
              }
            `}
          </style>
          <div className="mt-3 text-center">
            <label>Zoom:</label>
            <input
              type="range"
              min={0.1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowResize(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleResize}>
            Save
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Video Preview Modal */}
      <Modal
        show={!!previewVideo}
        onHide={() => setPreviewVideo(null)}
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Video Preview</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {previewVideo ? (
            <video
              key={previewVideo}
              src={previewVideo}
              controls
              autoPlay
              style={{ width: "100%" }}
            />
          ) : (
            <Spinner animation="border" />
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default UploadPhotos;
