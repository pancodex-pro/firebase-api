import template from 'lodash/template';
import {readFile, writeFile} from './fileUtils';

export async function setProjectId(sourceFilePath: string, projectId: string): Promise<void> {
    const fileData: any = await readFile(sourceFilePath);
    const compiled = template(fileData);
    const resultFileData = compiled({firebase_project_id: projectId});
    await writeFile(sourceFilePath, resultFileData);
}
