// src/pages/CreatePostPage.tsx (New File)
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Typography, Box } from '@mui/material';
import CreatePost from '../components/CreatePost'; // Import the existing form component
import { Post } from '../types'; // Import Post type if needed for the handler

const CreatePostPage: React.FC = () => {
    const navigate = useNavigate();

    // Handler to be called after a post is successfully created
    const handlePostCreated = (newPost: Post) => {
        console.log("Post created successfully on page, navigating home:", newPost);
        // Navigate to the home feed after successful post creation
        navigate('/home');
    };

    return (
        // Add padding-bottom if using AppLayout which includes BottomNav
        <Container sx={{ pt: 2, pb: 7 }}>
            <Typography variant="h4" component="h1" gutterBottom>
                Create New Post
            </Typography>

            {/* Render the CreatePost form component */}
            {/* Pass the navigation logic to the onPostCreated callback */}
            <CreatePost onPostCreated={handlePostCreated} />

        </Container>
    );
};

export default CreatePostPage;