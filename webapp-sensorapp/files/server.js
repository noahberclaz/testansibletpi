// Importer les dépendances nécessaires
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const nodemailer = require('nodemailer');


// Initialiser l'application Express
const app = express();
const port = 3000;

// Middleware pour parser les requêtes JSON et activer CORS
app.use(cors());
app.use(bodyParser.json());

// Servir les fichiers statiques (HTML, CSS, JS) depuis le dossier src/
app.use(express.static(path.join(__dirname, 'src')));

// Se connecter à la base de données SQLite
const db = new sqlite3.Database('./database/database.sqlite', (err) => {
    if (err) {
        console.error('Erreur lors de la connexion à la base de données :', err.message);
    } else {
        console.log('Connecté à la base de données SQLite.');
    }
});

// Configurer le transporteur d'email
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'captorview@gmail.com',
        pass: 'qruh cbol niwx sjla'
    }
});

// Fonction pour envoyer un email d'alerte de qualité de l'air
function sendAirQualityAlert(salleNom, captorData) {
    const mailOptions = {
        from: 'captorview@gmail.com',
        to: 'noah.berclaz@studentfr.ch',
        subject: `⚠️ Alerte : Mauvaise qualité de l'air dans ${salleNom}`,
        text: `
Bonjour,

Une mauvaise qualité de l'air a été détectée dans la salle ${salleNom}. Voici les détails :

- **Qualité de l'air** : ${captorData.qualite_air || 'N/A'}
- **Humidité** : ${captorData.humidite || 'N/A'}
- **Température** : ${captorData.temperature || 'N/A'}
- **Micro-particules** : ${captorData.micro_particules || 'N/A'}

**Recommandations :**
- Aérez immédiatement la salle en ouvrant les fenêtres.
- Vérifiez les sources potentielles de pollution (ex: appareils électriques, produits chimiques).
- Si le problème persiste, contactez un technicien pour inspecter le capteur et la ventilation.

Cordialement,
Votre système de surveillance
        `
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Erreur lors de l\'envoi de l\'email (qualité de l\'air) :', error);
        } else {
            console.log('Email d\'alerte qualité de l\'air envoyé :', info.response);
        }
    });
}

// Fonction pour envoyer un email d'alerte de batterie faible
function sendLowBatteryAlert(captor) {
    const salleNom = captor.salle_id ? `Salle ${captor.salle_id}` : 'Non assigné';
    const mailOptions = {
        from: 'captorview@gmail.com',
        to: 'sebastien.maldonado@studentfr.ch',
        subject: `⚠️ Alerte : Batterie faible pour le capteur ID ${captor.id}`,
        text: `
Bonjour,

Le capteur ID ${captor.id} a une batterie faible. Voici les détails :

- **Capteur ID** : ${captor.id}
- **Salle** : ${salleNom}
- **Niveau de batterie** : ${captor.battery}%
- **Statut** : ${captor.statut}

**Recommandations :**
- Remplacez ou rechargez la batterie du capteur dès que possible.
- Si le capteur est défectueux, envisagez de le remplacer.

Cordialement,
Votre système de surveillance
        `
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Erreur lors de l\'envoi de l\'email (batterie faible) :', error);
        } else {
            console.log(`Email d'alerte batterie faible envoyé pour le capteur ID ${captor.id} :`, info.response);
        }
    });
}

// Fonction pour surveiller la qualité de l'air et la batterie
function monitorAirQualityAndBattery() {
    console.log('Surveillance de la qualité de l\'air et des batteries...');
    
    // Récupérer tous les capteurs
    db.all('SELECT * FROM captors', [], (err, captors) => {
        if (err) {
            console.error('Erreur lors de la récupération des capteurs pour la surveillance :', err.message);
            return;
        }

        // Récupérer toutes les salles
        db.all('SELECT * FROM salles', [], (err, salles) => {
            if (err) {
                console.error('Erreur lors de la récupération des salles pour la surveillance :', err.message);
                return;
            }

            captors.forEach(captor => {
                // 1. Vérifier la qualité de l'air pour les capteurs actifs et assignés
                if (captor.statut === 'actif' && captor.salle_id) {
                    const salle = salles.find(s => s.nom === `Salle ${captor.salle_id}`);
                    if (!salle) {
                        console.log(`Salle non trouvée pour le capteur ${captor.id} (salle_id: ${captor.salle_id})`);
                        return;
                    }

                    // Vérifier la qualité de l'air
                    const qualiteAir = captor.qualite_air ? parseInt(captor.qualite_air.replace('%', ''), 10) : null;
                    const isBadQuality = qualiteAir && qualiteAir < 40; // Mauvaise qualité si < 40%
                    const isHighMicroParticules = captor.micro_particules === 'Élevé';
                    const humidite = captor.humidite ? parseInt(captor.humidite.replace('%', ''), 10) : null;
                    const isHighHumidite = humidite && humidite > 70;
                    const temperature = captor.temperature ? parseInt(captor.temperature.replace('°C', ''), 10) : null;
                    const isHighTemperature = temperature && temperature > 30;

                    // Si la qualité est mauvaise ou un autre paramètre est critique, envoyer une alerte
                    if (isBadQuality || isHighMicroParticules || isHighHumidite || isHighTemperature) {
                        console.log(`Alerte : Mauvaise qualité de l'air détectée dans ${salle.nom} (Capteur ID: ${captor.id})`);
                        sendAirQualityAlert(salle.nom, captor);
                    }
                }

                // 2. Vérifier le niveau de batterie pour tous les capteurs (actifs ou non)
                const batteryLevel = captor.battery;
                const isLowBattery = batteryLevel !== null && batteryLevel <= 30; // Batterie faible si ≤ 30%

                if (isLowBattery) {
                    console.log(`Alerte : Batterie faible détectée pour le capteur ID ${captor.id} (${batteryLevel}%)`);
                    sendLowBatteryAlert(captor);
                }
            });
        });
    });
}

// Créer les tables et initialiser les données
db.serialize(() => {
    // Créer la table "captors" avec tous les champs nécessaires (sans AUTOINCREMENT)
    db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='captors'`, (err, row) => {
        if (err) {
            console.error('Erreur lors de la vérification de la table captors :', err.message);
            return;
        }

        if (row) {
            // Vérifier si la table captors_temp existe déjà
            db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='captors_temp'`, (err, tempRow) => {
                if (err) {
                    console.error('Erreur lors de la vérification de captors_temp :', err.message);
                    return;
                }

                if (tempRow) {
                    // Si captors_temp existe, la supprimer
                    console.log('Table captors_temp existe déjà, suppression...');
                    db.run(`DROP TABLE captors_temp`, (dropErr) => {
                        if (dropErr) {
                            console.error('Erreur lors de la suppression de captors_temp :', dropErr.message);
                            return;
                        }
                        console.log('Table captors_temp supprimée.');
                        proceedWithCaptorMigration();
                    });
                } else {
                    // Si captors_temp n'existe pas, procéder directement à la migration
                    proceedWithCaptorMigration();
                }
            });
        } else {
            // Si la table captors n'existe pas, la créer directement
            db.run(`
                CREATE TABLE captors (
                    id INTEGER PRIMARY KEY,
                    salle_id TEXT,
                    battery INTEGER,
                    statut TEXT,
                    humidite TEXT,
                    temperature TEXT,
                    micro_particules TEXT,
                    qualite_air TEXT,
                    created_at TEXT,
                    created_by TEXT,
                    updated_by TEXT,
                    updated_at TEXT
                )
            `, (err) => {
                if (err) {
                    console.error('Erreur lors de la création de la table captors :', err.message);
                } else {
                    console.log('Table "captors" créée.');
                    initializeData();
                }
            });
        }
    });

    // Créer la table "salles"
    db.run(`
        CREATE TABLE IF NOT EXISTS salles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nom VARCHAR(100) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('Erreur lors de la création de la table salles :', err.message);
        } else {
            console.log('Table "salles" créée ou déjà existante.');
        }
    });

    // Initialiser les données des salles si la table est vide
    db.get('SELECT COUNT(*) as count FROM salles', (err, row) => {
        if (err) {
            console.error('Erreur lors de la vérification de la table salles :', err.message);
            return;
        }

        if (row.count === 0) {
            console.log('Table salles vide, insertion des données initiales...');
            const initialSalles = [
                ['Salle F119'],
                ['Salle F106'],
                ['Salle F120'],
                ['Salle E304']
            ];

            const sql = `
                INSERT INTO salles (nom)
                VALUES (?)
            `;
            initialSalles.forEach(data => {
                db.run(sql, data, (err) => {
                    if (err) {
                        console.error('Erreur lors de l\'insertion des données initiales dans salles :', err.message);
                    }
                });
            });
            console.log('Données initiales insérées dans la table salles (F119, F106, F120, E304).');
        }
    });
});

// Fonction pour procéder à la migration de la table captors
function proceedWithCaptorMigration() {
    console.log('Table captors existe, migration des données...');
    // 1. Créer une table temporaire avec la nouvelle définition
    db.run(`
        CREATE TABLE captors_temp (
            id INTEGER PRIMARY KEY,
            salle_id TEXT,
            battery INTEGER,
            statut TEXT,
            humidite TEXT,
            temperature TEXT,
            micro_particules TEXT,
            qualite_air TEXT,
            created_at TEXT,
            created_by TEXT,
            updated_by TEXT,
            updated_at TEXT
        )
    `, (err) => {
        if (err) {
            console.error('Erreur lors de la création de captors_temp :', err.message);
            return;
        }

        // 2. Copier les données existantes dans la table temporaire
        db.run(`
            INSERT INTO captors_temp (id, salle_id, battery, statut, humidite, temperature, micro_particules, qualite_air, created_at, created_by, updated_by, updated_at)
            SELECT id, salle_id, battery, statut, humidite, temperature, micro_particules, qualite_air, created_at, created_by, updated_by, updated_at
            FROM captors
        `, (err) => {
            if (err) {
                console.error('Erreur lors de la copie des données :', err.message);
                return;
            }

            // 3. Supprimer l'ancienne table
            db.run(`DROP TABLE captors`, (err) => {
                if (err) {
                    console.error('Erreur lors de la suppression de captors :', err.message);
                    return;
                }

                // 4. Renommer la table temporaire en captors
                db.run(`ALTER TABLE captors_temp RENAME TO captors`, (err) => {
                    if (err) {
                        console.error('Erreur lors de la migration de la table captors :', err.message);
                    } else {
                        console.log('Migration de la table captors terminée.');
                        initializeData();
                    }
                });
            });
        });
    });
}

// Fonction pour initialiser les données des capteurs
function initializeData() {
    // Vérifier si la table captors est vide, et si oui, insérer des données initiales
    db.get('SELECT COUNT(*) as count FROM captors', (err, row) => {
        if (err) {
            console.error('Erreur lors de la vérification de la table captors :', err.message);
            return;
        }

        if (row.count === 0) {
            console.log('Table captors vide, insertion des données initiales...');
            const created_at = new Date().toISOString();
            const initialData = [
                [1, 'F119', 98, 'actif', '45%', '22°C', 'Faible', '80%', created_at, null, null, null],
                [2, 'F106', 70, 'actif', '60%', '24°C', 'Modéré', '50%', created_at, null, null, null],
                [3, 'F120', 70, 'actif', '6%', '24°C', 'Modéré', '5%', created_at, null, null, null],
                [4, null, 20, 'inactif', null, null, null, null, created_at, null, null, null], // Capteur non assigné, batterie à 20%
                [5, null, 90, 'inactif', null, null, null, null, created_at, null, null, null]  // Capteur non assigné
            ];

            const sql = `
                INSERT INTO captors (id, salle_id, battery, statut, humidite, temperature, micro_particules, qualite_air, created_at, created_by, updated_by, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            initialData.forEach(data => {
                db.run(sql, data, (err) => {
                    if (err) {
                        console.error('Erreur lors de l\'insertion des données initiales dans captors :', err.message);
                    }
                });
            });
            console.log('Données initiales insérées dans la table captors.');

            // Simuler un capteur défectueux (ID 2) après l'insertion
            db.run(`
                UPDATE captors
                SET statut = ?, updated_at = ?
                WHERE id = ?
            `, ['defect', new Date().toISOString(), 2], (err) => {
                if (err) {
                    console.error('Erreur lors de la simulation du capteur défectueux :', err.message);
                } else {
                    console.log('Capteur ID 2 marqué comme défectueux au démarrage.');
                }
            });
        } else {
            console.log('Table captors déjà remplie, vérification des capteurs défectueux...');
            // Vérifier si un capteur est déjà défectueux
            db.get('SELECT * FROM captors WHERE statut = ?', ['defect'], (err, defectRow) => {
                if (err) {
                    console.error('Erreur lors de la vérification des capteurs défectueux :', err.message);
                    return;
                }

                if (!defectRow) {
                    // Aucun capteur défectueux, simuler un capteur défectueux (ID 2)
                    db.run(`
                        UPDATE captors
                        SET statut = ?, updated_at = ?
                        WHERE id = ?
                    `, ['defect', new Date().toISOString(), 2], (err) => {
                        if (err) {
                            console.error('Erreur lors de la simulation du capteur défectueux :', err.message);
                        } else {
                            console.log('Capteur ID 2 marqué comme défectueux au démarrage.');
                        }
                    });
                } else {
                    console.log('Un capteur est déjà défectueux, aucune simulation nécessaire.');
                }
            });
        }

        // Une fois les données initialisées, démarrer la surveillance
        console.log('Initialisation terminée, démarrage de la surveillance de la qualité de l\'air et des batteries...');
        monitorAirQualityAndBattery(); // Première exécution
        setInterval(monitorAirQualityAndBattery, 300000); // Surveillance toutes les 5 minutes
    });
}

// Fonction pour trouver le prochain ID disponible pour les capteurs
function getNextAvailableId(callback) {
    db.all('SELECT id FROM captors ORDER BY id ASC', (err, rows) => {
        if (err) {
            console.error('Erreur lors de la récupération des IDs des capteurs :', err.message);
            callback(err, null);
            return;
        }

        if (rows.length === 0) {
            // Si la table est vide, le premier ID est 1
            callback(null, 1);
            return;
        }

        // Trouver le plus petit ID manquant
        let nextId = 1;
        for (let i = 0; i < rows.length; i++) {
            if (rows[i].id !== nextId) {
                break;
            }
            nextId++;
        }

        // Si aucun "trou" n'est trouvé, prendre le plus grand ID + 1
        if (nextId === rows.length + 1) {
            nextId = rows[rows.length - 1].id + 1;
        }

        callback(null, nextId);
    });
}

// Fonction pour vérifier si une salle est déjà assignée à un capteur
function checkIfRoomAssigned(salle_id, excludeCaptorId, callback) {
    if (!salle_id) {
        // Si aucune salle n'est assignée (salle_id est null), pas de conflit
        callback(null, false);
        return;
    }

    // Requête pour vérifier si un capteur est déjà assigné à cette salle
    const sql = 'SELECT id FROM captors WHERE salle_id = ? AND id != ?';
    db.get(sql, [salle_id, excludeCaptorId || -1], (err, row) => {
        if (err) {
            console.error('Erreur lors de la vérification de l\'assignation de la salle :', err.message);
            callback(err, null);
            return;
        }
        // Si un capteur est trouvé, la salle est déjà assignée
        callback(null, !!row);
    });
}

// Routes pour les capteurs

// Route GET pour récupérer tous les capteurs
app.get('/api/captors', (req, res) => {
    const sql = 'SELECT * FROM captors';
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Erreur lors de la récupération des capteurs :', err.message);
            res.status(500).json({ error: 'Erreur serveur' });
        } else {
            res.json(rows);
        }
    });
});

// Route GET pour récupérer un capteur spécifique
app.get('/api/captors/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'SELECT * FROM captors WHERE id = ?';
    db.get(sql, [id], (err, row) => {
        if (err) {
            console.error('Erreur lors de la récupération du capteur :', err.message);
            res.status(500).json({ error: 'Erreur serveur' });
        } else if (!row) {
            res.status(404).json({ error: 'Capteur non trouvé' });
        } else {
            res.json(row);
        }
    });
});

// Route POST pour ajouter un nouveau capteur
app.post('/api/captors', (req, res) => {
    const { salle_id } = req.body;

    // Vérifier si la salle est déjà assignée à un autre capteur
    checkIfRoomAssigned(salle_id, null, (err, isAssigned) => {
        if (err) {
            console.error('Erreur lors de la vérification de l\'assignation de la salle :', err.message);
            res.status(500).json({ error: 'Erreur serveur lors de la vérification de la salle' });
            return;
        }

        if (isAssigned) {
            console.log(`La salle ${salle_id} est déjà assignée à un autre capteur.`);
            res.status(400).json({ error: 'Cette salle est déjà assignée à un autre capteur.' });
            return;
        }

        // Trouver le prochain ID disponible
        getNextAvailableId((err, nextId) => {
            if (err) {
                res.status(500).json({ error: 'Erreur serveur lors de la génération de l\'ID' });
                return;
            }

            // Générer des données aléatoires
            const battery = Math.floor(Math.random() * 50 + 50); // Ex: 50% à 100%
            const statut = salle_id ? 'actif' : 'inactif'; // Statut basé sur l'assignation
            let humidite = null;
            let temperature = null;
            let micro_particules = null;
            let qualite_air = null;

            if (statut === 'actif' && salle_id) {
                humidite = `${Math.floor(Math.random() * 50 + 30)}%`; // Ex: 30% à 80%
                temperature = `${Math.floor(Math.random() * 10 + 20)}°C`; // Ex: 20°C à 30°C
                micro_particules = Math.random() > 0.5 ? 'Faible' : 'Modéré';
                qualite_air = `${Math.floor(Math.random() * 50 + 50)}%`; // Ex: 50% à 100%
            }

            const created_at = new Date().toISOString();
            const created_by = null;
            const updated_by = null;
            const updated_at = null;

            const sql = `
                INSERT INTO captors (id, salle_id, battery, statut, humidite, temperature, micro_particules, qualite_air, created_at, created_by, updated_by, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            db.run(sql, [
                nextId,
                salle_id || null,
                battery,
                statut,
                humidite,
                temperature,
                micro_particules,
                qualite_air,
                created_at,
                created_by,
                updated_by,
                updated_at
            ], function (err) {
                if (err) {
                    console.error('Erreur lors de l\'ajout du capteur :', err.message);
                    res.status(500).json({ error: 'Erreur serveur' });
                } else {
                    res.status(201).json({ id: nextId, message: 'Capteur ajouté avec succès' });
                }
            });
        });
    });
});

// Route PUT pour modifier un capteur
app.put('/api/captors/:id', (req, res) => {
    const { id } = req.params;
    const { salle_id, statut: statutOverride } = req.body;

    console.log(`Requête PUT reçue pour le capteur ID ${id} avec salle_id: ${salle_id}, statutOverride: ${statutOverride}`);

    // Vérifier si la salle est déjà assignée à un autre capteur (en excluant le capteur actuel)
    checkIfRoomAssigned(salle_id, id, (err, isAssigned) => {
        if (err) {
            console.error('Erreur lors de la vérification de l\'assignation de la salle :', err.message);
            res.status(500).json({ error: 'Erreur serveur lors de la vérification de la salle' });
            return;
        }

        if (isAssigned) {
            console.log(`La salle ${salle_id} est déjà assignée à un autre capteur.`);
            res.status(400).json({ error: 'Cette salle est déjà assignée à un autre capteur.' });
            return;
        }

        // Récupérer les données actuelles du capteur pour conserver les valeurs si nécessaire
        db.get('SELECT * FROM captors WHERE id = ?', [id], (err, captor) => {
            if (err) {
                console.error('Erreur lors de la récupération du capteur :', err.message);
                res.status(500).json({ error: 'Erreur serveur' });
                return;
            }

            if (!captor) {
                res.status(404).json({ error: 'Capteur non trouvé' });
                return;
            }

            // Déterminer le statut
            let finalStatut = statutOverride || (salle_id ? 'actif' : 'inactif');

            // Préparer les données à mettre à jour
            let updates = {
                salle_id: salle_id !== undefined ? (salle_id || null) : captor.salle_id, // Conserver salle_id si non fourni
                statut: finalStatut,
                updated_at: new Date().toISOString(),
                updated_by: null,
                humidite: captor.humidite,
                temperature: captor.temperature,
                micro_particules: captor.micro_particules,
                qualite_air: captor.qualite_air
            };

            // Si le capteur devient inactif (non assigné), réinitialiser les données
            if (finalStatut === 'inactif' || !updates.salle_id) {
                updates.humidite = null;
                updates.temperature = null;
                updates.micro_particules = null;
                updates.qualite_air = null;
            }
            // Si le capteur devient actif et est assigné, générer de nouvelles données (sauf si déjà defect)
            else if (finalStatut === 'actif' && updates.salle_id && captor.statut !== 'defect') {
                updates.humidite = `${Math.floor(Math.random() * 50 + 30)}%`; // Ex: 30% à 80%
                updates.temperature = `${Math.floor(Math.random() * 10 + 20)}°C`; // Ex: 20°C à 30°C
                updates.micro_particules = Math.random() > 0.5 ? 'Faible' : 'Modéré';
                updates.qualite_air = `${Math.floor(Math.random() * 50 + 50)}%`; // Ex: 50% à 100%
            }
            // Si le capteur est defect, conserver les données existantes (ne pas les réinitialiser)
            else if (finalStatut === 'defect') {
                // On conserve les données actuelles (humidite, temperature, etc.)
                // Pas de modification des données, juste le statut
            }

            const sql = `
                UPDATE captors
                SET salle_id = ?, statut = ?, humidite = ?, temperature = ?, micro_particules = ?, qualite_air = ?, updated_by = ?, updated_at = ?
                WHERE id = ?
            `;
            db.run(sql, [
                updates.salle_id,
                updates.statut,
                updates.humidite,
                updates.temperature,
                updates.micro_particules,
                updates.qualite_air,
                updates.updated_by,
                updates.updated_at,
                id
            ], function (err) {
                if (err) {
                    console.error('Erreur lors de la modification du capteur :', err.message);
                    res.status(500).json({ error: 'Erreur serveur' });
                } else if (this.changes === 0) {
                    console.log(`Aucune modification effectuée pour le capteur ID ${id} (capteur non trouvé)`);
                    res.status(404).json({ error: 'Capteur non trouvé' });
                } else {
                    console.log(`Capteur ID ${id} mis à jour avec succès`);
                    res.json({ message: 'Capteur mis à jour avec succès' });
                }
            });
        });
    });
});

// Route DELETE pour supprimer un capteur par son ID
app.delete('/api/captors/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM captors WHERE id = ?';
    db.run(sql, id, function (err) {
        if (err) {
            console.error('Erreur lors de la suppression du capteur :', err.message);
            res.status(500).json({ error: 'Erreur serveur' });
        } else if (this.changes === 0) {
            res.status(404).json({ error: 'Capteur non trouvé' });
        } else {
            res.json({ message: 'Capteur supprimé avec succès' });
        }
    });
});

// Routes pour les salles

// GET /api/salles - Récupérer toutes les salles
app.get('/api/salles', (req, res) => {
    const sql = 'SELECT * FROM salles';
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Erreur lors de la récupération des salles :', err.message);
            res.status(500).json({ error: 'Erreur serveur' });
        } else {
            res.json(rows);
        }
    });
});

// GET /api/salles/:id - Récupérer une salle spécifique
app.get('/api/salles/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'SELECT * FROM salles WHERE id = ?';
    db.get(sql, [id], (err, row) => {
        if (err) {
            console.error('Erreur lors de la récupération de la salle :', err.message);
            res.status(500).json({ error: 'Erreur serveur' });
        } else if (!row) {
            res.status(404).json({ error: 'Salle non trouvée' });
        } else {
            res.json(row);
        }
    });
});

// POST /api/salles - Ajouter une nouvelle salle
app.post('/api/salles', (req, res) => {
    const { nom } = req.body;

    if (!nom) {
        res.status(400).json({ error: 'Le champ "nom" est requis' });
        return;
    }

    // Vérifier si une salle avec ce nom existe déjà
    const checkSql = 'SELECT * FROM salles WHERE nom = ?';
    db.get(checkSql, [nom], (err, row) => {
        if (err) {
            console.error('Erreur lors de la vérification de l\'existence de la salle :', err.message);
            res.status(500).json({ error: 'Erreur serveur lors de la vérification de la salle' });
            return;
        }

        if (row) {
            // Une salle avec ce nom existe déjà
            res.status(400).json({ error: `Une salle avec le nom "${nom}" existe déjà.` });
            return;
        }

        // Si aucune salle avec ce nom n'existe, procéder à l'ajout
        const sql = `
            INSERT INTO salles (nom)
            VALUES (?)
        `;
        db.run(sql, [nom], function (err) {
            if (err) {
                console.error('Erreur lors de l\'ajout de la salle :', err.message);
                res.status(500).json({ error: 'Erreur serveur' });
            } else {
                res.status(201).json({ id: this.lastID, message: 'Salle ajoutée avec succès' });
            }
        });
    });
});

// PUT /api/salles/:id - Modifier une salle
app.put('/api/salles/:id', (req, res) => {
    const { id } = req.params;
    const { nom } = req.body;

    if (!nom) {
        res.status(400).json({ error: 'Le champ "nom" est requis' });
        return;
    }

    // Vérifier si une autre salle avec ce nom existe déjà (en excluant la salle actuelle)
    const checkSql = 'SELECT * FROM salles WHERE nom = ? AND id != ?';
    db.get(checkSql, [nom, id], (err, row) => {
        if (err) {
            console.error('Erreur lors de la vérification de l\'existence de la salle :', err.message);
            res.status(500).json({ error: 'Erreur serveur lors de la vérification de la salle' });
            return;
        }

        if (row) {
            // Une autre salle avec ce nom existe déjà
            res.status(400).json({ error: `Une autre salle avec le nom "${nom}" existe déjà.` });
            return;
        }

        // Si aucune autre salle avec ce nom n'existe, procéder à la modification
        const sql = `
            UPDATE salles
            SET nom = ?
            WHERE id = ?
        `;
        db.run(sql, [nom, id], function (err) {
            if (err) {
                console.error('Erreur lors de la modification de la salle :', err.message);
                res.status(500).json({ error: 'Erreur serveur' });
            } else if (this.changes === 0) {
                res.status(404).json({ error: 'Salle non trouvée' });
            } else {
                res.json({ message: 'Salle mise à jour avec succès' });
            }
        });
    });
});

// DELETE /api/salles/:id - Supprimer une salle
app.delete('/api/salles/:id', (req, res) => {
    const { id } = req.params;

    // Récupérer le nom de la salle à partir de son ID
    db.get('SELECT nom FROM salles WHERE id = ?', [id], (err, row) => {
        if (err) {
            console.error('Erreur lors de la récupération de la salle :', err.message);
            res.status(500).json({ error: 'Erreur serveur lors de la récupération de la salle' });
            return;
        }

        if (!row) {
            res.status(404).json({ error: 'Salle non trouvée' });
            return;
        }

        const salleNom = row.nom; // Ex: "Salle F119"
        console.log(`Salle à supprimer : ${salleNom}`);
        if (!salleNom || !salleNom.startsWith("Salle ") || salleNom.split(" ").length < 2) {
            console.error(`Format de nom de salle invalide : ${salleNom}`);
            res.status(500).json({ error: 'Format de nom de salle invalide' });
            return;
        }

        // Extraire l'identifiant de la salle (ex: "F119")
        const salleId = salleNom.split(" ")[1]; // Ex: "F119"
        console.log(`Identifiant de la salle extrait (salleId) : ${salleId}`);

        // Vérifier tous les capteurs pour voir leur état initial
        db.all('SELECT * FROM captors', (err, allCaptors) => {
            if (err) {
                console.error('Erreur lors de la récupération de tous les capteurs :', err.message);
                res.status(500).json({ error: 'Erreur serveur lors de la récupération des capteurs' });
                return;
            }
            console.log(`État initial de tous les capteurs :`, allCaptors);

            // Vérifier les capteurs assignés à cette salle avant la désassignation
            db.all('SELECT * FROM captors WHERE UPPER(salle_id) = UPPER(?)', [salleId], (err, captors) => {
                if (err) {
                    console.error('Erreur lors de la récupération des capteurs assignés :', err.message);
                    res.status(500).json({ error: 'Erreur serveur lors de la récupération des capteurs' });
                    return;
                }

                console.log(`Capteurs assignés à la salle ${salleId} avant désassignation :`, captors);

                // D'abord, désassigner les capteurs liés à cette salle
                db.run(
                    'UPDATE captors SET salle_id = NULL, statut = ?, humidite = ?, temperature = ?, micro_particules = ?, qualite_air = ?, updated_at = ? WHERE UPPER(salle_id) = UPPER(?)',
                    ['inactif', null, null, null, null, new Date().toISOString(), salleId],
                    function (err) {
                        if (err) {
                            console.error('Erreur lors de la désassignation des capteurs :', err.message);
                            res.status(500).json({ error: 'Erreur serveur lors de la désassignation des capteurs' });
                            return;
                        }

                        console.log(`Nombre de capteurs désassignés : ${this.changes}`);

                        // Vérifier les capteurs après la désassignation
                        db.all('SELECT * FROM captors WHERE UPPER(salle_id) = UPPER(?)', [salleId], (err, captorsAfter) => {
                            if (err) {
                                console.error('Erreur lors de la vérification des capteurs après désassignation :', err.message);
                            } else {
                                console.log(`Capteurs assignés à la salle ${salleId} après désassignation :`, captorsAfter);
                            }

                            // Vérifier l'état final de tous les capteurs
                            db.all('SELECT * FROM captors', (err, allCaptorsAfter) => {
                                if (err) {
                                    console.error('Erreur lors de la récupération de tous les capteurs après désassignation :', err.message);
                                } else {
                                    console.log(`État final de tous les capteurs :`, allCaptorsAfter);
                                }

                                // Ensuite, supprimer la salle
                                const sql = 'DELETE FROM salles WHERE id = ?';
                                db.run(sql, id, function (err) {
                                    if (err) {
                                        console.error('Erreur lors de la suppression de la salle :', err.message);
                                        res.status(500).json({ error: 'Erreur serveur' });
                                    } else if (this.changes === 0) {
                                        res.status(404).json({ error: 'Salle non trouvée' });
                                    } else {
                                        console.log(`Salle ID ${id} supprimée avec succès`);
                                        res.json({ message: 'Salle supprimée avec succès' });
                                    }
                                });
                            });
                        });
                    }
                );
            });
        });
    });
});

// Route pour servir la page principale
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'dashboard_captor.html'), (err) => {
        if (err) {
            console.error('Erreur lors du chargement de dashboard_captor.html :', err);
            res.status(500).send('Erreur serveur : impossible de charger la page');
        }
    });
});

// Démarrer le serveur
app.listen(port, () => {
    console.log(`Serveur démarré sur http://localhost:${port}`);
});

// Fermer la base de données proprement à la fermeture du serveur
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Erreur lors de la fermeture de la base de données :', err.message);
        }
        console.log('Base de données fermée.');
        process.exit(0);
    });
});