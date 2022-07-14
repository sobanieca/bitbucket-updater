import { program } from 'commander';
import fetch from 'node-fetch';
import base64 from 'base-64';
import { FormData } from 'formdata-node';

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

info(`Updating ${options.repository} to version ${options.version} of ${options.package}...`);

const getPackageJsonPath = () => {
  let path = "";
  if (options.path) {
    //TODO: ensure options.path ends with '/'
    path = options.path;
  }
  return `${path}package.json`;
}

const getBaseEndpoint = () => { 
  return `https://api.bitbucket.org/2.0/repositories/${options.workspace}/${options.repository}`;
}

const getAuthHeader = () => ({
  'Authorization': `Basic ${base64.encode(options.username + ":" + options.appPassword)}`
});

const getPackageJson = async () => {
  const endpointUrl = `${getBaseEndpoint()}/src/${options.branch}/${getPackageJsonPath()}`;
  debug(`Getting package.json file content from: ${endpointUrl}...`);
  const response = await fetch(endpointUrl, {
    method: 'GET',
    headers: getAuthHeader() 
  });
  debug(`Response status: ${response.status}`);
  // TODO: verify response status and content
  return await response.json();
}

const sendPackageJson = async (packageJsonContent) => { 
  const branchName = 'feature/auto-update-' + Date.now(); const form = new FormData();

  form.set(getPackageJsonPath(), packageJsonContent);
  form.set('branch', branchName);
  form.set('message', `Update of ${options.package} to version ${options.version}`);

  const endpointUrl = `${getBaseEndpoint()}/src`;
  debug(`Pushing package.json file content to ${endpointUrl}`);
  const response = await fetch(endpointUrl, {
    method: 'POST',
    headers: getAuthHeader(),
    body: form
  });
  debug(`Response status: ${response.status}`);

  return branchName;
}

const openPullRequest = async (branchName) => {
  debug('Creating pull request...');
  const endpointUrl = `${getBaseEndpoint()}/pullrequests`;
  await fetch(endpointUrl, {
    method: 'POST',
    headers: {
      ...getAuthHeader(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: `Update of ${options.package} to version ${options.version}`,
      source: {
        branch: {
          name: branchName
        }
      }
    })
  });
}

debug("Input parameters provided:");
debug(options);
// TODO: validation of input parameters
// TODO: use some more 'industry-standard' logger?

const currentPackageJson = await getPackageJson();
debug('Obtained following package.json file content:');
debug(currentPackageJson);

// TODO: ensure that package exists, check for null reference exceptions
// TODO: check if there are no breaking changes update, if yes - display warning, or proceed if --forced flag is provided
currentPackageJson.dependencies[options.package] = options.version;

debug('Package.json file content after library update:');
debug(currentPackageJson);

// TODO: determine the output format, spaces tabs? Or decide with different approach to not parse JSON at all and do simple replace (with regex)
const targetPackageJsonContent = JSON.stringify(currentPackageJson, null, 4);

const newFeatureBranchName = await sendPackageJson(targetPackageJsonContent);

await openPullRequest(newFeatureBranchName);

