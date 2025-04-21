// src/components/PostGridItem.tsx
import React from 'react';
import { Box, Typography } from '@mui/material';
import ArticleIcon from '@mui/icons-material/Article';
import { Post } from '../types'; // Adjust path as necessary

// --- Base URL for Storage (Define or Import) ---
const APP_URL = import.meta.env.VITE_APP_URL || 'http://localhost:8000';
const STORAGE_URL = `${APP_URL}/storage`;
// ---

interface PostGridItemProps {
    post: Post;
    onClick: () => void;
}

const PostGridItem: React.FC<PostGridItemProps> = ({ post, onClick }) => {
    const hasImage = !!post.image_path;
    const imageUrl = hasImage ? `${STORAGE_URL}/${post.image_path}` : null;

    return (
        <Box
            onClick={onClick}
            sx={{
                position: 'relative',
                paddingTop: '100%', // 1:1 aspect ratio
                cursor: 'pointer',
                overflow: 'hidden',
                bgcolor: 'grey.200',
                borderRadius: 1,
                '&:hover .overlay': { opacity: 0.6, }
            }}
        >
            <Box sx={{ position: 'absolute', top: 0, left: 0, bottom: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={`Post ${post.id}`}
                        style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                ) : (
                    <ArticleIcon sx={{ fontSize: 40, color: 'grey.500' }} />
                )}
            </Box>
            {/* Optional Overlay */}
            {/* <Box className="overlay" sx={{ ... overlay styles ... }}> ... </Box> */}
        </Box>
    );
};

export default PostGridItem;