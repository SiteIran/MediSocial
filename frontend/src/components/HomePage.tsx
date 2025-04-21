// src/pages/HomePage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Container, CircularProgress, Alert, Button, Collapse, Divider } from '@mui/material'; // <-- Import Collapse, Divider
import apiClient from '../api/axiosConfig';
import PostCard from '../components/PostCard'; // Import PostCard
import { Post, PaginatedPostsResponse, ApiErrorResponse } from '../types'; // Ensure types are imported
import axios from 'axios'; // Import axios for the type guard helper
import CreatePost from '../components/CreatePost'; // Keep commented or uncomment
import CommentSection from '../components/CommentSection'; // <-- Import CommentSection

// --- Type Guards (Keep as is) ---
interface ApiErrorResponse { message: string; errors?: Record<string, string[]>; }
function isApiErrorResponse(data: any): data is ApiErrorResponse { return typeof data === 'object' && data !== null && typeof data.message === 'string'; }
function isAxiosError(error: any): error is import('axios').AxiosError { return error.isAxiosError === true; }
// ---

const HomePage: React.FC = () => {
  // --- State variables (Keep as is) ---
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // --- Add State for Comment Section Toggle ---
  const [openCommentPostId, setOpenCommentPostId] = useState<number | null>(null);
  // -------------------------------------------

  // --- Function to fetch feed data (Keep as is) ---
  const fetchFeed = useCallback(async (page = 1, loadMore = false) => {
    if (!loadMore) { setLoading(true); setError(null); } else { setLoadingMore(true); }
    try {
      const response = await apiClient.get<PaginatedPostsResponse>('/feed', { params: { page } });
      if (response.data && Array.isArray(response.data.data)) {
          if (page === 1) setPosts(response.data.data);
          else setPosts(prev => [...prev, ...response.data.data.filter(np => !prev.some(ep => ep.id === np.id))]);
          setCurrentPage(response.data.current_page);
          setHasNextPage(response.data.next_page_url !== null);
      } else { /* Handle format error */ setPosts([]); setHasNextPage(false); setError("Unexpected format."); }
    } catch (err) { /* Handle errors */ setError("Could not load feed."); setPosts([]); setHasNextPage(false); console.error(err); }
    finally { setLoading(false); setLoadingMore(false); }
  }, []); // Empty dependency array

  // --- Fetch initial feed on mount (Keep as is) ---
  useEffect(() => { fetchFeed(1); }, [fetchFeed]);

  // --- Load More Handler (Keep as is) ---
  const handleLoadMore = () => { if (hasNextPage && !loadingMore && !loading) { fetchFeed(currentPage + 1, true); } };

  // --- Handler for New Post Creation (Keep as is) ---
  const handlePostCreated = (newPost: Post) => { setPosts(prevPosts => [newPost, ...prevPosts]); };

  // --- Handler for Like Toggle (Keep as is) ---
  const handleLikeToggleList = useCallback((postId: number, newLikeStatus: boolean, newLikeCount: number) => {
      setPosts(prevPosts => prevPosts.map(p => p.id === postId ? { ...p, is_liked_by_current_user: newLikeStatus, likes_count: newLikeCount } : p ));
  }, []);

  // --- Add Handler for Comment Icon Click ---
  const handleToggleCommentSection = useCallback((postId: number) => {
      setOpenCommentPostId(prevId => (prevId === postId ? null : postId));
  }, []); // No dependency needed if just toggling based on previous state
  // --- End Add ---


  return (
    <Container sx={{ pb: 7, pt: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom> Home Feed </Typography>

      {/* --- Optional Create Post Component --- */}
      {/* <CreatePost onPostCreated={handlePostCreated} /> */}

      {/* --- Error Alert --- */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* --- Initial Loading Indicator --- */}
      {loading && posts.length === 0 && ( <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}> <CircularProgress /> </Box> )}

      {/* --- No Posts Message --- */}
      {!loading && posts.length === 0 && !error && ( <Typography sx={{ textAlign: 'center', color: 'text.secondary', mt: 5 }}> Your feed is empty. Follow some users or create your first post! </Typography> )}

      {/* --- Posts List --- */}
      {/* Using Box for flexibility with Collapse */}
      <Box>
          {posts.map((post) => (
            // Using React.Fragment to group PostCard and Collapse
            <React.Fragment key={post.id}>
              <PostCard
                post={post}
                onLikeToggle={handleLikeToggleList}
                // --- Pass the comment toggle handler ---
                onCommentClick={handleToggleCommentSection}
                // onDelete/onEdit are not needed here
              />
              {/* --- Conditionally render Comment Section --- */}
              <Collapse in={openCommentPostId === post.id} timeout="auto" unmountOnExit>
                {/* Render only when 'in' and ID matches */}
                {openCommentPostId === post.id && (
                  <>
                    <CommentSection postId={post.id} />
                    <Divider sx={{ my: 1 }} />
                  </>
                )}
              </Collapse>
              {/* --- End Comment Section --- */}
            </React.Fragment>
          ))}
      </Box>

      {/* --- Load More Button & Indicator --- */}
      {hasNextPage && !loadingMore && posts.length > 0 && ( <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}> <Button onClick={handleLoadMore} disabled={loadingMore}>Load More Posts</Button> </Box> )}
      {loadingMore && ( <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}> <CircularProgress size={24} /> </Box> )}
      {/* --- End Load More --- */}

    </Container>
  );
};

export default HomePage;