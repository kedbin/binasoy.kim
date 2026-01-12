const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    mode: 'development',
    entry: {
        main: './src/script/index.js',
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
    },
    devtool: 'inline-source-map',
    plugins: [
        new MiniCssExtractPlugin({
            filename: '[name].css',
        }),
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
            template: './src/index.html',
        }),
        new CopyWebpackPlugin({
            patterns: [
                { from: 'resume.pptx', to: 'resume.pptx' },
            ],
        }),
    ],
    module: {
        rules: [
            {
                test: /\.scss$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    'css-loader',
                    'sass-loader',
                ],
            },
            {
                test: /\.html$/i,
                use: 'html-loader'
            },
            {
                test: /\.(png|svg|jpg|gif|ttf|pptx|webp|webmanifest)$/i,
                type: 'asset/resource',
                generator: {
                    filename: 'images/[name]-[hash][ext]'
                }
            }
        ],
    },
    performance: {
        hints: 'warning',
        maxAssetSize: 1024 * 1024, // 1MB
        maxEntrypointSize: 512 * 1024, // 512KB
    },
    devServer: {
        static: './dist',
        open: true,
    },
};

