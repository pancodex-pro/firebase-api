import chalk from 'chalk';
import {Command} from 'commander';
import path from 'path';
import {nanoid} from 'nanoid';
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
import {setProjectId, setSecret} from './scaffold';
import {printUsageExample} from './printUtils';

const packageJson = require('../package.json');

const downloadURL: string = SOURCE_CODE_PACKAGE;
let projectDirName: string | undefined;
let passId: string | undefined;
let projectId: string | undefined;

const program: Command = new Command(packageJson.name)
    .version(packageJson.version)
    .argument('<pass-id>', 'pass ID value that is automatically generated while creating new site project in Pancodex')
    .argument('<project-id>', 'project ID value from the Firebase Web application SDK configuration')
    .argument('<project-directory>', 'a new local directory where the backend API source code should be')
    .usage(`${chalk.green('<pass-id>')} ${chalk.green('<project-id>')} ${chalk.green('<project-directory>')}`)
    .action((passId_arg, projectId_arg, projectDirectory_arg) => {
        passId = passId_arg;
        projectId = projectId_arg;
        projectDirName = projectDirectory_arg;
    })
    .on('--help', () => {
        console.log();
        console.log(`Arguments ${chalk.green('<pass-id>')} and ${chalk.green('<project-id>')} are obtained while creating new site project in Pancodex CMS.`);
        console.log(`Please specify the ${chalk.green('<project-directory>')}.`);
        console.log();
    })
    .parse(process.argv);

if (typeof projectDirName === 'undefined') {
    console.error(`Please specify the ${chalk.green('<project-directory>')}:`);
    printUsageExample(program.name());
    process.exit(1);
}

if (typeof passId === 'undefined') {
    console.error(`Please specify the ${chalk.green('<pass-id>')}:`);
    printUsageExample(program.name());
    process.exit(1);
}

if (typeof projectId === 'undefined') {
    console.error(`Please specify the ${chalk.green('<project-id>')}:`);
    printUsageExample(program.name());
    process.exit(1);
}

const root: string = path.resolve(projectDirName);
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
        console.log(`Please install ${chalk.green('firebase-tools')} and try again.`);
        console.log(`${chalk.green('npm install -g firebase-tools')}`);
        console.log();
        return;
    }

    try {
        await ensureDirPath(root);
    } catch (e) {
        console.log();
        console.error(`Cannot create ${root} directory.`);
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
            'Either try using a new directory name, or remove all files inside this directory.'
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
        const firebaseRCTmpFilePath: string = path.join(root, '.firebaserc.tmp');
        const firebaseRCFilePath: string = path.join(root, '.firebaserc');
        if (projectId) {
            await setProjectId(firebaseRCTmpFilePath, firebaseRCFilePath, projectId);
        }
    } catch (e) {
        console.log();
        console.error(`Error creating a .firebaserc file in the ${root} directory: ${e}`);
        console.log();
        return;
    }

    try {
        const secretsTmpFilePath: string = path.join(root, 'functions', 'secrets.tmp');
        const secretsFilePath: string = path.join(root, 'functions', 'secrets.js');
        if (projectId && passId) {
            await setSecret(secretsTmpFilePath, secretsFilePath, {
                passId,
                projectId,
                secret: nanoid()
            });
        }
    } catch (e) {
        console.log();
        console.error(`Error creating a secrets.js file in the ${root}/functions directory: ${e}`);
        console.log();
        return;
    }

    try {
        await install(functionDirPath);
    } catch (e) {
        console.log();
        console.error(`Can not install dependencies in ${functionDirPath}`);
        console.log();
        return;
    }

    return "OK";
}

createProject().then((result: string | undefined) => {
    if (result === "OK") {
        console.log();
        console.log(chalk.green(`Creating the Firebase API project in ${root} directory has been done successfully.`));
        console.log();
        console.log(`Go to the directory: ${chalk.green('cd ' + root)}`);
        console.log(`Then login into firebase: ${chalk.green('firebase login')}`);
        console.log(`And then run: ${chalk.green('firebase deploy')}`);
        console.log();
    }
    console.log();
});
