<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Comment;
use App\Models\Post;
use App\Models\User; // Import User model
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Validation\Rule; // <-- *** ADD THIS LINE TO IMPORT Rule ***

class CommentController extends Controller
{
     use AuthorizesRequests;

    /**
     * Display a paginated listing of the comments for a specific post.
     */
    public function index(Post $post, Request $request)
    {
        if (!Auth::check()) { return response()->json(['message' => 'Unauthenticated.'], 401); }

        $perPage = (int) $request->query('per_page', 10);

        try {
            // Start query from Comment model
            $commentsQuery = Comment::query()
                         ->where('post_id', $post->id)
                         ->whereNull('parent_id') // Only top-level comments
                         ->with('user:id,name,profile_picture_path') // Eager load author
                         ->withCount('replies') // Add replies count
                         ->latest(); // Order newest first

            // Add like data using the helper method
            $commentsQuery = $this->addLikeDataToComments($commentsQuery);

            $comments = $commentsQuery->paginate($perPage);

            // Convert subquery result to boolean
             $comments->getCollection()->transform(function ($comment) {
                 $comment->is_liked_by_current_user = (bool) $comment->is_liked_by_current_user;
                 return $comment;
             });

            return response()->json($comments);

        } catch (\Exception $e) {
            Log::error("Failed to fetch comments for post {$post->id}: " . $e->getMessage());
            return response()->json(['message' => 'Could not load comments.'], 500);
        }
    }

    /**
     * Store a newly created comment in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\Post  $post
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request, Post $post)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        if (!$user) { return response()->json(['message' => 'Unauthenticated.'], 401); }

        $validated = $request->validate([
            'body' => 'required|string|max:2000',
            'parent_id' => ['nullable', 'integer', Rule::exists('comments', 'id')->where(fn ($q) => $q->where('post_id', $post->id))]
        ]);

        try {
            // Create the comment
            $comment = $post->comments()->create([
                'user_id' => $user->id,
                'body' => $validated['body'],
                'parent_id' => $validated['parent_id'] ?? null,
            ]);

            // --- FIX: Fetch the newly created comment AGAIN with ALL necessary data ---
            // Create a new query for the created comment ID
            $newCommentQuery = Comment::where('id', $comment->id)
                                ->with('user:id,name,profile_picture_path') // Eager load the author
                                ->withCount('replies'); // Get replies count

            // Use the helper to add like data to this specific query
            $newCommentQuery = $this->addLikeDataToComments($newCommentQuery);

            // Execute the query to get the fully enriched comment object
            $enrichedComment = $newCommentQuery->first();

            if (!$enrichedComment) {
                 // This should ideally not happen if creation was successful
                 Log::error("Could not retrieve newly created comment {$comment->id} with all data.");
                 // Fallback: return the basic comment object, user might be missing in UI temporarily
                 $comment->load('user:id,name,profile_picture_path'); // Try loading user on the original object
                 return response()->json($comment, 201);
            }

             // Ensure the boolean value is set correctly after fetching
            $enrichedComment->is_liked_by_current_user = (bool) $enrichedComment->is_liked_by_current_user;
            // --- End FIX ---


            Log::info("User {$user->id} added comment {$enrichedComment->id} to post {$post->id}");
            // TODO: Notify post owner later

            // Return the fully loaded and enriched comment
            return response()->json($enrichedComment, 201);

        } catch (\Exception $e) {
            Log::error("Failed to store comment for user {$user->id} on post {$post->id}: " . $e->getMessage(), ['exception' => $e]);
            return response()->json(['message' => 'Failed to post comment.'], 500);
        }
    }

     /**
      * Display a paginated listing of replies for a specific comment.
      */
      public function getReplies(Comment $comment, Request $request) {
        if (!Auth::check()) { return response()->json(['message' => 'Unauthenticated.'], 401); }
        $perPage = (int) $request->query('per_page', 5);

        try {
            // --- FIX: Start query from Comment model for replies ---
            $repliesQuery = Comment::query() // Start with a Builder instance
                                  ->where('parent_id', $comment->id) // Filter replies belonging to the parent comment
                                  ->with('user:id,name,profile_picture_path') // Eager load author
                                  ->oldest(); // Order replies by oldest first
            // --- End FIX ---

            // Now $repliesQuery is a Builder, safe to pass to the helper
            $repliesQuery = $this->addLikeDataToComments($repliesQuery); // Add like data

            $replies = $repliesQuery->paginate($perPage); // Paginate

            // Convert boolean result for replies
             $replies->getCollection()->transform(function ($reply) {
                 $reply->is_liked_by_current_user = (bool) $reply->is_liked_by_current_user;
                 return $reply;
             });

            return response()->json($replies);

        } catch (\Exception $e) {
            Log::error("Failed to fetch replies for comment {$comment->id}: " . $e->getMessage());
            return response()->json(['message' => 'Could not load replies.'], 500);
         }
    }


    /**
     * Helper function to add like count and status to a comment query.
     */
    private function addLikeDataToComments(Builder $query): Builder
    {
        if (Auth::check()) {
            $userId = Auth::id();
            // Ensure the correct relationship name 'likedByUsers' is used
            $query->withCount('likedByUsers as likes_count');
            $query->addSelect(['is_liked_by_current_user' =>
                DB::table('comment_likes') // Check the correct table name
                    ->selectRaw('1')
                    ->where('user_id', $userId)
                    ->whereColumn('comment_id', 'comments.id') // Ensure correct column names
                    ->limit(1)
            ]);
        } else {
             $query->withCount('likedByUsers as likes_count');
             $query->selectSub(DB::raw('false'), 'is_liked_by_current_user');
        }
        return $query;
    }

    // Optional: Implement destroy, update, show methods later with policies

} // End of CommentController class