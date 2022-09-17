import child_process from 'child_process';
import {StringDecoder} from 'string_decoder';
import {repairPath} from './fileUtils';

export function testCommand(command: string,
                            destDirPath: string,
                            argsList?: Array<string>,
): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        testRun(command, destDirPath, argsList, ({code, message}) => {
            if (code !== '0') {
                reject(message);
            } else {
                resolve();
            }
        });
    });
}

function testRun(
    command: string,
    destDirPath: string,
    argsList?: Array<string>,
    feedback?: (feedbackEvent: {
        code: string;
        message: any;
    }) => void
): void {
    if (command && destDirPath && feedback) {
        const validDestDirPath = repairPath(destDirPath);
        try {
            const processChild = child_process.spawn(command,
                argsList,
                {
                    env: {
                        ...process.env,
                    },
                    cwd: validDestDirPath
                },
            );

            if (processChild) {
                processChild.on('error', function (err) {
                    feedback({
                        code: '1',
                        message: err.message,
                    });
                });

                processChild.on('exit', function (code, signal) {
                    feedback({
                        code: '' + code,
                        message: `child process exited with code ${code} and signal ${signal}`,
                    });
                });
            }
        } catch (err) {
            feedback({
                code: '1',
                message: err,
            });
        }
    }
}
