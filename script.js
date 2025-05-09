let peer;
let conn;
let myName = "";
let remoteName = "Desconocido";
let cameraStream = null;

function start() {
  const myId = document.getElementById('myId').value;
  myName = document.getElementById('myName').value;

  if (!myId || !myName) {
    alert("Escribí un ID y un nombre para mostrar");
    return;
  }

  peer = new Peer(myId);

  peer.on('open', id => {
    document.getElementById('peer-id').textContent = id;
    document.getElementById('start-section').style.display = 'none';
    document.getElementById('chat-section').style.display = 'block';
  });

  peer.on('connection', connection => {
    conn = connection;
    setupConnection();
  });

  document.getElementById('message').addEventListener('keydown', e => {
    if (e.key === 'Enter') sendMessage();
  });
}

function connect() {
  const otherId = document.getElementById('connectId').value;
  if (!peer) {
    alert("Primero iniciá tu Peer con un ID.");
    return;
  }

  conn = peer.connect(otherId);
  conn.on('open', () => {
    conn.send({ type: "name", value: myName });
  });
  setupConnection();
}

function setupConnection() {
  conn.on('data', data => {
    if (data.type === "name") {
      remoteName = data.value;
    } else if (data.type === "msg") {
      addMessage(`${remoteName}: ${data.value}`);
    } else if (data.type === "buzz") {
      triggerBuzz();
    } else if (data.type === "img") {
      showImage(data.value, remoteName);
    }
  });

  conn.on('open', () => {
    conn.send({ type: "name", value: myName });
  });
}

function sendMessage() {
  const msgInput = document.getElementById('message');
  const msg = msgInput.value;
  if (conn && msg.trim() !== '') {
    conn.send({ type: "msg", value: msg });
    addMessage(`Yo (${myName}): ${msg}`);
    msgInput.value = '';
  }
}

function addMessage(msg) {
  const msgBox = document.getElementById('messages');
  const div = document.createElement('div');
  div.textContent = msg;
  msgBox.appendChild(div);
  msgBox.scrollTop = msgBox.scrollHeight;
}

function enableCamera() {
  const video = document.getElementById('video');

  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
    video.style.display = 'none';
    video.srcObject = null;
  } else {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        cameraStream = stream;
        video.srcObject = stream;
        video.style.display = 'block';
      })
      .catch(err => {
        console.error("No se pudo acceder a la cámara", err);
      });
  }
}

function capturePhoto() {
  const video = document.getElementById('video');
  const canvas = document.getElementById('canvas');
  const context = canvas.getContext('2d');

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  canvas.toBlob(blob => {
    blob.arrayBuffer().then(buffer => {
      conn.send({ type: "img", value: buffer });
      showImage(buffer, `Yo (${myName})`);
    });
  }, 'image/jpeg');
}

function showImage(buffer, sender) {
  const blob = new Blob([buffer]);
  const url = URL.createObjectURL(blob);
  const img = document.createElement('img');
  img.src = url;
  img.style.maxWidth = "100%";
  img.style.maxHeight = "200px";

  const container = document.createElement('div');
  container.innerHTML = `<strong>${sender}:</strong><br>`;
  container.appendChild(img);

  const msgBox = document.getElementById('messages');
  msgBox.appendChild(container);
  msgBox.scrollTop = msgBox.scrollHeight;
}

function sendBuzz() {
  if (conn) {
    conn.send({ type: "buzz" });
    triggerBuzz();
  }
}

function triggerBuzz() {
  const chatSection = document.getElementById('chat-section');
  chatSection.classList.add('shake');
  if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
  setTimeout(() => chatSection.classList.remove('shake'), 300);
}
