import {
  downloadSmallObject,
  maybeInitDefaultPortals,
  savePortals,
  savePortalSessions,
  setActivePortalMasterKey,
} from "@lumeweb/libweb";
import { log, logErr, sendAuthUpdate } from "./util.js";
import {
  defaultKernelLink,
  setKernelLoaded,
  setLoginComplete,
} from "./vars.js";
import { getStoredUserKey } from "./storage.js";
import { readableStreamToBlob } from "binconv";
import { addContextToErr } from "@lumeweb/libkernel";

let kernelLoadAttempt = false;

function testIndexedDBSupport() {
  return new Promise((resolve, reject) => {
    // Check for IndexedDB support
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB is not supported by this browser."));
    } else {
      // Attempt to open an IndexedDB database
      const request = indexedDB.open("test_db", 1);

      request.onerror = function (event) {
        // Error occurred, reject the promise

        reject(
          // @ts-ignore
          new Error("IndexedDB test error: " + event?.target?.error?.code),
        );
      };

      request.onsuccess = function (event) {
        // Success, resolve the promise
        // @ts-ignore
        event?.target?.result.close(); // Close the DB when done
        resolve(true);
      };

      request.onupgradeneeded = function (event: IDBVersionChangeEvent) {
        // Database needs to be created or upgraded
        // @ts-ignore
        const db = event?.target?.result;
        if (!db.objectStoreNames.contains("test_store")) {
          // Create an object store
          db.createObjectStore("test_store", { keyPath: "id" });
        }
      };
    }
  });
}

export async function boot() {
  let userKey;

  if (!(await testIndexedDBSupport())) {
    setKernelLoaded("indexeddb_error");
    logErr("indexed db is not supported or is blocked");
    return;
  }

  try {
    userKey = getStoredUserKey();
  } catch (e) {
    logErr(addContextToErr(e, "user key could not be fetched"));
    sendAuthUpdate();
    return;
  }

  if (!userKey) {
    sendAuthUpdate();
    return;
  }

  log("user is already logged in, attempting to load kernel");
  setActivePortalMasterKey(userKey);
  setLoginComplete(true);
  sendAuthUpdate();
  loadKernel();
}

export async function loadKernel() {
  if (kernelLoadAttempt) {
    return;
  }

  kernelLoadAttempt = true;

  try {
    maybeInitDefaultPortals();
  } catch (e) {
    let err = addContextToErr(e, "unable to init portals");
    setKernelLoaded(err);
    logErr(err);
    sendAuthUpdate();
    return;
  }
  let kernelCode;
  try {
    kernelCode = await downloadDefaultKernel();
  } catch (e) {
    let extErr = addContextToErr(e, "unable to download kernel");
    setKernelLoaded(extErr);
    logErr(extErr);
    sendAuthUpdate();
    return;
  }

  savePortals();
  savePortalSessions();

  try {
    await new Promise(async (resolve, reject) => {
      const url = URL.createObjectURL(await readableStreamToBlob(kernelCode));

      const el = document.createElement("script");
      el.src = url;
      el.onload = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      el.onerror = (
        event: Event | string,
        source?: string,
        lineno?: number,
        colno?: number,
        error?: Error,
      ) => {
        URL.revokeObjectURL(url);
        reject(error);
      };

      document.head.appendChild(el);
    });

    setKernelLoaded("success");
    sendAuthUpdate();
    log("kernel successfully loaded");
    return;
  } catch (err: any) {
    let extErr = addContextToErr(err, "unable to eval kernel");
    setKernelLoaded(extErr);
    logErr(extErr);
    logErr(err.toString());
    console.error(extErr);
    console.error(err);
    sendAuthUpdate();
    return;
  }
}

async function downloadKernel(kernelCid: string): Promise<ReadableStream> {
  return await downloadSmallObject(kernelCid);
}

function downloadDefaultKernel(): Promise<ReadableStream> {
  return downloadKernel(defaultKernelLink);
}
