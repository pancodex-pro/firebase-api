import template from 'lodash/template';
import {readFile, writeFile} from './fileUtils';

interface SecretData {
    passId: string;
    projectId: string;
    secret: string;
}

export async function setProjectId(sourceFilePath: string, destFilePath: string, projectId: string): Promise<void> {
    const fileData: any = await readFile(sourceFilePath);
    const compiled = template(fileData);
    const resultFileData = compiled({projectId});
    await writeFile(destFilePath, resultFileData);
}

export async function setSecret(sourceFilePath: string, destFilePath: string, secretData: SecretData): Promise<void> {
    const fileData: any = await readFile(sourceFilePath);
    const compiled = template(fileData);
    const resultFileData = compiled(secretData);
    await writeFile(destFilePath, resultFileData);
}
