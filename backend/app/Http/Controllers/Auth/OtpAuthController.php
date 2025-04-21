<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log; // Import Log facade
use App\Models\Otp; // Assuming Otp model exists in App\Models
use App\Models\User;
use Carbon\Carbon;
// use App\Services\SmsService; // You'll need this for actual SMS sending

class OtpAuthController extends Controller
{
    // OTP configuration
    private int $otpLength = 6; // Length of the OTP code
    private int $otpValidityMinutes = 5; // OTP is valid for 5 minutes

    /**
     * Request an OTP code for the given phone number.
     * Sends the OTP via configured method (log/SMS) and returns a message.
     * FOR TESTING: Temporarily returns the OTP in the response.
     */
    public function requestOtp(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'phone_number' => [
                'required',
                // More specific regex for Iranian numbers starting with 09 or 989 or +989
                'regex:/^(\+98|98|0)?(9\d{9})$/'
            ],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $phoneNumber = $this->normalizePhoneNumber($request->input('phone_number'));

        // --- OTP Generation ---
        $otpCode = $this->generateOtp();
        $expiresAt = Carbon::now()->addMinutes($this->otpValidityMinutes);

        // --- Store OTP ---
        // Invalidate previous OTPs for this number
        Otp::where('phone_number', $phoneNumber)->delete();

        try {
            Otp::create([
                'phone_number' => $phoneNumber,
                'code' => $otpCode, // Consider hashing if storing longer: Hash::make($otpCode)
                'expires_at' => $expiresAt,
            ]);
        } catch (\Exception $e) {
             Log::error('Failed to store OTP: ' . $e->getMessage());
             return response()->json(['message' => 'Could not process request. Please try again later.'], 500);
        }


        // --- Send OTP ---

        // Option 1: Log the OTP (Recommended for development when not returning in response)
        Log::info("OTP for {$phoneNumber}: {$otpCode}");

        // Option 2: Use an SMS Service (Production / Integration Testing)
        /*
        try {
            // $smsService = resolve(SmsService::class); // Use service container
            // $smsService->sendOtp($phoneNumber, $otpCode);
        } catch (\Exception $e) {
            Log::error("Failed to send OTP SMS to {$phoneNumber}: " . $e->getMessage());
            // Decide if you want to inform the user or just log
            // return response()->json(['message' => 'Could not send OTP code. Please try again later.'], 500);
        }
        */

        // --- Response ---

        // Default response (Use this in production)
        // return response()->json(['message' => 'OTP has been sent successfully.'], 200);

        // --- !!! TEMPORARY - FOR DEVELOPMENT/TESTING ONLY !!! ---
        // Returns the OTP code in the response.
        // !! REMOVE OR COMMENT OUT BEFORE PRODUCTION !!
        return response()->json([
            'message' => 'OTP generated (for testing).',
            'otp_for_testing' => $otpCode // Include OTP for easy testing
        ], 200);
        // --- !!! END TEMPORARY !!! ---

    }

    /**
     * Verify the OTP and log the user in or create a new user.
     * Returns an API token upon successful verification.
     */
    public function loginWithOtp(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'phone_number' => [
                'required',
                'regex:/^(\+98|98|0)?(9\d{9})$/'
            ],
            'otp' => [
                'required',
                'digits:' . $this->otpLength // Validate OTP length
            ],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $phoneNumber = $this->normalizePhoneNumber($request->input('phone_number'));
        $otpCode = $request->input('otp');

        // --- Verify OTP ---
        $otpEntry = Otp::where('phone_number', $phoneNumber)
                       // If you hash the OTP, use Hash::check():
                       // ->where(function ($query) use ($otpCode) {
                       //      $query->where('code', $otpCode); // Check plain first for legacy?
                       //      // Add Hash::check logic if needed
                       // })
                       ->where('code', $otpCode) // Comparing plain text OTP for now
                       ->where('expires_at', '>', Carbon::now())
                       ->first();

        if (!$otpEntry) {
            // Check if OTP existed but expired
            $expiredOtpExists = Otp::where('phone_number', $phoneNumber)
                                    ->where('code', $otpCode)
                                    ->exists();
            if ($expiredOtpExists) {
                 // Delete the expired OTP
                 Otp::where('phone_number', $phoneNumber)->where('code', $otpCode)->delete();
                 return response()->json(['message' => 'OTP has expired. Please request a new one.'], 401);
            }
            return response()->json(['message' => 'Invalid OTP code.'], 401); // Unauthorized
        }

        // --- Find or Create User ---
        // Use updateOrCreate to ensure phone_number is always set correctly
        $user = User::updateOrCreate(
            ['phone_number' => $phoneNumber],
            [
                // Add any fields that should be updated on login if needed,
                // or just ensure the user exists.
                // 'last_login_at' => now(), // Example
            ]
        );

        // --- Generate Sanctum Token ---
        // Consider revoking old tokens if needed: $user->tokens()->delete();
        $token = $user->createToken('api-token-' . $user->id)->plainTextToken; // Add user ID for uniqueness

        // --- Clean up OTP ---
        $otpEntry->delete(); // Delete the used OTP

        // --- Return Token and User Info ---
        return response()->json([
            'message' => 'Login successful.',
            'access_token' => $token,
            'token_type' => 'Bearer',
            // Eager load relationships you need in the frontend immediately after login
            'user' => $user->loadMissing('skills')->loadCount(['followers', 'following']) // Load skills if not already loaded
        ], 200);
    }


    /**
     * Generate a random OTP code.
     */
    private function generateOtp(): string
    {
        // Generate a secure random number of the specified length
        try {
             return strval(random_int(pow(10, $this->otpLength - 1), pow(10, $this->otpLength) - 1));
        } catch (\Exception $e) {
             // Fallback if random_int fails (highly unlikely)
             Log::warning('random_int failed for OTP generation, using fallback.');
             $code = '';
             for ($i = 0; $i < $this->otpLength; $i++) {
                 $code .= mt_rand(0, 9);
             }
             return $code;
        }
    }

    /**
     * Normalize phone number to the standard +989xxxxxxxxx format.
     */
    private function normalizePhoneNumber(string $phoneNumber): string
    {
        // Remove any non-digit characters except leading '+'
        $phoneNumber = preg_replace('/[^\d+]/', '', $phoneNumber);

        // Remove leading '00' if present
        if (str_starts_with($phoneNumber, '00')) {
            $phoneNumber = substr($phoneNumber, 2);
        }

        // Remove leading '+' if present (we'll add it back later)
        $phoneNumber = ltrim($phoneNumber, '+');

        // If it starts with '09', replace '0' with '98'
        if (str_starts_with($phoneNumber, '09')) {
            $phoneNumber = '98' . substr($phoneNumber, 1);
        }
        // If it starts with '9' (and assumes it's 9xxxxxxxxx), prepend '98'
        elseif (str_starts_with($phoneNumber, '9') && strlen($phoneNumber) === 10) {
             $phoneNumber = '98' . $phoneNumber;
        }

        // Ensure it starts with '989' and has the correct length for Iranian numbers
        if (!preg_match('/^989\d{9}$/', $phoneNumber)) {
             // Handle invalid format - maybe throw an exception or log?
             // For now, just return as is, relying on validator, but this function aims to standardize
             Log::warning("Could not normalize phone number: " . $phoneNumber);
             // You might return the raw input or throw ValidationException
        }

        // Return with leading '+'
        return '+' . $phoneNumber;
    }
}