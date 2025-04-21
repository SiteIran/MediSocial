<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens; // Ensure Sanctum is used
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable; // Add HasApiTokens

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'phone_number',
        'profile_picture_path',
        'bio',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        // 'password', // Password removed
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected function casts(): array // New syntax in Laravel 10+
    {
        return [
            // 'email_verified_at' => 'datetime', // Removed
            // 'password' => 'hashed', // Removed
            'phone_verified_at' => 'datetime', // Add if using verification
        ];
    }

    // Relationship: A user has many skills
    public function skills(): BelongsToMany
    {
        return $this->belongsToMany(Skill::class);
    }

    // Relationship: Users that this user is following
    public function following(): BelongsToMany
    {
        // 'follower_id' is the foreign key of the User model in the follows table
        // 'following_id' is the foreign key of the related User model in the follows table
        return $this->belongsToMany(User::class, 'follows', 'follower_id', 'following_id');
    }

    // Relationship: Users that are following this user
    public function followers(): BelongsToMany
    {
        // 'following_id' is the foreign key of the User model in the follows table
        // 'follower_id' is the foreign key of the related User model in the follows table
        return $this->belongsToMany(User::class, 'follows', 'following_id', 'follower_id');
    }

    /**
     * Get the posts for the user.
     */
    public function posts(): HasMany
    {
        // A user can have many posts
        return $this->hasMany(Post::class);
    }

    // Relationship for posts liked by the user
    public function likedPosts(): BelongsToMany
    {
        return $this->belongsToMany(Post::class, 'post_likes', 'user_id', 'post_id')->withTimestamps();
    }

    public function comments(): HasMany { return $this->hasMany(Comment::class); }

    public function likedComments(): BelongsToMany {
        return $this->belongsToMany(Comment::class, 'comment_likes', 'user_id', 'comment_id')->withTimestamps();
    }
        
}