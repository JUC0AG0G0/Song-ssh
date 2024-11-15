const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Client } = require('ssh2');
const fs = require('fs');
const os = require('os');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

function loadMachines() {
  const data = fs.readFileSync('machines.json');
  return JSON.parse(data);
}

function loadSounds() {
  const data = fs.readFileSync('sound.json');
  return JSON.parse(data);
}

app.get('/machines', (req, res) => {
  const machines = loadMachines();
  const sounds = loadSounds();
  res.json({ machines, sounds });
});

const script = (sound_url, volume) => `
  # Vérifie si les outils nécessaires sont installés
  if ! command -v wget &> /dev/null || ! command -v alsamixer &> /dev/null || ! command -v mpv &> /dev/null; then
      echo "wget, alsamixer, ou mpv n'est pas installé. Installation en cours..."
      sudo apt update && sudo apt install -y wget alsa-utils mpv
  fi
  
  # Configure le volume
  amixer set Master unmute
  amixer set Master ${volume}%
  
  # Crée le dossier Téléchargements s'il n'existe pas
  mkdir -p ~/Téléchargements
  
  # Télécharge le fichier audio
  wget -O ~/Téléchargements/hihihafunnysound.mp3 "${sound_url}"
  
  # Vérifie le fichier téléchargé
  ls ~/Téléchargements

  # Joue le son en utilisant mpv
  mpv ~/Téléchargements/hihihafunnysound.mp3

  # Supprime le fichier audio
  rm ~/Téléchargements/hihihafunnysound.mp3

  # Fin du script
  echo Fin du script

  exit
`;

io.on('connection', (socket) => {
  console.log('Client connecté');

  socket.on('ssh-connect', (req) => {
    const machines = loadMachines();
    const machine = machines.find(m => m.id === Number(req.machineId));

    const sound = loadSounds();
    const sounde = sound.find(s => s.id === Number(req.sound_id))

    if (!machine) {
      console.error(`Machine avec ID ${req.machineId} non trouvée dans machines.json`);
      socket.emit('ssh-data', 'Machine non trouvée');
      return;
    }


    console.log("id machine : " + req.machineId);
    console.log("volume : " + req.percentage);
    console.log("machine : " + machine);
    console.log("nom : " + machine.nom);
    console.log("host : " + machine.adresse_ip);

    console.log("id sound : " + req.sound_id);
    console.log("nom sound : " + sounde.name);
    console.log("lien sound : " + sounde.url);

    console.log(`Connexion SSH demandée pour la machine : ${machine.nom}`);
    
    const conn = new Client();
    
    conn.on('ready', () => {
      console.log('Connexion SSH prête');
      socket.emit('ssh-data', 'Connexion SSH établie ! Exécution du script...');

      const execScript = script(sounde.url, Number(req.percentage));

      conn.exec(execScript, (err, stream) => {
        if (err) {
          socket.emit('ssh-data', 'Erreur: ' + err.message);
          return conn.end();
        }

        stream.on('data', (data) => {
          socket.emit('ssh-data', data.toString());
        }).on('close', () => {
          conn.end();
        });
      });
    }).connect({
        host: machine.adresse_ip,
        port: 22,
        username: machine.utilisateur,
        password: machine.mot_de_passe
    });

    conn.on('error', (err) => {
      socket.emit('ssh-data', 'Erreur de connexion SSH: ' + err.message);
    });
  });
});

const hostname = '0.0.0.0';
const port = 3000;

server.listen(port, hostname, async () => {
  const networkInterfaces = os.networkInterfaces();
  const localAddress = Object.values(networkInterfaces)
    .flat()
    .find(iface => iface && iface.family === 'IPv4' && !iface.internal)
    .address;

  console.log(`Accessible à partir de l'url : http://${localAddress}:${port}`);
  
  const open = await import('open');
  open.default(`http://${localAddress}:${port}`);
});
