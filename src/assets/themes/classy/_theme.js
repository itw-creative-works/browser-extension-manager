// Import the theme entry point
import bootstrap from '../bootstrap/js/index.umd.js';

// Make Bootstrap available globally
window.bootstrap = bootstrap;

// Log that we've MADE IT
/* @dev-only:start */
{
  console.log('Classy theme loaded successfully (assets/themes/classy/_theme.js)');
}
/* @dev-only:end */

// // Import navbar scroll functionality
// import index from './js/_index.js';

// // Initialize navbar scroll effect when DOM is ready
// if (document.readyState === 'loading') {
//   document.addEventListener('DOMContentLoaded', () => {
//     index();
//   });
// } else {
//   index();
// }

