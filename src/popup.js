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
  const fileCount = document.querySelector('#file-count');
  fileCount.innerText = `${files.length} files found`;
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

function toggleRemoveFileExtensions() {
  const filenamesTextarea = document.querySelector('#file-name-text');
  const text = filenamesTextarea.innerHTML;
  document.querySelector('#error-msg').hidden = true;
  document.querySelector('#success-msg').hidden = true;
  const removeFileExtension = document.querySelector('#remove-file-extension');
  const checked = removeFileExtension.checked;
  const fileNames = text.split('\n');

  if (checked) {
    const newText = fileNames.map((text) => {
      let textArray = text.split('.');
      if (textArray.length > 1) {
        // get rid of last part (should be extension)
        if (isNaN(Number(textArray[textArray.length - 1]))) {
          // if last value is a number its likely not an extension
          let withoutSuffix = textArray.slice(0, -1);
          return withoutSuffix.join('.');
        }
        return textArray.join('.');
      }
      return text;
    });
    filenamesTextarea.innerHTML = newText.join('\n');
  } else {
    checkForFiles();
  }
}

/* functions to send to dom */
function findFilesInPage() {
  // if we can see grid button we know we are currently in list view
  // const listLayout = document.querySelector('div[aria-label="Grid layout"]');
  // const gridLayout = document.querySelector('div[aria-label="List layout"]');

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
        'div[role="gridcell"]'
      )
    );

    let fileNames = [];
    files.forEach((div) => {
      // currently this selector finds only the div with file name
      let label = div.querySelector('div[data-tooltip-unhoverable]');
      fileNames.push(label.innerText);
    });

    chrome.runtime.sendMessage({
      type: 'foundFiles',
      files: fileNames,
    });
  }
}

/* main */
const copyFilenamesBtn = document.querySelector('#copy-filenames-btn');
const removeFileExtension = document.querySelector('#remove-file-extension');

chrome.runtime.onMessage.addListener(popupListener);

window.onload = async () => {
  checkForFiles();
};

copyFilenamesBtn.addEventListener('click', copyFilenamesToClipboard);
removeFileExtension.addEventListener('change', toggleRemoveFileExtensions);

/* end of main */
