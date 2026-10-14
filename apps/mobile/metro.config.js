// Metro(React Native 번들러) 설정.
// 모노레포의 `packages/domain` 을 file: 의존성(심볼릭 링크)으로 쓰므로 Metro 가 그 폴더도 감시하도록 알려줍니다.
const path = require('path');
const fs = require('fs');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const domainRoot = path.resolve(projectRoot, '../../packages/domain');

const config = getDefaultConfig(projectRoot);

if (fs.existsSync(domainRoot)) {
  config.watchFolders = [...(config.watchFolders ?? []), domainRoot];
  config.resolver.nodeModulesPaths = [
    ...(config.resolver.nodeModulesPaths ?? []),
    path.resolve(projectRoot, 'node_modules'),
  ];
}

module.exports = config;
