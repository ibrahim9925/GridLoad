// @ts-nocheck

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type SiteContent = Record<string, any>;

export function useSiteContent(sectionKey: string) {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("site_content")
      .select("content_data")
      .eq("section_key", sectionKey)
      .maybeSingle();
    if (error) setError(error.message);
    // Ensure content_data is an object before setting state
    if (data && data.content_data && typeof data.content_data === "object" && !Array.isArray(data.content_data)) {
      setContent(data.content_data as SiteContent);
    } else {
      setContent(null);
    }
    setLoading(false);
  }, [sectionKey]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const saveContent = async (contentData: SiteContent) => {
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from("site_content")
      .update({ content_data: contentData, updated_at: new Date().toISOString() })
      .eq("section_key", sectionKey);
    if (error) setError(error.message);
    setContent(contentData);
    setSaving(false);
  };

  return { content, setContent, loading, saving, error, saveContent, refetch: fetchContent };
}
