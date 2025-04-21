<?php

namespace App\Policies;

use App\Models\Post;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class PostPolicy
{
    /**
     * Determine whether the user can update the model.
     * Only the author of the post can update it.
     */
    public function update(User $user, Post $post): bool
    {
        // Check if the authenticated user's ID matches the post's user_id
        return $user->id === $post->user_id;
    }

    /**
     * Determine whether the user can delete the model.
     * Only the author of the post can delete it.
     */
    public function delete(User $user, Post $post): bool
    {
        // Check if the authenticated user's ID matches the post's user_id
        return $user->id === $post->user_id;
    }

    // Add other policy methods like view, create if needed later
}