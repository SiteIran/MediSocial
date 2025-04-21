// src/components/UserList.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Divider,
  Button,                     // Button for follow/unfollow actions
  ListItemSecondaryAction,    // To position the button on the right
  CircularProgress,           // Loading spinner for button
  Typography,                 // For displaying text like skills or empty message
  Box                         // General layout component
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';       // Follow icon
import PersonRemoveIcon from '@mui/icons-material/PersonRemove'; // Unfollow icon
import { useAuth } from '../context/AuthContext';              // To get current user info

/**
 * Defines the structure of a user object expected by this list component.
 * Includes basic info and the follow status relative to the current user.
 */
export interface UserListItem {
  id: number;
  name: string | null;
  profile_picture_path?: string | null;
  skills?: { id: number; name: string }[];
  is_followed_by_current_user?: boolean; // Indicates if the logged-in user follows this list item user
}

/**
 * Defines the props accepted by the UserList component.
 */
interface UserListProps {
  users: UserListItem[];                         // Array of user objects to display
  loadingUserId?: number | null;                 // ID of the user whose follow button is currently processing
  onFollowToggle: (userId: number, isCurrentlyFollowing: boolean) => void; // Callback function when a follow/unfollow button is clicked
}


// --- Base URL for Storage (Keep as provided) ---
const APP_URL = import.meta.env.VITE_APP_URL || 'http://localhost:8000';
const STORAGE_URL = `${APP_URL}/storage`;
// ---

/**
 * A reusable component to display a list of users with follow/unfollow buttons
 * and makes the list item clickable to navigate to the user's profile.
 */
const UserList: React.FC<UserListProps> = ({ users, loadingUserId, onFollowToggle }) => {
  const navigate = useNavigate(); // Hook for programmatic navigation
  const { user: currentUser } = useAuth(); // Get the currently logged-in user's data

  // Display a message if the provided user list is empty
  if (users.length === 0) {
    return <Typography sx={{ textAlign: 'center', color: 'text.secondary', mt: 3 }}>No users to display.</Typography>;
  }

  // Render the list using MUI List and ListItem components
  return (
    <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
      {users.map((user, index) => {
        // Determine the follow status for the displayed user based on the prop
        const isFollowing = !!user.is_followed_by_current_user;
        // Check if the follow/unfollow action for *this specific user* is in progress
        const isButtonLoading = loadingUserId === user.id;
        // Check if the user being displayed is the same as the logged-in user
        const isCurrentUser = currentUser?.id === user.id;

        // --- Define navigation handler for this specific user ---
        const handleNavigateToProfile = () => {
             // Navigate to own profile page if clicking self, otherwise to public user page
             if (isCurrentUser) {
                 navigate('/profile');
             } else {
                navigate(`/users/${user.id}`);
             }
        };

        return (
          // Use React.Fragment to group the ListItem and Divider
          <React.Fragment key={user.id}>
            <ListItem
              alignItems="flex-start"
              // --- Secondary Action: Follow/Unfollow Button ---
              secondaryAction={
                // Only render the button if it's NOT the current user
                !isCurrentUser ? (
                  <Button
                    size="small"
                    variant={isFollowing ? "outlined" : "contained"}
                    color={isFollowing ? "secondary" : "primary"}
                    // --- Button onClick calls onFollowToggle ---
                    onClick={(e) => {
                        e.stopPropagation(); // VERY IMPORTANT: Prevent ListItem's onClick from firing
                        onFollowToggle(user.id, isFollowing); // Call the passed-in handler
                    }}
                    // --------------------------------------------
                    disabled={isButtonLoading}
                    startIcon={isButtonLoading
                        ? <CircularProgress size={16} color="inherit" />
                        : (isFollowing ? <PersonRemoveIcon fontSize="small"/> : <PersonAddIcon fontSize="small"/>)
                    }
                    sx={{ width: '100px', minWidth: '100px' }} // Fixed width
                  >
                    {isButtonLoading ? '' : (isFollowing ? 'Unfollow' : 'Follow')}
                  </Button>
                ) : null // No button for the current user
              }
              // Add padding to the right only if the button exists
              sx={{ pr: !isCurrentUser ? '120px' : undefined }}
              // --- ListItem onClick handles navigation ---
              button // Make the entire item look clickable
              onClick={handleNavigateToProfile} // Navigate when the item (but not the button) is clicked
              // -----------------------------------------
            >
              {/* --- User Avatar (also navigates on click) --- */}
              <ListItemAvatar sx={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); handleNavigateToProfile(); }}>
                  <Avatar
                  alt={user.name || 'User'}
                  // Check if path exists before creating URL
                  src={user?.profile_picture_path ? `${STORAGE_URL}/${user.profile_picture_path}` : undefined}
                  // Example resulting URL: http://localhost:8000/storage/avatars/randomname.jpg
                  />
              </ListItemAvatar>
              {/* --- User Name and Skills (also navigates on click) --- */}
              <ListItemText
                primary={user.name || `User ID: ${user.id}`}
                secondary={
                    user.skills && user.skills.length > 0 ? (
                        <Typography sx={{ display: 'block' }} component="span" variant="body2" color="text.primary">
                            Skills: {user.skills.slice(0, 3).map(s => s.name).join(', ')}{user.skills.length > 3 ? '...' : ''}
                        </Typography>
                    ) : null
                }
                // Make text area clickable for navigation as well
                onClick={(e) => { e.stopPropagation(); handleNavigateToProfile(); }}
                sx={{ cursor: 'pointer' }}
              />
            </ListItem>
            {/* Divider between items */}
            {index < users.length - 1 && <Divider variant="inset" component="li" />}
          </React.Fragment>
        );
      })}
    </List>
  );
};

export default UserList;