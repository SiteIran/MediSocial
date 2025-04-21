<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth; // To get the authenticated user
use Illuminate\Validation\Rule;      // For more complex validation rules if needed
use App\Models\User;                 // Import User model for Route Model Binding
use Illuminate\Support\Facades\Log;    // For logging errors
use Illuminate\Support\Facades\Storage; // <-- Import Storage facade
use Illuminate\Validation\Rules\File; // <-- Import File validation rule (Laravel 9+)

// Optional: Import an API Resource if you implement it later
// use App\Http\Resources\UserProfileResource;

class UserProfileController extends Controller
{
    /**
     * Display the authenticated user's own profile information.
     * Includes counts for followers and following, and loaded skills.
     * Called by GET /user route.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function show(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        if (!$user) {
            // This should ideally not be reachable due to auth:sanctum middleware
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // Eager load necessary relationships and counts
        try {
            $user->loadMissing('skills') // Load skills relationship if not already loaded
                 ->loadCount(['followers', 'following']); // Add 'followers_count' and 'following_count'
        } catch (\Exception $e) {
            Log::error('Failed to load relationships/counts for user ' . $user->id . ': ' . $e->getMessage());
            // Return user data without counts/skills if loading failed, or return an error
            return response()->json(['message' => 'Could not load full profile data.'], 500);
        }


        // The user object now has 'skills', 'followers_count', and 'following_count' properties
        return response()->json($user);

        // If using API Resources:
        // return new UserProfileResource($user);
    }

    /**
     * Display the public profile information for a given user.
     * Includes counts, skills, and whether the current user follows them.
     * Called by GET /users/{user} route.
     *
     * @param  \App\Models\User  $user The user whose profile is being viewed (resolved by RMB)
     * @return \Illuminate\Http\JsonResponse
     */
    public function getPublicProfile(User $user)
    {
        /** @var \App\Models\User $currentUser */
        $currentUser = Auth::user(); // Get the currently authenticated user

        if (!$currentUser) {
             return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // Prevent users from viewing their own profile via this public route
        // Redirect them to their standard /user or /profile view in frontend
        if ($currentUser->id === $user->id) {
             // It's better to handle redirection logic in the frontend based on user ID comparison.
             // Sending a specific status or message could also work.
             // For API consistency, let's return the profile, but frontend should redirect.
             Log::info("User {$currentUser->id} attempted to view own profile via public route /users/{$user->id}.");
             // return response()->json(['message' => 'Use /user endpoint for your own profile.'], 400);
        }


        try {
            // Load necessary public info: skills, counts
            $user->loadMissing('skills')
                 ->loadCount(['followers', 'following']);

            // Check if the current authenticated user is following this profile user
            $isFollowed = $currentUser->following()->where('users.id', $user->id)->exists();

            // Add the follow status to the user object before returning
            // Note: This adds the property directly to the model instance for this request only.
            // Using API Resources is cleaner for adding computed/conditional properties.
            $user->is_followed_by_current_user = $isFollowed;

        } catch (\Exception $e) {
             Log::error("Failed to load data for public profile {$user->id}: " . $e->getMessage());
             return response()->json(['message' => 'Could not load profile data.'], 500);
        }


        // Return the user object with added properties.
        // Consider using API Resources here to control exposed fields.
        return response()->json($user);

        // If using API Resources:
        // return new UserProfileResource($user); // The resource would handle adding 'is_followed_by_current_user'
    }


    /**
     * Update the authenticated user's basic profile information (name, bio, etc.).
     * Called by PUT /user route.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function updateProfile(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        if (!$user) { return response()->json(['message' => 'Unauthenticated.'], 401); }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'bio' => 'nullable|string|max:1000',
            // Add validation for other profile fields here (e.g., location)
        ]);

        try {
             $user->update($validated);
             Log::info("User {$user->id} updated profile info.");
        } catch (\Exception $e) {
             Log::error('Profile update failed for user ' . $user->id . ': ' . $e->getMessage());
             return response()->json(['message' => 'Profile update failed. Please try again.'], 500);
        }

        // Return the updated user object, ensuring counts and skills are loaded
        // Use loadMissing to avoid redundant loading if already loaded
        return response()->json(
            $user->loadMissing('skills')->loadCount(['followers', 'following'])
        );

        // If using API Resources:
        // return new UserProfileResource($user->loadMissing('skills')->loadCount(['followers', 'following']));
    }

    /**
     * Update the authenticated user's associated skills.
     * Called by PUT /user/skills route.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function updateSkills(Request $request)
    {
         /** @var \App\Models\User $user */
        $user = Auth::user();
        if (!$user) { return response()->json(['message' => 'Unauthenticated.'], 401); }

        $validated = $request->validate([
            // Expect 'skill_ids' key, must be an array (can be empty)
            'skill_ids' => 'present|array',
            // Validate each item in the array: must be an integer and exist in 'skills' table
            'skill_ids.*' => 'sometimes|integer|exists:skills,id'
        ]);

        try {
            // sync() efficiently updates the pivot table (skill_user)
            $user->skills()->sync($validated['skill_ids']);
            Log::info("User {$user->id} updated skills.");
        } catch (\Exception $e) {
             Log::error('Skill update failed for user ' . $user->id . ': ' . $e->getMessage());
             return response()->json(['message' => 'Skill update failed. Please try again.'], 500);
        }

        // Return the updated user object with skills loaded and counts
        // Use load() for skills here to ensure the *latest* set is returned after sync
        return response()->json(
            $user->load('skills')->loadCount(['followers', 'following'])
        );

         // If using API Resources:
        // return new UserProfileResource($user->load('skills')->loadCount(['followers', 'following']));
    }



    /**
     * Update the authenticated user's profile picture (avatar).
     * Stores the new avatar and deletes the old one.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function updateAvatar(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        if (!$user) { return response()->json(['message' => 'Unauthenticated.'], 401); }

        // --- Validate the uploaded file ---
        $request->validate([
            'avatar' => [
                'required',
                File::image() // Must be an image
                    ->max(5 * 1024), // Max 5MB
            ],
        ]);

        // --- Store the new avatar ---
        if ($request->hasFile('avatar')) {
            try {
                $file = $request->file('avatar');
                // Generate a unique name based on user ID and timestamp or use hashName()
                // Store in 'public/avatars' directory (storage/app/public/avatars)
                $path = $file->store('avatars', 'public'); // Returns 'avatars/filename.ext'

                // --- Delete the old avatar (if exists) ---
                if ($user->profile_picture_path && Storage::disk('public')->exists($user->profile_picture_path)) {
                     Log::info("Deleting old avatar for user {$user->id}: " . $user->profile_picture_path);
                     Storage::disk('public')->delete($user->profile_picture_path);
                }

                // --- Update the user record ---
                $user->profile_picture_path = $path;
                $user->save();

                Log::info("User {$user->id} updated avatar. New path: " . $path);

                // Return the updated user data (or just the path/success message)
                // Ensure counts and skills are loaded for consistency if returning full user
                return response()->json($user->loadMissing('skills')->loadCount(['followers', 'following']));

            } catch (\Exception $e) {
                Log::error("Avatar upload failed for user {$user->id}: " . $e->getMessage());
                return response()->json(['message' => 'Failed to upload avatar. Please try again.'], 500);
            }
        }

        // Should not happen if validation passes, but return error just in case
        return response()->json(['message' => 'Avatar file not found in request.'], 400);
    }

}