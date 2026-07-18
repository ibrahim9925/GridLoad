// @ts-nocheck

import React from "react";
import { Button } from "@/components/ui/button";

interface ContentSuggestionsProps {
  finalImage: string | null;
  aiCaption: string;
  captionLoading: boolean;
  aiHashtags: string;
  hashtagsLoading: boolean;
  aiCTA: string;
  ctaLoading: boolean;
}

export const ContentSuggestions: React.FC<ContentSuggestionsProps> = ({
  finalImage,
  aiCaption,
  captionLoading,
  aiHashtags,
  hashtagsLoading,
  aiCTA,
  ctaLoading,
}) => {
  if (!finalImage) return null;

  return (
    <div className="w-full max-w-lg mt-6">
      <h2 className="text-base font-semibold mb-2">🪄 Suggested Social Media Content</h2>
      <div className="mb-2 rounded border p-3 bg-yellow-50 flex flex-col gap-2">
        <div>
          <span className="font-medium">Caption:</span>
          {captionLoading ? (
            <span className="ml-2 text-xs text-gray-500 animate-pulse">Generating...</span>
          ) : (
            <span className="ml-2">{aiCaption || <span className="text-xs text-gray-400">No suggestion</span>}</span>
          )}
        </div>
        <div>
          <span className="font-medium">Hashtags:</span>
          {hashtagsLoading ? (
            <span className="ml-2 text-xs text-gray-500 animate-pulse">Generating...</span>
          ) : (
            <span className="ml-2">{aiHashtags || <span className="text-xs text-gray-400">No suggestion</span>}</span>
          )}
        </div>
        <div>
          <span className="font-medium">CTA:</span>
          {ctaLoading ? (
            <span className="ml-2 text-xs text-gray-500 animate-pulse">Generating...</span>
          ) : (
            <span className="ml-2">{aiCTA || <span className="text-xs text-gray-400">No suggestion</span>}</span>
          )}
        </div>
      </div>
      <div className="text-xs text-muted-foreground">Copy and customize these for your post, or try generating again!</div>
    </div>
  );
};
