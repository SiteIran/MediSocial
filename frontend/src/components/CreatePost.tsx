// src/components/CreatePost.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Box, TextField, Button, CircularProgress, Alert, IconButton, Avatar } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import PhotoCamera from '@mui/icons-material/PhotoCamera'; // Icon for adding photo
import CloseIcon from '@mui/icons-material/Close'; // Icon to remove preview
import apiClient from '../api/axiosConfig';
import { Post } from '../types'; // Adjust path if needed
import axios from 'axios'; // For type guard

// --- Type Guard Imports (or define locally) ---
interface ApiErrorResponse { message: string; errors?: Record<string, string[]>; }
function isApiErrorResponse(data: any): data is ApiErrorResponse { /* ... */ return typeof data === 'object' && data !== null && typeof data.message === 'string'; }
function isAxiosError(error: any): error is import('axios').AxiosError { /* ... */ return error.isAxiosError === true; }
// ---

interface CreatePostProps {
    onPostCreated: (newPost: Post) => void; // Callback after successful post creation
}

const CreatePost: React.FC<CreatePostProps> = ({ onPostCreated }) => {
    // State for post content
    const [content, setContent] = useState('');
    // State for selected image file and its preview
    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
    // State for submission status
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Ref for the hidden file input
    const imageInputRef = useRef<HTMLInputElement>(null);

    // --- Effect for cleaning up image preview URL ---
    useEffect(() => {
        let objectUrl: string | null = null;
        if (selectedImageFile) {
            objectUrl = URL.createObjectURL(selectedImageFile);
            setImagePreviewUrl(objectUrl);
            console.log("Generated preview URL:", objectUrl);
        } else {
            setImagePreviewUrl(null); // Clear preview if no file
        }
        // Cleanup function
        return () => {
            if (objectUrl) {
                 console.log("Revoking preview URL:", objectUrl);
                 URL.revokeObjectURL(objectUrl);
            }
        };
    }, [selectedImageFile]); // Re-run only when selectedImageFile changes

    // --- Handle Image Selection ---
    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                setError("Please select an image file."); setSelectedImageFile(null); return;
            }
             // Match backend validation (e.g., 10MB)
            if (file.size > 10 * 1024 * 1024) {
                 setError("Image size cannot exceed 10MB."); setSelectedImageFile(null); return;
            }
            setError(null);
            setSelectedImageFile(file);
        } else {
            setSelectedImageFile(null);
        }
         // Reset file input value to allow selecting the same file again after removing
         if (event.target) {
              event.target.value = '';
         }
    };

    // --- Trigger Image Input Click ---
    const handleAddPhotoClick = () => {
        imageInputRef.current?.click();
    };

    // --- Remove Selected Image ---
    const handleRemoveImage = () => {
        setSelectedImageFile(null);
        // No need to clear input ref value here if handleImageChange resets it
    };

    // --- Handle Form Submission ---
    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        // Validation: Require either content OR an image
        if (!content.trim() && !selectedImageFile) {
            setError("Please write something or add an image to post.");
            return;
        }
        if (isSubmitting) return; // Prevent double submission

        setIsSubmitting(true);
        setError(null);

        // --- Create FormData ---
        const formData = new FormData();
        // Use empty string if content is only whitespace, let backend handle nullable/empty
        formData.append('content', content || ''); // Send content (even if empty/null)
        // Append image ONLY if one is selected
        if (selectedImageFile) {
            formData.append('image', selectedImageFile); // Key must match backend ('image')
        }
        // ----------------------

        console.log("Submitting post FormData..."); // Check FormData content in Network tab if needed

        try {
            // Send POST request with FormData
            const response = await apiClient.post<Post>('/posts', formData, {
                 // Axios should automatically set Content-Type to multipart/form-data
                 // Ensure no interceptors are overriding it back to application/json
            });
            console.log("Post created successfully:", response.data);
            onPostCreated(response.data); // Notify parent component
            // Reset form state completely after success
            setContent('');
            setSelectedImageFile(null);
            // Preview will clear via useEffect

        } catch (err: any) {
            console.error("Failed to create post:", err);
            let errorMsg = "Could not create post.";
            if (isAxiosError(err) && err.response) {
                 if (isApiErrorResponse(err.response.data) && err.response.data.errors) { errorMsg = `Post failed: ${Object.values(err.response.data.errors).flat().join(' ')}`; }
                 else if (isApiErrorResponse(err.response.data)) { errorMsg = `Post failed: ${err.response.data.message}`; }
                 else { errorMsg = `Post failed (${err.response.status}). Please try again.`; }
            } else if (err instanceof Error) { errorMsg = `Post failed: ${err.message}`; }
            setError(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, mb: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <TextField
                label="What's on your mind?"
                multiline
                rows={3}
                fullWidth
                value={content}
                onChange={(e) => setContent(e.target.value)}
                margin="none"
                disabled={isSubmitting}
                sx={{ mb: 1 }}
            />

            {/* --- Image Preview --- */}
            {imagePreviewUrl && (
                <Box sx={{ position: 'relative', mb: 1, width: '100%', maxWidth: '200px' }}> {/* Control preview size */}
                    {/* Using img tag directly for preview */}
                    <img
                        src={imagePreviewUrl}
                        alt="Preview"
                        style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '4px' }}
                    />
                    <IconButton
                        aria-label="remove image"
                        onClick={handleRemoveImage}
                        size="small"
                        disabled={isSubmitting}
                        sx={{
                            position: 'absolute', top: 2, right: 2, bgcolor: 'rgba(0, 0, 0, 0.6)', color: 'white',
                            '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.8)' }, padding: '2px' // Smaller padding
                        }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Box>
            )}
            {/* --- End Image Preview --- */}

            {error && <Alert severity="error" sx={{ my: 1 }}>{error}</Alert>}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                {/* Hidden File Input */}
                <input accept="image/*" style={{ display: 'none' }} id="post-image-upload-input" type="file" onChange={handleImageChange} ref={imageInputRef}/>
                {/* Add Photo Button */}
                <IconButton color="primary" aria-label="add picture" onClick={handleAddPhotoClick} disabled={isSubmitting || !!selectedImageFile}> {/* Disable if image already selected */}
                    <PhotoCamera />
                </IconButton>

                {/* Post Button */}
                <Button
                    type="submit"
                    variant="contained"
                    // Disable if submitting OR if both content AND image are empty
                    disabled={(!content.trim() && !selectedImageFile) || isSubmitting}
                    startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
                >
                    {isSubmitting ? 'Posting...' : 'Post'}
                </Button>
            </Box>
        </Box>
    );
};

export default CreatePost;