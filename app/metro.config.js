const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
// app/ 밖의 shared/(웹·앱 공용 데이터·규칙)를 번들에 포함
config.watchFolders = [path.resolve(__dirname, '../shared')];

module.exports = config;
