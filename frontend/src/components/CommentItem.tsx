// src/components/CommentItem.tsx
import React from 'react'; // Removed useState, useCallback as they are not needed here anymore
import { ListItem, ListItemAvatar, Avatar, ListItemText, Typography, Box, IconButton, CircularProgress, Button, Link, Stack } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ReplyIcon from '@mui/icons-material/Reply';
import { Comment } from '../types'; // Adjust path if needed
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../context/AuthContext'; // For auth check

// --- Base URL ---
const APP_URL = import.meta.env.VITE_APP_URL || 'http://localhost:8000';
const STORAGE_URL = `${APP_URL}/storage`;
// ---

// --- Type Guards (Optional: Can be moved to a shared file) ---
// interface ApiErrorResponse { message: string; } // Assuming defined elsewhere or not needed here
// function isApiErrorResponse(data: any): data is ApiErrorResponse { /* ... */ return typeof data === 'object' && data !== null && typeof data.message === 'string'; }
// function isAxiosError(error: any): error is import('axios').AxiosError { /* ... */ return error.isAxiosError === true; }
// ---

interface CommentItemProps {
    comment: Comment;
    onLikeToggle: (commentId: number) => void;
    onReplyClick: (commentId: number, authorName: string) => void;
    onViewRepliesClick: (commentId: number) => void;
    loadingLike: boolean; // Prop indicating if like action is loading
}

const CommentItem: React.FC<CommentItemProps> = ({
    comment,
    onLikeToggle,
    onReplyClick,
    onViewRepliesClick,
    loadingLike
}) => {
    // Destructure comment properties
    const { user: author, body, created_at, id: commentId, likes_count, is_liked_by_current_user, replies_count } = comment;
    // Get authentication status
    const { isAuthenticated } = useAuth();

    // --- Event Handlers ---
    const handleInternalLikeClick = () => {
        if (loadingLike || !isAuthenticated) return;
        onLikeToggle(commentId);
    };

    const handleInternalReplyClick = () => {
        if (!isAuthenticated) return;
        onReplyClick(commentId, author?.name || 'User');
    };

     const handleInternalViewRepliesClick = () => {
         onViewRepliesClick(commentId);
     };
    // --- End Event Handlers ---

    // --- Helper Functions ---
    const formatCommentTime = (dateString: string): string => { try {return formatDistanceToNow(new Date(dateString),{ addSuffix: true });} catch(e){ return dateString; } }
    const authorAvatarSrc = author?.profile_picture_path ? `${STORAGE_URL}/${author.profile_picture_path}` : undefined;
    // --- End Helper Functions ---

    return (
         <ListItem alignItems="flex-start" disableGutters sx={{ py: 0.5, position: 'relative' }}
             secondaryAction={
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: -0.5 }}>
                     <IconButton size="small" onClick={handleInternalLikeClick} disabled={loadingLike || !isAuthenticated} color={is_liked_by_current_user ? "error" : "default"} sx={{ p: 0.5 }}>
                         {loadingLike ? <CircularProgress size={16} color="inherit"/> : (is_liked_by_current_user ? <FavoriteIcon sx={{ fontSize: 16 }}/> : <FavoriteBorderIcon sx={{ fontSize: 16 }}/>)}
                     </IconButton>
                     <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                         {likes_count ?? 0}
                     </Typography>
                </Box>
             }
        >
            {/* Author's avatar */}
            <ListItemAvatar sx={{ minWidth: 32, mt: 0.5 }}>
                <Avatar alt={author?.name || 'U'} src={authorAvatarSrc} sx={{ width: 24, height: 24 }} />
            </ListItemAvatar>
            <ListItemText
                primary={ <Typography component="span" variant="body2" sx={{ fontWeight: 'bold', mr: 0.5 }}> {author?.name || 'Unknown'} </Typography> }
                // --- FIX: Use secondaryTypographyProps to render secondary as div ---
                secondaryTypographyProps={{ component: 'div' }} // Render the secondary container as a div instead of p
                secondary={
                     // Now the content can safely include block elements like Typography and Stack
                     <>
                        <Typography component="span" variant="body2" color="text.primary" sx={{ wordBreak: 'break-word', display: 'block' }}>
                            {body}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                             <Typography variant="caption" color="text.secondary"> {formatCommentTime(created_at)} </Typography>
                             {isAuthenticated && ( <Button size="small" onClick={handleInternalReplyClick} sx={{ fontSize: '0.7rem', p:0, minWidth: 'auto', fontWeight: 'bold' }}> Reply </Button> )}
                             {(replies_count ?? 0) > 0 && ( <Link component="button" variant="caption" onClick={handleInternalViewRepliesClick} sx={{ cursor: 'pointer', textDecoration: 'none', fontWeight: 'bold' }}> View {(replies_count ?? 0)} {(replies_count ?? 0) > 1 ? 'replies' : 'reply'} </Link> )}
                         </Stack>
                     </>
                     // --- End FIX ---
                }
                sx={{ m: 0, pr: 5 }}
            />
        </ListItem>
    );
}

export default CommentItem;