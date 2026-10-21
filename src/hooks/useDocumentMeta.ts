import { metaForPath, type PageMeta } from '@shared/seo';
import { useEffect } from 'react';

function setMeta(selector: string, attribute: 'name' | 'property', key: string, content: string | null) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (content === null) {
    element?.remove();
    return;
  }
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

/** Actualiza título y metadatos al navegar (el servidor ya los inyecta en la carga inicial). */
export function useDocumentMeta(pathname: string, overrides: Partial<Pick<PageMeta, 'title' | 'description'>> = {}) {
  const { title: titleOverride, description: descriptionOverride } = overrides;

  useEffect(() => {
    const meta = metaForPath(pathname, window.location.origin);
    const title = titleOverride ?? meta.title;
    const description = descriptionOverride ?? meta.description;
    document.title = title;
    setMeta('meta[name="description"]', 'name', 'description', description);
    setMeta('meta[property="og:title"]', 'property', 'og:title', title);
    setMeta('meta[property="og:description"]', 'property', 'og:description', description);
    setMeta('meta[property="og:url"]', 'property', 'og:url', window.location.origin + pathname);
    setMeta('meta[name="robots"]', 'name', 'robots', meta.noindex ? 'noindex' : null);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = window.location.origin + (pathname === '/' ? '' : pathname);
  }, [pathname, titleOverride, descriptionOverride]);
}
