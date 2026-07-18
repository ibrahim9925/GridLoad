// @ts-nocheck
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

/**
 * Security enforcement hook for additional client-side protection
 */
export const useSecurityEnforcement = () => {
  const { toast } = useToast();

  useEffect(() => {
    // Detect and prevent common security threats
    const securityCheck = () => {
      // Check for console manipulation attempts
      if (typeof window !== 'undefined') {
        // Disable right-click in production (optional)
        const handleContextMenu = (e: MouseEvent) => {
          if (process.env.NODE_ENV === 'production') {
            e.preventDefault();
          }
        };

        // Detect developer tools opening (basic detection)
        const handleDevTools = () => {
          if (process.env.NODE_ENV === 'production') {
            const threshold = 160;
            if (
              window.outerHeight - window.innerHeight > threshold ||
              window.outerWidth - window.innerWidth > threshold
            ) {
              console.clear();
            }
          }
        };

        // Monitor for suspicious activity
        const handleKeyDown = (e: KeyboardEvent) => {
          // Block common developer shortcuts in production
          if (process.env.NODE_ENV === 'production') {
            if (
              (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) || // DevTools
              (e.ctrlKey && e.key === 'U') || // View Source
              e.key === 'F12' // DevTools
            ) {
              e.preventDefault();
              toast({
                title: "Access Restricted",
                description: "Developer tools are disabled in production mode.",
                variant: "destructive"
              });
            }
          }
        };

        // Add event listeners
        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('keydown', handleKeyDown);
        window.addEventListener('resize', handleDevTools);

        // Cleanup
        return () => {
          document.removeEventListener('contextmenu', handleContextMenu);
          document.removeEventListener('keydown', handleKeyDown);
          window.removeEventListener('resize', handleDevTools);
        };
      }
    };

    securityCheck();
  }, [toast]);

  // Security utility functions
  const sanitizeInput = (input: string): string => {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .trim();
  };

  const validateUrl = (url: string): boolean => {
    try {
      const validUrl = new URL(url);
      return ['http:', 'https:'].includes(validUrl.protocol);
    } catch {
      return false;
    }
  };

  return {
    sanitizeInput,
    validateUrl
  };
};