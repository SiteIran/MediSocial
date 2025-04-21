// src/components/ViewPostModal.tsx
import React, { useState, useEffect } from 'react'; // <-- Import useState
import { Dialog, DialogContent, IconButton, Box, Collapse, Divider } from '@mui/material'; // <-- Import Collapse, Divider
import CloseIcon from '@mui/icons-material/Close';
import { Post } from '../types'; // Adjust path
import PostCard from './PostCard'; // Import PostCard
import CommentSection from './CommentSection'; // <-- Import CommentSection

interface ViewPostModalProps {
    post: Post | null;
    open: boolean;
    onClose: () => void;
    onEditRequest: (post: Post) => void; // For editing the post itself
    onDeleteRequest: (postId: number) => void; // For deleting the post itself
    onLikeToggle: (postId: number, newLikeStatus: boolean, newLikeCount: number) => void; // For liking the post
    // We might not need a specific comment click handler from parent if we manage toggle state internally
}

const ViewPostModal: React.FC<ViewPostModalProps> = ({
    post,
    open,
    onClose,
    onEditRequest,
    onDeleteRequest,
    onLikeToggle // Receive the like toggle handler
}) => {
    // --- State to manage visibility of the comment section ---
    const [showComments, setShowComments] = useState(false);
    // ---

    // --- Handler to toggle comment section visibility ---
    // This will be passed to PostCard's onCommentClick
    const handleToggleComments = () => {
        setShowComments(prev => !prev);
    };
    // ---

    // Reset comment visibility when the modal closes or the post changes
    useEffect(() => {
        if (!open || !post) {
            setShowComments(false);
        }
    }, [open, post]); // Reset when modal open state or post changes


    if (!post) {
        return null; // Don't render anything if no post is selected
    }

    return (
        <Dialog
            open={open}
            onClose={() => { onClose(); setShowComments(false); }} // Also reset comment view on close
            maxWidth="sm"
            fullWidth
            PaperProps={{ sx: { position: 'relative', m: { xs: 1, sm: 2 } } }}
            sx={{ '& .MuiDialogContent-root': { p: 0, overflowY: 'auto' } }}
        >
            {/* Close Button (Keep positioning as before) */}
            <IconButton
                aria-label="close"
                onClick={() => { onClose(); setShowComments(false); }} // Also reset comment view on close
                sx={{
                    position: 'absolute',
                    right: theme => theme.spacing(1), // Adjusted spacing from previous step
                    top: theme => theme.spacing(1),   // Adjusted spacing from previous step
                    zIndex: 1301,
                    bgcolor: 'rgba(0, 0, 0, 0.4)',
                    color: 'white',
                    padding: '4px',
                    '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.6)' },
                }}
            >
                <CloseIcon fontSize="small" />
            </IconButton>

            {/* Dialog Content now holds PostCard and potentially CommentSection */}
            <DialogContent>
                {/* Render PostCard, passing all necessary handlers */}
                <PostCard
                    post={post}
                    onEdit={() => onEditRequest(post)}
                    onDelete={() => onDeleteRequest(post.id)}
                    onLikeToggle={onLikeToggle} // Pass down like handler
                    onCommentClick={handleToggleComments} // <-- Pass down comment toggle handler
                />

                {/* --- Conditionally Render Comment Section --- */}
                {/* Use Collapse for smooth animation */}
                <Collapse in={showComments} timeout="auto" unmountOnExit>
                    {/* Render CommentSection only when showComments is true */}
                    {/* Pass the postId needed by CommentSection */}
                    <CommentSection postId={post.id} />
                    {/* Add a divider for visual separation if desired */}
                    <Divider sx={{ mt: 1 }} />
                </Collapse>
                {/* --- End Comment Section --- */}

            </DialogContent>
        </Dialog>
    );
};

export default ViewPostModal;

// --- Make sure CommentSection component exists ---
// You should have the 'src/components/CommentSection.tsx' file created
// with the code provided in the previous step.