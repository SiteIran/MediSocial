// src/components/CommentSection.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, List, Typography, TextField, Button, CircularProgress, Divider, Alert, IconButton, Collapse } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close'; // For cancelling reply
import CommentItem from './CommentItem'; // Import the CommentItem component
// Assuming types are defined in '../types' or similar
import { Comment, PaginatedCommentsResponse, ApiErrorResponse } from '../types';
import apiClient from '../api/axiosConfig';
import { formatDistanceToNow } from 'date-fns';
import axios from 'axios'; // For type guard
import { useAuth } from '../context/AuthContext'; // Import useAuth for isAuthenticated check

// --- Base URL for storage ---
const APP_URL = import.meta.env.VITE_APP_URL || 'http://localhost:8000';
const STORAGE_URL = `${APP_URL}/storage`;
// ---

// --- Type Guards ---
// Define locally or ensure exported from types file
interface ApiErrorResponse { message: string; errors?: Record<string, string[]>; }
function isApiErrorResponse(data: any): data is ApiErrorResponse { return typeof data === 'object' && data !== null && typeof data.message === 'string'; }
function isAxiosError(error: any): error is import('axios').AxiosError { return error.isAxiosError === true; }
// ---

interface CommentSectionProps {
    postId: number; // The ID of the post whose comments are to be displayed
}

/**
 * Component to display and manage comments and replies for a specific post.
 * Includes fetching comments, adding new comments/replies, loading more,
 * liking comments/replies, and viewing replies.
 */
const CommentSection: React.FC<CommentSectionProps> = ({ postId }) => {
    // --- State Variables ---
    const [comments, setComments] = useState<Comment[]>([]); // Top-level comments for the post
    const [loading, setLoading] = useState(true);           // Loading state for initial comments
    const [error, setError] = useState<string | null>(null); // Error message when fetching comments
    const [newComment, setNewComment] = useState('');      // Input state for the new comment/reply form
    const [isSubmitting, setIsSubmitting] = useState(false); // Loading state for submitting a new comment/reply
    const [submitError, setSubmitError] = useState<string | null>(null); // Error message for comment submission
    const [currentPage, setCurrentPage] = useState(1);       // Current page for top-level comment pagination
    const [hasNextPage, setHasNextPage] = useState(true);    // Indicator if more top-level comments exist
    const [loadingMore, setLoadingMore] = useState(false);   // Loading state for fetching more top-level comments
    const [totalComments, setTotalComments] = useState<number | null>(null); // Total count of top-level comments
    const [loadingLikeCommentId, setLoadingLikeCommentId] = useState<number | null>(null); // Tracks which comment/reply like action is processing

    // State specifically for managing replies
    const [viewingRepliesFor, setViewingRepliesFor] = useState<number | null>(null); // ID of the comment whose replies are currently expanded
    const [currentReplies, setCurrentReplies] = useState<Comment[]>([]); // Holds the fetched replies for the expanded comment
    const [loadingReplies, setLoadingReplies] = useState(false);         // Loading state for fetching replies
    const [repliesError, setRepliesError] = useState<string | null>(null); // Error fetching replies
    const [repliesPage, setRepliesPage] = useState(1);                   // Current page for replies pagination
    const [repliesHasNextPage, setRepliesHasNextPage] = useState(true);  // Indicator if more replies exist for the current comment
    const [loadingMoreReplies, setLoadingMoreReplies] = useState(false); // Loading state for fetching more replies

    // State for replying to a specific comment
    const [replyingTo, setReplyingTo] = useState<{ commentId: number; authorName: string } | null>(null);

    // --- Hooks ---
    const { isAuthenticated } = useAuth(); // Get user authentication status
    const commentInputRef = useRef<HTMLInputElement>(null); // Ref to the comment input field for focusing

    // --- Function to Fetch Top-Level Comments ---
    const fetchComments = useCallback(async (page = 1, loadMore = false) => {
        // Set appropriate loading state based on whether it's an initial load or "load more"
        if (!loadMore) {
            setLoading(true);
            setComments([]); // Clear existing comments on initial fetch for this post
            setCurrentPage(1);
            setHasNextPage(true);
        } else {
            setLoadingMore(true);
        }
        setError(null); // Clear previous errors
        console.log(`CommentSection: Fetching comments for post ${postId}, page ${page}...`);
        try {
            const response = await apiClient.get<PaginatedCommentsResponse>(`/posts/${postId}/comments`, { params: { page } });
            console.log("Comments API Response:", response.data);
            if (response.data && Array.isArray(response.data.data)) {
                const fetchedComments = response.data.data;
                // Append or replace comments in state
                if (page === 1) {
                    setComments(fetchedComments);
                    // Update total count only on the first page fetch
                    if (response.data.total !== undefined) setTotalComments(response.data.total);
                } else {
                    // Append new comments, ensuring no duplicates (though pagination should handle this)
                    setComments(prev => [...prev, ...fetchedComments.filter(nc => !prev.some(ec => ec.id === nc.id))]);
                }
                // Update pagination state
                setCurrentPage(response.data.current_page);
                setHasNextPage(response.data.next_page_url !== null);
            } else {
                console.warn("Unexpected comment format:", response.data);
                setError("Unexpected response format for comments.");
                if (page === 1) setComments([]); // Clear if format is wrong
                setHasNextPage(false);
            }
        } catch (err) {
             console.error("Failed to fetch comments:", err);
             let errorMsg = "Could not load comments.";
             if (isAxiosError(err) && err.response) {
                if (isApiErrorResponse(err.response.data)) { errorMsg = `Comments Error (${err.response.status}): ${err.response.data.message}`; }
                else { errorMsg = `Comments Error (${err.response.status}).`; }
             } else if (err instanceof Error) { errorMsg = `Comments Error: ${err.message}`; }
             setError(errorMsg);
             if (page === 1) setComments([]); // Clear on error
             setHasNextPage(false);
        } finally {
             // Reset loading states
             setLoading(false); // Always turn off initial loading state
             setLoadingMore(false); // Always turn off loading more state
        }
    }, [postId]); // Re-fetch whenever postId changes

    // --- Function to Fetch Replies ---
     const fetchReplies = useCallback(async (commentId: number, page = 1, loadMore = false) => {
         if (!loadMore) setLoadingReplies(true); else setLoadingMoreReplies(true);
         setRepliesError(null);
         console.log(`Fetching replies for comment ${commentId}, page ${page}...`);
         try {
             const response = await apiClient.get<PaginatedCommentsResponse>(`/comments/${commentId}/replies`, { params: { page } });
             console.log("Replies API Response:", response.data);
             if (response.data && Array.isArray(response.data.data)) {
                 const fetchedReplies = response.data.data;
                 if (page === 1) setCurrentReplies(fetchedReplies);
                 else setCurrentReplies(prev => [...prev, ...fetchedReplies.filter(nr => !prev.some(er => er.id === nr.id))]);
                 setRepliesPage(response.data.current_page);
                 setRepliesHasNextPage(response.data.next_page_url !== null);
             } else {
                 console.warn("Unexpected replies format:", response.data);
                 setRepliesError("Unexpected replies format.");
                 if (page === 1) setCurrentReplies([]);
                 setRepliesHasNextPage(false);
             }
         } catch (err) {
              console.error(`Failed to fetch replies for comment ${commentId}:`, err);
              setRepliesError("Could not load replies.");
              if (page === 1) setCurrentReplies([]);
              setRepliesHasNextPage(false);
         } finally {
              if (!loadMore) setLoadingReplies(false);
              setLoadingMoreReplies(false);
         }
     }, []); // This function doesn't depend on component state other than the ID passed in

    // --- Fetch initial comments when component mounts or postId changes ---
    useEffect(() => {
        console.log(`CommentSection: useEffect triggered for postId ${postId}.`);
        // Reset all comment and reply related states before fetching
        setComments([]); setCurrentPage(1); setHasNextPage(true); setError(null); setTotalComments(null);
        setViewingRepliesFor(null); setCurrentReplies([]); setRepliesPage(1); setRepliesHasNextPage(true); setRepliesError(null);
        setReplyingTo(null); setNewComment(''); setSubmitError(null);
        setLoading(true); // Set loading state for initial fetch
        fetchComments(1); // Fetch the first page of comments
    // We only need fetchComments in dependency array as it depends on postId
    }, [fetchComments, postId]); // <-- Explicitly add postId for clarity, though fetchComments covers it

    // --- Handle New Comment/Reply Submission ---
    const handleCommentSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        const trimmedComment = newComment.trim();
        // Validation: Check for empty comment, submission state, or authentication
        if (!trimmedComment || isSubmitting || !isAuthenticated) {
            if (!trimmedComment) setSubmitError("Comment cannot be empty.");
            return;
        }
        setIsSubmitting(true); setSubmitError(null); // Set loading state and clear previous errors

        // Prepare payload, including parent_id if it's a reply
        const payload: { body: string; parent_id?: number } = { body: trimmedComment };
        if (replyingTo) {
            payload.parent_id = replyingTo.commentId;
            console.log("Submitting Reply with payload:", payload);
        } else {
            console.log("Submitting New Comment with payload:", payload);
        }

        try {
            // Send the POST request to the backend API
            const response = await apiClient.post<Comment>(`/posts/${postId}/comments`, payload);

            // --- DEBUG: Log the entire response from the API ---
            console.log("handleCommentSubmit - API Response:", response);
            console.log("handleCommentSubmit - API Response Data:", response.data);
            // --- Check specifically if the user object exists and has a name ---
            console.log("handleCommentSubmit - User in Response Data:", response.data?.user);
            console.log("handleCommentSubmit - User Name in Response:", response.data?.user?.name);
            // -----------------------------------------------------

            // Ensure the response data is valid before proceeding
            if (!response.data || typeof response.data !== 'object' || !response.data.id) {
                throw new Error("Invalid comment data received from server.");
            }

            // Assume default like status/count for the newly created comment for immediate UI update
            const newCommentWithDefaults: Comment = {
                 ...response.data, // Spread the data received from the API (should include the loaded user)
                 likes_count: response.data.likes_count ?? 0, // Use count from response if available, else 0
                 is_liked_by_current_user: response.data.is_liked_by_current_user ?? false, // Use status from response if available, else false
                 replies_count: response.data.replies_count ?? 0 // Use count from response if available, else 0
             };
             console.log("handleCommentSubmit - Comment object prepared for state:", newCommentWithDefaults);


            // Update the appropriate state list (replies or top-level comments)
            if (replyingTo) {
                 // If currently viewing replies for the parent, add the new reply to that list
                 if (viewingRepliesFor === replyingTo.commentId) {
                      setCurrentReplies(prev => [newCommentWithDefaults, ...prev]);
                      console.log("handleCommentSubmit - Added new reply to currentReplies state.");
                 }
                 // Always increment replies_count on the parent comment in the main list state
                 setComments(prev => prev.map(c =>
                     c.id === replyingTo?.commentId
                     ? {...c, replies_count: (c.replies_count ?? 0) + 1 } // Increment count
                     : c
                 ));
                 console.log(`handleCommentSubmit - Incremented replies_count for parent comment ${replyingTo.commentId}.`);
            } else {
                // Add new top-level comment to the main comments list state
                setComments(prev => [newCommentWithDefaults, ...prev]);
                setTotalComments(prev => (prev !== null ? prev + 1 : null)); // Increment total count
                console.log("handleCommentSubmit - Added new top-level comment to comments state.");
            }

            // Reset form state
            setNewComment('');
            setReplyingTo(null); // Exit reply mode

        } catch (err: any) {
            // Handle errors during submission
            console.error("Failed to post comment:", err);
            let errorMsg = "Failed to post comment.";
            if (isAxiosError(err) && err.response) {
                 if (isApiErrorResponse(err.response.data) && err.response.data.errors) { errorMsg = `Comment failed: ${Object.values(err.response.data.errors).flat().join(' ')}`; }
                 else if (isApiErrorResponse(err.response.data)) { errorMsg = `Comment failed: ${err.response.data.message}`; }
                 else { errorMsg = `Comment failed (${err.response.status}).`; }
            } else if (err instanceof Error) { errorMsg = `Comment failed: ${err.message}`; }
            setSubmitError(errorMsg); // Display the submission error
        } finally {
            setIsSubmitting(false); // Reset submission loading state
        }
    };

    // --- Load More Top-Level Comments ---
    const handleLoadMoreComments = () => { if (hasNextPage && !loadingMore && !loading) { fetchComments(currentPage + 1, true); } };

    // --- Load More Replies ---
     const handleLoadMoreReplies = () => { if (viewingRepliesFor && repliesHasNextPage && !loadingMoreReplies) { fetchReplies(viewingRepliesFor, repliesPage + 1, true); } };

    // --- Like Toggle Handler (for both comments and replies) ---
    const handleLikeToggleCommentList = useCallback(async (commentId: number) => {
        if (loadingLikeCommentId || !isAuthenticated) return; setLoadingLikeCommentId(commentId);
        // Find the comment/reply in either list
        const allListedComments = [...comments, ...currentReplies];
        const commentIndex = allListedComments.findIndex(c => c.id === commentId);
        if (commentIndex === -1) { setLoadingLikeCommentId(null); return; } // Should not happen
        const comment = allListedComments[commentIndex];
        const isCurrentlyLiked = !!comment.is_liked_by_current_user;

        try {
            let response;
            if (isCurrentlyLiked) response = await apiClient.delete(`/comments/${commentId}/like`);
            else response = await apiClient.post(`/comments/${commentId}/like`);

            if (response.data && typeof response.data.likes_count === 'number' && typeof response.data.is_liked_by_current_user === 'boolean') {
                 const updatedLikeStatus = response.data.is_liked_by_current_user;
                 const updatedLikeCount = response.data.likes_count;
                 // Update both state lists
                 setComments(prev => prev.map(c => c.id === commentId ? { ...c, is_liked_by_current_user: updatedLikeStatus, likes_count: updatedLikeCount } : c));
                 setCurrentReplies(prev => prev.map(c => c.id === commentId ? { ...c, is_liked_by_current_user: updatedLikeStatus, likes_count: updatedLikeCount } : c));
            } else { console.warn("Unexpected like/unlike comment response format"); }
        } catch (error) { console.error("Failed comment like:", error); setError("Could not update like status."); setTimeout(() => setError(null), 3000); }
        finally { setLoadingLikeCommentId(null); }
    }, [comments, currentReplies, loadingLikeCommentId, isAuthenticated]); // Dependencies

    // --- Handler for "View Replies" click ---
    const handleViewRepliesClick = (commentId: number) => {
        if (viewingRepliesFor === commentId) setViewingRepliesFor(null); // Hide if already viewing
        else {
             setViewingRepliesFor(commentId); setCurrentReplies([]); setRepliesPage(1); setRepliesHasNextPage(true); setRepliesError(null);
             fetchReplies(commentId, 1); // Fetch first page
        }
    };

    // --- Handler for "Reply" click ---
     const handleReplyClick = (commentId: number, authorName: string) => {
         setReplyingTo({ commentId, authorName }); setNewComment(`@${authorName} `); commentInputRef.current?.focus();
     };
     const cancelReply = () => { setReplyingTo(null); setNewComment(''); }


    // --- Helper to format date ---
    const formatCommentTime = (dateString: string): string => { try {return formatDistanceToNow(new Date(dateString),{ addSuffix: true });} catch(e){ return dateString; } }

    // --- Render Component ---
    return (
        <Box sx={{ mt: 2, px: { xs: 0, sm: 2 }, pb: 1 }}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2" gutterBottom sx={{ px: { xs: 2, sm: 0 } }}> Comments {totalComments !== null ? `(${totalComments})` : ''} </Typography>

            {/* New Comment Form (Show only if authenticated) */}
            {isAuthenticated && (
                <Box component="form" onSubmit={handleCommentSubmit} sx={{ px: { xs: 2, sm: 0 }, mb: 2 }}>
                    {replyingTo && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                             <Typography variant="caption" color="text.secondary"> Replying to {replyingTo.authorName} </Typography>
                             <IconButton size="small" onClick={cancelReply} sx={{ ml: 0.5, p: 0.2 }}><CloseIcon sx={{ fontSize: '0.8rem' }}/></IconButton>
                        </Box>
                    )}
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextField inputRef={commentInputRef} size="small" fullWidth variant="outlined" placeholder={replyingTo ? 'Write your reply...' : "Add a comment..."} value={newComment} onChange={(e) => setNewComment(e.target.value)} disabled={isSubmitting} />
                        <Button type="submit" size="small" variant="contained" disabled={!newComment.trim() || isSubmitting} sx={{ minWidth: 'auto', px: 1 }} > {isSubmitting ? <CircularProgress size={20} color="inherit" /> : <SendIcon fontSize="small" />} </Button>
                    </Box>
                </Box>
            )}
            {submitError && <Alert severity="error" sx={{ mb: 1, mx: { xs: 2, sm: 0 } }} onClose={() => setSubmitError(null)}>{submitError}</Alert>}

            {/* Loading/Error/Empty states for top-level comments */}
            {loading && comments.length === 0 && <Box sx={{display: 'flex', justifyContent: 'center', py: 2}}><CircularProgress size={24} /></Box>}
            {error && <Alert severity="warning" sx={{ mb: 1, mx: { xs: 2, sm: 0 } }}>{error}</Alert>}
            {!loading && comments.length === 0 && !error && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', py: 2, px: { xs: 2, sm: 0 } }}>No comments yet.</Typography>}

            {/* Comments List */}
            {comments.length > 0 && (
                <List dense disablePadding sx={{ maxHeight: '400px', overflowY: 'auto', mb: 1, px: { xs: 2, sm: 0 } }}>
                    {comments.map(comment => (
                        <Box key={comment.id}>
                             <CommentItem
                                comment={comment}
                                onLikeToggle={handleLikeToggleCommentList} // Pass like handler
                                onReplyClick={handleReplyClick}       // Pass reply handler
                                onViewRepliesClick={handleViewRepliesClick} // Pass view replies handler
                                loadingLike={loadingLikeCommentId === comment.id} // Pass loading state for like
                            />
                            {/* Replies Section (Collapsible) */}
                            <Collapse in={viewingRepliesFor === comment.id} timeout="auto" unmountOnExit>
                                <Box sx={{ pl: 4, borderLeft: '2px solid', borderColor: 'divider', ml: 1.5, pb: 1 }}>
                                     {/* Loading/Error/Empty for replies */}
                                     {loadingReplies && <CircularProgress size={18} sx={{ display: 'block', my: 1, mx: 'auto' }}/>}
                                     {repliesError && <Alert severity="error" size="small" sx={{my: 1}}>{repliesError}</Alert>}
                                     {!loadingReplies && currentReplies.length === 0 && !repliesError && (<Typography variant="caption" sx={{pl:1}}>No replies</Typography>)}

                                     {/* Render Replies using CommentItem */}
                                     {currentReplies.map(reply => (
                                         <CommentItem
                                             key={reply.id}
                                             comment={reply}
                                             onLikeToggle={handleLikeToggleCommentList}
                                             onReplyClick={handleReplyClick} // Allow replying to replies
                                             onViewRepliesClick={() => {}} // Disable viewing replies of replies
                                             loadingLike={loadingLikeCommentId === reply.id}
                                         />
                                     ))}
                                     {/* Load More Replies Button */}
                                     {repliesHasNextPage && !loadingMoreReplies && currentReplies.length > 0 && (
                                         <Button size="small" onClick={handleLoadMoreReplies} disabled={loadingMoreReplies} sx={{fontSize:'0.7rem', mt: 0.5, ml: 1}}>Load more replies</Button>
                                     )}
                                     {loadingMoreReplies && <CircularProgress size={18} sx={{ display: 'block', my: 1, mx: 'auto' }} />}
                                </Box>
                            </Collapse>
                        </Box>
                    ))}
                </List>
            )}

            {/* Load More Top-Level Comments Button */}
            {hasNextPage && !loadingMore && comments.length > 0 && ( <Button size="small" fullWidth onClick={handleLoadMoreComments} disabled={loadingMore} sx={{ mt: 1, textTransform: 'none' }}> View more comments </Button> )}
            {loadingMore && <Box sx={{display: 'flex', justifyContent: 'center', py:1}}><CircularProgress size={20} /></Box>}
        </Box>
    );
};

export default CommentSection;