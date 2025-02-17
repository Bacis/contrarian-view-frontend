import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1'
});

// Define a Zod schema for validating the view structure
const ViewSchema = z.object({
  id: z.number(),
  title: z.string().min(1, "Title is required"),
  subtitle: z.string().optional(),
  content: z.string().min(1, "Content is required"),
  imageUrl: z.string().url().optional(),
  imageGenerationPrompt: z.string().min(1, "Image generation prompt is required")
});

const ViewsSchema = z.array(ViewSchema).max(6);

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const response = await openai.chat.completions.create({
      model: 'anthropic/claude-3-sonnet',
      messages: [
        {
          role: 'system',
          content: `You are an expert at generating profound, intellectually rigorous alternative interpretations of complex narratives.`
        },
        {
          role: 'user',
          content: `Generate three radically different but plausible interpretations of this news story. Each interpretation should reveal a profound 'other way of looking at it' that causes an 'ah-ha!' moment by seeing the same events from a completely unexpected perspective. These should not be conspiracy theories, but rather intelligent alternative frameworks that expose deeper implications, hidden dynamics, or non-obvious future impacts. Each interpretation should be 2-3 sentences long, be both surprising and logically sound, and reveal a perspective that makes us say 'wow, I hadn't thought of it that way!' Focus on identifying the profound historical implications or future consequences that aren't immediately apparent from the conventional narrative. Make each interpretation genuinely insightful rather than merely contrarian.

          Respond with a VALID JSON array of view objects. Each view MUST have:
          - id (unique number)
          - title (non-empty string)
          - content (non-empty string)
          - imageUrl (non-empty string)
          - imageGenerationPrompt (non-empty string describing an image that perfectly captures the view's essence)
          
          IMPORTANT: Ensure the JSON is properly formatted and escaped.
          Use ONLY valid JSON characters. Avoid newlines in strings.

          Example format:
          [
            {
              "id": 1,
              "title": "Provocative Perspective",
              "content": "A challenging one-sentence view.",
              "imageUrl": "https://example.com/image.jpg",
              "imageGenerationPrompt": "A symbolic representation of the unique perspective"
            }
          ]

          Source Text: ${text}`
        }
      ],
      max_tokens: 800,
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    const generatedContent = response.choices[0].message.content || '[]';

    // Additional parsing safeguards
    const sanitizedContent = generatedContent
      .replace(/\n/g, ' ')      // Remove newlines
      .replace(/\t/g, ' ')      // Remove tabs
      .replace(/\s+/g, ' ')     // Normalize whitespace
      .trim();

    console.log(sanitizedContent);

    let parsedViews: { id: number; title: string; content: string; imageUrl?: string; imageGenerationPrompt?: string }[];
    const jsonMatch = sanitizedContent.match(/^\s*(\[(?:\s*{[^}]*}\s*,?)*\s*\])\s*$/);
    if (jsonMatch) {
      try {
        parsedViews = JSON.parse(jsonMatch[1]);
      } catch {
        return NextResponse.json({ 
          error: 'Failed to parse generated views',
          rawContent: sanitizedContent
        }, { status: 400 });
      }
    } else {
      return NextResponse.json({ 
        error: 'No valid JSON found',
        rawContent: sanitizedContent
      }, { status: 400 });
    }

    // Validate and transform views
    const validatedViews = ViewsSchema.parse(
      parsedViews.map((view: { id: number; title: string; subtitle?: string; content: string; imageUrl?: string; imageGenerationPrompt?: string }, index: number) => ({
        id: view.id || index + 1,
        title: view.title || `Alternative Perspective ${index + 1}`,
        content: view.content || 'A unique perspective on the topic.',
        imageUrl: view.imageUrl || `https://picsum.photos/seed/${index + 1}/400/300`,
        imageGenerationPrompt: view.imageGenerationPrompt || `A symbolic representation of the unique perspective`
      }))
    );

    const viewsWithImages = await Promise.all(validatedViews.map(async (view) => {
      const imageUrl = await generateViewImage(view.imageGenerationPrompt);
      return { ...view, imageUrl };
    }));

    console.log(viewsWithImages);

    return NextResponse.json({ views: viewsWithImages });
  } catch (error) {
    console.error('Generate Views error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      details: error
    }, { status: 500 });
  }
}

const generateViewImage = async (prompt: string): Promise<string | undefined | null> => {
    try {
        const generationResponse = await fetch(
            "https://cloud.leonardo.ai/api/rest/v1/generations",
            {
                method: 'POST',
                headers: {
                    accept: "application/json",
                    authorization: `Bearer ${process.env.LEONARDO_API_KEY}`,
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    modelId: "6b645e3a-d64f-4341-a6d8-7a3690fbf042",
                    contrast: 3.5,
                    prompt: prompt,
                    num_images: 4,
                    width: 1472,
                    height: 832,
                    alchemy: true,
                    styleUUID: "111dc692-d470-4eec-b791-3475abac4c46",
                    enhancePrompt: false,
                })
            }
        );

        const generationData = await generationResponse.json();

        if (generationData.sdGenerationJob) {
            const generationId =
                generationData.sdGenerationJob.generationId;

            console.log("Generation ID:", generationId);

            // Implement polling method with 7-second delay
            let statusResponse;
            let attempts = 0;
            const maxAttempts = 10; // Prevent infinite loop

            while (attempts < maxAttempts) {
                statusResponse = await fetch(
                    `https://cloud.leonardo.ai/api/rest/v1/generations/${generationId}`,
                    {
                        headers: {
                            accept: "application/json",
                            authorization: `Bearer ${process.env.LEONARDO_API_KEY}`,
                        },
                    }
                );

                const statusData = await statusResponse.json();

                // Check if images are generated
                const generatedImages =
                    statusData.generations_by_pk
                        .generated_images;

                if (generatedImages && generatedImages.length > 0) {
                    console.log("Generated Images:", generatedImages);

                    // Return the first image URL
                    return generatedImages[0].url;
                }

                // Wait 7 seconds before next attempt
                await new Promise((resolve) =>
                    setTimeout(resolve, 7000)
                );
                attempts++;
                console.log(
                    "Waiting for 7 seconds before next attempt",
                    attempts
                );
            }

            if (attempts === maxAttempts) {
                console.warn(
                    "Max polling attempts reached without generating images"
                );
                return null;
            }
        } else {
            throw new Error("No generationId found");
        }
    } catch (error) {
        console.error("Leonardo AI Image Generation Error:", error);
        return null;
    }
}