<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\OtpAuthController;
use App\Http\Controllers\Api\SkillController;        // <--- Import SkillController
use App\Http\Controllers\Api\UserProfileController; // <--- Import UserProfileController
use App\Http\Controllers\Api\SearchController; // Assuming we create this controller
use App\Http\Controllers\Api\FollowController; // Assuming we create this controller
use App\Http\Controllers\Api\PostController; // Import PostController
use App\Http\Controllers\Api\LikeController; // Import LikeController
use App\Http\Controllers\Api\CommentController; // Import

// Public routes
Route::post('/auth/otp/request', [OtpAuthController::class, 'requestOtp']);
Route::post('/auth/otp/login', [OtpAuthController::class, 'loginWithOtp']);

// Public route to get all available skills (optional: move inside auth if needed)
Route::get('/skills', [SkillController::class, 'index']); // <--- Add route for skills

// Protected routes (require authentication via Sanctum)
Route::middleware('auth:sanctum')->group(function () {
    // Get authenticated user's info
    // Replace the closure with a controller action
    // Route::get('/user', function (Request $request) {
    //     return $request->user()->loadMissing('skills');
    // });
    Route::get('/user', [UserProfileController::class, 'show']); // <--- Change to this

    // Update authenticated user's basic profile info
    Route::put('/user', [UserProfileController::class, 'updateProfile']); // <--- Add route for profile update

    // Update authenticated user's skills
    Route::put('/user/skills', [UserProfileController::class, 'updateSkills']); // <--- Add route for skills update

    Route::get('/search/users', [SearchController::class, 'searchUsers']);
    // TODO: Add other protected routes here (follow/unfollow, search users, etc.)


    // Route to follow a user
    Route::post('/users/{user}/follow', [FollowController::class, 'follow']);

    // Route to unfollow a user
    Route::delete('/users/{user}/follow', [FollowController::class, 'unfollow']);

    // Optional: Route to get user's followers/following (implement later if needed)
    // Route::get('/users/{user}/followers', [FollowController::class, 'followers']);
    // Route::get('/users/{user}/following', [FollowController::class, 'following']);

    // Get IDs of users the current user is following
    Route::get('/user/following-ids', [FollowController::class, 'getFollowingIds']); // Add to FollowController

    Route::get('/user/followers', [FollowController::class, 'getFollowers']); // Add to FollowController

    Route::get('/user/following', [FollowController::class, 'getFollowing']); // Add to FollowController

    // Get public profile info for a specific user by ID
    Route::get('/users/{user}', [UserProfileController::class, 'getPublicProfile'])
    ->where('user', '[0-9]+'); // Ensure {user} is numeric ID
    // Alternatively, if using usernames:
    // Route::get('/users/{username}', [UserProfileController::class, 'getPublicProfileByUsername']);
    
    // Route to upload/update user avatar
    Route::post('/user/avatar', [UserProfileController::class, 'updateAvatar']);


    // --- Post Routes ---
    Route::post('/posts', [PostController::class, 'store']);         // Create
    Route::get('/feed', [PostController::class, 'feed']);           // Get feed for current user
    Route::get('/users/{user}/posts', [PostController::class, 'index']); // Get posts for a specific user
    // Route::get('/posts/{post}', [PostController::class, 'show']);     // Get single post (optional)
    Route::put('/posts/{post}', [PostController::class, 'update']);    // Update a post
    Route::delete('/posts/{post}', [PostController::class, 'destroy']); // Delete a post
    // --- End Post Routes ---

    // --- Like Routes ---
    Route::post('/posts/{post}/like', [LikeController::class, 'like'])->where('post', '[0-9]+');
    Route::delete('/posts/{post}/like', [LikeController::class, 'unlike'])->where('post', '[0-9]+');
    // --- End Like Routes ---

    // --- Comment Routes ---
    // Get comments for a specific post (paginated)
    Route::get('/posts/{post}/comments', [CommentController::class, 'index'])->where('post', '[0-9]+');
    // Store a new comment for a specific post
    Route::post('/posts/{post}/comments', [CommentController::class, 'store'])->where('post', '[0-9]+');
    // Optional: Delete a comment (requires policy)
    // Route::delete('/comments/{comment}', [CommentController::class, 'destroy'])->where('comment', '[0-9]+');
    // Optional: Update a comment (requires policy)
    // Route::put('/comments/{comment}', [CommentController::class, 'update'])->where('comment', '[0-9]+');
    // --- End Comment Routes ---

    Route::post('/comments/{comment}/like', [LikeController::class, 'likeComment'])->where('comment', '[0-9]+');
    Route::delete('/comments/{comment}/like', [LikeController::class, 'unlikeComment'])->where('comment', '[0-9]+');
    Route::get('/comments/{comment}/replies', [CommentController::class, 'getReplies'])->where('comment', '[0-9]+');

});