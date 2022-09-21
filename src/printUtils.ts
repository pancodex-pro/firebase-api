import chalk from 'chalk';

export function printUsageExample(name: string): void {
    console.log(
        `  ${chalk.cyan(name)} ${chalk.green('<pass-id>')} ${chalk.green('<project-id>')} ${chalk.green('<project-directory>')}`
    );
    console.log();
    console.log('For example:');
    console.log(`${chalk.cyan(name)} 00000-000-0000-0000 my-site-backend my-site-backend-api`);
    console.log();
    console.log(
        `Run ${chalk.cyan(`${name} --help`)} to see the usage.`
    );
}