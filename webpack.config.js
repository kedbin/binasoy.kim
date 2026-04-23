const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = (env, argv = {}) => {
    const mode = argv.mode || 'development';
    const isProduction = mode === 'production';

    return {
        mode,
        entry: {
            main: './src/script/index.js',
        },
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: '[name].js',
        },
        devtool: isProduction ? 'source-map' : 'inline-source-map',
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
            hints: isProduction ? 'warning' : false,
            maxAssetSize: 1024 * 1024,
            maxEntrypointSize: 512 * 1024,
            assetFilter: (assetFilename) => !assetFilename.endsWith('.pptx'),
        },
        devServer: {
            static: './dist',
            open: true,
            client: {
                overlay: {
                    errors: true,
                    warnings: false,
                },
            },
        },
    };
};
