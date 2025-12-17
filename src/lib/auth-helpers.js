// Auth helpers for cross-context auth sync in browser extensions
// Used by popup.js, options.js, sidepanel.js, page.js

/**
 * Sign in with custom token from storage
 * @param {Object} context - The manager instance
 * @param {Object} authState - Auth state with token
 */
async function signInWithStoredToken(context, authState) {
  const { webManager, logger } = context;

  // Skip if no token
  if (!authState?.token) {
    logger.log('[AUTH-SYNC] No token in auth state, skipping sign in');
    return;
  }

  try {
    logger.log('[AUTH-SYNC] Signing in with stored token...');

    // Sign in using webManager's auth which initializes Firebase
    await webManager.auth().signInWithCustomToken(authState.token);

    logger.log('[AUTH-SYNC] Signed in successfully:', authState.user?.email);
  } catch (error) {
    // Token may have expired, clear it
    logger.error('[AUTH-SYNC] Error signing in with token:', error.message);

    // If token is invalid/expired, clear the auth state
    if (error.code === 'auth/invalid-custom-token' || error.code === 'auth/custom-token-expired') {
      logger.log('[AUTH-SYNC] Token expired, clearing auth state');
      context.extension.storage.remove('bxm:authState');
    }
  }
}

/**
 * Set up storage listener for cross-context auth sync
 * Listens for auth state changes from background.js and syncs Firebase auth
 * @param {Object} context - The manager instance (must have extension, webManager, logger)
 */
export function setupAuthStorageListener(context) {
  const { extension, webManager, logger } = context;

  // Check existing auth state on load and sign in
  extension.storage.get('bxm:authState', (result) => {
    const authState = result['bxm:authState'];

    if (authState?.token) {
      logger.log('[AUTH-SYNC] Found existing auth state, signing in...', authState.user?.email);
      signInWithStoredToken(context, authState);
    }
  });

  // Listen for WM auth state changes and sync to storage
  // When user signs out via WM, clear storage so background.js knows
  webManager.auth().listen((state) => {
    if (!state.user) {
      // User signed out - clear storage so all contexts sync
      logger.log('[AUTH-SYNC] WM auth signed out, clearing storage...');
      extension.storage.remove('bxm:authState');
    }
  });

  // Listen for storage changes from background.js
  // Note: BEM normalizes storage to sync or local, so we listen to all areas
  extension.storage.onChanged.addListener((changes) => {
    // Check for auth state change
    const authChange = changes['bxm:authState'];
    if (!authChange) {
      return;
    }

    // Log
    logger.log('[AUTH-SYNC] Auth state changed in storage:', authChange);

    // Get the new auth state
    const newAuthState = authChange.newValue;

    // If auth state was cleared (signed out)
    if (!newAuthState) {
      logger.log('[AUTH-SYNC] Auth state cleared, signing out...');
      webManager.auth().signOut();
      return;
    }

    // Sign in with the new token
    if (newAuthState?.token) {
      signInWithStoredToken(context, newAuthState);
    }
  });

  // Log
  logger.log('Auth storage listener set up');
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

  // Account button (.auth-account-btn) - opens account page on website
  document.addEventListener('click', (event) => {
    const $accountBtn = event.target.closest('.auth-account-btn');
    if (!$accountBtn) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    openAuthPage(context, { path: '/account' });
  });

  // Note: .auth-signout-btn is handled by web-manager's auth module
  // BEM's storage listener will detect the sign-out via onAuthStateChanged in background.js
  // If background hasn't initialized Firebase yet, stale storage is cleared on next auth attempt

  // Log
  context.logger.log('Auth event listeners set up');
}
