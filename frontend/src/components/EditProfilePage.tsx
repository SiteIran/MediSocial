import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { /* ... MUI Imports ... */ Container, Box, TextField, Button, Typography, CircularProgress, Alert, Autocomplete, Chip, Avatar, IconButton, Badge } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import apiClient from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

// --- Interfaces & Type Guards ---
interface SkillOption { id: number; name: string; }
interface ApiErrorResponse { message: string; errors?: Record<string, string[]>; }
function isApiErrorResponse(data: any): data is ApiErrorResponse { return typeof data === 'object' && data !== null && typeof data.message === 'string'; }
function isAxiosError(error: any): error is import('axios').AxiosError { return error.isAxiosError === true; }

// --- FIX: Define User type locally (or import if defined elsewhere) ---
interface User {
  id: number;
  name: string | null;
  phone_number: string;
  profile_picture_path?: string | null;
  bio?: string | null;
  skills?: SkillOption[]; // Use SkillOption here too
  followers_count?: number;
  following_count?: number;
}
// --- End FIX ---


// --- Base URL for Storage (Keep as provided) ---
const APP_URL = import.meta.env.VITE_APP_URL || 'http://localhost:8000';
const STORAGE_URL = `${APP_URL}/storage`;
// ---

const EditProfilePage: React.FC = () => {
  const { user, setUser, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();

  // --- State variables (Keep as provided) ---
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [allSkills, setAllSkills] = useState<SkillOption[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<SkillOption[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(true);
  const [isSaving, setIsSaving] = useState(false); // Overall saving state
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // --- Add State for Avatar Upload ---
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false); // Specific state for avatar upload process
  // ---

  // --- Add Ref for file input ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  // ---

  // --- Effect for fetching skills (Keep as provided) ---
  useEffect(() => {
    // setLoadingSkills(true); // Already set initially
    if (!user) return; // Prevent fetch if user isn't loaded yet

    apiClient.get<SkillOption[]>('/skills')
    .then(response => {
        const availableSkills = response.data;
        setAllSkills(availableSkills);
        if (user?.skills && Array.isArray(user.skills)) {
            const currentUserSkillIds = new Set(user.skills.map(s => s.id));
            const currentUserSkills = availableSkills.filter(skill => currentUserSkillIds.has(skill.id));
            setSelectedSkills(currentUserSkills);
        } else { setSelectedSkills([]); }
    })
    .catch(err => { setError("Could not load skills."); console.error("Fetch skills error:", err); })
    .finally(() => { setLoadingSkills(false); });
}, [user]); // Dependency on user seems correct

  // --- Effect for redirecting if no user (Keep as provided) ---
   useEffect(() => {
       if (!isAuthLoading && !user) { navigate('/login'); }
   }, [user, isAuthLoading, navigate]);

   // --- Add Effect for Cleaning up Preview URL ---
   useEffect(() => {
       if (selectedFile) {
           const objectUrl = URL.createObjectURL(selectedFile);
           setPreviewUrl(objectUrl);
           // Cleanup function
           return () => URL.revokeObjectURL(objectUrl);
       } else {
           setPreviewUrl(null); // Clear preview if no file selected
       }
   }, [selectedFile]);
   // ---

   // --- Add Handle File Input Change ---
   const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
       const file = event.target.files?.[0];
       if (file) {
           // Basic client-side validation
           if (!file.type.startsWith('image/')) {
               setError("Please select an image file."); setSelectedFile(null); return;
           }
           if (file.size > 5 * 1024 * 1024) { // 5MB limit
                setError("File size cannot exceed 5MB."); setSelectedFile(null); return;
           }
           setError(null);
           setSelectedFile(file);
       } else { setSelectedFile(null); }
   };
   // ---

   // --- Add Trigger Hidden File Input Click ---
   const handleAvatarClick = () => { fileInputRef.current?.click(); };
   // ---

   // --- MODIFIED Handle saving profile changes (now handleSaveAll) ---
   const handleSaveAll = async () => {
    if (isSaving || loadingSkills || isUploading) return; // Prevent save if already busy

    setIsSaving(true); // Set overall saving state for text/skills
    setError(null);
    setSuccessMessage(null);

    let finalUpdatedUser = user; // Keep track of the latest user data

    // --- Step 1: Upload Avatar if selected ---
    if (selectedFile) {
      setIsUploading(true); // Set specific upload state
      const formData = new FormData();
      formData.append('avatar', selectedFile); // <-- MUST be 'avatar'
      try {
        console.log("Uploading avatar...");
        const avatarResponse = await apiClient.post<User>('/user/avatar', formData); // Assuming response is User type
        finalUpdatedUser = avatarResponse.data; // Update user data with response from avatar upload
        setUser(finalUpdatedUser); // Update context immediately after avatar success
        localStorage.setItem('authUser', JSON.stringify(finalUpdatedUser)); // Update storage
        setSelectedFile(null); // Clear selected file
        console.log("Avatar upload successful:", finalUpdatedUser);
      } catch (avatarError: any) {
        console.error("Avatar Upload Error:", avatarError);
        let errorMsg = "Failed to upload avatar.";
        if (isAxiosError(avatarError) && avatarError.response) {
            if (isApiErrorResponse(avatarError.response.data)) errorMsg = `Avatar Upload Failed: ${avatarError.response.data.message}`;
            else errorMsg = `Avatar Upload Failed (${avatarError.response.status}).`;
        } else if (avatarError instanceof Error) { errorMsg = `Avatar Upload Failed: ${avatarError.message}`; }
        setError(errorMsg);
        setIsUploading(false); // Turn off upload indicator
        setIsSaving(false);   // Turn off overall saving indicator
        return; // Stop the process if avatar upload fails
      } finally {
        setIsUploading(false); // Turn off upload indicator
      }
    }

    // --- Step 2: Update Profile Text and Skills ---
    const profileData = { name, bio };
    const skillData = { skill_ids: selectedSkills.map(skill => skill.id) };
    console.log("Updating profile text and skills...");

    try {
      // Send requests (could be parallel or sequential)
      // For simplicity, let's assume the last request (skills) returns the most complete user object
      await apiClient.put('/user', profileData); // Update profile text
      const skillsResponse = await apiClient.put('/user/skills', skillData); // Update skills
      finalUpdatedUser = skillsResponse.data; // Get final user data from skills response

      setUser(finalUpdatedUser); // Update context state
      localStorage.setItem('authUser', JSON.stringify(finalUpdatedUser)); // Update local storage
      setSuccessMessage("Profile updated successfully!");
      console.log("Profile/skills updated successfully:", finalUpdatedUser);

      // Navigate back after delay
      setTimeout(() => { navigate('/profile'); }, 1500);

    } catch (profileSkillError: any) {
      console.error("Failed to save profile/skills:", profileSkillError);
       let errorMsg = "Failed to save profile details or skills.";
        if (isAxiosError(profileSkillError) && profileSkillError.response) {
            if (isApiErrorResponse(profileSkillError.response.data)) errorMsg = `Update failed: ${profileSkillError.response.data.message}`;
            else errorMsg = `Update failed (${profileSkillError.response.status}).`;
        } else if (profileSkillError instanceof Error) { errorMsg = `Update failed: ${profileSkillError.message}`; }
      setError(errorMsg);
    } finally {
       setIsSaving(false); // Turn off overall saving indicator
    }
  };
  // --- End handleSaveAll ---


  // --- Add handleCancel function ---
  const handleCancel = () => { navigate(-1); };
  // ---

  // Loading state render (Keep as provided)
  if (isAuthLoading || !user) { return ( <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}> <CircularProgress /> </Container> ); }

  // --- Determine Avatar Source ---
  const avatarSrc = previewUrl || (user?.profile_picture_path ? `${STORAGE_URL}/${user.profile_picture_path}` : undefined);
  // ---

  // --- Main Render ---
  return (
    <Container sx={{ pb: 7, pt: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom> Edit Profile </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}

      <Box component="form" noValidate autoComplete="off">

        {/* --- ADDED: Avatar Section --- */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
           <input accept="image/*" style={{ display: 'none' }} id="avatar-upload-input" type="file" onChange={handleFileChange} ref={fileInputRef} />
           <IconButton onClick={handleAvatarClick} color="primary" aria-label="upload picture" component="span" disabled={isSaving || isUploading}>
                <Badge overlap="circular" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} badgeContent={ <Avatar sx={{ bgcolor: 'primary.main', width: 24, height: 24 }}><PhotoCamera sx={{ fontSize: 16 }} /></Avatar> }>
                    <Avatar sx={{ width: 100, height: 100 }} alt={name || "User Avatar"} src={avatarSrc} />
                </Badge>
           </IconButton>
        </Box>
        {/* --- End Avatar Section --- */}

        {/* TextFields & Autocomplete (Keep as provided) */}
        <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth required margin="normal" disabled={isSaving || isUploading} />
        <TextField label="Bio" value={bio} onChange={(e) => setBio(e.target.value)} fullWidth multiline rows={4} margin="normal" disabled={isSaving || isUploading} />
        <Autocomplete multiple id="skills-autocomplete" options={allSkills} getOptionLabel={(option) => option.name}
            value={selectedSkills} isOptionEqualToValue={(option, value) => option.id === value.id}
            onChange={(event, newValue) => { setSelectedSkills(newValue); }}
            loading={loadingSkills} disabled={isSaving || loadingSkills || isUploading}
            renderInput={(params) => ( <TextField {...params} variant="outlined" label="Skills" placeholder="Select skills" margin="normal" InputProps={{ ...params.InputProps, endAdornment: ( <> {loadingSkills ? <CircularProgress color="inherit" size={20} /> : null} {params.InputProps.endAdornment} </> ), }} /> )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => {
                  // Get all props including the key for this specific tag
                  const { key, ...otherTagProps } = getTagProps({ index });
                  // Pass key directly and spread the rest of the props
                  return <Chip key={key} variant="outlined" label={option.name} {...otherTagProps} />;
              })
          }
        />

        {/* --- Action Buttons Section --- */}
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}> {/* Added gap */}
          {/* --- Added Cancel Button --- */}
          <Button variant="outlined" color="inherit" onClick={handleCancel} disabled={isSaving || isUploading} startIcon={<CancelIcon />}> Cancel </Button>
          {/* --- Modified Save Button --- */}
          <Button variant="contained" color="primary" startIcon={(isSaving || isUploading) ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            disabled={isSaving || loadingSkills || isUploading} // Disable if saving, uploading, or skills loading
            onClick={handleSaveAll}> {/* Changed onClick handler */}
            {/* Change button text based on state */}
            {isUploading ? 'Uploading...' : (isSaving ? 'Saving...' : 'Save Changes')}
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default EditProfilePage;