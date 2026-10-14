// Metro(React Native 번들러) 설정.
//
// 모노레포의 `packages/domain`(@eodisan/domain) 을 **소스(src/) 그대로** 읽습니다.
// 패키지의 package.json `exports` 는 빌드 산출물 dist/ 를 가리키지만 dist/ 는 gitignore 라서
// 새로 clone 한 환경에서도 빌드 없이 돌아가도록 resolveRequest 로 경로를 바꿔치기합니다.
// (tsc 쪽은 tsconfig.json 의 `paths` 가 같은 일을 합니다.)
const path = require('path');
const fs = require('fs');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const domainRoot = path.resolve(projectRoot, '../../packages/domain');
const domainSrc = path.join(domainRoot, 'src');
const domainEntry = path.join(domainSrc, 'index.ts');

const config = getDefaultConfig(projectRoot);

if (fs.existsSync(domainEntry)) {
  // Metro 는 projectRoot 밖의 파일을 기본적으로 감시하지 않으므로 패키지 폴더를 추가합니다.
  config.watchFolders = [...(config.watchFolders ?? []), domainRoot];
  config.resolver.nodeModulesPaths = [
    ...(config.resolver.nodeModulesPaths ?? []),
    path.resolve(projectRoot, 'node_modules'),
  ];

  const defaultResolve = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    // 1) '@eodisan/domain' → packages/domain/src/index.ts
    if (moduleName === '@eodisan/domain') {
      return { type: 'sourceFile', filePath: domainEntry };
    }
    // 2) 패키지 소스는 ESM 관례대로 `import './types.js'` 라고 쓰지만 실제 파일은 .ts 입니다.
    //    도메인 소스 안에서 나온 상대 경로 .js import 는 확장자를 떼서 Metro 가 .ts 를 찾게 합니다.
    if (
      context.originModulePath &&
      context.originModulePath.startsWith(domainSrc) &&
      moduleName.startsWith('.') &&
      moduleName.endsWith('.js')
    ) {
      const stripped = moduleName.slice(0, -3);
      return (defaultResolve ?? context.resolveRequest)(context, stripped, platform);
    }
    return (defaultResolve ?? context.resolveRequest)(context, moduleName, platform);
  };
}

module.exports = config;
