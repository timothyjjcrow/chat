import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";

function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();

  // If still loading, you might want to show a loading spinner
  if (loading) {
    return <div>Loading...</div>;
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If authenticated, render the child routes
  return <Outlet />;
}

export default ProtectedRoute;
