<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\Post; // Import Post model for Route Model Binding
use App\Models\User; // To specify User type hint
use Illuminate\Support\Facades\Log;
use Illuminate\Database\QueryException;
use App\Models\Comment; // Import Comment model

class LikeController extends Controller
{
    /**
     * Like a specific post.
     *
     * @param  \App\Models\Post  $post
     * @return \Illuminate\Http\JsonResponse
     */
    public function like(Post $post)
    {
        /** @var User $user */
        $user = Auth::user();
        if (!$user) { return response()->json(['message' => 'Unauthenticated.'], 401); }

        try {
            // syncWithoutDetaching attempts to attach the ID if it doesn't exist.
            // It returns an array like ['attached' => [1], 'detached' => [], 'updated' => []]
            $result = $user->likedPosts()->syncWithoutDetaching([$post->id]);

            $wasAttached = !empty($result['attached']);
            if ($wasAttached) {
                 Log::info("User {$user->id} liked post {$post->id}");
                 // TODO: Implement notification for the post author later
            } else {
                 Log::info("User {$user->id} attempted to like post {$post->id} which was already liked.");
            }

            // Always get the updated like count
            $likeCount = $post->likedByUsers()->count();

            // Return success with the new like count and status
            return response()->json([
                'message' => 'Post liked successfully.',
                'likes_count' => $likeCount,
                'is_liked_by_current_user' => true // User now definitely likes it
                ], 200);

        } catch (QueryException $e) {
            // Handle potential unique constraint violation if sync didn't prevent it fully
             Log::error("Database error during like: User {$user->id} -> Post {$post->id}. Error: " . $e->getMessage());
             // Check if already following just in case (though sync should handle)
             if ($user->likedPosts()->where('post_id', $post->id)->exists()) {
                  $likeCount = $post->likedByUsers()->count(); // Get current count
                  return response()->json([
                      'message' => 'Already liked this post.',
                      'likes_count' => $likeCount,
                      'is_liked_by_current_user' => true
                      ], 409); // Conflict
             }
             return response()->json(['message' => 'Could not like post due to a database issue.'], 500);
        } catch (\Exception $e) {
             Log::error("Generic like error: User {$user->id} -> Post {$post->id}. Error: " . $e->getMessage());
             return response()->json(['message' => 'An unexpected error occurred.'], 500);
        }
    }

    /**
     * Unlike a specific post.
     *
     * @param  \App\Models\Post  $post
     * @return \Illuminate\Http\JsonResponse
     */
    public function unlike(Post $post)
    {
        /** @var User $user */
       $user = Auth::user();
       if (!$user) { return response()->json(['message' => 'Unauthenticated.'], 401); }

        try {
            // detach removes the record from the pivot table. Returns number of detached records.
            $detachedCount = $user->likedPosts()->detach($post->id);

            if ($detachedCount > 0) {
                 Log::info("User {$user->id} unliked post {$post->id}");
            } else {
                 Log::warning("User {$user->id} attempted to unlike post {$post->id}, but was not liking it.");
                 // You might return a 404 or just indicate success with the current state
            }

            // Get the updated like count
            $likeCount = $post->likedByUsers()->count();

            // Return success with the new like count and status
            return response()->json([
                'message' => 'Post unliked successfully.',
                'likes_count' => $likeCount,
                'is_liked_by_current_user' => false // User now definitely does not like it
                ], 200);
            // Or simply return 204 No Content if the client handles UI updates optimistically
            // return response()->json(null, 204);

        } catch (\Exception $e) {
             Log::error("Unlike action failed: User {$user->id} -> Post {$post->id}. Error: " . $e->getMessage());
             return response()->json(['message' => 'Could not unlike post at this time.'], 500);
        }
    }

    public function likeComment(Comment $comment) {
        /** @var User $user */
        $user = Auth::user();
        if (!$user) { /*...*/ }
        try {
            $result = $user->likedComments()->syncWithoutDetaching([$comment->id]);
            $likeCount = $comment->likedByUsers()->count();
            return response()->json(['message' => 'Comment liked', 'likes_count' => $likeCount, 'is_liked_by_current_user' => true], 200);
        } catch (\Exception $e) { /* Error handling, maybe return 409 if already liked */ }
    }
    
    public function unlikeComment(Comment $comment) {
        /** @var User $user */
        $user = Auth::user();
         if (!$user) { /*...*/ }
        try {
            $user->likedComments()->detach($comment->id);
            $likeCount = $comment->likedByUsers()->count();
             return response()->json(['message' => 'Comment unliked', 'likes_count' => $likeCount, 'is_liked_by_current_user' => false], 200);
        } catch (\Exception $e) { /* Error handling */ }
    }

}