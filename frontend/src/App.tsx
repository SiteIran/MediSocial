// src/App.tsx
import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';

// --- Page Imports (Ensure paths are correct) ---
import LoginPage from './pages/LoginPage';
// Assuming these are pages now based on convention:
import HomePage from './components/HomePage';
import ProfilePage from './components/ProfilePage';
import SearchPage from './components/SearchPage';
import EditProfilePage from './components/EditProfilePage';
import FollowersPage from './pages/FollowersPage';
import FollowingPage from './pages/FollowingPage';
import UserProfilePage from './components/UserProfilePage'; // Assuming this is also a page now
import CreatePostPage from './pages/CreatePostPage'; // <-- Import CreatePostPage

// --- Component Imports ---
import BottomNav from './components/BottomNav';
import ProtectedRoute from './components/ProtectedRoute';
import { Box, CircularProgress, Container } from '@mui/material';

// --- Layout WITH BottomNav ---
const AppLayout: React.FC = () => {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            {/* Added padding-bottom */}
            <Box component="main" sx={{ flexGrow: 1, pb: 7 }}>
                 <Suspense fallback={ <LoadingFallback /> }>
                    <Outlet />
                 </Suspense>
            </Box>
            <BottomNav />
        </Box>
    );
};

// --- Layout WITHOUT BottomNav ---
const SimpleLayout: React.FC = () => {
    return (
         <Suspense fallback={ <LoadingFallback /> }>
            <Outlet />
         </Suspense>
    );
}

// --- Loading Fallback Component ---
const LoadingFallback: React.FC = () => (
    <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
    </Container>
);


// --- Main App Routing ---
function App() {
  return (
    <Router>
      <Routes>
        {/* Public Login Route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes Wrapper */}
        <Route element={<ProtectedRoute />}>

            {/* Group 1: Routes using AppLayout (WITH BottomNav) */}
            {/* These routes will have the main app layout with the bottom navigation bar */}
            <Route element={<AppLayout />}>
                <Route path="/" element={<Navigate to="/home" replace />} /> {/* Default redirect */}
                <Route path="home" element={<HomePage />} />
                <Route path="search" element={<SearchPage />} />
                <Route path="profile" element={<ProfilePage />} /> {/* Own profile index */}
                {/* --- Add Create Post Route --- */}
                <Route path="create" element={<CreatePostPage />} /> {/* Add /create path */}
                {/* ----------------------------- */}
                {/* Add other main tab routes here if they use AppLayout */}
            </Route>

            {/* Group 2: Routes WITHOUT AppLayout (NO BottomNav) */}
            {/* These routes render within the SimpleLayout */}
             <Route element={<SimpleLayout />}>
                 <Route path="profile/edit" element={<EditProfilePage />} />
                 <Route path="profile/followers" element={<FollowersPage />} />
                 <Route path="profile/following" element={<FollowingPage />} />
                 <Route path="users/:userId" element={<UserProfilePage />} /> {/* Public profile page */}
                 {/* Add other protected sub-pages here */}
             </Route>

        </Route> {/* End Protected Routes Wrapper */}

        {/* Fallback Route */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </Router>
  );
}
export default App;