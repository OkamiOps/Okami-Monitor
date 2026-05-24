import { readFile } from "node:fs/promises";
import { Client } from "ssh2";

const DEFAULT_TIMEOUT = 12000;

function expandHome(path) {
  if (!path?.startsWith("~")) return path;
  return path.replace(/^~/, process.env.HOME ?? "");
}

function connectSsh(config, secrets = {}) {
  return new Promise((resolve, reject) => {
    const client = new Client();
    const timeout = windowlessTimeout(() => {
      client.end();
      reject(new Error("SSH timeout"));
    }, config.timeoutMs ?? DEFAULT_TIMEOUT);

    client
      .on("ready", () => {
        clearTimeout(timeout);
        resolve(client);
      })
      .on("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      })
      .connect({
        host: config.sshHost,
        port: Number(config.sshPort) || 22,
        username: config.sshUser,
        privateKey: secrets.privateKey,
        passphrase: secrets.passphrase || undefined,
        password: secrets.password || undefined,
        readyTimeout: config.timeoutMs ?? DEFAULT_TIMEOUT,
        keepaliveInterval: 15000,
        keepaliveCountMax: 2,
        tryKeyboard: Boolean(secrets.password),
      });
  });
}

function windowlessTimeout(callback, ms) {
  return setTimeout(callback, ms);
}

export async function buildSecrets(config, store) {
  if (config.sshAuthMethod === "password") {
    const password = await store.getSecret(config.sshPasswordRef);
    if (!password) {
      throw new Error("Senha SSH nao encontrada no cofre. Salve a senha novamente.");
    }
    return { password };
  }

  const sshKeyPath = normalizeSecretRef(config.sshKeyPath);
  let privateKey = await store.getSecret(sshKeyPath);
  if (!privateKey && config.sshKeyPath && !config.sshKeyPath.startsWith("vault://")) {
    privateKey = await readFile(expandHome(config.sshKeyPath), "utf8");
  }
  if (!privateKey) {
    throw new Error(`Chave SSH nao encontrada no cofre: ${config.sshKeyPath || "sem key ref"}. Envie a private key novamente.`);
  }

  return {
    privateKey,
    passphrase: await store.getSecret(`${sshKeyPath}:passphrase`),
  };
}

function normalizeSecretRef(ref = "") {
  if (ref.startsWith("vault://ssh/ssh-key_")) {
    return ref.replace("vault://ssh/", "vault://ssh-key/");
  }
  return ref;
}

export async function sshExec(config, store, command, options = {}) {
  const secrets = await buildSecrets(config, store);
  const client = await connectSsh(config, secrets);

  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";

    client.exec(command, { pty: false }, (error, stream) => {
      if (error) {
        client.end();
        reject(error);
        return;
      }

      const timeout = windowlessTimeout(() => {
        stream.close();
        client.end();
        reject(new Error(`Command timeout: ${command}`));
      }, options.timeoutMs ?? DEFAULT_TIMEOUT);

      stream
        .on("close", (code) => {
          clearTimeout(timeout);
          client.end();
          resolve({ command, stdout, stderr, exitCode: code ?? 0 });
        })
        .on("data", (data) => {
          stdout += data.toString();
        });

      stream.stderr.on("data", (data) => {
        stderr += data.toString();
      });
    });
  });
}

export async function sshTest(config, store) {
  const result = await sshExec(
    config,
    store,
    "printf 'ok '; hostname; printf 'user '; whoami; printf 'home '; pwd",
    { timeoutMs: 10000 },
  );

  return {
    ok: result.exitCode === 0,
    output: result.stdout.trim(),
    error: result.stderr.trim(),
  };
}
