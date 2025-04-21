// src/components/BottomNav.tsx
import React, { useState, useEffect } from 'react';
// Removed unused 'Link' import
import { useLocation, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import HomeIcon from '@mui/icons-material/Home';
import SearchIcon from '@mui/icons-material/Search';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'; // <-- Import Add icon
import Paper from '@mui/material/Paper';

const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // Keep state based on current pathname for correct highlighting
  const [value, setValue] = useState(location.pathname);

  // Update state if location changes externally
  useEffect(() => {
    // Ensure value accurately reflects current path, even on direct navigation/refresh
     // Check against known paths to prevent highlighting invalid values if user lands on a sub-page
     const validPaths = ['/home', '/search', '/create', '/profile'];
     if (validPaths.includes(location.pathname)) {
         setValue(location.pathname);
     } else if (location.pathname.startsWith('/profile') || location.pathname.startsWith('/users')) {
         // Optionally highlight profile tab for sub-profile pages
         // setValue('/profile');
     } else {
          // Optionally set a default or leave as is
          // setValue('/home');
     }
  }, [location.pathname]);

  // Handle navigation when a tab is clicked
  const handleChange = (event: React.SyntheticEvent, newValue: string) => {
    // Don't need to call setValue here if using navigate,
    // the useEffect above will update it when location changes.
    // setValue(newValue); // Optional: Set state immediately for faster UI feedback
    navigate(newValue); // Use navigate function to change route
  };

  return (
    <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1100 }} elevation={3}>
      {/* Pass the current 'value' state to highlight the correct tab */}
      <BottomNavigation showLabels value={value} onChange={handleChange}>
        <BottomNavigationAction label="Home" value="/home" icon={<HomeIcon />} />
        <BottomNavigationAction label="Search" value="/search" icon={<SearchIcon />} />
        {/* --- Add Create Post Tab --- */}
        <BottomNavigationAction label="Create" value="/create" icon={<AddCircleOutlineIcon />} />
        {/* -------------------------- */}
        <BottomNavigationAction label="Profile" value="/profile" icon={<AccountCircleIcon />} />
      </BottomNavigation>
    </Paper>
  );
};

export default BottomNav;