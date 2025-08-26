import { NextRequest, NextResponse } from "next/server";
import ollama from "ollama";

interface ViralAnalysis {
  viralScore: number;
  verdict: string;
  description: string;
  platformScores: {
    instagram: number;
    tiktok: number;
    linkedin: number;
    twitter: number;
  };
  trendingElements: string[];
  improvements: string[];
  hashtags: string[];
  bestPostingTime: string;
  fullResponse: string;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString("base64");

    // Use Ollama to analyze the image for viral potential
    const response = await ollama.chat({
      model: "llava:latest",
      messages: [
        {
          role: "user",
          content: `You are an expert social media analyst and viral content predictor. Analyze this image and provide a comprehensive viral potential assessment.

ANALYZE THE IMAGE FOR:
1. Visual Appeal (composition, colors, lighting, quality)
2. Emotional Impact (does it evoke strong emotions?)
3. Shareability Factors (humor, relatability, shock value, inspiration)
4. Trending Elements (current fashion, popular objects, viral poses)
5. Platform Suitability (what works best where?)

PROVIDE YOUR ANALYSIS IN THIS EXACT FORMAT:

VIRAL_SCORE: [0-100]
DESCRIPTION: [2-3 sentence description of the content]
VERDICT: [VIRAL/MODERATE/VILE]

PLATFORM_SCORES:
Instagram: [0-100]
TikTok: [0-100]
LinkedIn: [0-100]
Twitter: [0-100]

TRENDING_ELEMENTS: [list trending elements you detect, separated by commas]

IMPROVEMENTS: [3-5 specific actionable suggestions to increase viral potential]

HASHTAGS: [5-8 relevant hashtags with # symbol]

BEST_TIME: [optimal posting time and day recommendation]

Be specific, actionable, and focus on what makes content go viral in 2024.`,
          images: [base64Image]
        }
      ]
    });

    const result = response.message.content?.trim() || "";

    // Parse the AI response into structured data
    const analysis: ViralAnalysis = parseViralAnalysis(result);

    return NextResponse.json(analysis);

  } catch (error: unknown) {
    console.error("Error analyzing image:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to analyze image";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

function parseViralAnalysis(response: string): ViralAnalysis {
  // Default values
  let viralScore = 50;
  let description = "Content analysis completed";
  let verdict = "MODERATE";
  let platformScores = { instagram: 50, tiktok: 50, linkedin: 30, twitter: 40 };
  let trendingElements: string[] = [];
  let improvements: string[] = [];
  let hashtags: string[] = [];
  let bestPostingTime = "Best time varies by audience";

  try {
    // Extract viral score
    const scoreMatch = response.match(/VIRAL_SCORE:\s*(\d+)/i);
    if (scoreMatch) {
      viralScore = Math.min(100, Math.max(0, parseInt(scoreMatch[1])));
    }

    // Extract description
    const descMatch = response.match(/DESCRIPTION:\s*(.+?)(?=\n[A-Z_]+:|$)/is);
    if (descMatch) {
      description = descMatch[1].trim();
    }

    // Extract verdict
    const verdictMatch = response.match(/VERDICT:\s*(VIRAL|MODERATE|VILE)/i);
    if (verdictMatch) {
      verdict = verdictMatch[1].toUpperCase();
    }

    // Extract platform scores
    const instagramMatch = response.match(/Instagram:\s*(\d+)/i);
    const tiktokMatch = response.match(/TikTok:\s*(\d+)/i);
    const linkedinMatch = response.match(/LinkedIn:\s*(\d+)/i);
    const twitterMatch = response.match(/Twitter:\s*(\d+)/i);

    if (instagramMatch) platformScores.instagram = Math.min(100, parseInt(instagramMatch[1]));
    if (tiktokMatch) platformScores.tiktok = Math.min(100, parseInt(tiktokMatch[1]));
    if (linkedinMatch) platformScores.linkedin = Math.min(100, parseInt(linkedinMatch[1]));
    if (twitterMatch) platformScores.twitter = Math.min(100, parseInt(twitterMatch[1]));

    // Extract trending elements
    const trendingMatch = response.match(/TRENDING_ELEMENTS:\s*(.+?)(?=\n[A-Z_]+:|$)/is);
    if (trendingMatch) {
      trendingElements = trendingMatch[1]
        .split(',')
        .map(item => item.trim())
        .filter(item => item.length > 0)
        .slice(0, 6);
    }

    // Extract improvements
    const improvementsMatch = response.match(/IMPROVEMENTS:\s*(.+?)(?=\n[A-Z_]+:|$)/is);
    if (improvementsMatch) {
      improvements = improvementsMatch[1]
        .split(/\n|•|-|\d+\./)
        .map(item => item.trim())
        .filter(item => item.length > 10)
        .slice(0, 5);
    }

    // Extract hashtags
    const hashtagsMatch = response.match(/HASHTAGS:\s*(.+?)(?=\n[A-Z_]+:|$)/is);
    if (hashtagsMatch) {
      hashtags = hashtagsMatch[1]
        .split(/\s|,/)
        .map(item => item.trim())
        .filter(item => item.startsWith('#') && item.length > 1)
        .slice(0, 8);
    }

    // Extract best posting time
    const timeMatch = response.match(/BEST_TIME:\s*(.+?)(?=\n[A-Z_]+:|$)/is);
    if (timeMatch) {
      bestPostingTime = timeMatch[1].trim();
    }

    // Generate fallback data if parsing failed
    if (trendingElements.length === 0) {
      trendingElements = generateFallbackTrending(description);
    }

    if (improvements.length === 0) {
      improvements = generateFallbackImprovements(viralScore);
    }

    if (hashtags.length === 0) {
      hashtags = generateFallbackHashtags(description);
    }

  } catch (error) {
    console.error("Error parsing viral analysis:", error);
  }

  return {
    viralScore,
    verdict,
    description,
    platformScores,
    trendingElements,
    improvements,
    hashtags,
    bestPostingTime,
    fullResponse: response
  };
}

function generateFallbackTrending(description: string): string[] {
  const commonTrending = ["Aesthetic", "Mood", "Vibes", "Content", "Style"];
  return commonTrending.slice(0, 3);
}

function generateFallbackImprovements(score: number): string[] {
  if (score >= 70) {
    return [
      "Add trending audio or music",
      "Optimize caption with hooks",
      "Use better lighting setup"
    ];
  } else if (score >= 40) {
    return [
      "Improve image composition",
      "Add more engaging elements",
      "Better timing for posting",
      "Use trending hashtags"
    ];
  } else {
    return [
      "Completely rethink the concept",
      "Focus on emotional impact",
      "Improve visual quality significantly",
      "Study viral content in your niche",
      "Consider professional photography"
    ];
  }
}

function generateFallbackHashtags(description: string): string[] {
  return ["#viral", "#trending", "#content", "#social", "#creative"];
}
