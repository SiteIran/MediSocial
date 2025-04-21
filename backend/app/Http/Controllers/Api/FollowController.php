<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User; // Import User model for Route Model Binding
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Database\Eloquent\Builder; // <-- Import Builder
use Illuminate\Support\Facades\DB;      // <-- Import DB facade

class FollowController extends Controller
{
    /**
     * Allow the authenticated user to follow another user.
     *
     * @param  \App\Models\User  $user The user to follow (resolved by Route Model Binding)
     * @return \Illuminate\Http\JsonResponse
     */
    public function follow(User $user)
    {
        /** @var \App\Models\User $currentUser */
        $currentUser = Auth::user();

        // Prevent users from following themselves
        if ($currentUser->id === $user->id) {
            return response()->json(['message' => 'You cannot follow yourself.'], 422); // Unprocessable Entity
        }

        // Use attach() to add the relationship in the pivot table (follows).
        // attach() accepts an ID or array of IDs.
        // It automatically avoids creating duplicate entries if the relationship already exists.
        try {
            // The 'following' relationship is defined in the User model
            $currentUser->following()->attach($user->id);
             Log::info("User {$currentUser->id} followed User {$user->id}");
        } catch (\Illuminate\Database\QueryException $e) {
            // Handle potential unique constraint violation if attach didn't prevent it
            // or other DB errors
             Log::error("Follow action failed: User {$currentUser->id} -> User {$user->id}. Error: " . $e->getMessage());
             // Check if already following (though attach should handle this)
             if ($currentUser->following()->where('users.id', $user->id)->exists()) {
                  return response()->json(['message' => 'Already following this user.'], 409); // Conflict
             }
             return response()->json(['message' => 'Could not follow user at this time.'], 500);
        } catch (\Exception $e) {
             Log::error("Generic follow error: User {$currentUser->id} -> User {$user->id}. Error: " . $e->getMessage());
             return response()->json(['message' => 'An unexpected error occurred.'], 500);
        }


        // Return success response
        // Optionally return the updated follow status or counts
        return response()->json(['message' => "You are now following {$user->name}."], 200);
    }

    /**
     * Allow the authenticated user to unfollow another user.
     *
     * @param  \App\Models\User  $user The user to unfollow (resolved by Route Model Binding)
     * @return \Illuminate\Http\JsonResponse
     */
    public function unfollow(User $user)
    {
         /** @var \App\Models\User $currentUser */
        $currentUser = Auth::user();

        // Prevent users from unfollowing themselves (though they can't follow either)
        if ($currentUser->id === $user->id) {
             return response()->json(['message' => 'Invalid action.'], 422);
        }

        // Use detach() to remove the relationship from the pivot table.
        // detach() accepts an ID or array of IDs.
        // If the relationship doesn't exist, it does nothing.
        try {
             $result = $currentUser->following()->detach($user->id);
             if ($result > 0) { // detach returns the number of detached records
                  Log::info("User {$currentUser->id} unfollowed User {$user->id}");
                  return response()->json(['message' => "You have unfollowed {$user->name}."], 200);
             } else {
                  Log::warning("User {$currentUser->id} attempted to unfollow User {$user->id}, but was not following.");
                  return response()->json(['message' => 'You were not following this user.'], 404); // Not Found or 409 Conflict
             }
        } catch (\Exception $e) {
             Log::error("Unfollow action failed: User {$currentUser->id} -> User {$user->id}. Error: " . $e->getMessage());
             return response()->json(['message' => 'Could not unfollow user at this time.'], 500);
        }
    }

     // --- Optional: Methods to get followers/following lists ---
     /*
     public function followers(User $user) {
         $followers = $user->followers()->paginate(15); // Paginate the followers list
         return response()->json($followers);
     }

     public function following(User $user) {
         $following = $user->following()->paginate(15); // Paginate the following list
         return response()->json($following);
     }
     */

     // Add this method to FollowController.php
     public function getFollowingIds()
     {
         /** @var \App\Models\User $currentUser */
         $currentUser = Auth::user();
         if (!$currentUser) { return response()->json(['message' => 'Unauthenticated.'], 401); }
 
         // pluck() gets only the 'id' column from the related users in the 'following' relationship
         $followingIds = $currentUser->following()->pluck('users.id');
         return response()->json($followingIds);
     }
 
     /**
      * Get paginated list of users who follow the current user.
      * Includes skills (optional) and whether the current user follows them back.
      *
      * @param  \Illuminate\Http\Request  $request
      * @return \Illuminate\Http\JsonResponse
      */
     public function getFollowers(Request $request)
     {
         /** @var \App\Models\User $currentUser */
         $currentUser = Auth::user();
          if (!$currentUser) { return response()->json(['message' => 'Unauthenticated.'], 401); }
 
         $perPage = (int) $request->query('per_page', 15);
 
         // Start query with the 'followers' relationship
         $followersQuery = $currentUser->followers()
             ->with(['skills' => fn($q) => $q->select('skills.id','skills.name')]) // Eager load skills
             ->select('users.id', 'users.name', 'users.profile_picture_path'); // Select base user fields
 
         // --- MODIFIED: Add the follow status using a subquery ---
         $followersQuery->addSelect(['is_followed_by_current_user' =>
             DB::table('follows')
                 ->selectRaw('1') // Select 1 if exists
                 ->where('follower_id', $currentUser->id) // Current user is the follower
                 ->whereColumn('following_id', 'users.id') // Following ID matches the user ID from the outer query
                 ->limit(1)
         ]);
         // --- End MODIFICATION ---
 
         // Execute pagination
         try {
              $followers = $followersQuery->paginate($perPage);
         } catch (\Exception $e) {
              Log::error("Failed to paginate followers for user {$currentUser->id}: " . $e->getMessage());
              return response()->json(['message' => 'Could not retrieve followers.'], 500);
         }
 
 
         // --- MODIFIED: Convert subquery result (0/1/null) to boolean ---
         // This ensures the frontend always receives true or false
         $followers->getCollection()->transform(function ($follower) {
             $follower->is_followed_by_current_user = (bool) $follower->is_followed_by_current_user;
             return $follower;
         });
         // --- End MODIFICATION ---
 
         return response()->json($followers);
     }
 
     /**
      * Get paginated list of users the current authenticated user is following.
      * Includes skills (optional) and marks them as followed.
      *
      * @param  \Illuminate\Http\Request  $request
      * @return \Illuminate\Http\JsonResponse
      */
      public function getFollowing(Request $request)
      {
          /** @var \App\Models\User $currentUser */
          $currentUser = Auth::user();
          if (!$currentUser) { return response()->json(['message' => 'Unauthenticated.'], 401); }
 
          $perPage = (int) $request->query('per_page', 15);
 
          // Get paginated list of users the current user is following
          try {
               $following = $currentUser->following() // Use the 'following' relationship
                                      ->with(['skills' => fn($q) => $q->select('skills.id','skills.name')])
                                      ->select('users.id', 'users.name', 'users.profile_picture_path')
                                      ->paginate($perPage);
          } catch (\Exception $e) {
               Log::error("Failed to paginate following list for user {$currentUser->id}: " . $e->getMessage());
               return response()->json(['message' => 'Could not retrieve following list.'], 500);
          }
 
 
          // Add 'is_followed_by_current_user' = true manually for consistency
           $following->getCollection()->transform(function ($user) {
               $user->is_followed_by_current_user = true; // We know the current user follows everyone in this list
               return $user;
           });
 
 
          return response()->json($following);
      }
 }