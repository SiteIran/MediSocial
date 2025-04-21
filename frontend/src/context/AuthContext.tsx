// src/context/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import apiClient from '../api/axiosConfig';
import axios from 'axios'; // Needed for isAxiosError check

// --- User Interface (Keep as before) ---
interface User {
  id: number;
  name: string | null;
  phone_number: string;
  profile_picture_path?: string | null;
  bio?: string | null;
  skills?: { id: number; name: string }[];
  followers_count?: number;
  following_count?: number;
}

// --- Auth Context Type ---
interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean; // Initial auth check loading
  login: (token: string, userData: User) => Promise<void>; // Made login async
  logout: () => void;
  setUser: React.Dispatch<React.SetStateAction<User | null>>; // Allow updating user profile info

  // --- Follow State and Actions ---
  followingIds: Set<number>; // Set of user IDs the current user is following
  isFollowingLoading: boolean; // Loading state for fetching initial following IDs
  followUser: (userId: number) => Promise<boolean>; // Function to follow a user, returns success status
  unfollowUser: (userId: number) => Promise<boolean>; // Function to unfollow a user, returns success status
  // ------------------------------
}

// --- Create Context ---
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Auth Provider Props ---
interface AuthProviderProps {
  children: ReactNode;
}

// --- Auth Provider Component ---
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('authToken'));
  const [isLoading, setIsLoading] = useState(true); // Initial auth loading

  // --- Follow State ---
  const [followingIds, setFollowingIds] = useState<Set<number>>(new Set());
  const [isFollowingLoading, setIsFollowingLoading] = useState(false);
  // --------------------

  // --- Fetch Following IDs Function ---
  const fetchFollowingIds = useCallback(async () => {
      // Only fetch if authenticated (check token directly from state or localStorage)
      if (!localStorage.getItem('authToken')) {
            console.log("fetchFollowingIds: No auth token, skipping fetch.");
            setFollowingIds(new Set()); // Ensure it's cleared
            return;
      };

      setIsFollowingLoading(true);
      console.log("Fetching following IDs...");
      try {
          // Ensure Authorization header is set if using apiClient directly after mount
          const currentToken = localStorage.getItem('authToken');
          if (currentToken && !apiClient.defaults.headers.common['Authorization']) {
               apiClient.defaults.headers.common['Authorization'] = `Bearer ${currentToken}`;
          }

          const response = await apiClient.get<number[]>('/user/following-ids'); // Expecting an array of IDs
          setFollowingIds(new Set(response.data));
          console.log("Following IDs fetched:", new Set(response.data));
      } catch (error) {
          console.error("Failed to fetch following IDs:", error);
          setFollowingIds(new Set()); // Clear on error
      } finally {
          setIsFollowingLoading(false);
      }
  }, []); // useCallback with empty dependency array

  // --- Initial Auth Check Effect ---
  // --- Initial Auth Check Effect ---
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      const storedToken = localStorage.getItem('authToken');
      let isAuthenticatedNow = false;
      let currentUser: User | null = null; // Variable to hold fetched user

      if (storedToken) {
        setToken(storedToken);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;

        try {
          // --- ALWAYS Fetch user data if token exists ---
          console.log("Auth Check: Fetching user data from API...");
          const response = await apiClient.get<User>('/user'); // Fetch from /user which includes counts
          currentUser = response.data;
          setUser(currentUser);
          // --- Store the FRESH data in localStorage ---
          localStorage.setItem('authUser', JSON.stringify(currentUser));
          isAuthenticatedNow = true;
          console.log("Auth Check: User data fetched and stored:", currentUser);
          // --- End Fetch and Store ---

        } catch (error: any) {
          // Handle errors (e.g., invalid token)
          console.error("Auth Check: Failed to fetch user data (token might be invalid):", error);
          localStorage.removeItem('authToken');
          localStorage.removeItem('authUser'); // Clear potentially outdated user data
          setToken(null);
          setUser(null);
          delete apiClient.defaults.headers.common['Authorization'];
          isAuthenticatedNow = false;
        }

        // Fetch following IDs only if authentication was successful
        if (isAuthenticatedNow) {
            await fetchFollowingIds();
        } else {
            setFollowingIds(new Set()); // Clear following IDs if auth failed
        }

      } else {
          // No token found
          console.log("Auth Check: No token found.");
          setUser(null); // Ensure user is null if no token
          setFollowingIds(new Set());
      }
      setIsLoading(false);
    };

    checkAuth();
  // Only depend on fetchFollowingIds (which is stable)
  // Running only once on mount effectively
  }, [fetchFollowingIds]);

  // --- Login Function ---
  const login = useCallback(async (newToken: string, userData: User) => {
    // The userData from login response SHOULD include counts now
    console.log("Login Function: User data received:", userData);
    localStorage.setItem('authToken', newToken);
    // --- Store the complete user data from login response ---
    localStorage.setItem('authUser', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    // Fetch following IDs after login
    await fetchFollowingIds();
  }, [fetchFollowingIds]);

  // --- Logout Function (Keep as is) ---
  const logout = useCallback(() => {
    // 1. Remove items from browser's localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    // 2. Reset React state variables
    setToken(null);
    setUser(null);
    setFollowingIds(new Set()); // Clear following IDs
    // 3. Remove default Authorization header from future Axios requests
    delete apiClient.defaults.headers.common['Authorization'];
    console.log("User logged out.");
    // 4. Navigation happens automatically via ProtectedRoute because isAuthenticated becomes false
  }, []);

  // --- setUser function (comes from useState, keep as is) ---

  // --- followUser / unfollowUser (Update user count manually as before) ---
   const followUser = useCallback(async (userId: number): Promise<boolean> => {
       // ... (API call) ...
       try {
           await apiClient.post(`/users/${userId}/follow`);
           setFollowingIds(prev => new Set(prev).add(userId));
           setUser(prevUser => prevUser ? { ...prevUser, following_count: (prevUser.following_count ?? 0) + 1 } : null);
           return true;
       } catch (error: any) { /* ... error handling ... */ return false; }
   }, []);

   const unfollowUser = useCallback(async (userId: number): Promise<boolean> => {
        const wasFollowing = followingIds.has(userId);
        try {
            await apiClient.delete(`/users/${userId}/follow`);
            setFollowingIds(prev => { const newSet = new Set(prev); newSet.delete(userId); return newSet; });
            if (wasFollowing) {
                setUser(prevUser => prevUser ? { ...prevUser, following_count: Math.max(0, (prevUser.following_count ?? 0) - 1) } : null);
            }
            return true;
          } catch (error: any) {
            console.error(`Failed to unfollow user ${userId}:`, error);
            if (isAxiosError(error) && error.response?.status === 404) {
                 console.warn(`Attempted to unfollow user ${userId}, but was not following.`);
                 // Ensure state is correct (remove ID)
                 setFollowingIds(prev => { const newSet = new Set(prev); newSet.delete(userId); return newSet; });
                  // Don't decrement count if wasn't following
                 return true;
            }
            return false;
        }
      
      }, [followingIds]); // Need followingIds dependency here
  // --- Calculate isAuthenticated ---
  // User is authenticated if token exists and user data is loaded (not null)
  const isAuthenticated = !!token && !!user;

  // --- Provide Context Value ---
  const contextValue: AuthContextType = {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    logout,
    setUser,
    followingIds,
    isFollowingLoading,
    followUser,
    unfollowUser,
  };

  // Render children only when not in initial loading state
  // or provide a loading indicator
  return (
    <AuthContext.Provider value={contextValue}>
       {/* You might want a more sophisticated loading screen */}
      {!isLoading ? children : <div>Loading App...</div>}
    </AuthContext.Provider>
  );
};

// --- Custom Hook (Keep as before) ---
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// --- Axios Error Type Guard (ensure it's available) ---
function isAxiosError(error: any): error is import('axios').AxiosError {
    return error.isAxiosError === true;
}