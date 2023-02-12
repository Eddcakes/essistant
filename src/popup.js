/* functions to send to dom */
const checkForFiles = async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: findFilesInPage,
  });
};

/* message handler, popup POV */
function popupListener(req, sender, sendResponse) {
  switch (req.type) {
    case 'noFiles':
      noFiles();
      break;
    case 'foundFiles':
      foundFiles(req, sender, sendResponse);
      break;
    default:
      return;
  }
}

/* for the popup */
function foundFiles(req, sender, sendResponse) {
  const filenamesTextarea = document.querySelector('#file-name-text');
  const files = req.files;
  if (files == null) {
    console.error('passed invalid files to found files');
    // send message to popup to give user feedback
    document.querySelector('#error-msg').hidden = false;
    return;
  }
  // reset textarea
  filenamesTextarea.innerHTML = '';

  files.forEach((fileName) => {
    filenamesTextarea.append(`${fileName}\n`);
  });
}

function noFiles() {
  console.log('No files');
}

function copyFilenamesToClipboard() {
  const filenamesTextarea = document.querySelector('#file-name-text');
  const text = filenamesTextarea.innerHTML;
  document.querySelector('#error-msg').hidden = true;
  document.querySelector('#success-msg').hidden = true;
  navigator.clipboard.writeText(text).then(
    () => {
      document.querySelector('#success-msg').hidden = false;
    },
    () => {
      document.querySelector('#error-msg').hidden = false;
    }
  );
}

/* functions to send to dom */
function findFilesInPage() {
  const findFilesHeader = document.querySelectorAll(
    "div[role='presentation'][aria-hidden]"
  );
  let filesText;
  findFilesHeader.forEach((node) => {
    if (node.innerText === 'Files') {
      filesText = node;
    }
  });

  if (filesText?.innerText !== 'Files') {
    console.error('filesText has not been found.');
    chrome.runtime.sendMessage({
      type: 'noFiles',
      files: null,
    });
  } else {
    const files = Array.from(
      filesText.nextElementSibling.firstChild.querySelectorAll(
        'div[data-tooltip]'
      )
    );
    const fileNames = files.map((label) => label.innerText);

    chrome.runtime.sendMessage({
      type: 'foundFiles',
      files: fileNames,
    });
  }
}

/* main */
const copyFilenamesBtn = document.querySelector('#copy-filenames-btn');

chrome.runtime.onMessage.addListener(popupListener);

window.onload = async () => {
  checkForFiles();
};

copyFilenamesBtn.addEventListener('click', copyFilenamesToClipboard);

/* end of main */
