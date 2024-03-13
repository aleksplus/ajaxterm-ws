const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

const isProduction = process.env.NODE_ENV === 'production';

const srcDir = path.join(__dirname, '.', 'src');

const config = {
  entry: {
    index: path.resolve(srcDir, 'index.js')
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'var', // this line makes the bundle accessible globally
    library: 'ajaxterm'
  },
  plugins: [
    new CopyPlugin({
      patterns: [{ from: 'src/index.css', to: '.', context: '.' }],
      options: {},
    }),
  ],
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/i,
        loader: 'babel-loader',
      }
      // Add your rules for custom modules here
      // Learn more about loaders from https://webpack.js.org/loaders/
    ],
  },
};

module.exports = () => {
  if (isProduction) {
    config.mode = 'production';
  } else {
    config.mode = 'development';
  }
  return config;
};
