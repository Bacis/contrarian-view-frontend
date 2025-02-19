import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
    try {
        // Parse the incoming request body
        const { prompt, width = 1024, height = 704, model = "civitai:102438@133677", numberResults = 1 } = await request.json();

        // Validate prompt
        if (!prompt || typeof prompt !== 'string') {
            return NextResponse.json({ 
                error: 'A valid prompt is required' 
            }, { status: 400 });
        }

        // Validate API key
        if (!process.env.RUNWARE_API_KEY) {
            console.error("Runware API Key is missing!");
            return NextResponse.json({ 
                error: 'Image generation service is not configured' 
            }, { status: 500 });
        }

        // Prepare Runware API request payload
        const runwarePayload = [
            {
                taskType: "authentication",
                apiKey: process.env.RUNWARE_API_KEY
            },
            {
                taskType: "imageInference",
                taskUUID: uuidv4(), // Generate a unique task UUID
                positivePrompt: prompt,
                width: width,
                height: height,
                model: model,
                numberResults: numberResults
            }
        ];

        // Perform image generation
        console.log('Initiating image generation request to Runware AI');
        const generationResponse = await fetch(
            "https://api.runware.ai/v1",
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(runwarePayload)
            }
        );

        // Check if the generation request was successful
        if (!generationResponse.ok) {
            const errorText = await generationResponse.text();
            console.error("Runware API Response Error:", {
                status: generationResponse.status,
                body: errorText
            });
            return NextResponse.json({ 
                error: 'Failed to initiate image generation' 
            }, { status: 500 });
        }

        const generationData = await generationResponse.json();
        console.log('Generation response:', generationData);

        // Extract image URLs from the response
        const imageResults = generationData.data
            .filter((response: { taskType: string }) => response.taskType === "imageInference")
            .map((response: { imageURL: string; imageUUID: string; seed: number }) => ({
                imageUrl: response.imageURL,
                imageUUID: response.imageUUID,
                seed: response.seed
            }));

        if (imageResults.length === 0) {
            return NextResponse.json({ 
                error: 'No images generated' 
            }, { status: 500 });
        }

        return NextResponse.json({ 
            imageUrl: imageResults[0].imageUrl,
            allImages: imageResults
        });

    } catch (error) {
        console.error("Runware Image Generation Error:", error);
        return NextResponse.json({ 
            error: 'Unexpected error during image generation',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
} 