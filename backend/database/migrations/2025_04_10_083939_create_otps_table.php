<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('otps', function (Blueprint $table) {
            $table->id();
            $table->string('phone_number')->index(); // شماره موبایلی که کد برایش ارسال شده
            $table->string('code'); // کد OTP
            $table->timestamp('expires_at'); // زمان انقضای کد
            $table->timestamps(); // زمان ایجاد کد
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('otps');
    }
};
