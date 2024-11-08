const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Client } = require('ssh2');
const fs = require('fs');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

function loadMachines() {
  const data = fs.readFileSync('machines.json');
  return JSON.parse(data);
}

app.get('/machines', (req, res) => {
  const machines = loadMachines();
  res.json(machines);
});

io.on('connection', (socket) => {
  console.log('Client connecté');

  const sound_url = 'https://www.myinstants.com/media/sounds/dry-fart.mp3';

  const script = (sound_url) => `
    # Vérifie si les outils nécessaires sont installés
    if ! command -v wget &> /dev/null || ! command -v alsamixer &> /dev/null || ! command -v mpv &> /dev/null; then
        echo "wget, alsamixer, ou mpv n'est pas installé. Installation en cours..."
        sudo apt update && sudo apt install -y wget alsa-utils mpv
    fi
    
    # Configure le volume au maximum
    amixer set Master 80%
    
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
  `;

  socket.on('ssh-connect', (machineId) => {
    const machines = loadMachines();
    const machine = machines.find(m => m.id === machineId);

    if (!machine) {
      socket.emit('ssh-data', 'Machine non trouvée');
      return;
    }

    console.log(`Connexion SSH demandée pour la machine : ${machine.nom}`);
    
    const conn = new Client();
    
    conn.on('ready', () => {
      console.log('Connexion SSH prête');
      socket.emit('ssh-data', 'Connexion SSH établie ! Exécution du script...');

      const execScript = script(sound_url);

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

server.listen(port, hostname, () => {
  console.log(`Serveur en écoute sur http://${hostname}:${port}`);
});
