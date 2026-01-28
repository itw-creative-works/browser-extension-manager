/**
 * Webpack Loader: strip-dev-blocks
 * Strips code between /* @dev-only:start * / and /* @dev-only:end * / markers
 * Runs before webpack bundles, so the source code is still clean
 */

const START_MARKER = '/* @dev-only:start */';
const END_MARKER = '/* @dev-only:end */';

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = function stripDevBlocksLoader(source) {
  // Only strip in build mode
  if (process.env.BXM_BUILD_MODE !== 'true') {
    return source;
  }

  // Strip everything between start and end markers
  const pattern = new RegExp(
    `${escapeRegex(START_MARKER)}[\\s\\S]*?${escapeRegex(END_MARKER)}`,
    'g'
  );

  return source.replace(pattern, '');
};