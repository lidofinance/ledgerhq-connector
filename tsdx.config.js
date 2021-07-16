const path = require('path');

module.exports = {
  rollup(config, options) {
    const { output, ...restConfig } = config;
    const { file, ...restOutput } = output;

    return {
      ...restConfig,
      output: {
        ...restOutput,
        dir: path.join(__dirname, `dist/${restOutput.format}`),
      },
    };
  },
};
