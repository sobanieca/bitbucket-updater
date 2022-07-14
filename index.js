import { program } from 'commander';
import fetch from 'node-fetch';
import base64 from 'base-64';

process.on('uncaughtException', err => {
  console.log(`Uncaught Exception: ${err.message}`)
  process.exit(1)
})

program
  .option('--workspace <string>', 'Bitbucket workspace name')
  .option('--repository <string>', 'Bitbucket repository name')
  .option('--username <string>', 'Username (non email)')
  .option('--app-password <string>', 'App password for Bitbucket account')
  .option('--branch <string>', 'Target branch to be updated')
  .option('--path <string>', 'Path to package.json file, if not provided will search in root directory')
  .option('--package <string>', 'Package to be updated')
  .option('--version <string>', 'Target package version')
  .option('--debug', 'Enable debug logs')
  .option('-f, --forced', 'Update package even if it bums major version (introduces breaking changes)');

program.parse();

const options = program.opts();

const info = (msg) => {
  console.log(msg);
}

const debug = (msg) => {
  if (options.debug) {
    console.log(msg);
  }
}

debug("Input parameters provided:");
debug(options);

// TODO: validation of input parameters
// TODO: use some more 'industry-standard' logger?

info(`Updating ${options.repository} to version ${options.version} of ${options.package}...`);

const getPackageJson = async () => {
  let path = "";
  if (options.path) {
    //TODO: ensure options.path ends with '/'
    path = options.path;
  }
  const endpointUrl = `https://api.bitbucket.org/2.0/repositories/${options.workspace}/${options.repository}/src/${options.branch}/${path}package.json`;
  debug(`Getting package.json file content from: ${endpointUrl}...`);
  const response = await fetch(endpointUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${base64.encode(options.username + ":" + options.appPassword)}`
    }
  });
  debug(`Obtained Bitbucket API response status: ${response.status}`);
  // TODO: verify response status and content
  return await response.json();
}

const currentPackageJson = await getPackageJson();
debug('Obtained following package.json file content:');
debug(currentPackageJson);

// TODO: ensure that package exists
currentPackageJson.dependencies[options.package] = options.version;

debug('Package.json file content after library update:');
debug(currentPackageJson);

const targetPackageJsonContent = JSON.stringify(currentPackageJson);


// TODO: https://www.npmjs.com/package/semver

