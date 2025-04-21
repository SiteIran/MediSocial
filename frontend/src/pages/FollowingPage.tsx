// src/pages/FollowingPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container,
    Typography,
    Box,
    CircularProgress,
    Alert,
    AppBar,         // AppBar for the top navigation bar
    Toolbar,        // Toolbar for AppBar content layout
    IconButton      // Clickable icon button (for back)
 } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack'; // Back arrow icon
import apiClient from '../api/axiosConfig';
import UserList, { UserListItem } from '../components/UserList'; // Import reusable UserList component
import { useAuth } from '../context/AuthContext'; // Import useAuth hook
import axios from 'axios'; // Import axios for the type guard helper

// --- Define Expected API Error Structure ---
interface ApiErrorResponse {
    message: string;
    errors?: Record<string, string[]>;
}

// Type Guard to check if data matches ApiErrorResponse
function isApiErrorResponse(data: any): data is ApiErrorResponse {
    return typeof data === 'object' && data !== null && typeof data.message === 'string';
}
// --- End Error Structure ---

// --- Define Paginated Response Structure ---
interface PaginatedUserResponse {
    data: UserListItem[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    next_page_url: string | null;
}
// --- End Paginated Response ---

/**
 * Page component to display the list of users the current user is following.
 */
const FollowingPage: React.FC = () => {
  // State management
  const [following, setFollowing] = useState<UserListItem[]>([]); // List of users being followed
  const [loading, setLoading] = useState(true);                  // Loading state for initial fetch
  const [error, setError] = useState<string | null>(null);       // Error message state
  const [loadingFollowId, setLoadingFollowId] = useState<number | null>(null); // Tracks which button is loading
  // const [currentPage, setCurrentPage] = useState(1); // For pagination
  // const [hasNextPage, setHasNextPage] = useState(false); // For pagination

  // Hooks
  const { followUser, unfollowUser } = useAuth();
  const navigate = useNavigate();

  // --- Function to Fetch Following Data ---
  const fetchFollowing = useCallback(async (page = 1) => {
    if (page === 1) setLoading(true);
    setError(null);
    try {
      console.log(`Fetching following page ${page}...`);
      // Fetch data from the '/user/following' endpoint
      const response = await apiClient.get<PaginatedUserResponse>('/user/following', { params: { page } });
      console.log("Following API Response:", response.data);
      if (response.data && Array.isArray(response.data.data)) {
          // Backend should set is_followed_by_current_user = true for this list
          if (page === 1) setFollowing(response.data.data);
          else { /* Append logic for Load More */ }
          // setCurrentPage(response.data.current_page); // For pagination
          // setHasNextPage(response.data.next_page_url !== null); // For pagination
          console.log("Setting following state:", response.data.data);
      } else { /* Handle unexpected structure */ }
    } catch (err) { /* Handle errors with Type Guard */
        console.error("Failed to fetch following list:", err);
        let errorMsg = "Could not load following list.";
         if (axios.isAxiosError(err) && err.response) {
            if (isApiErrorResponse(err.response.data)) { errorMsg = `Could not load following list (${err.response.status}): ${err.response.data.message}`; }
            else { errorMsg = `Could not load following list (${err.response.status}): Invalid server response format.`; }
         } else if (err instanceof Error) { errorMsg = `Could not load following list: ${err.message}`; }
        setError(errorMsg);
        if (page === 1) setFollowing([]);
    } finally {
      if (page === 1) setLoading(false);
    }
  }, []);

  // --- Fetch initial data on mount ---
  useEffect(() => {
    fetchFollowing(1);
  }, [fetchFollowing]);

  // --- Handler for Follow/Unfollow Button Click ---
  const handleFollowToggle = useCallback(async (userId: number, isCurrentlyFollowing: boolean) => {
      if (loadingFollowId) return;
      setLoadingFollowId(userId);
      setError(null);
      try {
          let success = false;
          // Since this is the 'Following' list, the primary action is 'unfollow'
          if (isCurrentlyFollowing) {
              success = await unfollowUser(userId);
              if (success) {
                 // OPTIONAL: Immediately remove the user from this list view
                 setFollowing(prevFollowing => prevFollowing.filter(f => f.id !== userId));
              }
          } else {
               // Handle unlikely case where user needs to be followed back
               success = await followUser(userId);
               // Decide if the user should be added back visually or list refreshed
          }
          if (!success) { /* Handle failure */ setError(`Could not update follow status.`); setTimeout(() => setError(null), 3500); }
      } catch (err) { /* Handle unexpected errors */ setError("An unexpected error occurred."); setTimeout(() => setError(null), 3500); }
      finally { setLoadingFollowId(null); }
  }, [loadingFollowId, followUser, unfollowUser]);

  // --- Render the Component UI ---
  return (
    <> {/* Use Fragment or simple Box */}
        {/* --- Internal AppBar for this specific page --- */}
        <AppBar position="sticky" elevation={1} sx={{ bgcolor: 'background.paper', color: 'text.primary' }}>
            <Toolbar>
                <IconButton edge="start" color="inherit" aria-label="back" onClick={() => navigate(-1)}>
                    <ArrowBackIcon />
                </IconButton>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    Following {/* <-- Title Updated */}
                </Typography>
            </Toolbar>
        </AppBar>
        {/* --- End Internal AppBar --- */}

        {/* --- Main Content Container --- */}
        <Container sx={{ pb: 7, pt: { xs: 8, sm: 9 } }}> {/* Added padding top */}
            {/* Error Alert */}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {/* Loading Indicator */}
            {loading && following.length === 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}> <CircularProgress /> </Box>
            ) : (
                // User List
                <UserList users={following} loadingUserId={loadingFollowId} onFollowToggle={handleFollowToggle} />
            )}
            {/* Load More Placeholder */}
        </Container>
    </>
  );
};

export default FollowingPage;