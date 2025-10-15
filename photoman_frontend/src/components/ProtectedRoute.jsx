import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, approverOnly = false }) {
  const user = localStorage.getItem("user"); // optional: store user data as JSON
  const isApprover = localStorage.getItem("isApprover") === "true";

  // Not logged in
  if (!user && !isApprover) return <Navigate to="/" replace />;

  // Trying to open approver-only route
  if (approverOnly && !isApprover) return <Navigate to="/" replace />;

  return children;
}
