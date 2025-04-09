const audioContext = new AudioContext();
let pianoRollCustomGUI;
let currentBpm = 60;

async function setup() {
  createCanvas(1600, 800);

  const hostGroupId = await setupWamHost();
  // First WAM: a piano roll for generating notes, sort of step sequencer
  const wamURIPianoRoll = "https://www.webaudiomodules.com/community/plugins/burns-audio/pianoroll/index.js";
  const pianoRollInstance = await loadDynamicComponent(wamURIPianoRoll, hostGroupId);
  const pianoRollDiv = await pianoRollInstance.createGui();
  showWam(pianoRollDiv, 10, 50, 0.7, 500, 540);

  // Second WAM: a synth to play the notes
  // Example with a web assembly instrument (Pro24 synth) WAM compiled from C-Major code)
  const wamURISynth = 'https://wam-4tt.pages.dev/Pro54/index.js';
  synthInstance = await loadDynamicComponent(wamURISynth, hostGroupId);

  // Display the WAM GUI (optionnal, WAMs can be used without GUI)
  const synthDiv = await synthInstance.createGui();
  showWam(synthDiv, 370, 50, 0.7);

  // Build the audio graph
  // a WAM is always handled like a single Web Audio node, even if
  // its made internally of many nodes
  synthInstance.audioNode.connect(audioContext.destination);

  // build the "MIDI graph" (connect the pianoRoll to the synth)
  pianoRollInstance.audioNode.connectEvents(synthInstance.instanceId);

  // Create the pianoRoll custom GUI
  // parameters: number of rows, number of bars, time signature numerator, time signature denominator
  pianoRollCustomGUI = new PianoRollCustomGUI(12, 2, 4, 4, currentBpm);

  const startButton = document.querySelector("#btn-start");
  startButton.onclick = () => {
    console.log(audioContext.state)
    if (audioContext.state !== "running") {
      audioContext.resume();
    }

    if (startButton.textContent === "Start") {
      pianoRollInstance.audioNode.scheduleEvents({
        type: 'wam-transport', data: {
          playing: true,
          timeSigDenominator: 4,
          timeSigNumerator: 4,
          currentBar: 0,
          currentBarStarted: audioContext.currentTime,
          tempo: currentBpm
        }
      });
      // start custom GUI
      pianoRollCustomGUI.start();

      startButton.textContent = "Stop";
    } else {

      pianoRollInstance.audioNode.scheduleEvents({
        type: 'wam-transport', data: {
          playing: false,
          timeSigDenominator: 4,
          timeSigNumerator: 4,
          currentBar: 0,
          currentBarStarted: audioContext.currentTime,
          tempo: currentBpm
        }
      });

      // stop custom GUI
      pianoRollCustomGUI.stop();

      startButton.textContent = "Start";
      // not mandatory. If present, allows a "play/pause" behavior.
      // if not, presing start will start from beginning each time.
      audioContext.suspend();
    }
  }

  // Listener for bpm change
  const bpmInput = document.querySelector("#bpm");
  bpmInput.oninput = (e) => {
    const bpm = parseInt(e.target.value);
    console.log(bpm);
    currentBpm = bpm;

    // adjust pianoRoll tempo
    pianoRollInstance.audioNode.scheduleEvents({
      type: 'wam-transport', data: {
        playing: true,
        timeSigDenominator: 4,
        timeSigNumerator: 4,
        currentBar: 0,
        currentBarStarted: audioContext.currentTime,
        tempo: bpm
      }
    });

    // adjust tempo of the pianoRoll custom GUI
    pianoRollCustomGUI.setTempo(bpm);
  }
}

function draw() {
  // Let's draw our own piano roll as a matrix of square pads
  if (pianoRollCustomGUI) {
    pianoRollCustomGUI.draw();
  }
}



// check click on a piano roll cell and turn it red/white on/off on click
function mousePressed() {
  const cols = pianoRollCustomGUI.cols;
  const rows = pianoRollCustomGUI.rows;
  const w = width / cols;
  const h = height / rows;

  const col = Math.floor(mouseX / w);
  const row = Math.floor(mouseY / h);
  const cell = pianoRollCustomGUI.getCell(col, row);
    // Change color of the cell
    pianoRollCustomGUI.toggleCellActive(cell);
  
}
//-------------------
// Utility functions 
//-------------------
async function setupWamHost() {
  // Init WamEnv, load SDK etc.
  const { default: initializeWamHost } = await import("https://www.webaudiomodules.com/sdk/2.0.0-alpha.6/src/initializeWamHost.js");
  const [hostGroupId] = await initializeWamHost(audioContext);

  // hostGroupId is useful to group several WAM plugins together....
  return hostGroupId;
}

async function loadDynamicComponent(wamURI, hostGroupId) {
  try {

    // Import WAM
    const { default: WAM } = await import(wamURI);
    // Create a new instance of the plugin, pass groupId
    const wamInstance = await WAM.createInstance(hostGroupId, audioContext);

    return wamInstance;
  } catch (error) {
    console.error('Erreur lors du chargement du Web Component :', error);
  }
}

function showWam(wamGUI, x, y, scale, width, height) {
  // Create a container around the wam, so that we can rescale/position it easily
  // this is where you can add a menu bar, close button, etc.
  const container = document.createElement('div');
  container.style.position = 'absolute';

  container.style.overflow = 'auto';
  container.style.zIndex = '10';  // above canvas

  // Put the wam in the div
  container.appendChild(wamGUI);

  adjustPositionAndSize(container, x, y, scale);
  if (height !== undefined)
    container.style.height = height + "px";
  if (width !== undefined)
    container.style.width = width + "px";

  document.body.appendChild(container);
}

function adjustPositionAndSize(wamContainer, x, y, scale) {
  // rescale without changing the top left coordinates
  wamContainer.style.transformOrigin = '0 0';
  wamContainer.style.top = y + "px";
  wamContainer.style.left = x + "px";
  wamContainer.style.transform += ` scale(${scale})`;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  const container = document.querySelector('div');
  if (container) {
    container.style.width = windowWidth + "px";
    container.style.height = windowHeight + "px";
  }
}