<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo; // Import BelongsTo
use Illuminate\Database\Eloquent\Relations\BelongsToMany; // Add import
use Illuminate\Database\Eloquent\Relations\HasMany; // Import

class Post extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id', // Make sure user_id is fillable if creating like $user->posts()->create()
        'content',
        'image_path',
    ];

    /**
     * Get the user (author) that owns the post.
     */
    public function user(): BelongsTo
    {
        // A post belongs to a single user
        return $this->belongsTo(User::class);
    }

    // Relationship for users who liked the post
    public function likedByUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'post_likes', 'post_id', 'user_id')->withTimestamps();
    }

    public function comments(): HasMany { return $this->hasMany(Comment::class)->whereNull('parent_id')->latest(); } // Get only top-level comments by default, newest first

}