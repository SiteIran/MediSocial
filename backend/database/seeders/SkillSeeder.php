<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Skill; // Import Skill model
use Illuminate\Support\Facades\DB; // If needed for direct DB interaction

class SkillSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Clear the table first (optional)
        // DB::table('skills')->delete(); // Use if you want to reset on each seed

        $skills = [
            ['name' => 'ایمپلنت دندانی'],
            ['name' => 'ارتودنسی'],
            ['name' => 'دندانپزشکی زیبایی'],
            ['name' => 'جراحی لثه'],
            ['name' => 'پروتزهای دندانی'],
            ['name' => 'اندودانتیکس (درمان ریشه)'],
            ['name' => 'رادیولوژی دهان و دندان'],
            ['name' => 'دندانپزشکی کودکان'],
            // Add more skills relevant to medical/dental
            ['name' => 'تجهیزات پزشکی'],
            ['name' => 'بازاریابی مدیکال'],
        ];

        // Insert skills, ignoring duplicates if name is unique
        foreach ($skills as $skill) {
            Skill::firstOrCreate($skill);
        }

        // Or use insert directly if you cleared the table first and names are unique:
        // Skill::insert($skills);
    }
}