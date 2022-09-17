import path from 'path';
import nodeProcess from 'process';
import child_process from 'child_process';
import { StringDecoder } from 'string_decoder';
import {readJson, removeFile, repairPath, unpackTarGz, readDir} from './fileUtils';
import {FILE_NAME_YARN_LOCK} from './constants';

export type PackageFileDescription = {
  absoluteFilePath: string;
  relativeFilePath: string;
  baseName: string;
}

export type PackagedInDir = {
  packageConfig: any;
  packageFileList: Array<PackageFileDescription>;
  packageDependencies: any;
  packageDevDependencies: any;
}

const stringDecoder = new StringDecoder('utf8');

export function unpackPackagesInDir (dirPath: string): Promise<PackagedInDir> {
  let packageFileList: Array<PackageFileDescription> = [];
  let packageDependencies = {};
  let packageDevDependencies = {};
  let packageConfig = {};
  return readDir(dirPath)
    .then(files => {
      let sequence = Promise.resolve();
      if (files && files.length > 0) {
        files.forEach(fileItemPath => {
          sequence = sequence
            .then(() => {
              const fileBaseName = path.basename(fileItemPath, '.tar.gz');
              const destDirPath = path.dirname(fileItemPath);
              // GH release archive includes inner directory with the name of archive file
              const innerDirPath = repairPath(path.join(dirPath, fileBaseName));
              if (fileBaseName) {
                return unpackTarGz(fileItemPath, destDirPath)
                  .then(() => {
                    return removeFile(fileItemPath);
                  })
                  .then(() => {
                    return innerDirPath;
                  });
              }
            })
            .then((innerDirPath) => {
              if (innerDirPath) {
                return readDir(dirPath)
                  .then((files) => {
                    let sequence2 = Promise.resolve();
                    if (files && files.length > 0) {
                      let baseName;
                      files.forEach(fileItemPath => {
                        baseName = path.basename(fileItemPath);
                        if (baseName && baseName.indexOf('package.json') >= 0) {
                          sequence2 = sequence2.then(() => {
                            return readJson(repairPath(fileItemPath))
                              .then(packageFileData => {
                                packageConfig = packageFileData;
                                if (packageFileData) {
                                  if (packageFileData.dependencies) {
                                    packageDependencies = { ...packageDependencies, ...packageFileData.dependencies };
                                  }
                                  if (packageFileData.devDependencies) {
                                    packageDevDependencies = { ...packageDevDependencies, ...packageFileData.devDependencies };
                                  }
                                }
                              });
                          });
                        } else {
                          packageFileList.push({
                            absoluteFilePath: fileItemPath,
                            relativeFilePath: repairPath(fileItemPath).replace(innerDirPath, ''),
                            baseName,
                          });
                        }
                      });
                    }
                    return sequence2;
                  });
              }
            });
        });
      }
      return sequence;
    })
    .then(() => {
      return {
        packageConfig,
        packageFileList,
        packageDependencies,
        packageDevDependencies
      };
    });
}

export function install(destDirPath: string, dependencies?: any, isDevelopment?: boolean): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    installModules({destDirPath, dependencies, isDevelopment}, ({code, message}) => {
      if (code !== '0') {
        reject(message);
      } else {
        resolve();
      }
    });
  });
}

function installModules (
    options: { destDirPath: string, dependencies?: any, isDevelopment?: boolean },
    feedback: (feedbackEvent: {
      code: string;
      message: any;
    }) => void
): void {
  if (options && feedback) {
    const { destDirPath, dependencies, isDevelopment } = options;
    const validDestDirPath = repairPath(destDirPath);
    const testProjectYarnLockFile =
      repairPath(path.join(destDirPath, FILE_NAME_YARN_LOCK));
    const useYarn = !!testProjectYarnLockFile;
    let args: Array<string>;
    if (dependencies && dependencies.length > 0) {
      args = useYarn
        ? [
          'add',
          '--exact'
        ]
        : [
          'install',
          '--save'
        ];
      if (isDevelopment) {
        args.push('-D');
      }
      args.push(dependencies);
    } else {
      args = useYarn
        ? [
          'install',
        ]
        : [
          'install',
        ];
    }
    try {
      let command: string;
      if (nodeProcess.platform !== 'win32') {
        command = useYarn ? 'yarnpkg' : 'npm';
      } else {
        command = useYarn ? 'yarnpkg.cmd' : 'npm.cmd';
      }
      const processChild = child_process.spawn(command,
        args,
        {
          env: {
            ...process.env,
          },
          cwd: validDestDirPath
        },
      );

      if (processChild) {
        processChild.on('error', function (err) {
          console.error('Error: ', err);
          feedback({
            code: '1',
            message: err.message,
          });
        });

        if (processChild.stdout) {
          processChild.stdout.on('data', function (data) {
            console.log(stringDecoder.write(Buffer.from(data)));
          });
        }

        if (processChild.stderr) {
          processChild.stderr.on('data', function (data) {
            console.error(stringDecoder.write(Buffer.from(data)));
          });
        }

        processChild.on('exit', function (code, signal) {
          feedback({
            code: '' + code,
            message: `child process exited with code ${code} and signal ${signal}`,
          });
        });
      }
    } catch(err) {
      console.error('Error: ', err);
      feedback({
        code: '1',
        message: err,
      });
    }
  }
}
