var agents, argv, colors, currentVersion, data, eras, linewrap, makeResult, makeResults, open, os, osHomedir, path, resultmap, searchkey, showFeature, slowFind, supernums, types, versionrange, wrap, xwrap,
  indexOf = [].indexOf || function(item) {
    for (var i = 0, l = this.length; i < l; i++) {
      if (i in this && this[i] === item) return i;
    }
    return -1;
  };

data = require('caniuse-db/data.json');

colors = require('colors');

linewrap = require('linewrap');

open = require('open');

path = require('path');

osHomedir = require('os-homedir');

os = require('os');

argv = require('yargs').option('short', {
  alias: 's',
  type: 'boolean',
  "default": void 0,
  describe: "Short output: show browsers on one line and don't display notes or description (default when displaying multiple results)"
}).option('long', {
  alias: 'l',
  type: 'boolean',
  "default": void 0,
  describe: "Long output: show more information (default when displaying a single result)"
}).option('oneline', {
  alias: '1',
  type: 'boolean',
  "default": false,
  describe: "One-line output: just global percentages, no per-browser info"
}).option('oneline-browser', {
  alias: '2',
  type: 'boolean',
  "default": false,
  describe: "One-line output with browser info, implies --abbrev and --current"
}).option('abbrev', {
  alias: 'a',
  type: 'boolean',
  "default": false,
  describe: "Abbreviate browser names"
}).option('percentages', {
  alias: 'p',
  type: 'boolean',
  "default": false,
  describe: "Include browser version usage percentages"
}).option('future', {
  alias: 'f',
  type: 'boolean',
  "default": false,
  describe: "Include future browser versions"
}).option('current', {
  alias: 'c',
  type: 'boolean',
  "default": false,
  describe: "Don't include old browser versions, equivalent to --era e0"
}).option('era', {
  alias: 'e',
  type: 'string',
  describe: "How many versions back to go, e0 to " + (Object.keys(data.eras)[0])
}).option('mobile', {
  alias: 'm',
  type: 'boolean',
  "default": false,
  describe: "Include mobile browsers"
}).option('desktop', {
  alias: 'd',
  type: 'boolean',
  "default": true,
  describe: "Include desktop browsers"
}).option('browser', {
  alias: 'b',
  type: 'string',
  describe: "Show results for these browsers, comma-separated (" + (Object.keys(data.agents)) + ")"
}).option('ascii', {
  alias: 'A',
  type: 'boolean',
  "default": false,
  describe: "UTF-8 symbols replacement with ASCII description"
}).option('web', {
  alias: 'w',
  type: 'boolean',
  "default": false,
  describe: "Go to the search page on caniuse.com"
}).option('config', {
  alias: 'C',
  type: 'string',
  "default": path.join(osHomedir(), '.caniuse.json'),
  describe: "Specify a config file with default options"
}).config('config').help('help').argv;

resultmap = {
  y: "✔",
  n: "✘",
  a: "◒",
  u: "‽",
  i: "ⓘ",
  w: "⚠"
};

supernums = "⁰¹²³⁴⁵⁶⁷⁸⁹";

if (os.platform() === 'win32') {
  resultmap = {
    y: "\u221A",
    n: "\u00D7",
    a: "\u0398",
    u: "\u203D",
    i: "\u24D8",
    w: "\u26A0"
  };
}

if (argv["ascii"]) {
  resultmap = {
    y: "[Yes]",
    n: "[No]",
    a: "[Partly]",
    u: "[?!]",
    i: "[Info]",
    w: "[Warning]"
  };
}

if ((Date.now() / 1000 - data.updated) > 30 * 60 * 60 * 24) {
  console.warn((resultmap.w + "  Caniuse data is more than 30 days out of date!\n   Consider updating: npm install -g caniuse-cmd\n").yellow);
}

if (argv.web) {
  return open("http://caniuse.com/#search=" + (encodeURIComponent(argv._.join(' '))));
}

searchkey = argv._.join('').toLowerCase().replace(/\W*/g, '');

agents = data.agents;

xwrap = linewrap(process.stdout.columns || 80, {
  skipScheme: 'ansi-color',
  whitespace: 'line',
  tabWidth: 2,
  wrapLineIndent: 0,
  wrapLineIndentBase: /\S/
});

wrap = function(str) {
  return xwrap(str).replace(/\u2800/g, ' ');
};

if (argv["oneline-browser"]) {
  argv.abbrev = true;
  argv.short = true;
  argv.current = true;
}

types = [];

if (argv.desktop) {
  types.push('desktop');
}

if (argv.mobile) {
  types.push('mobile');
}

eras = Object.keys(data.eras);

currentVersion = eras.indexOf("e0");

versionrange = [0, currentVersion];

if (argv.future) {
  versionrange[1] = Infinity;
}

if (argv.current) {
  versionrange[0] = currentVersion;
}

if (argv.era) {
  versionrange[0] = eras.indexOf(argv.era);
}

makeResult = function(result, nums) {
  var note, out, ref, support;
  if (nums == null) {
    nums = {};
  }
  support = result.support[0];
  out = '';
  out += (resultmap[support] || support) + "\u2800";
  if (result.version) {
    out += result.version;
  }
  if (indexOf.call(result.support, "x") >= 0) {
    out += "ᵖ";
  }
  if (note = (ref = result.support.match(/#(\d+)/)) != null ? ref[1] : void 0) {
    nums[note] = true;
    out += supernums[note];
  }
  if (argv.percentages && result.usage) {
    if (out.slice(-1) !== "\u2800") {
      out += " ";
    }
    out += "(" + (Math.round(result.usage * 1) / 1) + "%)";
  }
  out += ' ';
  switch (support) {
    case "y":
      return out.green;
    case "n":
      return out.red;
    case "a":
      return out.yellow;
    default:
      return out;
  }
};

makeResults = function(browser, stats) {
  var current, i, j, len, ref, results, support, usage, version;
  results = [];
  current = {};
  ref = browser.versions;
  for (i = j = 0, len = ref.length; j < len; i = ++j) {
    version = ref[i];
    if (!(version && (versionrange[0] <= i && i <= versionrange[1]))) {
      continue;
    }
    support = stats[version];
    usage = browser.usage_global[version] || 0;
    if (browser.versions[i + 1]) {
      version += '+';
    }
    if (support[0] === "p") {
      support = "n" + support.slice(1);
    }
    if (!current.version || current.support !== support) {
      current = {
        version: version,
        support: support,
        usage: 0
      };
      results.push(current);
    }
    current.usage += usage;
  }
  return results;
};

showFeature = function(result, opts) {
  var browser, filter, headerSep, j, len, need_note, note, num, out, percentages, ref, ref1, res, results, stats, status, tags;
  if (opts == null) {
    opts = {};
  }
  if (opts.long == null) {
    opts.long = !opts.short;
  }
  if (opts.short == null) {
    opts.short = !opts.long;
  }
  percentages = [];
  if (result.usage_perc_y) {
    percentages.push(resultmap.y + (" " + result.usage_perc_y + "%").green);
  }
  if (result.usage_perc_a) {
    percentages.push(resultmap.a + (" " + result.usage_perc_a + "%").yellow);
  }
  percentages = percentages.join(' ');
  status = opts.long ? " [" + data.statuses[result.status] + "]" : '';
  headerSep = opts["oneline-browser"] ? ": " : "\n";
  process.stdout.write((result.title.bold + " " + percentages + status) + headerSep);
  if (opts.oneline) {
    return;
  }
  if (opts.long) {
    tags = result.categories.map(function(x) {
      return '#' + x.replace(/\W/g, '');
    }).join(' ');
    console.log(wrap('\t' + result.description.trim() + ' ' + tags + '\n'));
  }
  out = [];
  if (opts.short && !opts["oneline-browser"]) {
    out.push('\t');
  }
  filter = function(browser) {
    var ref;
    if (opts.browser) {
      return indexOf.call(opts.browser.split(','), browser) >= 0;
    } else {
      return ref = agents[browser].type, indexOf.call(types, ref) >= 0;
    }
  };
  need_note = {};
  ref = result.stats;
  for (browser in ref) {
    stats = ref[browser];
    if (!(filter(browser))) {
      continue;
    }
    if (!opts.short) {
      out.push("\t");
    }
    if (opts.abbrev) {
      out.push(agents[browser].abbr + " ");
    } else {
      out.push(agents[browser].browser + " ");
    }
    results = makeResults(agents[browser], stats);
    if (results.length === 1) {
      results[0].version = null;
    }
    for (j = 0, len = results.length; j < len; j++) {
      res = results[j];
      out.push("" + (makeResult(res, need_note)));
    }
    if (!opts.short) {
      out.push("\n");
    }
  }
  console.log(wrap(out.join('')));
  if (!opts.short) {
    ref1 = result.notes_by_num;
    for (num in ref1) {
      note = ref1[num];
      if (need_note[num]) {
        console.log(wrap("\t\t" + supernums[num].yellow + note));
      }
    }
    if (result.notes) {
      return console.log(wrap("\t " + resultmap.i + ("  " + (result.notes.replace(/[\r\n]+/g, ' ')))));
    }
  }
};

slowFind = function(query) {
  var categories, description, key, keywords, matcher, ref, ref1, results, title;
  results = [];
  ref = data.data;
  for (key in ref) {
    ref1 = ref[key], title = ref1.title, description = ref1.description, keywords = ref1.keywords, categories = ref1.categories;
    matcher = (key + title + description + keywords + categories).toLowerCase().replace(/\W*/g, '');
    if (matcher.match(query)) {
      results.push(key);
    }
  }
  return results;
};

(function() {
  var feat, features, j, len, results1;
  if (feat = data.data[searchkey]) {
    return showFeature(feat, argv);
  } else if ((features = slowFind(searchkey)).length > 0) {
    if (argv.short == null) {
      argv.short = features.length > 1;
    }
    results1 = [];
    for (j = 0, len = features.length; j < len; j++) {
      feat = features[j];
      results1.push(showFeature(data.data[feat], argv));
    }
    return results1;
  } else {
    return console.error(searchkey + ": not found");
  }
})();

// ---
// generated by coffee-script 1.9.2