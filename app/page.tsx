"use client";

import Image from "next/image";
import { useState } from "react";

// Mock contrarian views for search results
// const mockContrarianViews = [
//   { 
//     id: 1, 
//     title: "Climate Change: A Contrarian View", 
//     content: "Challenging mainstream narratives about global warming and its potential impacts.",
//     imageUrl: "https://picsum.photos/seed/1/800/600"
//   },
//   { 
//     id: 2, 
//     title: "AI Development: Risks and Misconceptions", 
//     content: "Exploring alternative perspectives on the potential dangers and benefits of artificial intelligence.",
//     imageUrl: "https://picsum.photos/seed/2/800/600"
//   },
//   { 
//     id: 3, 
//     title: "Economic Inequality: Rethinking Solutions", 
//     content: "A critical examination of conventional approaches to addressing wealth disparities.",
//     imageUrl: "https://picsum.photos/seed/3/800/600"
//   },
//   { 
//     id: 4, 
//     title: "Renewable Energy: Hidden Challenges", 
//     content: "Uncovering overlooked obstacles in the transition to sustainable energy sources.",
//     imageUrl: "https://picsum.photos/seed/4/800/600"
//   },
//   { 
//     id: 5, 
//     title: "Social Media's Impact: Beyond the Narrative", 
//     content: "An alternative analysis of how digital platforms shape social interactions and perceptions.",
//     imageUrl: "https://picsum.photos/seed/5/800/600"
//   },
//   { 
//     id: 6, 
//     title: "Healthcare Innovation: Unconventional Insights", 
//     content: "Challenging traditional thinking about medical progress and patient care.",
//     imageUrl: "https://picsum.photos/seed/6/800/600"
//   }
// ];

export default function Home() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<{ id: number; title: string; content: string; imageUrl?: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Extracts all text content from a given URL by fetching the HTML
   * and parsing it to remove scripts, styles, and HTML tags
   */
  const extractTextFromUrl = async (url: string): Promise<string> => {
    try {
      // Use the new API route to fetch the URL
      const response = await fetch('/api/fetch-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch URL');
      }

      const { html } = await response.json();

      // Use a more universal text extraction method
      const cleanedText = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/\s+/g, ' ')    // Replace multiple whitespaces
        .trim();

      return cleanedText;
    } catch (error) {
      throw new Error(`Failed to extract text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  const handleSubmit = async () => {
    // Reset previous errors
    setError(null);

    // Validate URL
    if (!query.trim()) {
      setError("Please enter a URL");
      return;
    }

    if (!isValidUrl(query)) {
      setError("Please enter a valid URL");
      return;
    }

    setIsLoading(true);
    try {
      // Extract text from the URL
      const extractedText = await extractTextFromUrl(query);
      console.log("Extracted Text Length:", extractedText.length);

      // Generate contrarian views using OpenRouter
      const viewsResponse = await fetch('/api/generate-views', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: extractedText }),
      });

      if (!viewsResponse.ok) {
        const errorData = await viewsResponse.json();
        throw new Error(errorData.error || 'Failed to generate views');
      }

      const { views } = await viewsResponse.json();

      // Update the result state with generated views
      setResult(views);
    } catch (error) {
      setResult([]);
      const errorMessage = error instanceof Error 
        ? error.message 
        : "An unknown error occurred while generating views";
      setError(errorMessage);
      console.error('View Generation Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveResult = (idToRemove: number) => {
    setResult(result.filter(view => view.id !== idToRemove));
  };

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <div className="text-xl text-center dark:text-white">
          Check contrarian views on your news story
        </div>
        <div className="w-full max-w-xl flex flex-col items-center gap-4 justify-center">
          <div className="w-full flex items-center gap-4 justify-center">
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter URL" 
              className="flex-grow px-4 py-2 border border-black/[.08] dark:border-white/[.145] rounded-full focus:outline-none focus:ring-2 focus:ring-foreground text-sm sm:text-base placeholder:text-gray-500 dark:placeholder:text-gray-400 text-black"
            />
            <button 
              onClick={handleSubmit}
              disabled={isLoading}
              className="rounded-full border border-solid border-white transition-colors flex items-center justify-center bg-background text-foreground gap-2 hover:bg-[#ccc] dark:hover:bg-[#383838] text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
            >
              {isLoading ? "Loading..." : "Submit"}
            </button>
          </div>
          {error && (
            <div className="text-red-500 text-sm mt-2">
              {error}
            </div>
          )}
        </div>
        {result.length > 0 && (
          <div className="w-full mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {result.map((view) => (
              <div key={view.id} className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg relative min-h-[200px] flex flex-col">
                <button 
                  onClick={() => handleRemoveResult(view.id)}
                  className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
                {view.imageUrl && (
                  <Image 
                    src={view.imageUrl} 
                    alt={view.title} 
                    className="w-full h-auto rounded-lg mt-4 object-cover cursor-pointer"
                    width={300}
                    height={200}
                    layout="responsive"
                  />
                )}
                  <h3 className="text-md font-semibold dark:text-white mb-2 mt-4 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400">
                    {view.title}
                  </h3>
                <p className="text-sm dark:text-white mb-2 flex-grow">{view.content}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
