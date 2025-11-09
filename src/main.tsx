import { Component, ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import './index.css';

// Sécurise systématiquement les iframes tierces en retirant l'option
// "allow-same-origin" lorsque "allow-scripts" est demandé. Cela empêche
// l'iframe d'échapper à son sandbox tout en conservant l'exécution de scripts
// nécessaire aux embeds modernes (YouTube, Loom, etc.).
function enforceIframeSandboxPolicy() {
  if (typeof document === 'undefined') return;

  const sanitizeIframe = (iframe: HTMLIFrameElement) => {
    const sandbox = iframe.getAttribute('sandbox');
    if (!sandbox) return;

    const tokens = sandbox
      .split(/\s+/)
      .map(token => token.trim())
      .filter(Boolean);

    const hasAllowScripts = tokens.includes('allow-scripts');
    const hasAllowSameOrigin = tokens.includes('allow-same-origin');

    if (!hasAllowScripts || !hasAllowSameOrigin) return;

    // Sécurité iframe : on retire allow-same-origin lorsqu'allow-scripts est présent
    // pour empêcher l'évasion du sandbox. Les scripts restent autorisés mais l'iframe
    // n'a plus un accès direct de type same-origin et doit utiliser postMessage.
    const filteredTokens = tokens.filter(token => token !== 'allow-same-origin');
    iframe.setAttribute('sandbox', filteredTokens.join(' '));
  };

  const scanNode = (root: ParentNode) => {
    if ('querySelectorAll' in root) {
      root.querySelectorAll('iframe[sandbox]').forEach(node => {
        if (node instanceof HTMLIFrameElement) {
          sanitizeIframe(node);
        }
      });
    }
  };

  scanNode(document);

  if (typeof MutationObserver === 'undefined') return;

  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node instanceof HTMLIFrameElement) {
            sanitizeIframe(node);
          } else if (node instanceof Element) {
            scanNode(node);
          }
        });
      }

      if (mutation.type === 'attributes' && mutation.target instanceof HTMLIFrameElement) {
        sanitizeIframe(mutation.target);
      }
    });
  });

  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['sandbox'],
  });
}

type PreloadAsValue = 'script' | 'style' | 'font' | 'image' | 'video' | 'audio' | 'fetch';

function guessPreloadAs(href: string): PreloadAsValue | undefined {
  const url = href.split('?')[0]?.toLowerCase() ?? '';
  if (url.endsWith('.js') || url.endsWith('.mjs') || url.endsWith('.cjs')) return 'script';
  if (url.endsWith('.css')) return 'style';
  if (url.endsWith('.woff') || url.endsWith('.woff2') || url.endsWith('.ttf') || url.endsWith('.otf')) return 'font';
  if (url.endsWith('.png') || url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.webp') || url.endsWith('.gif') || url.endsWith('.svg') || url.endsWith('.avif')) return 'image';
  if (url.endsWith('.mp4') || url.endsWith('.webm')) return 'video';
  if (url.endsWith('.mp3') || url.endsWith('.wav') || url.endsWith('.ogg')) return 'audio';
  if (url.endsWith('.json')) return 'fetch';
  return undefined;
}

function cleanupPreloadLinks() {
  if (typeof document === 'undefined') return;

  document.querySelectorAll<HTMLLinkElement>('link[rel="preload"]').forEach(link => {
    const href = link.getAttribute('href')?.trim();
    if (!href) {
      link.remove();
      return;
    }

    const expectedAs = guessPreloadAs(href);
    if (!expectedAs) {
      link.remove();
      return;
    }

    const currentAs = link.getAttribute('as')?.trim();
    if (currentAs !== expectedAs) {
      link.setAttribute('as', expectedAs);
    }

    if (expectedAs === 'font' && !link.hasAttribute('crossorigin')) {
      link.setAttribute('crossorigin', 'anonymous');
    }
  });
}

let lovableTokenHandled = false;

async function consumeLovableTokenFromUrl() {
  if (typeof window === 'undefined' || lovableTokenHandled) return;

  lovableTokenHandled = true;

  const currentUrl = new URL(window.location.href);
  const token = currentUrl.searchParams.get('__lovable_token');

  if (!token) {
    return;
  }

  const sanitizedToken = token.trim();
  const nextSearchParams = currentUrl.searchParams;
  nextSearchParams.delete('__lovable_token');

  const nextSearch = nextSearchParams.toString();
  const replacementPath = `${currentUrl.pathname}${nextSearch ? `?${nextSearch}` : ''}${currentUrl.hash}`;

  try {
    if (sanitizedToken) {
      await fetch('/api/lovable/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token: sanitizedToken }),
      });
    }
  } catch (error) {
    console.error('[Lovable] Failed to persist onboarding token', error);
  } finally {
    window.history.replaceState(window.history.state, document.title, replacementPath || currentUrl.pathname);
  }
}

cleanupPreloadLinks();
consumeLovableTokenFromUrl();
enforceIframeSandboxPolicy();

if (import.meta.env.DEV) {
  console.info('[ENV]', {
    hasUrl: Boolean(import.meta.env.VITE_SUPABASE_URL),
    hasAnon: Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY),
    hasPubl: Boolean(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY),
  });
}

type ErrorBoundaryState = { error?: Error };

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: undefined };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Runtime error:', error);
    console.error('Component stack:', errorInfo.componentStack);
    console.error('Error type:', error.name, 'Message:', error.message);
  }

  render() {
    if (this.state.error) {
      return (
        <pre style={{ padding: 16, color: 'crimson', whiteSpace: 'pre-wrap' }}>
          {String(this.state.error.message ?? this.state.error)}
        </pre>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
