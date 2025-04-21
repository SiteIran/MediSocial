<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB; // Import DB facade for LOWER() if needed
use Illuminate\Support\Facades\Log; // Import Log facade

class SearchController extends Controller
{
    /**
     * Search for users based on name or skills.
     * Excludes the currently authenticated user from results.
     * Implements basic pagination.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function searchUsers(Request $request)
    {
        $queryTerm = $request->query('q', '');
        // Sanitize the query term slightly (remove excessive whitespace)
        $queryTerm = trim($queryTerm);
        $perPage = (int) $request->query('per_page', 15); // Cast to integer

        // If query term is empty after trimming, return empty paginated result
        if (empty($queryTerm)) {
            Log::info('Search attempted with empty query term.');
            // Return an empty paginator instance directly for better structure
             return response()->json(User::whereRaw('1=0')->paginate($perPage));
        }

        // Get the authenticated user's ID
        $currentUserId = Auth::id();
        if (!$currentUserId) {
             // Should not happen if middleware is applied, but good to check
             Log::warning('Search attempt without authenticated user.');
             return response()->json(['message' => 'Unauthorized'], 401);
        }
        Log::info("Searching for term: '{$queryTerm}' by User ID: {$currentUserId}");

        // Start building the query
        $usersQuery = User::query()
            ->where('id', '!=', $currentUserId) // Exclude current user
            ->where(function (Builder $query) use ($queryTerm) {

                // --- Search by Name ---
                // Using LOWER for case-insensitivity explicitly (optional for MySQL, needed for others)
                 $searchTermLower = strtolower($queryTerm); // Convert search term to lower case
                 $query->where(DB::raw('LOWER(name)'), 'LIKE', "%{$searchTermLower}%");

                 // --- Search by Skill Name ---
                 $query->orWhereHas('skills', function (Builder $skillQuery) use ($searchTermLower) {
                     // Also use LOWER for skill name search
                     $skillQuery->where(DB::raw('LOWER(name)'), 'LIKE', "%{$searchTermLower}%");
                 });

                 // --- Optional: Search by Bio (Uncomment if needed) ---
                 // $query->orWhere(DB::raw('LOWER(bio)'), 'LIKE', "%{$searchTermLower}%");

                 // --- Optional: Search by Exact Phone Number (Uncomment if needed) ---
                 // Requires exact match and potentially normalization of input/stored number
                 // $normalizedPhone = $this->normalizePhoneNumberForSearch($queryTerm); // Example helper
                 // if ($normalizedPhone) {
                 //     $query->orWhere('phone_number', $normalizedPhone);
                 // }
            })
            // Eager load skills but select only necessary fields
            ->with(['skills' => function ($query) {
                $query->select('skills.id', 'skills.name'); // Always specify table name in closure
             }])
            // Select necessary user fields
            ->select(['users.id', 'users.name', 'users.profile_picture_path']); // Use table name prefix

        // --- Logging the SQL Query and Bindings ---
        try {
            // Get the SQL query string before pagination
            $sql = $usersQuery->toSql();
            // Get the bindings (values to replace '?')
            $bindings = $usersQuery->getBindings();
            Log::debug('Search Query SQL: ' . $sql);
            Log::debug('Search Query Bindings: ', $bindings);
        } catch (\Exception $e) {
             Log::error('Error getting SQL for search query: ' . $e->getMessage());
        }
        // --- End Logging ---


        // Execute the query with pagination
        try {
             $users = $usersQuery->paginate($perPage);
        } catch (\Exception $e) {
             Log::error('Error executing search query: ' . $e->getMessage());
             return response()->json(['message' => 'Error during search. Please try again.'], 500);
        }


        // Log the number of results found
        Log::info("Search for '{$queryTerm}' found {$users->total()} results.");

        // Return the paginated results
        return response()->json($users);
    }


    // --- Optional Helper Function for Phone Number Normalization (Example) ---
    /*
    private function normalizePhoneNumberForSearch(string $phoneInput): ?string
    {
        // Basic check if input looks like a phone number
        if (preg_match('/^(\+98|98|0)?(9\d{9})$/', $phoneInput, $matches)) {
             // Return in the standard format used in your DB (e.g., +989xxxxxxxxx)
             return '+98' . $matches[2];
        }
        return null; // Not a valid phone number format to search for
    }
    */
}