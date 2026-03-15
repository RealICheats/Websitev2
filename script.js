const video = document.getElementById('video');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const switchBtn = document.getElementById('switchCamera');

let currentFacingMode = 'user';
let faceMesh;

// Load MediaPipe
async function loadFaceMesh() {
  status.textContent = 'Loading face model...';

  const { FaceMesh } = await import('https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/face_mesh.js');

  faceMesh = new FaceMesh({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/${file}`,
  });

  faceMesh.setOptions({
    maxNumFaces: 5,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });

  faceMesh.onResults(onResults);
  status.textContent = 'Model loaded! Starting detection...';
}

// Start camera
async function startCamera() {
  try {
    status.textContent = 'Requesting camera...';

    if (video.srcObject) {
      video.srcObject.getTracks().forEach(track => track.stop());
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: currentFacingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    });

    video.srcObject = stream;

    await new Promise(resolve => {
      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        resolve();
      };
    });

    status.textContent = 'Camera active – detecting faces';
  } catch (err) {
    status.textContent = 'Camera error: ' + err.message;
  }
}

// Process results
function onResults(results) {
  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (results.multiFaceLandmarks) {
    for (const landmarks of results.multiFaceLandmarks) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const lm of landmarks) {
        const x = lm.x * canvas.width;
        const y = lm.y * canvas.height;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }

      ctx.strokeStyle = 'red';
      ctx.lineWidth = 4;
      ctx.shadowColor = 'rgba(255,0,0,0.7)';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.rect(minX, minY, maxX - minX, maxY - minY);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// Start detection loop
function startDetection() {
  const processFrame = async () => {
    if (video.readyState === video.HAVE_ENOUGH_DATA && faceMesh) {
      await faceMesh.send({ image: video });
    }
    requestAnimationFrame(processFrame);
  };
  processFrame();
}

// Switch camera
switchBtn.addEventListener('click', async () => {
  currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
  await startCamera();
});

// Initialize
video.addEventListener('play', async () => {
  await loadFaceMesh();
  startDetection();
});

startCamera();

// Cleanup
window.addEventListener('beforeunload', () => {
  if (video.srcObject) {
    video.srcObject.getTracks().forEach(track => track.stop());
  }
});
