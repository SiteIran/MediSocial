// src/types/index.ts or relevant file
import { UserListItem } from '../components/UserList'; // Import if using nested user type

export interface PostAuthor { // Simplified author info for the post card
    id: number;
    name: string | null;
    profile_picture_path?: string | null;
}

export interface Post {
    id: number;
    user_id: number;
    content: string;
    image_path?: string | null; // For later image implementation
    created_at: string; // ISO date string
    updated_at: string; // ISO date string
    user: PostAuthor; // Nested author information
    // --- Add Like Info ---
    likes_count?: number; // Renamed from liked_by_users_count for simplicity
    is_liked_by_current_user?: boolean;
    // -------------------
    comments_count?: number; // <-- Add comment count
}

// Paginated response for posts
export interface PaginatedPostsResponse {
    data: Post[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    next_page_url: string | null;
    // ... other pagination fields
}

export interface ApiErrorResponse {
    message: string;
    errors?: Record<string, string[]>; // For validation errors
}

// Add Comment Type
export interface Comment {
    id: number;
    user_id: number;
    post_id: number;
    parent_id?: number | null;
    body: string;
    created_at: string;
    updated_at: string;
    user: PostAuthor; // Re-use PostAuthor for comment author info
    // replies_count?: number; // Add later if needed
    // likes_count?: number; // Add later if needed
    // is_liked_by_current_user?: boolean; // Add later if needed
}

// Paginated response for comments
export interface PaginatedCommentsResponse {
    data: Comment[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    next_page_url: string | null;
    // ... other fields
}
