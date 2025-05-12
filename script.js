let peer;
let conn;
let myName = "";
let remoteName = "Desconocido";
let cameraStream = null;
let myLocation = null;
let remoteLocation = null;
let mediaDevices = [];
let currentCameraIndex = 0;
let cameraActive = false;  // Nuevo estado para controlar la cámara

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
    addMessage(`✅ Sistema: Usuario conectado.`);
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

  addMessage(`⌛ Sistema: Esperando conexión con ${otherId}...`);
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
      addMessage(`✅ Sistema: Conectado con ${remoteName}`);
    } else if (data.type === "msg") {
      addMessage(`${remoteName}: ${data.value}`);
    } else if (data.type === "buzz") {
      triggerBuzz();
    } else if (data.type === "img") {
      showImage(data.value, remoteName);
    } else if (data.type === "end") {
      addMessage(data.value);
    } else if (data.type === "location") {
      remoteLocation = data.value;
      addMessage(`📍 ${remoteName} envió su ubicación.`);
      checkDistance();
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

function enableCamera(deviceId = null) {
  const video = document.getElementById('video');
  const container = document.getElementById('video-container');

  if (cameraActive) {
    // Si la cámara ya está activa, la detenemos
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
    video.srcObject = null;
    video.style.display = 'none';
    container.style.display = 'none';
    cameraActive = false;  // Desactivamos la cámara
    return;  // Salimos de la función para evitar seguir ejecutando el resto
  }

  // Si la cámara no está activa, la encendemos
  const constraints = deviceId
    ? { video: { deviceId: { exact: deviceId }, facingMode: "environment" } }
    : { video: { facingMode: "user" } };

  navigator.mediaDevices.getUserMedia(constraints)
    .then(stream => {
      cameraStream = stream;
      video.srcObject = stream;
      video.style.display = 'block';
      container.style.display = 'block';
      cameraActive = true;  // Activamos la cámara
    })
    .catch(err => {
      console.error("No se pudo acceder a la cámara", err);
      alert("No se pudo acceder a la cámara.");
    });
}

function switchCamera() {
  navigator.mediaDevices.enumerateDevices()
    .then(devices => {
      mediaDevices = devices.filter(device => device.kind === 'videoinput');

      if (mediaDevices.length < 2) {
        alert("No hay más de una cámara disponible.");
        return;
      }

      const currentDeviceId = cameraStream?.getVideoTracks()?.[0]?.getSettings()?.deviceId;
      const currentIndex = mediaDevices.findIndex(dev => dev.deviceId === currentDeviceId);
      currentCameraIndex = (currentIndex + 1) % mediaDevices.length;

      const nextDeviceId = mediaDevices[currentCameraIndex].deviceId;
      enableCamera(nextDeviceId);
    })
    .catch(err => {
      console.error("Error al enumerar dispositivos", err);
    });
}

function capturePhoto() {
  const video = document.getElementById('video');
  const canvas = document.getElementById('canvas');
  const context = canvas.getContext('2d');

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  if (canvas.width === 0 || canvas.height === 0) {
    alert("La cámara aún no está lista. Esperá un momento e intentá de nuevo.");
    return;
  }

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

function sendLocation() {
  if (!conn) return;

  if (!navigator.geolocation) {
    alert("Tu navegador no soporta geolocalización.");
    return;
  }

  navigator.geolocation.getCurrentPosition(position => {
    const coords = {
      lat: position.coords.latitude,
      lon: position.coords.longitude
    };
    myLocation = coords;
    conn.send({ type: "location", value: coords });
    addMessage(`📍 Ubicación enviada.`);
    checkDistance();
  }, err => {
    console.error("Error al obtener ubicación", err);
    alert("No se pudo obtener la ubicación.");
  });
}

function checkDistance() {
  if (myLocation && remoteLocation) {
    const dist = haversineDistance(myLocation, remoteLocation);
    addMessage(`📏 Distancia entre ambos: ${dist.toFixed(2)} km`);
  }
}

function haversineDistance(loc1, loc2) {
  const toRad = deg => deg * Math.PI / 180;
  const R = 6371; // km
  const dLat = toRad(loc2.lat - loc1.lat);
  const dLon = toRad(loc2.lon - loc1.lon);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(loc1.lat)) * Math.cos(toRad(loc2.lat)) *
            Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function disconnect() {
  if (conn && conn.open) {
    conn.send({ type: "end", value: "⚠️ Sistema: El chat ha sido finalizado por el otro usuario." });
    conn.close();
    conn = null;
    addMessage(`⚠️ Sistema: Desconectado.`);
  }

  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
    document.getElementById('video').srcObject = null;
    document.getElementById('video').style.display = 'none';
    document.getElementById('video-container').style.display = 'none';
  }

  if (peer) {
    peer.destroy();
    peer = null;
  }

  myLocation = null;
  remoteLocation = null;
  remoteName = "Desconocido";

  document.getElementById('chat-section').style.display = 'none';
  document.getElementById('start-section').style.display = 'block';

  addMessage(`⌛ Sistema: Esperando conexión...`);
}
