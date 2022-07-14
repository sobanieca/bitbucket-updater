const { program } = require('commander');

process.on('uncaughtException', err => {
  console.log(`Uncaught Exception: ${err.message}`)
  process.exit(1)
})

program
  .option('-r, --repository', 'Repository url')
  .option('-p, --package', 'Package to be updated')
  .option('-v, --version', 'Target package version')
  .option('-f, --forced', 'Update package even if it bums major version (introduces breaking changes)');

program.parse();

const options = program.opts();
const repository = options.repository;
const 



// TODO: validate repository url (is it bitbucket?)

let environment = process.argv[2];
