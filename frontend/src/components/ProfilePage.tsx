// src/pages/ProfilePage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Container, Button, Chip, Stack, CircularProgress, Avatar, Grid,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField,
  Alert // Ensure Alert is imported
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { useAuth } from '../context/AuthContext'; // *** Ensure this import is correct ***
import LogoutButton from '../components/LogoutButton';
// --- Remove PostList import ---
// import PostList from '../components/PostList';
// --- Import Grid Item and View Modal ---
import PostGridItem from '../components/PostGridItem'; // *** Ensure this import is correct ***
import ViewPostModal from '../components/ViewPostModal'; // *** Ensure this import is correct ***
import { Post, PaginatedPostsResponse, ApiErrorResponse } from '../types'; // Ensure types are imported
import apiClient from '../api/axiosConfig';
import axios from 'axios';

// --- Base URL & Type Guards ---
const APP_URL = import.meta.env.VITE_APP_URL || 'http://localhost:8000';
const STORAGE_URL = `${APP_URL}/storage`;
// Define locally or ensure exported from types
interface ApiErrorResponse { message: string; errors?: Record<string, string[]>; }
function isApiErrorResponse(data: any): data is ApiErrorResponse { return typeof data === 'object' && data !== null && typeof data.message === 'string'; }
function isAxiosError(error: any): error is import('axios').AxiosError { return error.isAxiosError === true; }
// ---

const ProfilePage: React.FC = () => {
  const { user, isLoading: isAuthLoading, setUser } = useAuth();
  const navigate = useNavigate();

  // --- State variables (Keep all from your previous working version) ---
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [postsCurrentPage, setPostsCurrentPage] = useState(1);
  const [postsHasNextPage, setPostsHasNextPage] = useState(true);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [postToEdit, setPostToEdit] = useState<Post | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [viewingPost, setViewingPost] = useState<Post | null>(null);

  // --- Handlers (Keep all from your previous working version) ---
  const handleEditProfile = () => { navigate('/profile/edit'); };
  const handleShowFollowers = () => { navigate('/profile/followers'); };
  const handleShowFollowing = () => { navigate('/profile/following'); };

  // --- Fetch User Posts Function (Keep as is) ---
  const fetchUserPosts = useCallback(async (page = 1, loadMore = false) => {
      // Add null check for user at the beginning
      if (!user?.id) {
          console.warn("fetchUserPosts called without user ID.");
          if (!loadMore) setLoadingPosts(false); // Ensure loading stops if no user
          return;
      }
      if (!loadMore) setLoadingPosts(true); else setLoadingMorePosts(true);
      setPostsError(null);
      try {
          const response = await apiClient.get<PaginatedPostsResponse>(`/users/${user.id}/posts`, { params: { page } });
          if (response.data && Array.isArray(response.data.data)) {
              if (page === 1) setUserPosts(response.data.data);
              else setUserPosts(prev => [...prev, ...response.data.data.filter(np => !prev.some(ep => ep.id === np.id))]);
              setPostsCurrentPage(response.data.current_page);
              setPostsHasNextPage(response.data.next_page_url !== null);
          } else {
               setPostsError("Unexpected response format for posts.");
               if (page === 1) setUserPosts([]);
               setPostsHasNextPage(false);
          }
      } catch (err) {
          console.error("Failed to fetch user posts:", err);
           let errorMsg = "Could not load posts.";
            if (isAxiosError(err) && err.response) {
               if (isApiErrorResponse(err.response.data)) { errorMsg = `Could not load posts (${err.response.status}): ${err.response.data.message}`; }
               else { errorMsg = `Could not load posts (${err.response.status}).`; }
            } else if (err instanceof Error) { errorMsg = `Could not load posts: ${err.message}`; }
           setPostsError(errorMsg);
           if (page === 1) setUserPosts([]); // Clear posts on error for first page
           setPostsHasNextPage(false); // Assume no more pages on error
       }
      finally {
           if (!loadMore) setLoadingPosts(false);
           setLoadingMorePosts(false);
       }
  }, [user?.id]); // Depend on user ID

  // --- Fetch initial posts (Keep as is) ---
  useEffect(() => { if (user?.id) { fetchUserPosts(1); } return () => { /* cleanup */ } }, [user?.id, fetchUserPosts]);

  // --- Load More Handler (Keep as is) ---
  const handleLoadMorePosts = () => { if (postsHasNextPage && !loadingMorePosts) { fetchUserPosts(postsCurrentPage + 1, true); } };

  // --- Delete Post Handlers (Keep as is) ---
  const openDeleteConfirm = (postId: number) => { setPostsError(null); setPostToDelete(postId); setDeleteConfirmOpen(true); };
  const closeDeleteConfirm = () => { setPostToDelete(null); setDeleteConfirmOpen(false); };
  const confirmDeletePost = async () => {
      if (!postToDelete || isDeleting) return; setIsDeleting(true); setPostsError(null);
      try {
          await apiClient.delete(`/posts/${postToDelete}`);
          setUserPosts(prev => prev.filter(p => p.id !== postToDelete));
          if (viewingPost?.id === postToDelete) setViewingPost(null);
          closeDeleteConfirm();
      } catch (err) { setPostsError("Could not delete post."); closeDeleteConfirm(); console.error(err); }
      finally { setIsDeleting(false); }
  };

  // --- Edit Post Handlers (Keep as is) ---
  const openEditModal = (post: Post) => { setPostsError(null); setEditError(null); setPostToEdit(post); setEditContent(post.content); setEditModalOpen(true); };
  const closeEditModal = () => { setPostToEdit(null); setEditContent(''); setEditModalOpen(false); setEditError(null); };
  const confirmEditPost = async () => {
      if (!postToEdit || !editContent.trim() || isEditing) return; setIsEditing(true); setEditError(null); setPostsError(null);
      try {
          const response = await apiClient.put<Post>(`/posts/${postToEdit.id}`, { content: editContent });
          const updatedPost = response.data;
          setUserPosts(prev => prev.map(p => p.id === postToEdit.id ? updatedPost : p));
          if (viewingPost?.id === postToEdit.id) setViewingPost(updatedPost);
          closeEditModal();
      } catch (err) { setEditError("Could not update post."); console.error(err); }
      finally { setIsEditing(false); }
  };

  // --- View Post Modal Handlers (Keep as is) ---
  const handleOpenViewPostModal = (post: Post) => { setViewingPost(post); };
  const handleCloseViewPostModal = () => { setViewingPost(null); };

   // --- *** ADDED: Handler for Like Toggle Event *** ---
   // This function will be passed down to update the local post list when a like happens inside ViewPostModal
   const handleLikeToggleList = useCallback((postId: number, newLikeStatus: boolean, newLikeCount: number) => {
    console.log(`ProfilePage updating like status for Post ${postId}: Liked=${newLikeStatus}, Count=${newLikeCount}`);
    setUserPosts(prevPosts => {
        const updatedPosts = prevPosts.map(p =>
            p.id === postId
            ? { ...p, is_liked_by_current_user: newLikeStatus, likes_count: newLikeCount }
            : p
        );
        // --- Log the state BEFORE and AFTER update ---
        // console.log("ProfilePage: Previous posts state:", prevPosts);
        // console.log("ProfilePage: New posts state:", updatedPosts);
        // ---
        return updatedPosts;
    });

    setViewingPost(prevViewingPost => {
          const updatedViewingPost = prevViewingPost?.id === postId
          ? { ...prevViewingPost, is_liked_by_current_user: newLikeStatus, likes_count: newLikeCount }
          : prevViewingPost;
         // --- Log viewing post update ---
         // console.log("ProfilePage: Previous viewingPost:", prevViewingPost);
         // console.log("ProfilePage: New viewingPost:", updatedViewingPost);
         // ---
         return updatedViewingPost;
     });
  }, [viewingPost?.id]); // Keep dependency correct
   // --- *** END ADDED *** ---


  // Auth Loading State
  if (isAuthLoading || !user) { return ( <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Container> ); }

  // Determine Avatar Source - Ensure user is checked for null
  const avatarSrc = user?.profile_picture_path ? `${STORAGE_URL}/${user.profile_picture_path}` : undefined;

  return (
    // Keep Container as the main wrapper
    <Container sx={{ pb: 7, pt: 2 }}>
      {/* --- Header Section --- */}
      {/* Ensure user is not null before accessing name */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1"> Profile </Typography>
        <Button variant="outlined" startIcon={<EditIcon />} onClick={handleEditProfile} size="small"> Edit Profile </Button>
      </Box>

      {/* --- Profile Header (Grid v1 syntax) --- */}
      <Grid container spacing={2} sx={{ mb: 3 }} alignItems="center">
          <Grid item xs={12} sm={3} md={2} sx={{ display: 'flex', justifyContent: { xs: 'center', sm: 'flex-start'} }}>
              {/* Ensure user is not null before accessing name */}
              <Avatar alt={user?.name || 'User Avatar'} src={avatarSrc} sx={{ width: 80, height: 80 }} />
          </Grid>
          <Grid item xs={12} sm={9} md={10}>
              {/* Ensure user is not null before accessing name/phone */}
              <Typography variant="h6">{user?.name || 'Name not set'}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}> {user?.phone_number} </Typography>
              <Stack direction="row" spacing={3} sx={{ mt: 1 }}>
                 {/* Ensure user is not null before accessing counts */}
                 <Box sx={{ textAlign: 'left', cursor: 'pointer' }} onClick={handleShowFollowers}>
                     <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}> {user?.followers_count ?? 0} </Typography>
                     <Typography variant="body2" color="text.secondary"> Followers </Typography>
                 </Box>
                 <Box sx={{ textAlign: 'left', cursor: 'pointer' }} onClick={handleShowFollowing}>
                     <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}> {user?.following_count ?? 0} </Typography>
                    <Typography variant="body2" color="text.secondary"> Following </Typography>
                 </Box>
              </Stack>
          </Grid>
      </Grid>

      {/* --- Bio Section --- */}
      {user?.bio && ( <Box sx={{ mb: 3 }}> <Typography variant="h6" gutterBottom>Bio</Typography> <Typography variant="body1">{user.bio}</Typography> </Box> )}

      {/* --- Skills Section --- */}
      <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom> Skills </Typography>
          {/* Ensure user is not null before accessing skills */}
          {user?.skills && Array.isArray(user.skills) && user.skills.length > 0 ? ( <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">{user.skills.map((skill) => ( <Chip key={skill.id} label={skill.name} variant="outlined" /> ))}</Stack> ) : ( <Typography variant="body2" color="text.secondary"> No skills added yet. </Typography> )}
      </Box>

      {/* --- User Posts Section --- */}
      <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>My Posts</Typography>
          {postsError && <Alert severity="error" sx={{ mb: 2 }}>{postsError}</Alert>}

          {/* Conditional Rendering & Grid */}
          {loadingPosts && userPosts.length === 0 && !postsError ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}> <CircularProgress /> </Box>
          ) : userPosts.length === 0 && !postsError ? (
               <Typography sx={{ textAlign: 'center', color: 'text.secondary', mt: 5 }}> No posts yet. </Typography>
          ) : (
              // Using Grid v1 with display: block override
              <Grid container spacing={0.5} sx={{ display: 'block' }}>
                  {userPosts.map((post) => (
                      <Grid item key={post.id} xs={4}
                          sx={{ display: 'inline-block', width: '33.3333%', verticalAlign: 'top', p: 0.25 }}>
                          <PostGridItem post={post} onClick={() => handleOpenViewPostModal(post)} />
                      </Grid>
                  ))}
              </Grid>
          )}

           {/* Load More Button & Indicator */}
           {postsHasNextPage && !loadingMorePosts && userPosts.length > 0 && ( <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}> <Button onClick={handleLoadMorePosts} disabled={loadingMorePosts}>Load More Posts</Button> </Box> )}
           {loadingMorePosts && ( <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}> <CircularProgress size={24} /> </Box> )}
      </Box>

      {/* --- Logout Button --- */}
      <Box sx={{ mt: 5, display: 'flex', justifyContent: 'center' }}> <LogoutButton /> </Box>

      {/* --- Modals --- */}
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={closeDeleteConfirm}>
        <DialogTitle>Delete Post?</DialogTitle>
        <DialogContent><DialogContentText>Are you sure?</DialogContentText></DialogContent>
        <DialogActions> <Button onClick={closeDeleteConfirm} disabled={isDeleting}>Cancel</Button> <Button onClick={confirmDeletePost} color="error" disabled={isDeleting}>{isDeleting ? <CircularProgress size={20}/> : 'Delete'}</Button> </DialogActions>
      </Dialog>
      {/* Edit Post Dialog */}
      <Dialog open={editModalOpen} onClose={closeEditModal} fullWidth maxWidth="sm">
          <DialogTitle>Edit Post</DialogTitle>
          <DialogContent>
              {editError && <Alert severity="error" sx={{ mb: 1 }}>{editError}</Alert>}
              <TextField autoFocus margin="dense" id="edit-content" label="Post Content" type="text" fullWidth multiline rows={4} value={editContent} onChange={(e) => setEditContent(e.target.value)} disabled={isEditing} sx={{ mt: editError ? 1 : 0 }}/>
          </DialogContent>
          <DialogActions> <Button onClick={closeEditModal} disabled={isEditing}>Cancel</Button> <Button onClick={confirmEditPost} variant="contained" disabled={isEditing || !editContent.trim()}>{isEditing ? <CircularProgress size={20}/> : 'Save Changes'}</Button> </DialogActions>
      </Dialog>
      {/* View Post Modal */}
      <ViewPostModal
          post={viewingPost}
          open={!!viewingPost}
          onClose={handleCloseViewPostModal}
          onEditRequest={openEditModal}
          onDeleteRequest={openDeleteConfirm}
          // --- Pass the like toggle handler ---
          onLikeToggle={handleLikeToggleList}
          // ------------------------------------
      />

    </Container>
  );
};

// --- Loading Indicator Helper (Optional) ---
// const LoadingIndicator: React.FC = () => ( <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Container> );

export default ProfilePage;