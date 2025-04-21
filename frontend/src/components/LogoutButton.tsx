// src/components/LogoutButton.tsx
import React from 'react';
import { Button } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout'; // Optional icon
import { useAuth } from '../context/AuthContext';
// import { useNavigate } from 'react-router-dom'; // Usually not needed here anymore

const LogoutButton: React.FC = () => {
  const { logout, isLoading } = useAuth(); // Get logout function AND isLoading state
  // const navigate = useNavigate();

  const handleLogout = () => {
    // Optional: Prevent logout if app is still in initial loading state?
    // if (isLoading) return;
    logout(); // Call the logout function from context
    // Navigation to /login is handled by ProtectedRoute detecting !isAuthenticated
    // navigate('/login');
  };

  return (
    <Button
      onClick={handleLogout}
      color="error" // Or "inherit" or "secondary"
      variant="contained" // Or "outlined"
      startIcon={<LogoutIcon />} // Optional icon
      // --- Ensure there is NO 'disabled' prop here OR it's correctly conditional ---
      // disabled={isLoading} // <-- POSSIBLE CAUSE: Is this line present and isLoading true?
    >
      Logout
    </Button>
  );
};

export default LogoutButton;