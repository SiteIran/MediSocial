<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rules\File; // <-- Import File rule
use Illuminate\Support\Facades\Gate;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Database\Eloquent\Builder; // <-- Import Builder
use Illuminate\Support\Facades\DB;      // <-- Import DB facade

class PostController extends Controller
{
    use AuthorizesRequests; // Use the authorization trait

    /**
     * Display a listing of posts for a specific user.
     */
    public function index(User $user, Request $request)
    {
         if (!Auth::check()) { return response()->json(['message' => 'Unauthenticated.'], 401); }
        $perPage = (int) $request->query('per_page', 10);
        try {
            // --- FIX: Start query from Post model and filter by user_id ---
            $postsQuery = Post::query() // Start with a Builder instance from the Post model
                          ->where('user_id', $user->id) // Filter posts belonging to the specific user
                          ->with('user:id,name,profile_picture_path') // Eager load author
                          ->latest(); // Order by newest
            // --- End FIX ---

            // Now $postsQuery is guaranteed to be a Builder instance
            $postsQuery = $this->addLikeDataToPosts($postsQuery); // Add like data

            $posts = $postsQuery->paginate($perPage); // Paginate

            // Convert boolean result
             $posts->getCollection()->transform(function ($post) {
                 $post->is_liked_by_current_user = (bool) $post->is_liked_by_current_user;
                 return $post;
             });

             return response()->json($posts);

        } catch (\Exception $e) {
             Log::error("Failed to fetch posts for user {$user->id}: " . $e->getMessage());
             return response()->json(['message' => 'Could not load posts.'], 500);
        }
    }


    /**
     * Store a newly created post in storage.
     */
    public function store(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        if (!$user) { return response()->json(['message' => 'Unauthenticated.'], 401); }

        $validated = $request->validate([
            'content' => 'required_without:image|nullable|string|max:5000',
            'image'   => ['required_without:content', 'nullable', File::image()->max(10 * 1024)], // Use imported File
        ]);

        $imagePath = null;
        if ($request->hasFile('image')) {
            try {
                $imagePath = $request->file('image')->store('posts', 'public');
                Log::info("Image uploaded for new post by user {$user->id}. Path: " . $imagePath);
            } catch (\Exception $e) { /* Handle upload failure */ return response()->json(['message' => 'Failed to upload image.'], 500); }
        }

        if (empty($validated['content']) && is_null($imagePath)) { return response()->json(['message' => 'Post content or image is required.'], 422); }

        try {
            $post = $user->posts()->create([
                'content' => $validated['content'] ?? '',
                'image_path' => $imagePath,
            ]);
            $post->load('user:id,name,profile_picture_path');
            Log::info("User {$user->id} created post {$post->id}" . ($imagePath ? " with image." : "."));
            // --- Add like data to the newly created post response ---
            $post = $this->addLikeDataToPosts(Post::query()->where('id', $post->id))->first();
             if ($post) { $post->is_liked_by_current_user = (bool) $post->is_liked_by_current_user; }
             // ---
            return response()->json($post, 201);
        } catch (\Exception $e) {
            Log::error("Failed to create post DB entry for user {$user->id}: " . $e->getMessage());
            if ($imagePath && Storage::disk('public')->exists($imagePath)) { Storage::disk('public')->delete($imagePath); }
            return response()->json(['message' => 'Failed to create post.'], 500);
        }
    }

    /**
     * Display the user's feed.
     */
    public function feed(Request $request)
    {
        /** @var \App\Models\User $currentUser */
        $currentUser = Auth::user();
        if (!$currentUser) { return response()->json(['message' => 'Unauthenticated.'], 401); }
        $perPage = (int) $request->query('per_page', 10);
        $followingIds = $currentUser->following()->pluck('users.id');
        $followingIds->push($currentUser->id);

        try {
            $feedQuery = Post::whereIn('user_id', $followingIds)
                            ->with('user:id,name,profile_picture_path')
                            ->latest();

            // Add like data
            $feedQuery = $this->addLikeDataToPosts($feedQuery);

            $feedPosts = $feedQuery->paginate($perPage);

            // Convert boolean result
             $feedPosts->getCollection()->transform(function ($post) {
                 $post->is_liked_by_current_user = (bool) $post->is_liked_by_current_user;
                 return $post;
             });

             return response()->json($feedPosts);
        } catch (\Exception $e) {
             Log::error("Failed to fetch feed for user {$currentUser->id}: " . $e->getMessage());
             return response()->json(['message' => 'Could not load feed.'], 500);
        }
    }

    /**
     * Update the specified post.
     */
    public function update(Request $request, Post $post)
    {
        $this->authorize('update', $post); // Use Policy

        $validated = $request->validate(['content' => 'required|string|max:5000']);

        try {
            $post->update(['content' => $validated['content']]);
            Log::info("User " . Auth::id() . " updated post {$post->id}");

            // --- Add like data to the updated post response ---
            $postQuery = Post::where('id', $post->id);
            $postQuery = $this->addLikeDataToPosts($postQuery);
            $updatedPost = $postQuery->with('user:id,name,profile_picture_path')->first();
             if ($updatedPost) { $updatedPost->is_liked_by_current_user = (bool) $updatedPost->is_liked_by_current_user; }
            // ---

            return response()->json($updatedPost ?? $post->load('user:id,name,profile_picture_path')); // Return enriched post

        } catch (\Exception $e) { /* Handle update failure */ return response()->json(['message' => 'Failed to update post.'], 500); }
    }

    /**
     * Remove the specified post.
     */
    public function destroy(Post $post)
    {
        $this->authorize('delete', $post); // Use Policy

        $imagePath = $post->image_path;
        try {
            $postId = $post->id; $userId = Auth::id();
            if ($post->delete()) {
                 if ($imagePath && Storage::disk('public')->exists($imagePath)) { Storage::disk('public')->delete($imagePath); }
                 Log::info("User {$userId} deleted post {$postId}");
                 return response()->json(null, 204); // Success, no content
            } else { /* Handle deletion failure */ return response()->json(['message' => 'Failed to delete post.'], 500); }
        } catch (\Exception $e) { /* Handle deletion exception */ return response()->json(['message' => 'Failed to delete post.'], 500); }
    }


    // --- Helper function to add like status and count ---
    // *** MOVED outside other methods, now a class method ***
    private function addLikeDataToPosts(Builder $query): Builder
    {
            // Add comment count (only top-level comments based on Post model relationship)
            $query->withCount('comments as comments_count'); // Alias to comments_count
            
        if (Auth::check()) {
            $userId = Auth::id();
            $query->withCount('likedByUsers as likes_count');
            $query->addSelect(['is_liked_by_current_user' =>
                DB::table('post_likes')
                    ->selectRaw('1')
                    ->where('user_id', $userId)
                    ->whereColumn('post_id', 'posts.id')
                    ->limit(1)
            ]);
        } else {
             $query->withCount('likedByUsers as likes_count');
             // Use selectSub to add a literal false value as a column
             $query->selectSub(DB::raw('false'), 'is_liked_by_current_user');
        }
        return $query;
    }
    // *** End Helper function ***


    // --- Optional show method ---
    /*
    public function show(Post $post) { ... }
    */

} // *** End of PostController class ***