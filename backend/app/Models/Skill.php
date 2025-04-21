<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Skill extends Model
{
    use HasFactory;

    protected $fillable = ['name'];

    // Relationship: A skill belongs to many users
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class);
    }

    public function index()
    {
        // Consider caching this result as skills might not change often
        return response()->json(Skill::orderBy('name')->get(['id', 'name']));
    }

}