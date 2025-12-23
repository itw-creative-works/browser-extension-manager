// Auth helpers for cross-context auth sync in browser extensions
// Used by popup.js, options.js, sidepanel.js, page.js
//
// Architecture:
// - Background.js is the SOURCE OF TRUTH for authentication
// - On context load, contexts wait for WM auth to settle, then ask background if in sync
// - If out of sync, background provides a fresh custom token (fetched from server)
// - No BEM-specific storage - Web Manager handles auth state internally

/**
 * Sync auth state with background.js on context load
 * Waits for WM auth to settle, then asks background if in sync
 * @param {Object} context - The manager instance (must have extension, webManager, logger)
 */
export async function syncWithBackground(context) {
  const { extension, webManager, logger } = context;

  try {
    // Wait for WM auth state to settle FIRST (prevents race conditions)
    const localState = await new Promise(resolve => {
      webManager.auth().listen({ once: true }, resolve);
    });

    const localUid = localState.user?.uid || null;
    logger.log('[AUTH-SYNC] Local auth state settled, UID:', localUid);

    // Ask background for auth state comparison
    const response = await new Promise((resolve) => {
      extension.runtime.sendMessage(
        { command: 'bxm:syncAuth', contextUid: localUid },
        (res) => {
          if (extension.runtime.lastError) {
            logger.log('[AUTH-SYNC] Background not ready:', extension.runtime.lastError.message);
            resolve({ needsSync: false });
            return;
          }
          resolve(res || { needsSync: false });
        }
      );
    });

    // Already in sync
    if (!response.needsSync) {
      logger.log('[AUTH-SYNC] Already in sync with background');
      return;
    }

    // Need to sign out (background is signed out, context is signed in)
    if (response.signOut) {
      logger.log('[AUTH-SYNC] Background signed out, signing out context...');
      await webManager.auth().signOut();
      return;
    }

    // Need to sign in with token
    if (response.customToken) {
      logger.log('[AUTH-SYNC] Syncing with background...', response.user?.email);
      await webManager.auth().signInWithCustomToken(response.customToken);
      logger.log('[AUTH-SYNC] Synced successfully');
    }

  } catch (error) {
    logger.error('[AUTH-SYNC] Error syncing with background:', error.message);
  }
}

/**
 * Set up listener for auth token broadcasts from background.js
 * Handles both sign-in broadcasts and sign-out broadcasts
 * @param {Object} context - The manager instance (must have extension, webManager, logger)
 */
export function setupAuthBroadcastListener(context) {
  const { webManager, logger } = context;

  // Listen for messages from service worker (background.js)
  navigator.serviceWorker?.addEventListener('message', async (event) => {
    const { command, token } = event.data || {};

    // Handle sign-in broadcast
    if (command === 'bxm:signInWithToken' && token) {
      logger.log('[AUTH-BROADCAST] Received sign-in broadcast');
      try {
        await webManager.auth().signInWithCustomToken(token);
        logger.log('[AUTH-BROADCAST] Signed in via broadcast');
      } catch (error) {
        logger.error('[AUTH-BROADCAST] Error signing in:', error.message);
      }
      return;
    }

    // Handle sign-out broadcast
    if (command === 'bxm:signOut') {
      // Skip if already signed out (prevents loops)
      if (!webManager.auth().getUser()) {
        logger.log('[AUTH-BROADCAST] Already signed out, ignoring broadcast');
        return;
      }
      logger.log('[AUTH-BROADCAST] Received sign-out broadcast');
      try {
        await webManager.auth().signOut();
        logger.log('[AUTH-BROADCAST] Signed out via broadcast');
      } catch (error) {
        logger.error('[AUTH-BROADCAST] Error signing out:', error.message);
      }
    }
  });

  logger.log('[AUTH-BROADCAST] Broadcast listener set up');
}

/**
 * Set up listener to notify background when user signs out from this context
 * @param {Object} context - The manager instance (must have extension, webManager, logger)
 */
export function setupSignOutListener(context) {
  const { extension, webManager, logger } = context;

  // Track previous user to detect sign-out
  let previousUid = null;

  webManager.auth().listen((state) => {
    const currentUid = state.user?.uid || null;

    // Detect sign-out (had user, now don't)
    if (previousUid && !currentUid) {
      logger.log('[AUTH-SYNC] Detected sign-out, notifying background...');
      extension.runtime.sendMessage({ command: 'bxm:signOut' });
    }

    previousUid = currentUid;
  });

  logger.log('[AUTH-SYNC] Sign-out listener set up');
}

/**
 * Open auth page in new tab (for signing in via website)
 * @param {Object} context - The manager instance (must have extension, webManager, logger)
 * @param {Object} options - Options object
 * @param {string} options.path - Path to open (default: '/token')
 * @param {string} options.authReturnUrl - Return URL for electron/deep links
 */
export function openAuthPage(context, options = {}) {
  const { extension, webManager, logger } = context;

  // Get auth domain from config
  const authDomain = webManager.config?.firebase?.app?.config?.authDomain;

  if (!authDomain) {
    logger.error('No authDomain configured');
    return;
  }

  // Build the URL
  const path = options.path || '/token';
  const authUrl = new URL(path, `https://${authDomain}`);

  // Add return URL if provided (for electron/deep links)
  if (options.authReturnUrl) {
    authUrl.searchParams.set('authReturnUrl', options.authReturnUrl);
  }

  // Log
  logger.log('Opening auth page:', authUrl.toString());

  // Get current active tab so we can restore it after auth
  extension.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const authSourceTabId = tabs[0]?.id;

    // Add source tab ID to URL so background can restore it
    if (authSourceTabId) {
      authUrl.searchParams.set('authSourceTabId', authSourceTabId);
    }

    // Open in new tab
    extension.tabs.create({ url: authUrl.toString() });
  });
}

/**
 * Set up DOM event listeners for auth buttons (sign in, account)
 * Uses event delegation so it works with dynamically rendered content
 * @param {Object} context - The manager instance (must have extension, webManager, logger)
 */
export function setupAuthEventListeners(context) {
  // Only set up once DOM is ready
  if (typeof document === 'undefined') {
    return;
  }

  // Sign in button (.auth-signin-btn) - opens auth page
  document.addEventListener('click', (event) => {
    const $signInBtn = event.target.closest('.auth-signin-btn');
    if (!$signInBtn) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    openAuthPage(context);
  });

  // Note: .auth-signout-btn is handled by web-manager's auth module
  // setupSignOutListener detects sign-out and notifies background

  // Log
  context.logger.log('Auth event listeners set up');
}
