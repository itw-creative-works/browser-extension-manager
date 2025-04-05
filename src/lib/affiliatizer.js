// Suppported affiliates
const map = [
  // Amazon
  {
    id: 'amazon',
    match: /amazon.com/,
    replace: {
      href: 'https://giftly.app/product?url=https%3A%2F%2Fwww.amazon.com%2Fdp%2FB07PCMWTSG%3F%26linkCode%3Dll2%26tag%3Ditwcw1--promo-server-20%26linkId%3D38af0d81784751e4cf5b1136b8c32f63%26language%3Den_US%26ref_%3Das_li_ss_tl',
    },
  },

  // Meals
  {
    id: 'factor',
    match: /factor75.com/,
    replace: {
      href: 'https://www.factor75.com/plans?c=HS-HC5E50S4I&discount_comm_id=cd2585e3-0672-4633-90a6-64f6883222a3&plans_ab=true&utm_campaign=clipboard&utm_medium=referral&utm_source=raf-share-hpt',
    },
  },

  // Rewards
  {
    id: 'honeygain',
    match: /honeygain.com/,
    replace: {
      href: 'https://r.honeygain.me/IANA1DCDB1',
    },
  },
  {
    id: 'jumptask',
    match: /app.jumptask.io/,
    replace: {
      href: 'https://www.jumptask.io/r/dazelafojafy',
    },
  },
  {
    id: 'pawns',
    match: /pawns.app/,
    replace: {
      href: 'https://pawns.app/?r=5798401',
    },
  },

  // Shopping
  {
    id: 'capitaloneshopping',
    match: /capitaloneshopping.com/,
    replace: {
      href: 'https://capitaloneshopping.com/r/5G2HF1D',
    },
  },
  {
    id: 'coupert',
    match: /coupert.com/,
    replace: {
      href: 'https://www.coupert.com/invite/4yvqkp7da',
    },
  },
  {
    id: 'honey',
    match: /joinhoney.com/,
    replace: {
      href: 'https://www.joinhoney.com/ref/8dryc8u',
    },
  },
  {
    id: 'lolli',
    match: /lolli.com/,
    replace: {
      href: 'https://lolli.com/share/ydsPvyc23m',
    },
  },
  {
    id: 'paypal',
    match: /paypal.com/,
    replace: {
      href: 'https://py.pl/4gPBBJjLbbz',
    },
  },
  {
    id: 'rakuten',
    match: /rakuten.com/,
    replace: {
      href: 'https://www.rakuten.com/r/IANWIE8?eeid=28187',
    },
  },
  {
    id: 'upside',
    match: /upside.com/,
    replace: {
      href: 'https://upside.app.link/IAN4447',
    },
  },

  // VPN
  {
    id: 'nordvpn',
    match: /nordvpn.com/,
    replace: {
      href: 'https://ref.nordvpn.com/CHMkfrnoQtL',
    },
  },
];

function Affiliatizer() {
}

Affiliatizer.get = function () {
  return map;
};

Affiliatizer.initialize = async function (Manager) {
  // Shortcuts
  const { extension, logger } = Manager;
  const { storage } = extension;

  // Parse the URL
  const url = new URL(window.location.href);
  const query = url.searchParams;

  // Get query parameters
  const qsStatus = query.get('affiliatizerStatus');

  // Check if the URL has the affiliatizerStatus parameter
  if (qsStatus === 'reset') {
    // Log
    logger.log('Resetting affiliatizer data...');

    // Reset the data
    await storage.set({ affiliatizer: null });
    query.delete('affiliatizerStatus');

    // Log
    logger.log('Reset!');
  } else if (qsStatus === 'block') {
    // Log
    logger.log('Affiliatizer is blocked.');

    // Set affiliatizer to 'block' in storage
    await storage.set({ affiliatizer: 'block' });
  } else if (qsStatus === 'allow') {
    // Log
    logger.log('Affiliatizer is allowed.');

    // Set affiliatizer to 'allow' in storage
    await storage.set({ affiliatizer: 'allow' });
  }

  // Check if affiliatizer is blocked
  const data = await storage.get() || {};
  const status = data.affiliatizer || 'allow';

  // Check if it's blocked
  if (status === 'block') {
    logger.log('Affiliatizer is blocked.');
    return;
  }

  // Loop through the map
  map.forEach((item, i) => {
    // Get the item
    const id = item.id;

    // Log
    // logger.log('Checking for', id, item.match, 'in', url.hostname, '...');

    // Check if the item matches
    if (!item.match.test(url.hostname)) {
      return;
    }

    // Process
    storage.get((data) => {
      // Log
      logger.log('Matched', data);

      // Set the default data
      const now = new Date();
      const timestamp = new Date(data.affiliatizer && data.affiliatizer[id] ? data.affiliatizer[id].timestamp || 0 : 0);
      const differenceInHours = (now - timestamp) / 1000 / 60 / 60;

      // Check if the timestamp is older than 24 hours
      if (differenceInHours < 24) {
        return;
      }

      // Build the new URL
      const newURL = new URL(url.href);

      // Query
      if (item.replace.query) {
        Object.keys(item.replace.query).forEach((key, i) => {
          newURL.searchParams.set(key, item.replace.query[key]);
        });
      }

      // Path
      if (item.replace.pathname) {
        newURL.pathname = item.replace.pathname;
      }

      // Href
      if (item.replace.href) {
        newURL.href = item.replace.href;
      }

      // Log
      logger.log('Redirecting...', newURL.toString());

      // Save to storage
      const newTimestamp = {
        timestamp: now.toISOString(),
      };
      const updatedData = Object.assign({}, data.affiliatizer, { [id]: newTimestamp });
      storage.set({ affiliatizer: updatedData });

      // Redirect
      window.location.href = newURL.toString();
    });
  });
}

// Export
module.exports = Affiliatizer;
