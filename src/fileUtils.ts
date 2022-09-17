import request from 'request';
import fs from 'fs-extra';
import path from 'path';
import tar from 'tar-fs';
import zlib from 'zlib';

type FileValuePair = {
  srcFilePath: string;
  destFilePath: string;
};

const wrongWin32AbsolutePathPrefix = new RegExp(/^\/[A-Za-z]:(.*?)/);

export function ensureFilePath (filePath: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    fs.ensureFile(filePath, err => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

export function ensureDirPath (dirPath: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    fs.ensureDir(dirPath, err => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

export function readFile (filePath: string): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    fs.readFile(filePath, { encoding: 'utf8' }, (err, data) => {
      if (err) {
        reject('Can\'t read file: ' + filePath + '. Cause: ' + err.message);
      } else {
        resolve(data);
      }
    });
  });
}

export function readFileSync (filePath: string) {
  return fs.readFileSync(filePath, { encoding: 'utf8' });
}

export function readDir(dirPath: string): Promise<Array<string>> {
    return new Promise<Array<string>>((resolve, reject) => {
      fs.stat(dirPath, (err, stat) => {
        if (err) {
          reject('Can not read directory. ' + err);
        } else {
          if (stat && stat.isDirectory()) {
            fs.readdir(dirPath, (err, files) => {
              resolve(files);
            });
          } else {
            reject(dirPath + ' is not a directory');
          }
        }
      });
    });
}

export function writeFile (filePath: string, fileData: any): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (!fileData) {
      reject('File data is undefined. File path: ' + filePath);
    }
    fs.writeFile(filePath, fileData, { encoding: 'utf8' }, err => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

export function writeBinaryFile (filePath: string, fileData: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (!fileData) {
      reject('File data is undefined. File path: ' + filePath);
    }
    fs.writeFile(filePath, fileData, { encoding: null }, err => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

export function readBlobAsArrayBuffer (blob: Blob): Promise<string | ArrayBuffer | null> {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onloadend = () => {
      if (fileReader.result) {
        resolve(fileReader.result);
      } else {
        reject('Error reading blob file.');
      }
    };
    fileReader.readAsArrayBuffer(blob);
  });
}

export function copyFiles (options: Array<FileValuePair>): Promise<void> {
  return options.reduce(
    (sequence, valuePair) => {
      return sequence.then(() => {
        return copyFile(valuePair.srcFilePath, valuePair.destFilePath);
      });
    },
    Promise.resolve()
  );
}

export function copyFilesNoError (options: Array<FileValuePair>): Promise<void> {
  return options.reduce(
    (sequence, valuePair) => {
      return sequence.then(() => {
        return copyFile(valuePair.srcFilePath, valuePair.destFilePath)
          .catch(error => {
            console.error(error);
          });
      });
    },
    Promise.resolve()
  );
}

export function copyFile(srcFilePath: string, destFilePath: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    fs.stat(srcFilePath, (err, stat) => {
      if (err) {
        reject(err);
      } else if (stat) {
        if (stat.isDirectory()) {
          fs.ensureDir(destFilePath, err => {
            if (err) {
              reject(err);
            } else {
              fs.copy(srcFilePath, destFilePath, function (err) {
                if (err) {
                  reject(err);
                } else {
                  resolve();
                }
              });
            }
          });
        } else if (stat.isFile()) {
          fs.ensureFile(destFilePath, err => {
            if (err) {
              reject(err);
            } else {
              fs.copy(srcFilePath, destFilePath, function (err) {
                if (err) {
                  reject(err);
                } else {
                  resolve();
                }
              });
            }
          });
        }
      }
    });
  });
}

export function isExisting (filePath: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    fs.stat(filePath, (err, stat) => {
      if (err) {
        reject(err);
      } else {
        if (stat.isDirectory() || stat.isFile()) {
          resolve();
        } else {
          reject(filePath + ' is not a file or a dir');
        }
      }
    });
  });
}

export function checkDirIsEmpty (dirPath: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    fs.stat(dirPath, (err, stat) => {
      if (err) {
        reject('Can not read directory. ' + err);
      } else {
        if (stat && stat.isDirectory()) {
          fs.readdir(dirPath, (err, files) => {
            let total = files.length;
            if (total === 0) {
              resolve();
            } else {
              reject(dirPath + ' is not empty');
            }
          });
        } else {
          reject(dirPath + ' is not a directory');
        }
      }
    });
  });
}

export function readJson (filePath: string): Promise<any> {
  return new Promise<any>((resolve, reject) => {
    fs.readJson(filePath, (err, packageObj) => {
      if (err) {
        reject(err);
      } else {
        resolve(packageObj);
      }
    });
  });
}

export function writeJson (filePath: string, jsonObj: any): Promise<void> {
  return ensureFilePath(filePath)
    .then(() => {
      return new Promise<void>((resolve, reject) => {
        fs.writeJson(filePath, jsonObj, err => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });
}

export function removeFile (filePath:string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    fs.remove(filePath, err => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

export function isFile (filePath: string): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    fs.lstat(filePath, (err, stat) => {
      if (err) {
        reject(err);
      } else {
        resolve(stat && !stat.isDirectory());
      }
    });
  });
}

export function removeFileAndEmptyDir (filePath: string, stopDirPath: string): Promise<void> {
  return removeFile(filePath)
    .then(() => {
      const dirName = path.dirname(filePath);
      if (stopDirPath && dirName !== stopDirPath) {
        return checkDirIsEmpty(dirName)
          .then(() => {
            return removeFileAndEmptyDir(dirName, stopDirPath);
          })
          .catch(error => {
            // do nothing because dir is not empty
          });
      }
    });
}

export function writeFileWhenDifferent (filePath: string, fileBody: any) {
  return readFile(filePath)
    .then((existingFileBody: Buffer) => {
      const existingFileBuffer = Buffer.from(existingFileBody);
      const newFileBuffer = Buffer.from(fileBody);
      if (!existingFileBuffer.equals(newFileBuffer)) {
        return ensureFilePath(filePath)
          .then(() => {
            return writeFile(filePath, fileBody);
          });
      }
    })
    .catch(() => {
      // there is no such file
      return ensureFilePath(filePath)
        .then(() => {
          return writeFile(filePath, fileBody);
        });
    });
}

export function unpackTarGz (srcFilePath: string, destDirPath: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    fs.createReadStream(srcFilePath)
      .pipe(zlib.createGunzip())
      .pipe(tar
        .extract(destDirPath, {
          readable: true, // all dirs and files should be readable
          writable: true, // all dirs and files should be writable
        })
        .on('finish', () => { resolve(); }))
      .on('error', err => { reject(err); });
  });
}

export function packTarGz (srcDirPath: string, destFilePath: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let destFile = fs.createWriteStream(destFilePath);
    tar.pack(srcDirPath).pipe(zlib.createGzip()).pipe(destFile)
      .on('finish', () => { resolve(); })
      .on('error', err => { reject(err); });
  });
}

export function download(url: string, destDirPath: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const requestOptions = {
      url,
      method: 'GET',
      headers: {
        'User-Agent': 'axios',
      },
      encoding: null
    };
    try {
      request(requestOptions)
        .on('error', (error) => {
          reject(error || 'Error downloading file ' + url);
        })
        .on('response', (response) => {
          if (response) {
            if (response.statusCode === 200) {
              const contentDisposition: string | undefined = response.headers['content-disposition'];
              if (contentDisposition) {
                const matches = /filename=(.*)/g.exec(contentDisposition);
                if (matches && matches.length > 1) {
                  // create file write stream
                  const destinationFile = repairPath(path.join(destDirPath, matches[1]));
                  fs.ensureFileSync(destinationFile);
                  const writer = fs.createWriteStream(destinationFile);
                  writer.on('finish', () => {
                    resolve(destinationFile);
                  });
                  writer.on('error', (error) => {
                    reject(error || 'Error downloading file ' + url);
                  });
                  response.pipe(writer);
                } else {
                  reject('Can not find file name in the response from ' + url);
                }
              } else {
                reject('Can not find content-disposition in the response ' +  + url);
              }
            } else {
              reject(`Error downloading file ${url}: ${response.statusCode}`);
            }
          } else {
            reject('Error downloading file ' + url);
          }
        })
    } catch (e) {
      console.error(e);
      reject('Error reading url ' + url);
    }
  });
}

export function repairPath (filePath: string): string {
  if (filePath) {
    const newFilePath = filePath.replace(/\\/g, '/');
    const nameMatches = wrongWin32AbsolutePathPrefix.exec(newFilePath);
    if (!nameMatches) {
      return newFilePath;
    }
    // here we have a bug in the path-browserify
    // after the path resolving we get the leading slash --> /D://dir/dir
    // however there should not be any on the win32 platform --> D://dir/dir
    return newFilePath.substring(1);
  }
  return filePath;
}
