const shell = require('shelljs');
const moment = require('moment');
const path = require('path');
const console = require('console');
const os = require('os');

const buildTime = moment().format('HH:mm:ss DD/MM/YYYY');

const serverUrls = {
  localnet: 'http://localhost:4096',
  testnet: 'http://test.asch.io',
  mainnet: 'http://mainnet.asch.io'
};

const build = (osVersion, netVersion) => {
  // Check node.js version
  // if (shell.exec('node -v | cut -b 2-3').stdout.trim() !== 10) {
  //   console.log('Exited. Please use node.js version 10');
  //   process.exit(1)
  // }
  // Install dependencies
  shell.exec('sudo apt-get install curl sqlite3 ntp wget git libssl-dev openssl make gcc g++ autoconf automake python build-essential libtool libtool-bin -y');

  const fullPath = path.join(__dirname, 'build'); 
  shell.mkdir('-p', fullPath);
  shell.cd(fullPath);

  console.log('Packaging backend...')
  const backendRepo = 'https://github.com/AschPlatform/asch.git';
  shell.exec(`git clone --single-branch -b master ${backendRepo}`);
  shell.cd('asch');
  shell.pwd();
  shell.mkdir('-p', 'public/dist', 'chains', 'tmp', 'logs', 'bin', 'data');

  if (netVersion !== 'localnet') {
    shell.sed('-i', 'testnet', netVersion, `aschd`);
    shell.sed('-i', 'testnet', netVersion, `app.js`);
    shell.cp(`config-${netVersion}.json`, `config.json`);
  } 

  if (osVersion === 'linux') {
    shell.cp(shell.exec('which node'), `bin/`)
  }

  shell.sed('-i', 'DEFAULT_BUILD_TIME', buildTime, `app.js`);
  shell.exec('npm install --production');

  console.log('Packaging frontend...');
  shell.cd(fullPath);
  if (shell.exec('which yarn').code !== 0) {
    console.log('yarn not found, installing')
    shell.exec('npm install -g yarn')
  }
  const frontendRepo = 'https://github.com/AschPlatform/asch-frontend-2.git';
  shell.exec(`git clone --single-branch -b develop ${frontendRepo}`);
  shell.cd('asch-frontend-2');
  shell.exec('yarn install');
  shell.exec('node_modules/.bin/quasar build');
  shell.exec('cp -r dist/spa-mat/* ../asch/public/dist');

  shell.cd(fullPath);
  shell.exec(`tar zcf asch-linux-latest-${netVersion}.tar.gz asch`);
  shell.exec(`rm -rf asch`);
  shell.exec('rm -rf asch-frontend-2');

}

if (process.argv.length < 3) {
  console.log('Usage: `node build.js all` or `node build.js os net`.\nSo far only host build, no cross building support yet. Net can be localnet, testnet or mainnet.')
} else if (process.argv[2] === 'all') {
  ['localnet', 'testnet', 'mainnet'].forEach(net => build(os.platform(), net))
} else {
  build(process.argv[2], process.argv[3])
}
