import React, { useState, useEffect } from "react";
import Cropper from "react-easy-crop";
import { Button, Modal, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

// Utility to get cropped & adjusted image as Blob
const getCroppedImg = (imageSrc, crop, zoom, brightness, contrast) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // handle CORS
    img.src = imageSrc;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      const scale = img.naturalWidth / img.width;
      const cropX = crop.x * scale;
      const cropY = crop.y * scale;
      const cropWidth = img.width / zoom;
      const cropHeight = img.height / zoom;

      canvas.width = cropWidth;
      canvas.height = cropHeight;

      ctx.filter = `brightness(${brightness}) contrast(${contrast})`;
      ctx.drawImage(
        img,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        cropWidth,
        cropHeight
      );

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Canvas is empty"));
          resolve(blob);
        },
        "image/jpeg",
        0.95
      );
    };
    img.onerror = (err) => reject(err);
  });
};

export default function ApproverPage({ user, setUser }) {
  const [users, setUsers] = useState([]);
  const [folders, setFolders] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [photoAdjustments, setPhotoAdjustments] = useState({});
  const [brightness, setBrightness] = useState(1);
  const [contrast, setContrast] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [editingPhoto, setEditingPhoto] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // Load users on mount
  useEffect(() => {
    fetch("http://43.230.201.125:60025/get_users")
      .then((res) => res.json())
      .then((data) => setUsers(data.users || []))
      .catch((err) => console.error("Error fetching users:", err));
  }, []);

  const handleUserClick = (userItem) => {
    setSelectedUser(userItem);
    setFolders([]);
    setPhotos([]);
    fetch(`http://43.230.201.125:60025/get_folders?user_id=${userItem.id}`)
      .then((res) => res.json())
      .then((data) => setFolders(data.folders || []))
      .catch((err) => console.error("Error fetching folders:", err));
  };

  const handleFolderClick = (folder) => {
    setSelectedFolder(folder);
    setPhotos([]);
    fetch(
      `http://43.230.201.125:60025/get_photos?user_id=${selectedUser.id}&folder=${folder}`
    )
      .then((res) => res.json())
      .then((data) => setPhotos(data.photos || []))
      .catch((err) => console.error("Error fetching photos:", err));
  };

  const handleDelete = (photo) => {
    setPhotos((prev) => prev.filter((p) => p !== photo));
  };

  const handleEdit = (photo) => {
    setEditingPhoto(photo);
    const key = photo.url || photo;
    const current = photoAdjustments[key] || { brightness: 1, contrast: 1 };
    setBrightness(current.brightness);
    setContrast(current.contrast);
    setZoom(1);
    setShowCropper(true);
  };

  const handleCropSave = () => {
    const key = editingPhoto?.url || editingPhoto;
    setPhotoAdjustments((prev) => ({
      ...prev,
      [key]: {
        brightness: parseFloat(brightness),
        contrast: parseFloat(contrast),
        zoom: parseFloat(zoom),
      },
    }));
    setShowCropper(false);
  };

  const handleApprove = async () => {
    if (!selectedUser || !selectedFolder) return;
    const formData = new FormData();

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const key = photo.url || photo;
      const adj = photoAdjustments[key] || {
        brightness: 1,
        contrast: 1,
        zoom: 1,
      };

      const blob = await getCroppedImg(
        key,
        { x: 0, y: 0 },
        adj.zoom,
        adj.brightness,
        adj.contrast
      );
      formData.append("photos", blob, `photo_${i}.jpg`);
    }

    formData.append("user_id", selectedUser.id);
    formData.append("folder", selectedFolder);
    setLoading(true);
    await fetch("http://43.230.201.125:60025/approve_photos", {
      method: "POST",
      body: formData,
    });

    alert("✅ Photos approved and uploaded!");
    setLoading(false);
    //window.location.reload();
  };

  const navigateme = (screen) => {
    if (screen === "logout") {
      setUser(null);
      navigate("/");
    }
  };

  return (
    <div>
      {/* HEADER */}
      <header
        style={{
          background: "green",
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
          src="logo.png" // <-- Replace with your logo path
          alt=""
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

      {/* MAIN CONTENT */}
      <div className="p-4">
        <h2>Approver Dashboard</h2>

        {/* USERS SECTION */}
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: "10px",
            padding: "15px",
            marginBottom: "20px",
          }}
        >
          <h4>Select a User:</h4>
          {users.map((userItem) => (
            <Button
              key={userItem.id}
              className="m-2"
              variant={
                selectedUser?.id === userItem.id ? "primary" : "outline-primary"
              }
              onClick={() => handleUserClick(userItem)}
            >
              {userItem.name}
            </Button>
          ))}
        </div>

        {/* FOLDERS SECTION */}
        {selectedUser && (
          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: "10px",
              padding: "15px",
              marginBottom: "20px",
            }}
          >
            <h4>Folders for {selectedUser.name}</h4>
            {folders.length > 0 ? (
              folders.map((folder, idx) => (
                <Button
                  key={idx}
                  className="m-2"
                  variant={
                    selectedFolder === folder
                      ? "primary"
                      : "outline-secondary"
                  }
                  onClick={() => handleFolderClick(folder)}
                >
                  {folder}
                </Button>
              ))
            ) : (
              <p className="text-muted">No folders found.</p>
            )}
          </div>
        )}

        {/* PHOTOS SECTION */}
        {selectedFolder && (
          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: "10px",
              padding: "15px",
            }}
          >
            <h4>Photos in {selectedFolder}</h4>
            <div className="d-flex flex-wrap">
              {photos.map((photo, idx) => {
                const key = photo.url || photo;
                const adj =
                  photoAdjustments[key] || { brightness: 1, contrast: 1 };
                return (
                  <div
                    key={idx}
                    className="m-2"
                    style={{ position: "relative", textAlign: "center" }}
                  >
                    <img
                      src={key}
                      alt=""
                      style={{
                        width: "150px",
                        height: "150px",
                        objectFit: "cover",
                        filter: `brightness(${adj.brightness}) contrast(${adj.contrast})`,
                        borderRadius: "50%", // circular preview
                      }}
                    />
                    <div className="mt-2">
                      <Button
                        size="sm"
                        variant="warning"
                        onClick={() => handleEdit(photo)}
                      >
                        Edit
                      </Button>{" "}
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(photo)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <Button
              className="mt-4"
              variant="success"
              disabled={loading}
              onClick={handleApprove}
            >
              {loading ? (
                <Spinner animation="border" size="sm" />
              ) : (
                "Approve All"
              )}
            </Button>
          </div>
        )}

        {/* EDIT MODAL */}
        <Modal
          show={showCropper}
          onHide={() => setShowCropper(false)}
          size="lg"
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>Edit Photo</Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <div
              style={{
                position: "relative",
                width: "100%",
                height: "350px",
                background: "#222",
                overflow: "hidden",
                borderRadius: "8px",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  filter: `brightness(${brightness}) contrast(${contrast})`,
                }}
              >
                <Cropper
  image={editingPhoto?.url || editingPhoto}
  crop={crop}
  zoom={zoom}
  aspect={1}
  onCropChange={setCrop}
  onZoomChange={setZoom}
  objectFit="contain"
  cropShape="round"
  showGrid={false}
  restrictPosition={false} // ✅ allows drag anytime
/>


              </div>
               {/* Inline style only for this component */}
  <style>
    {`
      .reactEasyCrop_CropArea {
        border: 9px solid red !important;
        box-shadow: 0 0 0 9999em rgba(0, 0, 0, 0.5) !important;
        border-radius: 50% !important;
      }
    `}
  </style>
            </div>

            <div
              className="mt-4 d-flex flex-column align-items-center"
              style={{
                background: "#f8f9fa",
                padding: "10px",
                borderRadius: "8px",
              }}
            >
              <div className="w-75">
                <label className="form-label">Brightness:</label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={brightness}
                  onChange={(e) => setBrightness(e.target.value)}
                  className="form-range"
                />
              </div>

              <div className="w-75 mt-3">
                <label className="form-label">Contrast:</label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={contrast}
                  onChange={(e) => setContrast(e.target.value)}
                  className="form-range"
                />
              </div>

              <div className="w-75 mt-3">
                <label className="form-label">Zoom:</label>
                <input
                  type="range"
                  min="0.1"
                  max="3"
                  step="0.1"
                  value={zoom}
                  onChange={(e) => setZoom(e.target.value)}
                  className="form-range"
                />
              </div>
            </div>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCropper(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCropSave}>
              Save
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </div>
  );
}
