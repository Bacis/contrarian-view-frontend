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
          content: `Generate three radically different but plausible interpretations of this news story. Each interpretation should reveal a profound 'other way of looking at it' that causes an 'ah-ha!' moment by seeing the same events from a completely unexpected perspective. These should not be conspiracy theories, but rather intelligent alternative frameworks that expose deeper implications, hidden dynamics, or non-obvious future impacts. 

Each interpretation should be 2-3 sentences long, be both surprising and logically sound, and reveal a perspective that makes us say 'wow, I hadn't thought of it that way!' Focus on identifying the profound historical implications or future consequences that aren't immediately apparent from the conventional narrative. Make each interpretation genuinely insightful rather than merely contrarian.

Respond with a VALID JSON array of view objects. Each view MUST have:
- id (unique number)
- title (non-empty string)
- content (non-empty string)
- imageUrl (non-empty string)
- imageGenerationPrompt (non-empty string describing an image that perfectly captures the view's essence)

IMPORTANT: Ensure the JSON is properly formatted and escaped. Use ONLY JSON in the response.

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

    const rawContent = response.choices[0].message.content || '';

    // Advanced JSON extraction and parsing
    const extractJSON = (content: string) => {
      // Try to extract JSON between first [ and last ]
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch {
          // Fallback parsing attempts
          try {
            // Remove any text before [ and after ]
            const cleanedContent = content.replace(/^[^[]*/, '').replace(/[^]]*$/, '');
            return JSON.parse(cleanedContent);
          } catch {
            return null;
          }
        }
      }
      return null;
    };

    const parsedViews = extractJSON(rawContent);

    if (!parsedViews || !Array.isArray(parsedViews) || parsedViews.length !== 3) {
      return NextResponse.json({ 
        error: 'Failed to parse views',
        rawContent,
        parsedViews
      }, { status: 400 });
    }

    // Validate and transform views
    const validatedViews = ViewsSchema.parse(
      parsedViews.map((view: { id: number; title: string; content: string; imageUrl?: string; imageGenerationPrompt?: string }, index: number) => ({
        id: view.id || index + 1,
        title: view.title || `Alternative Perspective ${index + 1}`,
        content: view.content || 'A unique perspective on the topic.',
        imageGenerationPrompt: view.imageGenerationPrompt || `Symbolic representation ${index + 1}`,
        imageUrl: `https://picsum.photos/seed/${index + 1}/400/300`
      }))
    );

    return NextResponse.json({ views: validatedViews });
  } catch (error) {
    console.error('Generate Views error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      details: String(error)
    }, { status: 500 });
  }
}
