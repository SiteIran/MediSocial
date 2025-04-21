<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany; // Add import
use Illuminate\Database\Eloquent\Relations\HasMany; // Add import

class Comment extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'post_id',
        'parent_id', // Nullable for top-level comments
        'body',
    ];

    /**
     * Get the user (author) who created the comment.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the post that the comment belongs to.
     */
    public function post(): BelongsTo
    {
        return $this->belongsTo(Post::class);
    }

    public function likedByUsers(): BelongsToMany {
        return $this->belongsToMany(User::class, 'comment_likes', 'comment_id', 'user_id')->withTimestamps();
    }

    /**
     * Get the parent comment (if this is a reply).
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Comment::class, 'parent_id');
    }

    /**
     * Get replies to this comment.
     */
    public function replies(): HasMany
    {
        // Order replies by oldest first for typical display order
        return $this->hasMany(Comment::class, 'parent_id')->oldest();
    }


}