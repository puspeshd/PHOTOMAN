import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

import LoginForm from "./components/LoginForm";
import UploadPhotos from "./components/UploadPhotos";
import ApproverPage from "./components/ApproverPage";

function App() {
  const [user, setUser] = useState(() => {
    // Load from localStorage on refresh
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });

  // 🔹 Keep localStorage in sync with React state
  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  return (
    <Router>
      <Routes>
        {/* 🔹 Default route → Login */}
        <Route
          path="/"
          element={
            !user ? (
              <LoginForm onLoginSuccess={(userData) => setUser(userData)} />
            ) : (
              <Navigate to="/upload" replace />
            )
          }
        />

        {/* 🔹 Upload page (only if logged in) */}
        <Route
          path="/upload"
          element={
            user ? (
              <UploadPhotos user={user} setUser={setUser} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* 🔹 Approver page (role-based access) */}
        <Route
          path="/approver"
          element={
            localStorage.getItem("isApprover") === "true" ? (
           <ApproverPage user={user} setUser={setUser} />
            ) : (
              <UploadPhotos user={user} setUser={setUser} />
            )
          }
          // element = <ApproverPage user={user} setUser={setUser} />
        />

        {/* 🔹 Catch-all for invalid URLs */}
        <Route path="*" element={<h2 className="text-center mt-5">404 - Page Not Found</h2>} />
      </Routes>
    </Router>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
