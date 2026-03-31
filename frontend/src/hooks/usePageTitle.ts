import { useEffect } from "react";

const DEFAULT_TITLE = "MOLi 門禁管理系統";

/**
 * Custom hook to set the document title dynamically
 * @param title - The page title
 * @param suffix - The suffix to append (default: 'MOLi 門禁管理系統')
 */
export function usePageTitle(title: string, suffix = DEFAULT_TITLE) {
  useEffect(() => {
    document.title = title ? `${title} - ${suffix}` : suffix;

    // Cleanup: restore default title when component unmounts
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [title, suffix]);
}
