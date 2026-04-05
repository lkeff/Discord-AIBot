import { getGitInfo } from './utils/gitInfo';

(async () => {
  const gitInfo = await getGitInfo();
  console.log(`[startup] Git: branch=${gitInfo.branch} commit=${gitInfo.commit?.slice(0, 7) ?? 'unknown'}`);
})();

export * from './node_modules/@babel/core/src/config/files/index-browser';
export * from './node_modules/@babel/core/src/config/resolve-targets-browser';
export * from './node_modules/@babel/core/src/config/resolve-targets';
export * from './node_modules/@babel/core/src/transform-file-browser';
export * from './node_modules/@babel/core/src/transform-file';
export * from './node_modules/@babel/parser/typings/babel-parser.d';
export * from './node_modules/@babel/types/lib/index-legacy.d';
export * from './node_modules/@babel/types/lib/index.d';
export * from './node_modules/@bcoe/v8-coverage/dist/lib/_src/ascii';
export * from './node_modules/@bcoe/v8-coverage/dist/lib/_src/clone';
export * from './node_modules/@bcoe/v8-coverage/dist/lib/_src/compare';
export * from './node_modules/@bcoe/v8-coverage/dist/lib/_src/merge';
export * from './node_modules/@bcoe/v8-coverage/dist/lib/_src/normalize';
export * from './node_modules/@bcoe/v8-coverage/dist/lib/_src/range-tree';
export * from './node_modules/@bcoe/v8-coverage/dist/lib/_src/types';
export * from './node_modules/@bcoe/v8-coverage/dist/lib/ascii.d';
export * from './node_modules/@bcoe/v8-coverage/dist/lib/clone.d';
export * from './node_modules/@bcoe/v8-coverage/dist/lib/compare.d';
export * from './node_modules/@bcoe/v8-coverage/dist/lib/index.d';
export * from './node_modules/@bcoe/v8-coverage/dist/lib/merge.d';
export * from './node_modules/@bcoe/v8-coverage/dist/lib/normalize.d';
export * from './node_modules/@bcoe/v8-coverage/dist/lib/range-tree.d';
export * from './node_modules/@bcoe/v8-coverage/dist/lib/types.d';
export * from './node_modules/@bcoe/v8-coverage/gulpfile';
export * from './node_modules/@bcoe/v8-coverage/src/lib/ascii';
export * from './node_modules/@bcoe/v8-coverage/src/lib/clone';
export * from './node_modules/@bcoe/v8-coverage/src/lib/compare';
export * from './node_modules/@bcoe/v8-coverage/src/lib/merge';
export * from './node_modules/@bcoe/v8-coverage/src/lib/normalize';
export * from './node_modules/@bcoe/v8-coverage/src/lib/range-tree';
export * from './node_modules/@bcoe/v8-coverage/src/lib/types';