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
        Schema::create('follows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('follower_id')->constrained('users')->onDelete('cascade'); // کاربری که فالو می‌کند
            $table->foreignId('following_id')->constrained('users')->onDelete('cascade'); // کاربری که فالو می‌شود
            $table->timestamps(); // زمان فالو کردن
            $table->unique(['follower_id', 'following_id']); // هر کاربر فقط یک بار می‌تواند دیگری را فالو کند
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('follows');
    }
};
