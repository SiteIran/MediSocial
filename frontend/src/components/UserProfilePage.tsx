// src/pages/UserProfilePage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Container, Typography, Box, CircularProgress, Alert, Avatar, Stack, Chip, Button, AppBar, Toolbar, IconButton, Grid,
    // Keep Dialog related imports if ViewPostModal uses them internally or if you plan other modals
    Dialog, DialogActions, DialogContent, DialogTitle, TextField
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import apiClient from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { Post, PaginatedPostsResponse, ApiErrorResponse, UserProfileData } from '../types';
import PostGridItem from '../components/PostGridItem';
import ViewPostModal from '../components/ViewPostModal';
import axios from 'axios';

// --- Base URL & Type Guards ---
const APP_URL = import.meta.env.VITE_APP_URL || 'http://localhost:8000';
const STORAGE_URL = `${APP_URL}/storage`;
interface ApiErrorResponse { message: string; errors?: Record<string, string[]>; }
function isApiErrorResponse(data: any): data is ApiErrorResponse { return typeof data === 'object' && data !== null && typeof data.message === 'string'; }
function isAxiosError(error: any): error is import('axios').AxiosError { return error.isAxiosError === true; }
// ---

const UserProfilePage: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    // Destructure necessary values from useAuth
    const { user: currentUser, followUser, unfollowUser, followingIds } = useAuth();

    // State for Profile User being viewed
    const [profileUser, setProfileUser] = useState<UserProfileData | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [profileError, setProfileError] = useState<string | null>(null);
    const [loadingFollow, setLoadingFollow] = useState(false); // Loading state for follow button

    // State for the posts of the profileUser
    const [userPosts, setUserPosts] = useState<Post[]>([]);
    const [loadingPosts, setLoadingPosts] = useState(true); // Separate loading for posts
    const [postsError, setPostsError] = useState<string | null>(null);
    const [postsCurrentPage, setPostsCurrentPage] = useState(1);
    const [postsHasNextPage, setPostsHasNextPage] = useState(true);
    const [loadingMorePosts, setLoadingMorePosts] = useState(false);

    // State for the modal showing a single post
    const [viewingPost, setViewingPost] = useState<Post | null>(null);

    // --- Fetch Profile Data ---
    useEffect(() => {
        const profileUserId = Number(userId); // Convert string ID from params to number
        if (!userId || isNaN(profileUserId)) {
            setProfileError("Invalid User ID."); setLoadingProfile(false); setLoadingPosts(false); return;
        }
        if (currentUser?.id === profileUserId) {
             navigate('/profile', { replace: true }); return; // Redirect if viewing own profile
        }

        setLoadingProfile(true); setProfileError(null); setLoadingPosts(true); // Reset states for new profile view
        setUserPosts([]); setPostsCurrentPage(1); setPostsHasNextPage(true);

        apiClient.get<UserProfileData>(`/users/${profileUserId}`)
            .then(response => {
                setProfileUser(response.data);
                // Fetch posts only AFTER profile is successfully loaded
                fetchUserPosts(1); // Call initial post fetch
            })
            .catch(err => {
                console.error("Failed to fetch user profile:", err);
                let errorMsg = "Could not load user profile.";
                if (isAxiosError(err) && err.response) { /* ... More specific error handling ... */ }
                setProfileError(errorMsg);
                setLoadingPosts(false); // Ensure post loading stops if profile fails
            })
            .finally(() => { setLoadingProfile(false); });
            // Removed fetchUserPosts from dependency array, call it directly in .then()
    }, [userId, currentUser, navigate]); // Removed fetchUserPosts from here

    // --- Fetch User Posts ---
    // Ensure userId is treated as number for API call consistency
    const fetchUserPosts = useCallback(async (page = 1, loadMore = false) => {
        const profileUserId = Number(userId);
        if (!profileUserId) return;

        if (!loadMore) setLoadingPosts(true); else setLoadingMorePosts(true);
        setPostsError(null);
        try {
            const response = await apiClient.get<PaginatedPostsResponse>(`/users/${profileUserId}/posts`, { params: { page } });
            if (response.data && Array.isArray(response.data.data)) {
                const fetchedPosts = response.data.data;
                if (page === 1) setUserPosts(fetchedPosts);
                else setUserPosts(prev => [...prev, ...fetchedPosts.filter(np => !prev.some(ep => ep.id === np.id))]);
                setPostsCurrentPage(response.data.current_page);
                setPostsHasNextPage(response.data.next_page_url !== null);
            } else { /* Handle format error */ setPostsError("Unexpected post format."); if(page===1) setUserPosts([]); setPostsHasNextPage(false); }
        } catch (err) { /* Handle fetch error */ setPostsError("Could not load posts."); if(page===1) setUserPosts([]); setPostsHasNextPage(false); console.error(err); }
        finally { if (!loadMore) setLoadingPosts(false); setLoadingMorePosts(false); }
    }, [userId]); // Depend only on userId (string from params)

    // --- Handle Follow Toggle ---
    const handleFollowToggle = useCallback(async () => {
        if (!profileUser || loadingFollow || !currentUser) return;
        setLoadingFollow(true);
        const isCurrentlyFollowing = !!profileUser.is_followed_by_current_user;
        let success = false;
        try {
            if (isCurrentlyFollowing) success = await unfollowUser(profileUser.id);
            else success = await followUser(profileUser.id);
            if (success) {
                setProfileUser(prev => prev ? { ...prev, is_followed_by_current_user: !isCurrentlyFollowing, followers_count: (prev.followers_count ?? 0) + (isCurrentlyFollowing ? -1 : 1) } : null);
            } else { setProfileError("Could not update follow status."); setTimeout(() => setProfileError(null), 3500); }
        } catch (err) { setProfileError("Error updating follow status."); setTimeout(() => setProfileError(null), 3500); console.error(err); }
        finally { setLoadingFollow(false); }
    }, [profileUser, loadingFollow, followUser, unfollowUser, currentUser]); // Removed followingIds dependency, rely on profileUser status

    // --- Load More Posts Handler ---
    const handleLoadMorePosts = () => { if (postsHasNextPage && !loadingMorePosts) { fetchUserPosts(postsCurrentPage + 1, true); } };

     // --- View Post Modal Handlers ---
    const handleOpenViewPostModal = (post: Post) => { setViewingPost(post); };
    const handleCloseViewPostModal = () => { setViewingPost(null); };

    // --- Handler for Like Toggle Event ---
    const handleLikeToggleList = useCallback((postId: number, newLikeStatus: boolean, newLikeCount: number) => {
        setUserPosts(prevPosts => prevPosts.map(p => p.id === postId ? { ...p, is_liked_by_current_user: newLikeStatus, likes_count: newLikeCount } : p ));
        setViewingPost(prev => prev?.id === postId ? { ...prev, is_liked_by_current_user: newLikeStatus, likes_count: newLikeCount } : prev );
    }, [viewingPost?.id]);


    // --- Render Logic ---
    if (loadingProfile) { return ( <Container sx={{ display: 'flex', justifyContent: 'center', my: 5 }}><CircularProgress /></Container> ); }
    if (profileError) { return ( <Container sx={{ pt: 2 }}><Alert severity="error">{profileError}</Alert></Container> ); }
    if (!profileUser) { return ( <Container sx={{ pt: 2 }}><Alert severity="warning">User profile could not be loaded.</Alert></Container> ); }

    const avatarSrc = profileUser.profile_picture_path ? `${STORAGE_URL}/${profileUser.profile_picture_path}` : undefined;
    const isFollowing = !!profileUser.is_followed_by_current_user;

    return (
       <>
         {/* AppBar */}
         <AppBar position="sticky" elevation={1} sx={{ bgcolor: 'background.paper', color: 'text.primary' }}>
            <Toolbar> <IconButton edge="start" color="inherit" aria-label="back" onClick={() => navigate(-1)}> <ArrowBackIcon /> </IconButton> <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}> {profileUser.name || 'User Profile'} </Typography> </Toolbar>
         </AppBar>

         {/* Main Content */}
         <Container sx={{ pb: 7, pt: { xs: 8, sm: 9 } }}>
              {/* Profile Header */}
             <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
                 <Avatar alt={profileUser.name || 'User'} src={avatarSrc} sx={{ width: 64, height: 64 }} />
                 <Box sx={{ flexGrow: 1 }}>
                     <Typography variant="h5">{profileUser.name || `User ID: ${profileUser.id}`}</Typography>
                     {/* Follow/Unfollow Button - only show if NOT current user */}
                     {currentUser?.id !== profileUser.id && ( <Button variant={isFollowing ? "outlined" : "contained"} color={isFollowing ? "secondary" : "primary"} size="small" disabled={loadingFollow} startIcon={loadingFollow ? <CircularProgress size={16} color="inherit"/> : (isFollowing ? <PersonRemoveIcon fontSize='small'/> : <PersonAddIcon fontSize='small'/>)} onClick={handleFollowToggle} sx={{ mt: 1 }}> {loadingFollow ? '' : (isFollowing ? 'Unfollow' : 'Follow')} </Button> )}
                 </Box>
             </Box>
             {/* Follower/Following Counts */}
             <Stack direction="row" spacing={3} sx={{ mb: 3 }}>
                 <Box> <Typography variant="h6">{profileUser.followers_count ?? 0}</Typography> <Typography variant="body2">Followers</Typography> </Box>
                 <Box> <Typography variant="h6">{profileUser.following_count ?? 0}</Typography> <Typography variant="body2">Following</Typography> </Box>
             </Stack>

             {/* Bio */}
             {profileUser.bio && <Typography variant="body1" sx={{ mb: 3 }}>{profileUser.bio}</Typography>}

             {/* Skills */}
             <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>Skills</Typography>
                {profileUser.skills && profileUser.skills.length > 0 ? ( <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">{profileUser.skills.map((skill) => ( <Chip key={skill.id} label={skill.name} variant="outlined" /> ))}</Stack> ) : ( <Typography variant="body2" color="text.secondary">No skills specified.</Typography> )}
             </Box>

             {/* --- User Posts Section --- */}
             <Box sx={{ mt: 4 }}>
                 <Typography variant="h5" gutterBottom>Posts</Typography>
                 {postsError && <Alert severity="error" sx={{ mb: 2 }}>{postsError}</Alert>}

                 {/* Conditional Rendering & Grid for Posts */}
                 {loadingPosts && userPosts.length === 0 && !postsError ? ( <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}> <CircularProgress /> </Box> )
                 : userPosts.length === 0 && !postsError ? ( <Typography sx={{ textAlign: 'center', color: 'text.secondary', mt: 5 }}> This user has no posts yet. </Typography> )
                 : (
                     // Using Grid v1 syntax with display: block override
                     <Grid container spacing={0.5} sx={{ display: 'block' }}>
                         {userPosts.map((post) => (
                             <Grid item key={post.id} xs={4} sx={{ display: 'inline-block', width: '33.3333%', verticalAlign: 'top', p: 0.25 }}>
                                 <PostGridItem post={post} onClick={() => handleOpenViewPostModal(post)} />
                             </Grid>
                         ))}
                     </Grid>
                 )}
                 {/* Load More Button & Indicator */}
                 {postsHasNextPage && !loadingMorePosts && userPosts.length > 0 && ( <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}> <Button onClick={handleLoadMorePosts} disabled={loadingMorePosts}>Load More Posts</Button> </Box> )}
                 {loadingMorePosts && ( <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}> <CircularProgress size={24} /> </Box> )}
             </Box>

            {/* View Post Modal */}
            <ViewPostModal
                post={viewingPost}
                open={!!viewingPost}
                onClose={handleCloseViewPostModal}
                onLikeToggle={handleLikeToggleList} // Pass like handler
                // Provide no-op functions for edit/delete as these actions are not allowed here
                onEditRequest={() => {}}
                onDeleteRequest={() => {}}
            />

         </Container>
       </>
    );
};

export default UserProfilePage;