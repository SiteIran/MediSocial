<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Skill; // Import the Skill model
use Illuminate\Support\Facades\Cache; // Optional: for caching

class SkillController extends Controller
{
    /**
     * Display a listing of all skills.
     * Optionally uses caching.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function index()
    {
        // Option 1: Without caching
        // $skills = Skill::orderBy('name')->get(['id', 'name']);

        // Option 2: With caching (Recommended if skills don't change often)
        $skills = Cache::remember('all_skills', now()->addHour(), function () { // Cache for 1 hour
            return Skill::orderBy('name')->get(['id', 'name']);
        });

        return response()->json($skills);
    }

    // Other API resource methods (store, show, update, destroy) are generated
    // but not used in this step. You can remove them or implement later if needed.
}