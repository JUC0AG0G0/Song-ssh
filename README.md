# Projet de Gestion des Machines


## Prérequis


Assurez-vous que les éléments suivants sont installés :


- [Node.js](https://nodejs.org/) (version 14 ou supérieure)

- [npm](https://www.npmjs.com/) (installé avec Node.js)


## Configuration



1.  **Ajoutez un fichier `machines.json` à la racine du projet** avec les informations suivantes :



```json
[
	{
		"id": 1,
		"nom": "Serveur 1",
		"adresse_ip": "255.126.26.1",
		"utilisateur": "User",
		"mot_de_passe": "MonSuperMotDePasse"
	},
	{
		"id": 2,
		"nom": "Serveur 2",
		"adresse_ip": "255.126.26.1",
		"utilisateur": "User",
		"mot_de_passe": "MonSuperMotDePasse"
	}
]
```

Installez les dépendances :
```bash
npm  install
```

Pour lancer le serveur :
```bash
node  server.js
```