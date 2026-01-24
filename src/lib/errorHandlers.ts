/**
 * Global error handlers for catching unhandled errors in WebView/Capacitor
 * These help diagnose crashes that happen silently in native environments
 */

export function setupGlobalErrorHandlers() {
  // Catch synchronous errors
  window.onerror = (message, source, lineno, colno, error) => {
    console.error('[GlobalError]', {
      message,
      source,
      lineno,
      colno,
      stack: error?.stack,
    });
    
    // Optionally show a visible indicator for debugging
    // This can help catch errors that crash the WebView
    if (import.meta.env.DEV) {
      console.error('[GlobalError] Full error:', error);
    }
    
    // Return false to allow default error handling
    return false;
  };

  // Catch unhandled promise rejections
  window.onunhandledrejection = (event) => {
    console.error('[UnhandledRejection]', {
      reason: event.reason,
      stack: event.reason?.stack,
    });
    
    if (import.meta.env.DEV) {
      console.error('[UnhandledRejection] Full reason:', event.reason);
    }
  };

  console.log('[ErrorHandlers] Global error handlers installed');
}
