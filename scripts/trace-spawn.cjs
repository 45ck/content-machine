/* global process */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const outputDir = path.join(process.cwd(), 'output');
const logPath = path.join(outputDir, 'spawn-trace.log');
const runId = new Date().toISOString();

fs.mkdirSync(outputDir, { recursive: true });
fs.appendFileSync(logPath, `--- spawn trace start ${runId} ---\n`);

function safeStringify(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return '"[unserializable]"';
  }
}

function pickOptions(options) {
  if (!options || typeof options !== 'object') return undefined;
  return {
    cwd: options.cwd,
    shell: options.shell,
    windowsHide: options.windowsHide,
    detached: options.detached,
    stdio: options.stdio,
    windowsVerbatimArguments: options.windowsVerbatimArguments,
    uid: options.uid,
    gid: options.gid,
    hasEnv: Boolean(options.env),
  };
}

function logLine(message, data) {
  const line = `${new Date().toISOString()} ${message} ${data ? safeStringify(data) : ''}\n`;
  fs.appendFileSync(logPath, line);
}

const originalSpawn = cp.spawn;
cp.spawn = function patchedSpawn(command, args, options) {
  logLine('spawn', { command, args, options: pickOptions(options) });
  const child = originalSpawn.call(this, command, args, options);
  child.on('error', (error) => {
    logLine('spawn error', {
      command,
      args,
      code: error.code,
      errno: error.errno,
      syscall: error.syscall,
      message: error.message,
      path: error.path,
    });
  });
  child.on('exit', (code, signal) => {
    logLine('spawn exit', { command, code, signal });
  });
  return child;
};

const originalExecFile = cp.execFile;
cp.execFile = function patchedExecFile(command, args, options, callback) {
  logLine('execFile', { command, args, options: pickOptions(options) });
  const child = originalExecFile.call(this, command, args, options, callback);
  if (child && typeof child.on === 'function') {
    child.on('error', (error) => {
      logLine('execFile error', {
        command,
        args,
        code: error.code,
        errno: error.errno,
        syscall: error.syscall,
        message: error.message,
        path: error.path,
      });
    });
    child.on('exit', (code, signal) => {
      logLine('execFile exit', { command, code, signal });
    });
  }
  return child;
};

const originalExec = cp.exec;
cp.exec = function patchedExec(command, options, callback) {
  logLine('exec', { command, options: pickOptions(options) });
  const child = originalExec.call(this, command, options, callback);
  if (child && typeof child.on === 'function') {
    child.on('error', (error) => {
      logLine('exec error', {
        command,
        code: error.code,
        errno: error.errno,
        syscall: error.syscall,
        message: error.message,
        path: error.path,
      });
    });
    child.on('exit', (code, signal) => {
      logLine('exec exit', { command, code, signal });
    });
  }
  return child;
};

const originalFork = cp.fork;
cp.fork = function patchedFork(modulePath, args, options) {
  logLine('fork', { modulePath, args, options: pickOptions(options) });
  const child = originalFork.call(this, modulePath, args, options);
  if (child && typeof child.on === 'function') {
    child.on('error', (error) => {
      logLine('fork error', {
        modulePath,
        args,
        code: error.code,
        errno: error.errno,
        syscall: error.syscall,
        message: error.message,
        path: error.path,
      });
    });
    child.on('exit', (code, signal) => {
      logLine('fork exit', { modulePath, code, signal });
    });
  }
  return child;
};

const originalSpawnSync = cp.spawnSync;
cp.spawnSync = function patchedSpawnSync(command, args, options) {
  logLine('spawnSync', { command, args, options: pickOptions(options) });
  const result = originalSpawnSync.call(this, command, args, options);
  if (result && result.error) {
    logLine('spawnSync error', {
      command,
      args,
      code: result.error.code,
      errno: result.error.errno,
      syscall: result.error.syscall,
      message: result.error.message,
      path: result.error.path,
    });
  }
  return result;
};

const originalExecFileSync = cp.execFileSync;
cp.execFileSync = function patchedExecFileSync(command, args, options) {
  logLine('execFileSync', { command, args, options: pickOptions(options) });
  try {
    return originalExecFileSync.call(this, command, args, options);
  } catch (error) {
    logLine('execFileSync error', {
      command,
      args,
      code: error.code,
      errno: error.errno,
      syscall: error.syscall,
      message: error.message,
      path: error.path,
    });
    throw error;
  }
};

const originalExecSync = cp.execSync;
cp.execSync = function patchedExecSync(command, options) {
  logLine('execSync', { command, options: pickOptions(options) });
  try {
    return originalExecSync.call(this, command, options);
  } catch (error) {
    logLine('execSync error', {
      command,
      code: error.code,
      errno: error.errno,
      syscall: error.syscall,
      message: error.message,
      path: error.path,
    });
    throw error;
  }
};

process.on('exit', () => {
  fs.appendFileSync(logPath, `--- spawn trace end ${new Date().toISOString()} ---\n`);
});
