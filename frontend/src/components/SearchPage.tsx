// src/pages/SearchPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Container, TextField, List, ListItem, ListItemAvatar, Avatar,
  ListItemText, CircularProgress, Alert, InputAdornment, IconButton, Divider, Button,
  ListItemSecondaryAction // Ensure this is imported
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import apiClient from '../api/axiosConfig';
import _debounce from 'lodash/debounce';
import { useAuth } from '../context/AuthContext';
import axios from 'axios'; // Ensure axios is imported for type guard

// Define User type for search results
interface SearchUser {
  id: number;
  name: string | null;
  profile_picture_path?: string | null;
  skills?: { id: number; name: string }[];
}

// Define the structure of the paginated API response from Laravel
interface PaginatedResponse<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    next_page_url: string | null;
}

// Define the structure for expected API errors
interface ApiErrorResponse {
    message: string;
    errors?: Record<string, string[]>;
}

// --- Base URL for Storage (Keep as provided) ---
const APP_URL = import.meta.env.VITE_APP_URL || 'http://localhost:8000';
const STORAGE_URL = `${APP_URL}/storage`;
// ---

// Type Guard to check if data matches ApiErrorResponse
function isApiErrorResponse(data: any): data is ApiErrorResponse {
    return typeof data === 'object' && data !== null && typeof data.message === 'string';
}

// Axios error type guard
function isAxiosError(error: any): error is import('axios').AxiosError {
    return error.isAxiosError === true;
}


const SearchPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false); // Loading for search itself
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // --- Get follow state and actions from AuthContext ---
  const {
      followingIds,
      followUser,
      unfollowUser,
      isLoading: isAuthLoading, // Loading state from AuthContext (initial auth check)
      isFollowingLoading, // Loading state specifically for fetching initial following IDs
      user: currentUser // Get current user to check against list items
  } = useAuth();
  // State to track which follow/unfollow button is currently processing
  const [loadingFollowId, setLoadingFollowId] = useState<number | null>(null);
  // ---------------------------------------------------


  // --- Perform Search Function ---
   const performSearch = async (term: string, page: number = 1) => {
       if (page === 1) { setLoading(true); setError(null); setResults([]); }
       if (!term.trim()) { setResults([]); setLoading(false); return; }
       try {
           console.log(`Searching for: "${term}", Page: ${page}`);
           const response = await apiClient.get<PaginatedResponse<SearchUser>>('/search/users', { params: { q: term, page: page } });
           console.log("API Response:", response.data);
           if (response.data && Array.isArray(response.data.data)) {
               if (page === 1) { setResults(response.data.data); } else { /* Append logic if needed */ }
               console.log("Setting results:", response.data.data);
           } else { console.warn("Unexpected API response structure:", response.data); setResults([]); }
       } catch (err: any) {
           console.error("Search Error:", err);
           let errorMsg = "Failed to perform search."; // Default
           if (isAxiosError(err) && err.response) {
                if (isApiErrorResponse(err.response.data)) {
                    errorMsg = `Search failed (${err.response.status}): ${err.response.data.message}`;
                } else {
                     errorMsg = `Search failed (${err.response.status}): Server error.`;
                }
           } else if (err instanceof Error){
                errorMsg = `Search failed: ${err.message}`;
           }
           setError(errorMsg);
           setResults([]);
       } finally { setLoading(false); }
   };


  // --- Debounced Search Callback ---
  const debouncedSearch = useCallback(
      _debounce((term: string) => {
          if (term.trim().length === 0 || term.trim().length >= 2) { performSearch(term, 1); }
          else { setResults([]); setError(null); }
      }, 500), []);


  // --- Handle Input Change ---
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTerm = event.target.value;
    setSearchTerm(newTerm);
    debouncedSearch(newTerm);
  };


   // --- Clear Search ---
   const clearSearch = () => {
       setSearchTerm(''); setResults([]); setError(null);
   };


   // --- Handle Follow/Unfollow Click ---
   const handleFollowToggle = useCallback(async (userIdToToggle: number) => { // useCallback added
        if (loadingFollowId) return; // Prevent multiple clicks

        setLoadingFollowId(userIdToToggle);
        let success = false;
        const isCurrentlyFollowing = followingIds.has(userIdToToggle);

        try {
            if (isCurrentlyFollowing) {
                console.log(`UI: Attempting to unfollow ${userIdToToggle}`);
                success = await unfollowUser(userIdToToggle); // Call context action
                if (!success) console.error(`UI: Failed to unfollow ${userIdToToggle}`);
            } else {
                console.log(`UI: Attempting to follow ${userIdToToggle}`);
                success = await followUser(userIdToToggle); // Call context action
                if (!success) console.error(`UI: Failed to follow ${userIdToToggle}`);
            }
        } catch (error) {
             console.error(`Error during follow/unfollow toggle for ${userIdToToggle}`, error);
             setError("Could not update follow status."); // Set error for user
             setTimeout(() => setError(null), 3500); // Clear error after delay
        } finally {
             setLoadingFollowId(null); // Clear loading state for this button
        }
   }, [followingIds, followUser, unfollowUser, loadingFollowId]); // Added dependencies


   // --- Debug Log before Render ---
   console.log("Rendering SearchPage - Loading Search:", loading, "Loading Initial Follows:", isFollowingLoading, "Term:", searchTerm, "Results Count:", results.length, "Following IDs:", followingIds);


  return (
    <Container sx={{ pb: 7, pt: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Search Users
      </Typography>

      {/* --- Search Input --- */}
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search by name or skill (min 2 chars)..."
        value={searchTerm}
        onChange={handleSearchChange}
        sx={{ mb: 3 }}
        InputProps={{
            startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>),
            endAdornment: (
                <InputAdornment position="end">
                   {searchTerm && (<IconButton aria-label="clear search" onClick={clearSearch} edge="end"><ClearIcon /></IconButton>)}
                   {loading && searchTerm && <CircularProgress size={24} sx={{ mr: searchTerm ? 1 : 0 }}/>}
                </InputAdornment>
            )
         }}
      />

      {/* --- Error Alert --- */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

       {/* --- Loading Indicator for Initial Follows --- */}
       {isFollowingLoading && (
           <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
               <CircularProgress size={30}/>
               <Typography sx={{ ml: 1, color: 'text.secondary' }}>Loading follow status...</Typography>
           </Box>
       )}


      {/* --- No Results / Prompt Messages --- */}
      {!loading && !isFollowingLoading && searchTerm.trim().length >= 2 && results.length === 0 && !error && (
        <Typography sx={{ textAlign: 'center', color: 'text.secondary', mt: 3 }}> No users found matching "{searchTerm}".</Typography>
      )}
      {!loading && !isFollowingLoading && searchTerm.trim().length === 1 && !error && (
           <Typography sx={{ textAlign: 'center', color: 'text.secondary', mt: 3 }}>Please type at least 2 characters to search.</Typography>
       )}


      {/* --- Results List --- */}
      {/* Render list only if NOT loading initial follows AND there are results */}
      {!isFollowingLoading && results.length > 0 && (
          <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
            {results.map((user, index) => {
                // Determine follow status for this user
                const isFollowing = followingIds.has(user.id);
                // Is the button for this specific user currently loading?
                const isButtonLoading = loadingFollowId === user.id;
                // Is the displayed user the current logged-in user?
                const isCurrentUser = currentUser?.id === user.id;

                 // --- Define navigation handler specific to this user ---
                 const handleNavigateToProfile = () => {
                    if (isCurrentUser) {
                        navigate('/profile'); // Go to own profile page
                    } else {
                       navigate(`/users/${user.id}`); // Go to other user's profile page
                    }
                 };

                return (
                  <React.Fragment key={user.id}>
                    <ListItem
                        alignItems="flex-start"
                        // --- Secondary Action: Follow/Unfollow Button ---
                        secondaryAction={
                             // --- Only show button if it's NOT the current user ---
                            !isCurrentUser ? (
                                <Button
                                    size="small"
                                    variant={isFollowing ? "outlined" : "contained"}
                                    color={isFollowing ? "secondary" : "primary"}
                                    // --- CORRECTED onClick for BUTTON: Calls handleFollowToggle ---
                                    onClick={(e) => {
                                        e.stopPropagation(); // Prevent ListItem click
                                        handleFollowToggle(user.id);
                                    }}
                                    // ----------------------------------------------------------
                                    disabled={isButtonLoading}
                                    startIcon={isButtonLoading ? <CircularProgress size={16} color="inherit" /> : (isFollowing ? <PersonRemoveIcon fontSize="small"/> : <PersonAddIcon fontSize="small"/>) }
                                    sx={{ width: '100px', minWidth: '100px' }} // Ensure consistent width
                                >
                                    {isButtonLoading ? '' : (isFollowing ? 'Unfollow' : 'Follow')}
                                </Button>
                            ) : null // No button for self
                        }
                        // Add padding if button exists
                        sx={{ pr: !isCurrentUser ? '120px' : undefined }}
                        // --- CORRECTED onClick for LISTITEM: Calls handleNavigateToProfile ---
                        button // Make item look clickable
                        onClick={handleNavigateToProfile}
                        // -----------------------------------------------------------------
                     >
                        {/* --- Avatar also navigates --- */}
                        <ListItemAvatar sx={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); handleNavigateToProfile(); }}>
                            <Avatar
                            alt={user.name || 'User'}
                            // Check if path exists before creating URL
                            src={user?.profile_picture_path ? `${STORAGE_URL}/${user.profile_picture_path}` : undefined}
                            // Example resulting URL: http://localhost:8000/storage/avatars/randomname.jpg
                            />
                        </ListItemAvatar>
                        {/* --- Text also navigates --- */}
                        <ListItemText
                            primary={user.name || `User ID: ${user.id}`}
                            secondary={
                                <React.Fragment>
                                    {user.skills && user.skills.length > 0 && (
                                        <Typography sx={{ display: 'block' }} component="span" variant="body2" color="text.primary" >
                                            Skills: {user.skills.slice(0, 3).map(s => s.name).join(', ')}{user.skills.length > 3 ? '...' : ''}
                                        </Typography>
                                    )}
                                </React.Fragment>
                            }
                             onClick={(e) => { e.stopPropagation(); handleNavigateToProfile(); }}
                             sx={{ cursor: 'pointer' }}
                        />
                    </ListItem>
                    {index < results.length - 1 && <Divider variant="inset" component="li" />}
                  </React.Fragment>
                );
            })}
          </List>
      )}
      {/* --- End Results List --- */}

      {/* --- Load More Placeholder --- */}
    </Container>
  );
};

export default SearchPage;