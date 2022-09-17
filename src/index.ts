import chalk from 'chalk';
import {Command} from 'commander';
import path from 'path';
import {
    ensureDirPath,
    checkDirIsEmpty,
    copyFile,
    removeFile,
    repairPath,
    download,
    unpackTarGz,
    isExisting
} from './fileUtils';
import {DOWNLOAD_DIR, SOURCE_CODE_PACKAGE} from './constants';
import {testCommand} from './testCommandUtils';
import {install} from './installUtils';
import {setProjectId} from './scaffold';

const packageJson = require('../package.json');

const downloadURL: string = SOURCE_CODE_PACKAGE;
let projectName: string | undefined;
let siteId: string | undefined;

const program: Command = new Command(packageJson.name)
    .version(packageJson.version)
    .argument('<project-directory>')
    .usage(`${chalk.green('<project-directory>')} --id ${chalk.green('<site-id>')} [options]`)
    .action((name) => {
        projectName = name;
    })
    .option('--id <site-id>', 'the Pancodex site ID must be specified')
    .option('--use-npm', 'use npm for dependency installing instead of yarn')
    .on('--help', () => {
        console.log(`Please specify the ${chalk.green('<project-directory>')} and "--id" option.`);
        console.log();
    })
    .parse(process.argv);

siteId = program.getOptionValue('id');

if (typeof projectName === 'undefined') {
    console.error('Please specify the project directory:');
    console.log(
        `  ${chalk.cyan(program.name())} ${chalk.green('<project-directory>')}`
    );
    console.log();
    console.log('For example:');
    console.log(`  ${chalk.cyan(program.name())} ${chalk.green('firebase-api')} --id 0000-0000-00000-0000`);
    console.log();
    console.log(
        `Run ${chalk.cyan(`${program.name()} --help`)} to see all options.`
    );
    process.exit(1);
}

if (typeof siteId === 'undefined') {
    console.error('Please specify the id option:');
    console.log(
        `  ${chalk.cyan(program.name())} ${chalk.green('<project-directory>')} --id ${chalk.green('<site-id>')}`
    );
    console.log();
    console.log('For example:');
    console.log(`  ${chalk.cyan(program.name())} ${chalk.green('firebase-api')} --id ${chalk.green('0000-0000-00000-0000')}`);
    console.log();
    console.log(
        `Run ${chalk.cyan(`${program.name()} --help`)} to see all options.`
    );
    process.exit(1);
}

const root: string = path.resolve(projectName);
const downloadDestDirPath: string = repairPath(path.join(root, DOWNLOAD_DIR));
const functionDirPath: string = path.join(root, 'functions');

async function createProject(): Promise<string | undefined> {
    try {
        console.log('Testing firebase-tools...');
        await testCommand('firebase', __dirname, ['--help']);
    } catch (e) {
        console.log();
        console.error(`It seems that you don't have ${chalk.green('firebase-tools')} installed.`);
        console.log();
        console.log('Run one of the following commands:');
        console.log(`${chalk.green('yarn global add firebase-tools')}`);
        console.log(`${chalk.green('npm install -g firebase-tools')}`);
        console.log();
        return;
    }

    try {
        await ensureDirPath(root);
    } catch (e) {
        console.log();
        console.error(`Cannot create ${root}`);
        console.log();
        return;
    }

    try {
        await checkDirIsEmpty(root);
    } catch (e) {
        console.log();
        console.error(
            `The directory ${chalk.green(root)} is not empty`
        );
        console.log();
        console.log(
            'Either try using a new directory name, or remove the files insite this directory.'
        );
        console.log();
        return;
    }

    try {
        await removeFile(downloadDestDirPath);
        console.log('Downloading the project source tarball...')
        const filePath: string = await download(downloadURL, downloadDestDirPath);
        console.log('Unpacking package...');
        const fileBaseName = path.basename(filePath, '.tar.gz');
        const unpackDestDirPath = path.dirname(filePath);
        // GH release archive includes inner directory with the name of archive file
        const innerDirPath = repairPath(path.join(downloadDestDirPath, fileBaseName));
        await unpackTarGz(filePath, unpackDestDirPath);
        await removeFile(filePath);
        await copyFile(innerDirPath, root);
        await removeFile(downloadDestDirPath);
    } catch (e) {
        console.log();
        console.error(`Error in downloading and unpacking the source code tarball `, e);
        console.log();
        return;
    }

    try {
        await isExisting(functionDirPath);
    } catch (e) {
        console.log();
        console.error("Error: Missing 'functions' directory");
        console.log();
        return;
    }

    try {
        const firebaseRCFilePath: string = path.join(root, '.firebaserc');
        await setProjectId(firebaseRCFilePath, 'SOME-PROJECT-ID-RECEIVED-FROM-SERVICE-ENDPOINT');
    } catch (e) {
        console.log();
        console.error(`Can not update .firebaserc file in ${root} direcrtory: ${e}`);
        console.log();
        return;
    }

    // try {
    //     await install(functionDirPath);
    // } catch (e) {
    //     console.log();
    //     console.error(`Can not install dependencies in ${functionDirPath}`);
    //     console.log();
    //     return;
    // }

    return "OK";
}

createProject().then((result: string | undefined) => {
    if (result === "OK") {
        console.log();
        console.log(chalk.green(`Creating the Firebase API project in ${root} directory has been done successfully.`));
        console.log();
        console.log(`Now login into firebase: ${chalk.green('firebase login')}`);
        console.log(`And then run: ${chalk.green('firebase deploy')}`);
        console.log();
    }
    console.log();
});
