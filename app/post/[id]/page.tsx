"use client";

import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";

// Mock data (in a real app, this would come from an API or database)
const mockContrarianViews = [
  { 
    id: 1, 
    title: "Alternative Perspective 1", 
    content: "Here's a detailed exploration of a different take on the story that challenges the mainstream narrative. This expanded view provides deeper insights into the nuanced aspects of the topic that are often overlooked.",
    imageUrl: "https://picsum.photos/seed/1/800/600",
    fullContent: `
      ## Diving Deeper into the Alternative Perspective

      The conventional narrative often misses critical nuances that can fundamentally change our understanding. In this detailed analysis, we explore the underlying factors that challenge the mainstream view.

      ### Key Insights
      - Unexpected connections
      - Overlooked contextual information
      - Critical analysis of prevailing assumptions

      Our investigation reveals a more complex picture that demands a more nuanced approach to understanding the issue.
    `
  },
  // ... other mock views from the previous page
];

export default function PostPage() {
  const router = useRouter();
  const params = useParams();
  const [view, setView] = useState<{
    id: number;
    title: string;
    content: string;
    imageUrl?: string;
    fullContent?: string;
  } | null>(null);

  useEffect(() => {
    // Simulate fetching the specific view
    const viewId = Number(params.id);
    const foundView = mockContrarianViews.find(v => v.id === viewId);
    
    if (foundView) {
      setView(foundView);
    }
  }, [params.id]);

  const handleGoBack = () => {
    router.back();
  };

  if (!view) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <button 
        onClick={handleGoBack}
        className="mb-4 inline-block text-foreground hover:text-gray-700 dark:text-white dark:hover:text-gray-300"
      >
        ← Back
      </button>
      
      <article className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        {view.imageUrl && (
          <Image 
            src={view.imageUrl} 
            alt={view.title} 
            width={800} 
            height={400} 
            className="w-full h-auto object-cover"
            priority
          />
        )}
        
        <div className="p-6 md:p-10">
          <h1 className="text-2xl md:text-3xl font-bold mb-4 dark:text-white">
            {view.title}
          </h1>
          
          <div className="prose dark:prose-invert">
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              {view.content}
            </p>
            
            {view.fullContent && (
              <div 
                className="markdown"
                dangerouslySetInnerHTML={{ __html: view.fullContent }}
              />
            )}
          </div>
        </div>
      </article>
    </div>
  );
} 