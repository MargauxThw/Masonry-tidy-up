// Plugin JS here...
figma.showUI(__html__, {
  width: 300,
  height: 360,
  title: "Masonry tidy up",
});

// Initial setup
figma.ui.postMessage({
  msg: "new-selection",
  len: getSelectionWidth(),
  allEqual: getSelectionEqual(),
});

// Listeners
figma.on("selectionchange", () => {
  figma.ui.postMessage({
    msg: "new-selection",
    len: getSelectionWidth(),
    allEqual: getSelectionEqual(),
  });
});

// Helper functions
function getSelectionWidth() {
  let width;

  if (figma.currentPage.selection.length == 0) {
    width = 0;
  } else if (figma.currentPage.selection.length == 1) {
    width = figma.currentPage.selection[0].width;
  } else {
    width =
      Math.max(
        ...figma.currentPage.selection.map((node) => node.x + node.width)
      ) - Math.min(...figma.currentPage.selection.map((node) => node.x));
  }

  return width;
}

function getSelectionEqual() {
  let selection = figma.currentPage.selection;
  if (selection.length > 0) {
    let width = selection[0].width;
    for (let i = 0; i < selection.length; i++) {
      if (selection[i].width != width) {
        return false;
      }
    }
  } else {
    return false;
  }

  return true;
}

function getAncestorStickies(parent, ancestors) {
  // Recursively get all Stickies in sections (and sections in sections etc.)
  for (let i = 0; i < parent.children.length; i++) {
    if (parent.children[i].type === "STICKY") {
      ancestors.push(parent.children[i]);
    } else if (parent.children[i].type === "SECTION") {
      ancestors = getAncestorStickies(parent.children[i], ancestors);
    }
  }
  return ancestors;
}

function getSelectedStickies(children) {
  var nodes = [];

  // Add all selected Sticky Notes to nodes array
  for (let i = 0; i < children.length; i++) {
    if (children[i].type === "SECTION") {
      var ancestors = getAncestorStickies(children[i], []);
      for (let j = 0; j < ancestors.length; j++) {
        if (ancestors[j].type === "STICKY") {
          nodes.push(ancestors[j]);
        }
      }
    } else if (children[i].type === "STICKY") {
      nodes.push(children[i]);
    }
  }
  return nodes;
}

// Message handling
figma.ui.onmessage = (msg) => {
  const children = figma.currentPage.selection;
  const nodes = getSelectedStickies(children);

  switch (msg.type) {
    case "change-width":
      for (let i = 0; i < nodes.length; i++) {
        nodes[i].isWideWidth = false;
        nodes[i].rescale(msg.width / nodes[i].width);
        nodes[i].rescale(msg.width / nodes[i].width);
      }
      figma.ui.postMessage({
        msg: "new-selection",
        len: getSelectionWidth(),
        allEqual: getSelectionEqual(),
      });

      break;

    case "on-selected":
      // A 2-D array of all the rows in new masonry grid
      let masonry = [];
      let currRow = 0;

      let newNodes = [...nodes].sort((a, b) => 0.5 - Math.random());
      let originalX = newNodes[0].x;
      let originalY = newNodes[0].y;
      
      for (let i = 0; i < newNodes.length; i++) {
        let firstInRow = false;

        // Leave the first created sticky in-place
        if (i == 0) {
          masonry.push([i]);
        } else {
          // if adding this sticky will exceed max, make new row, unless first in row!
          if (masonry[currRow].length && masonry[currRow].length == msg.maxWidth) {
            currRow++;
            masonry.push([]);
            firstInRow = true;
          }

          // Set nodes[i].y
          if (currRow == 0) {
            newNodes[i].y = originalY;
          } else if (firstInRow) {
            newNodes[i].y =
            newNodes[masonry[currRow - 1][0]].y +
              newNodes[masonry[currRow - 1][0]].height +
              msg.spacing;
          } else {
            let index = masonry[currRow].length;
            newNodes[i].y =
            newNodes[masonry[currRow - 1][index]].y +
            newNodes[masonry[currRow - 1][index]].height +
              msg.spacing;
          }

          // Set nodes[i].x
          if (firstInRow) {
            newNodes[i].x = originalX;
          } else {
            newNodes[i].x = newNodes[i - 1].x + newNodes[i - 1].width + msg.spacing;
          }

          masonry[currRow].push(i);
        }
      }
      console.log(newNodes.map(n => [n.x, n.y]))


      figma.viewport.scrollAndZoomIntoView(nodes);
  }
};
