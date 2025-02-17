import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        // Parse the incoming request body
        const { prompt } = await request.json();

        // Validate prompt
        if (!prompt || typeof prompt !== 'string') {
            console.warn('Invalid prompt received');
            return NextResponse.json({ 
                error: 'A valid prompt is required' 
            }, { status: 400 });
        }

        // Validate API key
        if (!process.env.LEONARDO_API_KEY) {
            console.error("Leonardo API Key is missing!");
            return NextResponse.json({ 
                error: 'Image generation service is not configured' 
            }, { status: 500 });
        }

        // Perform image generation
        console.log('Initiating image generation request to Leonardo AI');
        const generationResponse = await fetch(
            "https://cloud.leonardo.ai/api/rest/v1/generations",
            {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'authorization': `Bearer ${process.env.LEONARDO_API_KEY}`,
                    'content-type': 'application/json',
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

        // Check if the generation request was successful
        if (!generationResponse.ok) {
            const errorText = await generationResponse.text();
            console.error("API Response Error:", {
                status: generationResponse.status,
                body: errorText
            });
            return NextResponse.json({ 
                error: 'Failed to initiate image generation' 
            }, { status: 500 });
        }

        const generationData = await generationResponse.json();
        console.log('Generation request successful', { generationData });

        // Check if generation job was created
        if (!generationData.sdGenerationJob) {
            console.warn('No generation job created');
            return NextResponse.json({ 
                error: 'No generation job created' 
            }, { status: 500 });
        }

        const generationId = generationData.sdGenerationJob.generationId;
        console.log(`Generation job created with ID: ${generationId}`);

        // Polling for image generation
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
            console.log(`Polling for image generation - Attempt ${attempts + 1}/${maxAttempts}`);
            const statusResponse = await fetch(
                `https://cloud.leonardo.ai/api/rest/v1/generations/${generationId}`,
                {
                    headers: {
                        'accept': 'application/json',
                        'authorization': `Bearer ${process.env.LEONARDO_API_KEY}`,
                    },
                }
            );

            const statusData = await statusResponse.json();
            const generatedImages = statusData.generations_by_pk?.generated_images;

            if (generatedImages && generatedImages.length > 0) {
                console.log(`Successfully generated ${generatedImages.length} images`);
                return NextResponse.json({ 
                    imageUrl: generatedImages[0].url,
                    allImageUrls: generatedImages.map((img: { url: string }) => img.url)
                });
            }

            // Wait before next attempt
            await new Promise((resolve) => setTimeout(resolve, 7000));
            console.log('Waiting for 7 seconds before next attempt');
            attempts++;
        }

        // If no images generated after max attempts
        console.warn('Could not generate image after multiple attempts');
        return NextResponse.json({ 
            error: 'Could not generate image after multiple attempts' 
        }, { status: 500 });

    } catch (error) {
        console.error("Image Generation Error:", error);
        return NextResponse.json({ 
            error: 'Unexpected error during image generation',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
} 