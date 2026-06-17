const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const devCerts = require("office-addin-dev-certs");

module.exports = async (env, options) => {
  const isProd = options.mode === "production";

  const config = {
    devtool: isProd ? false : "source-map",
    entry: {
      taskpane: "./src/taskpane/taskpane.ts",
    },
    output: {
      filename: "[name].js",
      path: path.resolve(__dirname, "dist"),
      clean: true,
    },
    resolve: {
      extensions: [".ts", ".js"],
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: "ts-loader",
          exclude: /node_modules/,
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        filename: "taskpane.html",
        template: "./src/taskpane/taskpane.html",
        chunks: ["taskpane"],
      }),
      new CopyWebpackPlugin({
        patterns: [{ from: "assets", to: "assets" }, { from: "manifest.xml", to: "manifest.xml" }],
      }),
    ],
    devServer: {
      static: path.resolve(__dirname, "dist"),
      port: 3000,
      server: {
        type: "https",
        options: isProd ? {} : await devCerts.getHttpsServerOptions(),
      },
      proxy: [
        {
          context: ["/api"],
          target: "http://localhost:3001",
          secure: false,
        },
      ],
    },
  };

  return config;
};
