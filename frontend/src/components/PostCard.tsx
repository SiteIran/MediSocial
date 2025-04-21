// src/components/PostCard.tsx
import React, { useState, useCallback } from 'react';
import { Card, CardHeader, CardContent, CardMedia, Avatar, Typography, Box, IconButton, Menu, MenuItem, CardActions, CircularProgress } from '@mui/material'; // Ensure CardActions is imported
import { Post } from '../types'; // Adjust path if needed
import MoreVertIcon from '@mui/icons-material/MoreVert';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'; // <-- Import Comment icon
// import ShareIcon from '@mui/icons-material/Share'; // Keep commented if not using Share
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/axiosConfig';
import axios from 'axios'; // For type guard

// --- Base URL & Type Guard ---
const APP_URL = import.meta.env.VITE_APP_URL || 'http://localhost:8000';
const STORAGE_URL = `${APP_URL}/storage`;
interface ApiErrorResponse { message: string; }
function isApiErrorResponse(data: any): data is ApiErrorResponse { /* ... */ return typeof data === 'object' && data !== null && typeof data.message === 'string'; }
function isAxiosError(error: any): error is import('axios').AxiosError { /* ... */ return error.isAxiosError === true; }
// ---

interface PostCardProps {
  post: Post;
  onDelete?: () => void;
  onEdit?: () => void;
  onLikeToggle?: (postId: number, newLikeStatus: boolean, newLikeCount: number) => void;
  onCommentClick?: (postId: number) => void; // <-- Add callback for comment click
}

const PostCard: React.FC<PostCardProps> = ({ post, onDelete, onEdit, onLikeToggle, onCommentClick }) => { // <-- Destructure onCommentClick
  // Destructure post props, including the new comments_count
  const { user: author, content, image_path, created_at, id: postId, likes_count, comments_count, is_liked_by_current_user } = post;
  const { user: currentUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // State for Menu & Like Button (Keep as provided)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);
  const [isLiking, setIsLiking] = useState(false);

  // Menu Handlers (Keep as provided)
  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => { setAnchorEl(event.currentTarget); };
  const handleMenuClose = () => { setAnchorEl(null); };
  const handleDeleteClick = () => { if (onDelete) onDelete(); handleMenuClose(); };
  const handleEditClick = () => { if (onEdit) onEdit(); handleMenuClose(); };

  // Time Ago Calculation (Keep as provided)
  let timeAgo = ''; try { timeAgo = formatDistanceToNow(new Date(created_at), { addSuffix: true }); } catch (e) { timeAgo = created_at; }

  // URLs (Keep as provided)
  const authorAvatarSrc = author?.profile_picture_path ? `${STORAGE_URL}/${author.profile_picture_path}` : undefined;
  const postImageSrc = image_path ? `${STORAGE_URL}/${image_path}` : null;

  // Navigation Handler (Keep as provided)
  const handleNavigateToAuthorProfile = () => { if (!author) return; if (currentUser?.id === author.id) navigate('/profile'); else navigate(`/users/${author.id}`); };

  // Check Authorship (Keep as provided)
  const isAuthor = currentUser?.id === author?.id;

  // Like/Unlike Handler (Keep as provided)
  const handleLikeToggle = useCallback(async () => {
      if (isLiking || !isAuthenticated) return; setIsLiking(true);
      const isCurrentlyLiked = !!is_liked_by_current_user; // Use destructured prop
      const originalLikeCount = likes_count ?? 0; // Use destructured prop
      if (onLikeToggle) { const optimisticLikeCount = originalLikeCount + (isCurrentlyLiked ? -1 : 1); onLikeToggle(postId, !isCurrentlyLiked, optimisticLikeCount); }
      try {
          let response;
          if (isCurrentlyLiked) response = await apiClient.delete(`/posts/${postId}/like`);
          else response = await apiClient.post(`/posts/${postId}/like`);
          if (response.data && typeof response.data.likes_count === 'number' && typeof response.data.is_liked_by_current_user === 'boolean') { if (onLikeToggle) onLikeToggle(postId, response.data.is_liked_by_current_user, response.data.likes_count); }
          else { if (onLikeToggle) onLikeToggle(postId, isCurrentlyLiked, originalLikeCount); }
      } catch (error) { if (onLikeToggle) onLikeToggle(postId, isCurrentlyLiked, originalLikeCount); console.error(error); }
      finally { setIsLiking(false); }
  }, [isLiking, isAuthenticated, is_liked_by_current_user, likes_count, postId, onLikeToggle]); // Use destructured props

  // --- Add Comment Click Handler ---
  const handleCommentButtonClick = () => {
      if (onCommentClick) {
          onCommentClick(postId); // Call the passed handler with the post ID
      } else {
          console.warn("PostCard: onCommentClick handler is not provided.");
      }
  };
  // -------------------------------

  return (
    <Card sx={{ mb: 2, boxShadow: 1 }}>
      <CardHeader
        avatar={ <Avatar src={authorAvatarSrc} onClick={handleNavigateToAuthorProfile} sx={{ cursor: 'pointer' }}>{!authorAvatarSrc ? author?.name?.charAt(0).toUpperCase() : null}</Avatar> }
        action={ isAuthor && (onDelete || onEdit) ? (<> <IconButton onClick={handleMenuClick}><MoreVertIcon /></IconButton> <Menu anchorEl={anchorEl} open={openMenu} onClose={handleMenuClose}>{onEdit && <MenuItem onClick={handleEditClick}>Edit</MenuItem>}{onDelete && <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>Delete</MenuItem>}</Menu> </>) : (<IconButton disabled sx={{ visibility: 'hidden' }}><MoreVertIcon /></IconButton>) }
        title={author?.name || 'Unknown User'}
        subheader={timeAgo}
        titleTypographyProps={{ fontWeight: 'bold', sx:{ cursor: 'pointer' }, onClick: handleNavigateToAuthorProfile }}
        subheaderTypographyProps={{ variant: 'caption' }}
      />

      {postImageSrc && ( <CardMedia component="img" sx={{ maxHeight: '60vh', width: '100%', objectFit: 'cover' }} image={postImageSrc} alt={`Post image by ${author?.name || 'user'}`} onError={(e) => (e.currentTarget.style.display = 'none')} /> )}

      {/* Display Post Content if exists */}
      {content && (
          <CardContent sx={{ pt: postImageSrc ? 1 : 2 }}>
            <Typography variant="body1" color="text.primary" sx={{ whiteSpace: 'pre-wrap' }}>
              {content}
            </Typography>
          </CardContent> // Closing tag was correct here
      )}

      {/* --- Card Actions for Like/Comment --- */}
      {/* Ensure CardActions exists and is correctly closed */}
      <CardActions disableSpacing sx={{ pt: content || postImageSrc ? 0 : 1 }}>
         {/* Like Button & Count */}
         <IconButton aria-label="like post" onClick={handleLikeToggle} disabled={isLiking || !isAuthenticated} color={is_liked_by_current_user ? "error" : "default"}>
           {isLiking ? <CircularProgress size={20} color="inherit"/> : (is_liked_by_current_user ? <FavoriteIcon fontSize="small"/> : <FavoriteBorderIcon fontSize="small"/>)}
         </IconButton>
         <Typography variant="body2" color="text.secondary" sx={{ ml: -1 }}>
           {likes_count ?? 0} {/* Use destructured prop */}
         </Typography>

         {/* --- Added Comment Button & Count --- */}
         <IconButton aria-label="comment" onClick={handleCommentButtonClick} sx={{ ml: 1 }}> {/* Use the new handler */}
             <ChatBubbleOutlineIcon fontSize="small"/>
         </IconButton>
         <Typography variant="body2" color="text.secondary" sx={{ ml: -1 }}>
           {comments_count ?? 0} {/* Use destructured comments_count */}
         </Typography>
         {/* --- End Added Comment Section --- */}

         {/* Share Button Placeholder */}
         {/* <IconButton aria-label="share" sx={{ ml: 'auto' }}> <ShareIcon fontSize="small"/> </IconButton> */}
      </CardActions>

    </Card> // Closing tag for Card
  );
};

export default PostCard;