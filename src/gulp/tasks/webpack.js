// Libraries
const Manager = new (require('../../build.js'));
const logger = Manager.logger('webpack');
const { watch, series } = require('gulp');
const glob = require('glob').globSync;
const path = require('path');
const wp = require('webpack');
const ReplacePlugin = require('../plugins/webpack/replace.js');
const version = require('wonderful-version');

// Load package
const package = Manager.getPackage('main');
const project = Manager.getPackage('project');
const manifest = Manager.getManifest();
const config = Manager.getConfig();

// Load variables
const firebaseVersion = version.clean(require('web-manager/package.json').dependencies.firebase);

// Settings
// const MINIFY = false;
const MINIFY = Manager.getEnvironment() === 'production';
const input = [
  // Include the project's src files
  'src/assets/js/**/*.js',

  // Include service worker
  'src/assets/js/background.js',

  // Include UJ's dist files
  path.join(__dirname, '../../../dist/assets/js/**/*.js'),

  // Files to exclude
  // '!dist/**',
];
const delay = 250;

const settings = {
  mode: 'production',
  target: ['web', 'es5'],
  plugins: [
    new ReplacePlugin({
      // App & Project
      ...project,
      ...manifest,
      ...config,

      // Additional
      environment: Manager.getEnvironment(),

      // Specific
      firebaseVersion: firebaseVersion,
    }),
  ],
  entry: {
    // Entry is dynamically generated
  },
  output: {
    // Set the path to the dist folder
    path: path.resolve(process.cwd(), 'dist/assets/js'),

    // Set the public path
    // publicPath: '',
    publicPath: '/assets/js/',

    // https://github.com/webpack/webpack/issues/959
    chunkFilename: (data) => {
      // Special case for the main chunk
      if (data.chunk.name === 'main') {
        return '[name].chunk.js';
      }

      // Otherwise, use the default chunk filename
      return '[name].chunk.[chunkhash].js';
    },
    filename: (data) => {
      // Special case for the background chunk
      // if (data.chunk.name === 'background') {
      //   return 'background.js';
      // }

      // Otherwise, use the default filename
      return '[name].bundle.js';
    },
  },
  resolveLoader: {
    modules: [
      path.resolve(process.cwd(), 'node_modules', package.name, 'node_modules'), // Path to your helper module's node_modules
      path.resolve(process.cwd(), 'node_modules'), // Default project node_modules
      'node_modules', // Fallback to global
    ]
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            // presets: ['@babel/preset-env'],
            presets: [
              require.resolve('@babel/preset-env', {
                paths: [path.resolve(process.cwd(), 'node_modules', package.name, 'node_modules')]
              })
            ],
            compact: MINIFY,
          }
        }
      }
    ]
  },
  optimization: {
    minimize: MINIFY,
  },
}

// Task
function webpack(complete) {
  // Log
  logger.log('Starting...');

  // Update entry points
  updateEntryPoints();

  // Compiler
  const compiler = wp(settings, (e, stats) => {
    // Log
    logger.log('Finished!');

    // Error
    if (e) {
      logger.error(e);
    } else {
      logger.log('Stats:\n', stats.toString({ colors: true }));
    }

    // Complete
    return complete(e);
  });
}
// Watcher task
function webpackWatcher(complete) {
  // Quit if in build mode
  if (Manager.isBuildMode()) {
    logger.log('[watcher] Skipping watcher in build mode');
    return complete();
  }

  // Log
  logger.log('[watcher] Watching for changes...');

  // Watch for changes
  watch(input, { delay: delay }, webpack)
  .on('change', function(path) {
    // Log
    logger.log(`[watcher] File ${path} was changed`);
  });

  // Complete
  return complete();
}

function updateEntryPoints() {
  // Get all JS files
  const files = glob(input);

  // Update from src
  settings.entry = files.reduce((acc, file) => {
    // Get the file name
    const name = path.basename(file, path.extname(file));

    // Add to entry points starting with "./"
    // acc[name] = `./${file}`;
    acc[name] = path.resolve(file);

    // Return
    return acc;
  }, {});

  // Log
  logger.log('Updated entry points:', settings.entry);
}

// Default Task
module.exports = series(webpack, webpackWatcher);
