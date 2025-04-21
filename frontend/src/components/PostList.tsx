// src/components/PostList.tsx (New File)
import React from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import PostCard from './PostCard'; // Assuming PostCard is in the same folder
import { Post } from '../types'; // Adjust path if needed

interface PostListProps {
    posts: Post[];
    isLoading: boolean; // Is the list initially loading?
    isLoadingMore: boolean; // Is it loading more posts?
    hasNextPage: boolean;
    error: string | null;
    onLoadMore: () => void; // Function to call when load more is needed
    onDeletePost?: (postId: number) => void; // Optional: Callback when delete is requested
    onEditPost?: (post: Post) => void; // Optional: Callback when edit is requested
}


const PostList: React.FC<PostListProps> = ({
    posts,
    isLoading,
    isLoadingMore,
    hasNextPage,
    error,
    onLoadMore,
    onDeletePost, // Receive delete handler
    onEditPost   // Receive edit handler
}) => {

    // Initial Loading State
    if (isLoading && posts.length === 0) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
                <CircularProgress />
            </Box>
        );
    }

    // No Posts State (after loading, without errors)
    if (!isLoading && posts.length === 0 && !error) {
        return (
            <Typography sx={{ textAlign: 'center', color: 'text.secondary', mt: 5 }}>
                No posts to display yet.
            </Typography>
        );
    }

    // Render the list of posts
    return (
        <Box>
            {posts.map((post) => (
                <PostCard
                    key={post.id}
                    post={post}
                    // Pass down the handlers ONLY if they exist (for own profile)
                    onDelete={onDeletePost ? () => onDeletePost(post.id) : undefined}
                    onEdit={onEditPost ? () => onEditPost(post) : undefined}
                />
            ))}

            {/* Load More Button & Indicator */}
            {hasNextPage && !isLoadingMore && (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                    <Button onClick={onLoadMore} disabled={isLoadingMore}>Load More Posts</Button>
                </Box>
            )}
            {isLoadingMore && (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                    <CircularProgress size={24} />
                </Box>
            )}
        </Box>
    );
};

export default PostList;