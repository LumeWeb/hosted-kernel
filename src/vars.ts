import { x25519 } from "@noble/curves/ed25519";

export const defaultKernelLink =
  "z2H79wojuYMLJAtVHfvJ4EkWoB2JbTfqNqsV7JYaZFfJZWh7vHE4";

const store = new Map<string, any>(
  Object.entries({
    loginComplete: false,
    logoutComplete: false,
    kernelLoaded: "not yet",
    communicationKey: null,
    frontendCommunicationPubKey: null,
  }),
);

export function setLoginComplete(status: boolean) {
  store.set("loginComplete", status);
}
export function getLoginComplete(): boolean {
  return store.get("loginComplete");
}
export function setLogoutComplete(status: boolean) {
  store.set("logoutComplete", status);
}
export function getLogoutComplete(): boolean {
  return store.get("logoutComplete");
}
export function setKernelLoaded(status: string) {
  store.set("kernelLoaded", status);
}

export function getKernelLoaded(): string {
  return store.get("kernelLoaded");
}

export function getCommunicationKey(): Uint8Array {
  if (!store.get("communicationKey")) {
    store.set("communicationKey", x25519.utils.randomPrivateKey());
  }

  return store.get("communicationKey");
}

export function getCommunicationPubKey() {
  return x25519.getPublicKey(getCommunicationKey());
}

export function getFrontendCommunicationPubkey(): Uint8Array {
  return store.get("frontendCommunicationPubKey");
}

export function setFrontendCommunicationPubkey(key: Uint8Array) {
  store.set("frontendCommunicationPubKey", key);
}
