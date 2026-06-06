const nodeExternals = require('webpack-node-externals'); module.exports = function(options, webpack) { options.externals = [ nodeExternals({ allowlist: [/@cogniquest/] }) ]; return options; }; 
