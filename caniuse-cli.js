const argsParser = require('./args-parser');
const { toStreams } = require('./caniuse.decaffeinate');

const {
  argv
} = argsParser;

if (argv.web) {
  return open(`http://caniuse.com/#search=${encodeURIComponent(argv._.join(' '))}`);
}

toStreams(argv);
