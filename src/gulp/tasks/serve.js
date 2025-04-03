// Libraries
const Manager = new (require('../../build.js'));
const logger = Manager.logger('serve');
const path = require('path');
const browserSync = require('browser-sync').create();

// Load package
const package = Manager.getPackage('main');
const project = Manager.getPackage('project');
const rootPathPackage = Manager.getRootPath('main');
const rootPathProject = Manager.getRootPath('project');

// Local URL
let localUrl;
let externalUrl;

// BrowserSync settings
const settings = {
  port: 4000,
  browser: 'default',
  cors: true,
  open: false,
  ghostMode: false,
  server: {
    // TODO: FIX?
    // baseDir: '_site',
    baseDir: 'dist',
    middleware: async function (req, res, next) {
      const url = new URL(`${localUrl}${req.url}`);
      const pathname = url.pathname;

      // Set the query object
      req.query = {};
      req.body = {};

      // If the file has no ext, log it
      if (!path.extname(pathname)) {
        logger.log(`Serving ${pathname}`);
      }

      // Process the post request
      if (pathname.match(/\/_process/)) {
        const qsUrl = url.searchParams.get('url');
        let lib;

        // Set query
        url.searchParams.forEach((value, key) => {
          req.query[key] = value;
        })

        // Set body
        if (req.method === 'POST') {
          req.body = await receiveRequestBody(req);
        }

        // Try to load the library
        try {
          // Clear the cache
          delete require.cache[require.resolve(`../${qsUrl}`)];

          // Load the library
          lib = require(`../${qsUrl}`);
        } catch (e) {
          // Log the error
          logger.error(`Error processing ${qsUrl}`);

          // Set the status code
          res.statusCode = 500;

          // Return an error
          return res.write(`Cannot find ${qsUrl}`);
        }

        // Log
        logger.log(`Processing ${qsUrl}`);

        // Process the library
        return await lib({
          req: req,
          res: res,
        })
        .then((r) => {
          // Set the status code
          res.statusCode = 200;

          // Write the response (if it's JSON, set the content type)
          try {
            r = JSON.stringify(r);
            res.setHeader('Content-Type', 'application/json');
          } catch (e) {
          }

          // End the response
          res.write(r);
          res.end();
        })
        .catch((e) => {
          // Set the status code
          res.statusCode = 500;

          // Write the error
          res.write(`Error processing ${qsUrl}: ${e}`);
          res.end();
        });
      }

      // Check if the URL is missing a trailing slash and does not have an extension
      if (!pathname.endsWith('/') && !path.extname(pathname)) {
        // Get the new URL
        const newURL = `${pathname}.html`;

        // Log
        // logger.log(`Rewriting ${pathname} to ${newURL}`);

        // Rewrite it to serve the .html extension
        req.url = newURL;
      }

      // Special case: Rewrite /blog/ to blog.html since Jekyll fucks it up locally
      if (pathname === '/blog/') {
        req.url = '/blog.html';
      }

      // Continue
      return next();
    },
  },
}

// Task
module.exports = function serve(complete) {
  // Log
  logger.log('Starting...');

  // Initialize browserSync
  browserSync.init(settings, async (e, instance) => {
    if (e) {
      return logger.error(e);
    }

    // Get URLs
    localUrl = instance.options.get('urls').get('local');
    externalUrl = instance.options.get('urls').get('external');

    // Write the config file
    // jetpack.write('.temp/_config_browsersync.yml', `url: ${externalUrl}`);

    // Set global variable to access browserSync in other files
    global.browserSync = browserSync;

    // Log
    logger.log('Finished!');

    // Complete
    return complete();
  });
};

function receiveRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = [];

    // Listen for data
    req.on('data', (chunk) => {
      body.push(chunk.toString());
    });

    // Listen for errors
    req.on('error', (err) => {
      return reject(err);
    });

    // Listen for the end of the request
    req.on('end', () => {
      body = body.join('');

      // Attempt to parse the body as JSON
      try {
        return resolve(JSON.parse(body));
      } catch (e) {
        return resolve(body);
      }
    });
  });
}
